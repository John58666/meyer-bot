"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { parsePrice } from "@/lib/parse-services";
import bcrypt from "bcryptjs";
import { auditar } from "@/lib/audit";

// ── Listar profesionales activos (para selector al agendar) ───
export async function getActiveProfessionals(businessId: number) {
  const { rows } = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM professionals
     WHERE business_id = $1 AND active = true
     ORDER BY name`,
    [businessId],
  );
  return rows;
}

// ── Crear cita manual ─────────────────────────────────────────
export async function createAppointment(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  const nombre = formData.get("nombre") as string;
  const numero = formData.get("numero") as string;
  const servicio = formData.get("servicio") as string;
  const fecha = formData.get("fecha") as string; // YYYY-MM-DD
  const hora = formData.get("hora") as string;   // HH:MM
  const forceOverride = formData.get("forceOverride") === "true";
  const businessId = session.user.businessId;

  // Un usuario con rol "profesional" SOLO puede agendar a su propio nombre —
  // se ignora cualquier professionalId que venga del form (no confiar en el
  // cliente). Owner/admin sí pueden elegir cualquier profesional del negocio.
  const professionalId = session.user.role === "profesional"
    ? session.user.professionalId
    : (() => {
        const raw = formData.get("professionalId") as string | null;
        return raw ? parseInt(raw, 10) : null;
      })();

  if (!nombre || !numero || !servicio || !fecha || !hora) {
    return { error: "Todos los campos son obligatorios" };
  }

  try {
    if (!forceOverride) {
      // Si se eligió un profesional específico, el choque solo aplica contra
      // ESE profesional (dos barberos pueden atender a la misma hora).
      // Si no se eligió (negocio de 1 profesional, o "cualquiera"), se
      // mantiene el chequeo global por horario como antes.
      const params: (string | number)[] = [businessId, fecha, hora];
      const profFilter = professionalId != null
        ? ` AND professional_id = $${params.push(professionalId)}`
        : '';
      const { rows } = await pool.query(
        `SELECT id FROM appointments
         WHERE business_id = $1 AND fecha = $2 AND hora = $3::time AND estado != 'Cancelada'${profFilter}`,
        params,
      );
      if (rows.length > 0) return { conflict: true };
    }

    const insertResult = await pool.query(
      `INSERT INTO appointments (business_id, fecha, hora, nombre, servicio, numero, estado, professional_id)
       VALUES ($1, $2, $3::time, $4, $5, $6, 'Pendiente',
         COALESCE($7, (SELECT id FROM professionals WHERE business_id = $1 AND active = true ORDER BY id LIMIT 1)))
       RETURNING id`,
      [businessId, fecha, hora, nombre.trim(), servicio, numero.trim(), professionalId]
    );
    const appointmentId = insertResult.rows[0].id;

    await pool.query(
      `INSERT INTO customers (business_id, numero, nombre, primera_visita, ultima_visita, total_visitas)
       VALUES ($1, $2, $3, NOW(), NOW(), 1)
       ON CONFLICT (business_id, numero)
       DO UPDATE SET
         nombre        = EXCLUDED.nombre,
         ultima_visita = NOW(),
         total_visitas = customers.total_visitas + 1,
         updated_at    = NOW()`,
      [businessId, numero.trim(), nombre.trim()]
    );

    auditar(businessId, parseInt(session.user.id), "create_appointment", "appointment", appointmentId, {
      nombre, servicio, fecha, hora, professional_id: professionalId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("createAppointment error:", err);
    return { error: "Error al crear la cita" };
  }
}

// ── Actualizar estado ─────────────────────────────────────────
export async function updateAppointmentStatus(
  id: number,
  estado: "Completada" | "Cancelada" | "Pendiente"
) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  const professionalId = session.user.professionalId;
  const params: (string | number)[] = [estado, id, session.user.businessId];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  try {
    const { rowCount } = await pool.query(
      `UPDATE appointments
       SET estado = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3
       ${profFilter}`,
      params
    );
    if (rowCount === 0) {
      return { error: "No tienes permiso para modificar esta cita" };
    }

    // Obtener datos para auditoría
    const { rows: aptRows } = await pool.query(
      `SELECT nombre, servicio, fecha FROM appointments WHERE id = $1`,
      [id],
    );

    const accionMap: Record<string, "cancel_appointment" | "complete_appointment" | "reactivate_appointment"> = {
      Cancelada: "cancel_appointment",
      Completada: "complete_appointment",
      Pendiente: "reactivate_appointment",
    };

    if (aptRows.length > 0) {
      auditar(session.user.businessId, parseInt(session.user.id), accionMap[estado], "appointment", id, {
        nombre: aptRows[0].nombre,
        servicio: aptRows[0].servicio,
        fecha: aptRows[0].fecha,
        nuevo_estado: estado,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("updateAppointmentStatus error:", err);
    return { error: "Error al actualizar la cita" };
  }
}

// ── Reagendar cita ────────────────────────────────────────────
export async function rescheduleAppointment(
  id: number,
  fecha: string,
  hora: string
) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  if (!fecha || !hora) return { error: "Fecha y hora son obligatorias" };

  try {
    // Obtener datos anteriores para auditoría
    const { rows: oldRows } = await pool.query(
      `SELECT nombre, servicio, fecha::text, hora::text FROM appointments WHERE id = $1`,
      [id],
    );

    await pool.query(
      `UPDATE appointments
       SET fecha = $1, hora = $2::time, estado = 'Pendiente', updated_at = NOW()
       WHERE id = $3 AND business_id = $4`,
      [fecha, hora, id, session.user.businessId]
    );

    if (oldRows.length > 0) {
      auditar(session.user.businessId, parseInt(session.user.id), "reschedule_appointment", "appointment", id, {
        nombre: oldRows[0].nombre,
        servicio: oldRows[0].servicio,
        fecha_anterior: oldRows[0].fecha,
        hora_anterior: oldRows[0].hora,
        fecha_nueva: fecha,
        hora_nueva: hora,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    return { error: "Error al reagendar la cita" };
  }
}

// ─── Cache simple in-memory para métricas ────────────────────────────────────

const metricsCache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 15_000; // 15 segundos

function getCacheKey(businessId: number, rango: RangoMetricas, professionalId?: number | null, fechaDesde?: string, fechaHasta?: string, compararCon?: CompararCon): string {
  const suffix = rango === 'custom' && fechaDesde && fechaHasta ? `:${fechaDesde}:${fechaHasta}` : '';
  return `${businessId}:${rango}:${professionalId ?? ''}${suffix}:${compararCon ?? ''}`;
}

function cacheGet<T>(key: string): T | null {
  const entry = metricsCache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    metricsCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T): void {
  metricsCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  if (metricsCache.size > 100) {
    const firstKey = metricsCache.keys().next().value;
    if (firstKey) metricsCache.delete(firstKey);
  }
}

// ─── MÉTRICAS ────────────────────────────────────────────────────────────────

export type RangoMetricas = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'custom';
export type CompararCon = 'periodo-anterior' | 'semana-anterior' | 'mes-anterior' | 'ano-anterior';

export interface FilaCita {
  estado: string;
  servicio: string;
  hora_slot: number;
  fecha: string;
  professional_id: number | null;
  professional_name: string | null;
}

export interface MetricasData {
  totalCitas: number;
  completadas: number;
  pendientes: number;
  canceladas: number;
  tasaCancelacion: number;
  ingresos: number;
  horaPico: number | null;
  historialPorDia: Array<{ fecha: string; total: number; ingresos: number }>;
  // Variación vs período anterior
  ingresosVariacion: number | null;
  totalCitasVariacion: number | null;
  tasaCancelacionVariacion: number | null;
  ocupacion: number | null;
  ocupacionVariacion: number | null;
  clientesNuevos: number;
  clientesRecurrentes: number;
  retencion: number | null;
  retencionVariacion: number | null;
  // Datos para tabs
  profesionales: Array<{ id: number; name: string; ingresos: number; citas: number; cancelaciones: number }>;
  servicios: Array<{ nombre: string; ingresos: number; citas: number }>;
  // Datos para overlay chart
  historialAnteriorPorDia: Array<{ fecha: string; total: number; ingresos: number }>;
  // Profesionales activos para filtro (solo owner/admin)
  profesionalesActivos: Array<{ id: number; name: string }>;
  // Sparklines para KPIs (últimos valores diarios)
  sparklines: {
    ingresos: number[];
    citas: number[];
    cancelaciones: number[];
    ocupacion: number[];
  };
}

export type DrawerTipo = 'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle';

export type DrawerData =
  | { tipo: 'ingresos'; filas: Array<{ profesional: string; servicio: string; cantidad: number; total: number }>; total: number }
  | { tipo: 'citas-del-dia'; filas: Array<{ hora: string; nombre: string; servicio: string; profesional: string; estado: string }> }
  | { tipo: 'ocupacion'; grid: Array<{ dia: string; hora: string; ocupados: number; total: number; ratio: number }> }
  | { tipo: 'servicio-detalle'; servicio: string; profesionales: Array<{ name: string; citas: number; ingresos: number }>; tendenciaMensual: Array<{ mes: string; citas: number }> };

function calcularRangoFechas(rango: RangoMetricas, fechaDesdeOverride?: string, fechaHastaOverride?: string): { fechaDesde: string; fechaHasta: string } {
  if (rango === 'custom' && fechaDesdeOverride && fechaHastaOverride) {
    return { fechaDesde: fechaDesdeOverride, fechaHasta: fechaHastaOverride };
  }

  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));

  if (rango === 'hoy') {
    const iso = ahora.toISOString().split('T')[0];
    return { fechaDesde: iso, fechaHasta: iso };
  }
  if (rango === 'semana') {
    const dia = ahora.getDay();
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(ahora);
    lunes.setDate(ahora.getDate() + diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
      fechaDesde: lunes.toISOString().split('T')[0],
      fechaHasta: domingo.toISOString().split('T')[0],
    };
  }
  if (rango === 'trimestre') {
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    return {
      fechaDesde: primerDia.toISOString().split('T')[0],
      fechaHasta: ultimoDia.toISOString().split('T')[0],
    };
  }
  const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  return {
    fechaDesde: primerDia.toISOString().split('T')[0],
    fechaHasta: ultimoDia.toISOString().split('T')[0],
  };
}

function calcularPeriodoAnterior(rango: RangoMetricas, fechaDesde: string, fechaHasta: string, compararCon?: CompararCon): { desde: string; hasta: string } {
  const desde = new Date(fechaDesde + 'T12:00:00');
  const hasta = new Date(fechaHasta + 'T12:00:00');

  if (compararCon === 'semana-anterior') {
    const inicioAnterior = new Date(desde.getTime() - 7 * 86400000);
    const finAnterior = new Date(hasta.getTime() - 7 * 86400000);
    return {
      desde: inicioAnterior.toISOString().split('T')[0],
      hasta: finAnterior.toISOString().split('T')[0],
    };
  }

  if (compararCon === 'mes-anterior') {
    const inicioAnterior = new Date(desde);
    inicioAnterior.setMonth(inicioAnterior.getMonth() - 1);
    const finAnterior = new Date(hasta);
    finAnterior.setMonth(finAnterior.getMonth() - 1);
    return {
      desde: inicioAnterior.toISOString().split('T')[0],
      hasta: finAnterior.toISOString().split('T')[0],
    };
  }

  if (compararCon === 'ano-anterior') {
    const inicioAnterior = new Date(desde);
    inicioAnterior.setFullYear(inicioAnterior.getFullYear() - 1);
    const finAnterior = new Date(hasta);
    finAnterior.setFullYear(finAnterior.getFullYear() - 1);
    return {
      desde: inicioAnterior.toISOString().split('T')[0],
      hasta: finAnterior.toISOString().split('T')[0],
    };
  }

  // Default: periodo-anterior
  const diffMs = hasta.getTime() - desde.getTime();

  if (rango === 'trimestre') {
    const inicioAnterior = new Date(desde);
    inicioAnterior.setMonth(inicioAnterior.getMonth() - 3);
    const finAnterior = new Date(hasta);
    finAnterior.setMonth(finAnterior.getMonth() - 3);
    return {
      desde: inicioAnterior.toISOString().split('T')[0],
      hasta: finAnterior.toISOString().split('T')[0],
    };
  }

  const inicioAnterior = new Date(desde.getTime() - diffMs - 86400000);
  const finAnterior = new Date(desde.getTime() - 86400000);
  return {
    desde: inicioAnterior.toISOString().split('T')[0],
    hasta: finAnterior.toISOString().split('T')[0],
  };
}

async function fetchMetricasQuery(
  businessId: number,
  fechaDesde: string,
  fechaHasta: string,
  professionalId?: number | null
): Promise<FilaCita[]> {
  const params: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const profFilter = professionalId != null
    ? ` AND a.professional_id = $${params.push(professionalId)}`
    : '';

  const { rows } = await pool.query<FilaCita>(
    `SELECT a.estado, a.servicio,
            EXTRACT(HOUR FROM a.hora)::int AS hora_slot,
            a.fecha::text, a.professional_id,
            p.name AS professional_name
     FROM appointments a
     LEFT JOIN professionals p ON p.id = a.professional_id
     WHERE a.business_id = $1
       AND a.fecha BETWEEN $2 AND $3
       ${profFilter}
     ORDER BY a.fecha ASC, a.hora ASC`,
    params
  );
  return rows;
}

async function fetchClientesMetricas(
  businessId: number,
  fechaDesde: string,
  fechaHasta: string
): Promise<{ nuevos: number; recurrentes: number }> {
  const { rows } = await pool.query<{ tipo: string }>(
    `SELECT CASE WHEN c.primera_visita >= $2 THEN 'nuevo' ELSE 'recurrente' END AS tipo
     FROM customers c
     WHERE c.business_id = $1
       AND EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.business_id = $1 AND a.numero = c.numero
           AND a.fecha BETWEEN $2 AND $3
       )`,
    [businessId, fechaDesde, fechaHasta]
  );

  const nuevos = rows.filter(r => r.tipo === 'nuevo').length;
  const recurrentes = rows.filter(r => r.tipo === 'recurrente').length;
  return { nuevos, recurrentes };
}

async function fetchOcupacion(
  businessId: number,
  fechaDesde: string,
  fechaHasta: string,
  professionalId?: number | null
): Promise<{ ocupados: number; total: number }> {
  const scheduleQuery = await pool.query<{ schedule_text: unknown }>(
    `SELECT schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (!scheduleQuery.rows[0]?.schedule_text) return { ocupados: 0, total: 0 };

  const schedule: Record<string, { open: number; close: number }> =
    typeof scheduleQuery.rows[0].schedule_text === 'string'
      ? JSON.parse(scheduleQuery.rows[0].schedule_text)
      : scheduleQuery.rows[0].schedule_text;

  const start = new Date(fechaDesde + 'T12:00:00');
  const end = new Date(fechaHasta + 'T12:00:00');
  let totalSlots = 0;

  const params: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const profFilter = professionalId != null
    ? ` AND a.professional_id = $${params.push(professionalId)}`
    : '';

  const { rows: aptRows } = await pool.query<{ fecha: string }>(
    `SELECT a.fecha::text
     FROM appointments a
     WHERE a.business_id = $1 AND a.fecha BETWEEN $2 AND $3 AND a.estado != 'Cancelada'
     ${profFilter}`,
    params
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const daySchedule = schedule[String(dayOfWeek)];
    if (!daySchedule) continue;
    const slotsForDay = (daySchedule.close - daySchedule.open) * 2;
    totalSlots += slotsForDay;
  }

  return { ocupados: aptRows.length, total: totalSlots };
}

export async function getMetricas(
  businessId: number,
  rango: RangoMetricas,
  professionalId?: number | null,
  fechaDesdeOverride?: string,
  fechaHastaOverride?: string,
  compararCon?: CompararCon
): Promise<{ data: MetricasData | null; error: string | null }> {
  const { fechaDesde, fechaHasta } = calcularRangoFechas(rango, fechaDesdeOverride, fechaHastaOverride);
  const cacheKey = getCacheKey(businessId, rango, professionalId, fechaDesde, fechaHasta, compararCon);
  const cached = cacheGet<MetricasData>(cacheKey);
  if (cached) return { data: cached, error: null };

  try {
    const periodoAnterior = calcularPeriodoAnterior(rango, fechaDesde, fechaHasta, compararCon);

    const [filas, filasAnteriores, clientesData, ocupacion] = await Promise.all([
      fetchMetricasQuery(businessId, fechaDesde, fechaHasta, professionalId),
      fetchMetricasQuery(businessId, periodoAnterior.desde, periodoAnterior.hasta, professionalId),
      fetchClientesMetricas(businessId, fechaDesde, fechaHasta),
      fetchOcupacion(businessId, fechaDesde, fechaHasta, professionalId),
    ]);

    const negocioResult = await pool.query<{ services_text: string }>(
      `SELECT services_text FROM businesses WHERE id = $1 LIMIT 1`, [businessId]
    );
    const profResult = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM professionals WHERE business_id = $1 AND active = true ORDER BY name`,
      [businessId]
    );

    const { nuevos, recurrentes } = clientesData;
    const precioMap = parsePrice(negocioResult.rows[0]?.services_text ?? '');

    const totalCitas = filas.length;
    const completadas = filas.filter(f => f.estado === 'Completada').length;
    const pendientes  = filas.filter(f => f.estado === 'Pendiente').length;
    const canceladas  = filas.filter(f => f.estado === 'Cancelada').length;
    const tasaCancelacion = totalCitas > 0
      ? Math.round((canceladas / totalCitas) * 100)
      : 0;

    const ingresos = filas
      .filter(f => f.estado === 'Completada')
      .reduce((acc, f) => acc + (precioMap.get(f.servicio) ?? 0), 0);

    // Cálculos período anterior
    const ingresosAnt = filasAnteriores
      .filter(f => f.estado === 'Completada')
      .reduce((acc, f) => acc + (precioMap.get(f.servicio) ?? 0), 0);
    const totalCitasAnt = filasAnteriores.length;
    const canceladasAnt = filasAnteriores.filter(f => f.estado === 'Cancelada').length;
    const tasaCancelacionAnt = totalCitasAnt > 0
      ? Math.round((canceladasAnt / totalCitasAnt) * 100)
      : 0;

    const ingresosVariacion = ingresosAnt > 0
      ? Math.round(((ingresos - ingresosAnt) / ingresosAnt) * 100)
      : null;

    const totalCitasVariacion = totalCitasAnt > 0
      ? totalCitas - totalCitasAnt
      : null;

    const tasaCancelacionVariacion = tasaCancelacionAnt > 0
      ? Math.round((tasaCancelacion - tasaCancelacionAnt) * 100) / 100
      : null;

    // Hora pico
    const conteoHoras: Record<number, number> = {};
    filas.filter(f => f.estado !== 'Cancelada').forEach(f => {
      conteoHoras[f.hora_slot] = (conteoHoras[f.hora_slot] ?? 0) + 1;
    });
    const horaPico = Object.keys(conteoHoras).length > 0
      ? parseInt(Object.entries(conteoHoras).sort((a, b) => b[1] - a[1])[0][0])
      : null;

    // Ocupación y variación
    const ocupacionAnt = await fetchOcupacion(businessId, periodoAnterior.desde, periodoAnterior.hasta, professionalId);
    const ocupacionPct = ocupacion.total > 0
      ? Math.round((ocupacion.ocupados / ocupacion.total) * 100)
      : null;
    const ocupacionAntPct = ocupacionAnt.total > 0
      ? Math.round((ocupacionAnt.ocupados / ocupacionAnt.total) * 100)
      : null;
    const ocupacionVariacion = ocupacionAntPct != null && ocupacionPct != null
      ? ocupacionPct - ocupacionAntPct
      : null;

    // Retención
    const totalClientesPeriodo = nuevos + recurrentes;
    const retencion = totalClientesPeriodo > 0
      ? Math.round((recurrentes / totalClientesPeriodo) * 100)
      : null;

    const { nuevos: nuevosAnt, recurrentes: recurrentesAnt } = await fetchClientesMetricas(
      businessId, periodoAnterior.desde, periodoAnterior.hasta
    );
    const totalAnt = nuevosAnt + recurrentesAnt;
    const retencionAnt = totalAnt > 0 ? Math.round((recurrentesAnt / totalAnt) * 100) : null;
    const retencionVariacion = retencionAnt != null && retencion != null
      ? retencion - retencionAnt
      : null;

    // Historial por día (actual)
    const porDia: Record<string, { total: number; ingresos: number }> = {};
    filas.forEach(f => {
      if (!porDia[f.fecha]) porDia[f.fecha] = { total: 0, ingresos: 0 };
      if (f.estado !== 'Cancelada') porDia[f.fecha].total += 1;
      if (f.estado === 'Completada') porDia[f.fecha].ingresos += precioMap.get(f.servicio) ?? 0;
    });
    const historialPorDia = Object.entries(porDia)
      .map(([fecha, v]) => ({ fecha, ...v }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Historial período anterior
    const porDiaAnt: Record<string, { total: number; ingresos: number }> = {};
    filasAnteriores.forEach(f => {
      if (!porDiaAnt[f.fecha]) porDiaAnt[f.fecha] = { total: 0, ingresos: 0 };
      if (f.estado !== 'Cancelada') porDiaAnt[f.fecha].total += 1;
      if (f.estado === 'Completada') porDiaAnt[f.fecha].ingresos += precioMap.get(f.servicio) ?? 0;
    });
    const historialAnteriorPorDia = Object.entries(porDiaAnt)
      .map(([fecha, v]) => ({ fecha, ...v }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Datos por profesional
    const profMap: Record<number, { id: number; name: string; ingresos: number; citas: number; cancelaciones: number }> = {};
    filas.forEach(f => {
      if (!f.professional_id) return;
      if (!profMap[f.professional_id]) {
        profMap[f.professional_id] = {
          id: f.professional_id,
          name: f.professional_name ?? 'Sin nombre',
          ingresos: 0, citas: 0, cancelaciones: 0,
        };
      }
      if (f.estado !== 'Cancelada') profMap[f.professional_id].citas += 1;
      if (f.estado === 'Cancelada') profMap[f.professional_id].cancelaciones += 1;
      if (f.estado === 'Completada') {
        profMap[f.professional_id].ingresos += precioMap.get(f.servicio) ?? 0;
      }
    });
    const profesionales = Object.values(profMap).sort((a, b) => b.ingresos - a.ingresos);

    // Datos por servicio
    const servMap: Record<string, { nombre: string; ingresos: number; citas: number }> = {};
    filas.forEach(f => {
      if (!servMap[f.servicio]) servMap[f.servicio] = { nombre: f.servicio, ingresos: 0, citas: 0 };
      if (f.estado !== 'Cancelada') servMap[f.servicio].citas += 1;
      if (f.estado === 'Completada') servMap[f.servicio].ingresos += precioMap.get(f.servicio) ?? 0;
    });
    const servicios = Object.values(servMap).sort((a, b) => b.ingresos - a.ingresos);

    // Sparklines: extraer arrays de valores diarios de historialPorDia
    const porDiaCancel: Record<string, number> = {};
    filas.filter(f => f.estado === 'Cancelada').forEach(f => {
      porDiaCancel[f.fecha] = (porDiaCancel[f.fecha] ?? 0) + 1;
    });
    const fechas = historialPorDia.map(d => d.fecha);
    const sparklines = {
      ingresos: historialPorDia.map(d => d.ingresos),
      citas: historialPorDia.map(d => d.total),
      cancelaciones: fechas.map(f => porDiaCancel[f] ?? 0),
      ocupacion: historialPorDia.map(d => d.total),
    };

    const resultData: MetricasData = {
      totalCitas, completadas, pendientes, canceladas, tasaCancelacion, ingresos, horaPico,
      historialPorDia,
      ingresosVariacion, totalCitasVariacion, tasaCancelacionVariacion,
      ocupacion: ocupacionPct, ocupacionVariacion,
      clientesNuevos: nuevos, clientesRecurrentes: recurrentes,
      retencion, retencionVariacion,
      profesionales,
      servicios,
      historialAnteriorPorDia,
      profesionalesActivos: profResult.rows,
      sparklines,
    };
    cacheSet(cacheKey, resultData);

    return { data: resultData, error: null };
  } catch (e) {
    console.error('[getMetricas]', e);
    return { data: null, error: 'Error cargando métricas' };
  }
}

export async function getMetricasDrawer(
  businessId: number,
  tipo: DrawerTipo,
  params: { fecha?: string; servicio?: string; professionalId?: number; rango?: RangoMetricas }
): Promise<{ data: DrawerData | null; error: string | null }> {
  try {
    if (tipo === 'ingresos') {
      const { fechaDesde, fechaHasta } = params.rango
        ? calcularRangoFechas(params.rango)
        : calcularRangoFechas('semana');

      const queryParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
      const profFilter = params.professionalId != null
        ? ` AND a.professional_id = $${queryParams.push(params.professionalId)}`
        : '';

      const [aptRows, bizRows] = await Promise.all([
        pool.query(
          `SELECT COALESCE(p.name, 'Sin asignar') AS profesional, a.servicio,
                  COUNT(*)::int AS cantidad,
                  COUNT(*) FILTER (WHERE a.estado = 'Completada')::int AS completadas
           FROM appointments a
           LEFT JOIN professionals p ON p.id = a.professional_id
           WHERE a.business_id = $1 AND a.fecha BETWEEN $2 AND $3 ${profFilter}
           GROUP BY p.name, a.servicio
           ORDER BY cantidad DESC`,
          queryParams
        ),
        pool.query<{ services_text: string }>(
          `SELECT services_text FROM businesses WHERE id = $1`, [businessId]
        ),
      ]);

      const precioMap = parsePrice(bizRows.rows[0]?.services_text ?? '');
      const filas = aptRows.rows.map(r => ({
        profesional: r.profesional,
        servicio: r.servicio,
        cantidad: parseInt(r.cantidad),
        total: parseInt(r.completadas) * (precioMap.get(r.servicio) ?? 0),
      }));
      const total = filas.reduce((s, f) => s + f.total, 0);

      return {
        data: { tipo: 'ingresos', filas, total },
        error: null,
      };
    }

    if (tipo === 'citas-del-dia') {
      const fecha = params.fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      const queryParams: (string | number)[] = [businessId, fecha];
      const profFilter = params.professionalId != null
        ? ` AND a.professional_id = $${queryParams.push(params.professionalId)}`
        : '';

      const { rows } = await pool.query(
        `SELECT a.hora::text, a.nombre, a.servicio, a.estado,
                COALESCE(p.name, 'Sin asignar') AS profesional
         FROM appointments a
         LEFT JOIN professionals p ON p.id = a.professional_id
         WHERE a.business_id = $1 AND a.fecha = $2 ${profFilter}
         ORDER BY a.hora ASC`,
        queryParams
      );

      return {
        data: { tipo: 'citas-del-dia', filas: rows },
        error: null,
      };
    }

    if (tipo === 'ocupacion') {
      const { fechaDesde, fechaHasta } = calcularRangoFechas(params.rango ?? 'semana');
      const scheduleQuery = await pool.query<{ schedule_text: unknown }>(
        `SELECT schedule_text FROM businesses WHERE id = $1`, [businessId]
      );
      const schedule: Record<string, { open: number; close: number }> =
        scheduleQuery.rows[0]?.schedule_text
          ? typeof scheduleQuery.rows[0].schedule_text === 'string'
            ? JSON.parse(scheduleQuery.rows[0].schedule_text)
            : scheduleQuery.rows[0].schedule_text
          : {};

      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const queryParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
      const profFilter = params.professionalId != null
        ? ` AND a.professional_id = $${queryParams.push(params.professionalId)}`
        : '';

      const { rows: apts } = await pool.query<{ fecha: string; hora_slot: number }>(
        `SELECT a.fecha::text, EXTRACT(HOUR FROM a.hora)::int AS hora_slot
         FROM appointments a
         WHERE a.business_id = $1 AND a.fecha BETWEEN $2 AND $3 AND a.estado != 'Cancelada'
         ${profFilter}`,
        queryParams
      );

      const ocupGrid: Record<string, Record<number, number>> = {};
      apts.forEach(a => {
        if (!ocupGrid[a.fecha]) ocupGrid[a.fecha] = {};
        ocupGrid[a.fecha][a.hora_slot] = (ocupGrid[a.fecha][a.hora_slot] ?? 0) + 1;
      });

      const grid: Array<{ dia: string; hora: string; ocupados: number; total: number; ratio: number }> = [];
      const start = new Date(fechaDesde + 'T12:00:00');
      const end = new Date(fechaHasta + 'T12:00:00');

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const daySchedule = schedule[String(dayOfWeek)];
        if (!daySchedule) continue;

        for (let h = daySchedule.open; h < daySchedule.close; h++) {
          const ocup = ocupGrid[dateStr]?.[h] ?? 0;
          const total = 2; // slots de 30 min por hora
          grid.push({
            dia: `${diasSemana[dayOfWeek]} ${d.getDate()}`,
            hora: `${String(h).padStart(2, '0')}:00`,
            ocupados: Math.min(ocup, total),
            total,
            ratio: ocup / total,
          });
        }
      }

      return { data: { tipo: 'ocupacion', grid }, error: null };
    }

    if (tipo === 'servicio-detalle') {
      if (!params.servicio) return { data: null, error: 'servicio requerido' };

      // Por profesional
      const { rows: profRows } = await pool.query(
        `SELECT COALESCE(p.name, 'Sin asignar') AS name,
                COUNT(*)::int AS citas,
                SUM(CASE WHEN a.estado = 'Completada' THEN 1 ELSE 0 END)::int AS completadas
         FROM appointments a
         LEFT JOIN professionals p ON p.id = a.professional_id
         WHERE a.business_id = $1 AND a.servicio = $2
         GROUP BY p.name
         ORDER BY citas DESC`,
        [businessId, params.servicio]
      );

      // Precio del servicio
      const { rows: bizRow } = await pool.query(
        `SELECT services_text FROM businesses WHERE id = $1`, [businessId]
      );
      const precioMap = parsePrice(bizRow[0]?.services_text ?? '');
      const precio = precioMap.get(params.servicio) ?? 0;

      const profesionales = profRows.map(r => ({
        name: r.name,
        citas: parseInt(r.citas),
        ingresos: parseInt(r.completadas) * precio,
      }));

      // Tendencia mensual (últimos 3 meses)
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      const fechaLimite = tresMesesAtras.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

      const { rows: mesRows } = await pool.query(
        `SELECT TO_CHAR(a.fecha, 'YYYY-MM') AS mes, COUNT(*)::int AS citas
         FROM appointments a
         WHERE a.business_id = $1 AND a.servicio = $2 AND a.fecha >= $3 AND a.estado != 'Cancelada'
         GROUP BY mes
         ORDER BY mes ASC`,
        [businessId, params.servicio, fechaLimite]
      );

      return {
        data: {
          tipo: 'servicio-detalle',
          servicio: params.servicio,
          profesionales,
          tendenciaMensual: mesRows.map(r => ({ mes: r.mes, citas: parseInt(r.citas) })),
        },
        error: null,
      };
    }

    return { data: null, error: 'Tipo de drawer inválido' };
  } catch (e) {
    console.error('[getMetricasDrawer]', e);
    return { data: null, error: 'Error cargando detalle' };
  }
}

// ─── Bloqueos de agenda ───────────────────────────────────────────────────────

export async function getBloqueos(
  businessId: number,
  professionalId?: number | null,
  viewAll = false,
) {
  // viewAll: para owner/admin — trae TODOS los bloqueos del negocio
  // (propios de cada profesional + los de "todo el negocio"), con el
  // nombre del profesional para mostrarlo en la UI.
  if (viewAll) {
    const { rows } = await pool.query(
      `SELECT se.id, se.fecha::text, se.tipo, se.hora_inicio::text, se.hora_fin::text,
              se.motivo, se.professional_id, p.name AS professional_name
       FROM schedule_exceptions se
       LEFT JOIN professionals p ON p.id = se.professional_id
       WHERE se.business_id = $1
         AND se.fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
       ORDER BY se.fecha ASC`,
      [businessId]
    )
    return rows
  }

  const params: number[] = [businessId];
  const profCondition = professionalId != null
    ? `professional_id = $${params.push(professionalId)}`
    : `professional_id IS NULL`;

  const { rows } = await pool.query(
    `SELECT id, fecha::text, tipo, hora_inicio::text, hora_fin::text, motivo
     FROM schedule_exceptions
     WHERE business_id = $1
       AND ${profCondition}
       AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
     ORDER BY fecha ASC`,
    params
  )
  return rows
}

export async function createBloqueo(data: {
  businessId: number
  fecha: string
  tipo: 'cerrado' | 'horario_especial'
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
  professionalId?: number | null
}) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }

  const { fecha, tipo, hora_inicio, hora_fin, motivo } = data
  // Nunca confiar en businessId/professionalId del cliente para AUTORIZAR —
  // el negocio siempre es el de la sesión. Un "profesional" solo puede
  // bloquear su propia agenda; solo owner/admin pueden elegir otro
  // profesional o "todo el negocio".
  const businessId = session.user.businessId
  const professionalId = session.user.role === 'profesional'
    ? session.user.professionalId
    : (data.professionalId ?? null)

  if (tipo === 'horario_especial') {
    if (!hora_inicio || !hora_fin)
      return { error: 'Horario especial requiere hora de inicio y fin' }
    if (hora_inicio >= hora_fin)
      return { error: 'La hora de inicio debe ser menor que la hora de fin' }
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  if (fecha < today) return { error: 'No se pueden bloquear fechas pasadas' }

  const bloqueoResult = await pool.query(
    `INSERT INTO schedule_exceptions (business_id, fecha, tipo, hora_inicio, hora_fin, motivo, professional_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      businessId,
      fecha,
      tipo,
      tipo === 'horario_especial' ? hora_inicio : null,
      tipo === 'horario_especial' ? hora_fin : null,
      motivo || null,
      professionalId ?? null,
    ]
  )

  auditar(businessId, parseInt(session.user.id), "create_bloqueo", "bloqueo", bloqueoResult.rows[0].id, {
    fecha, tipo, hora_inicio, hora_fin, motivo, professional_id: professionalId,
  })

  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function deleteBloqueo(id: number, businessId: number) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }
  // businessId siempre de la sesión, nunca del cliente.
  const realBusinessId = session.user.businessId

  // Un "profesional" solo puede borrar SUS PROPIOS bloqueos, nunca los de
  // otro profesional ni los de "todo el negocio".
  const params: (number)[] = [id, realBusinessId]
  const profFilter = session.user.role === 'profesional'
    ? ` AND professional_id = $${params.push(session.user.professionalId as number)}`
    : ''

  // Obtener datos para auditoría antes de borrar
  const { rows: delBloqRows } = await pool.query(
    `SELECT fecha, tipo, motivo FROM schedule_exceptions WHERE id = $1 AND business_id = $2`,
    [id, realBusinessId]
  )

  await pool.query(
    `DELETE FROM schedule_exceptions WHERE id = $1 AND business_id = $2${profFilter}`,
    params
  )

  if (delBloqRows.length > 0) {
    auditar(realBusinessId, parseInt(session.user.id), "delete_bloqueo", "bloqueo", id, {
      fecha: delBloqRows[0].fecha,
      tipo: delBloqRows[0].tipo,
      motivo: delBloqRows[0].motivo,
    })
  }

  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function updateServicesText(businessId: number, servicesText: string) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }
  if (session.user.role !== 'owner' && session.user.role !== 'admin')
    return { error: 'No autorizado' }

  const entries = servicesText.split(',').map(s => s.trim()).filter(Boolean)

  if (entries.length === 0)
    return { error: 'Agrega al menos un servicio' }

  for (const entry of entries) {
    if (!entry.match(/^.+\s*\$[0-9.,]+$/))
      return { error: `Formato inválido: "${entry}". Usa: Nombre $precio` }
  }

  await pool.query(
    `UPDATE businesses SET services_text = $1 WHERE id = $2`,
    [entries.join(', '), businessId]
  )

  auditar(businessId, parseInt(session.user.id), "update_services", "business", businessId, {
    servicios_count: entries.length,
  })

  revalidatePath('/dashboard/configuracion')
  return { ok: true }
}

export interface DaySchedule {
  open: number
  close: number
}

export type ScheduleData = Record<string, DaySchedule>

export async function updateScheduleText(businessId: number, schedule: ScheduleData) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }
  if (session.user.role !== 'owner' && session.user.role !== 'admin')
    return { error: 'No autorizado' }

  for (const [day, hs] of Object.entries(schedule)) {
    const d = parseInt(day)
    if (isNaN(d) || d < 0 || d > 6)
      return { error: `Día inválido: ${day}` }
    if (!Number.isInteger(hs.open) || hs.open < 0 || hs.open > 23)
      return { error: `Hora de apertura inválida en día ${d}` }
    if (!Number.isInteger(hs.close) || hs.close < 1 || hs.close > 24)
      return { error: `Hora de cierre inválida en día ${d}` }
    if (hs.close <= hs.open)
      return { error: `El cierre debe ser después de la apertura (día ${d})` }
  }

  try {
    await pool.query(
      `UPDATE businesses SET schedule_text = $1::jsonb WHERE id = $2`,
      [JSON.stringify(schedule), businessId]
    )
    auditar(businessId, parseInt(session.user.id), "update_services", "business", businessId, {
      schedule_days: Object.keys(schedule).length,
    })
    revalidatePath('/dashboard/configuracion')
    return { ok: true }
  } catch (e) {
    console.error('[updateScheduleText]', e)
    return { error: 'Error guardando los horarios' }
  }
}

// ─── CRM — Clientes ──────────────────────────────────────────────────────────

export interface Cliente {
  id: number;
  numero: string;
  nombre: string;
  total_visitas: number;
  ultima_visita: string | null;
  primera_visita: string | null;
  ultimo_servicio: string | null;
}

export interface ClienteHistorialItem {
  id: number;
  fecha: string;
  hora: string;
  servicio: string;
  estado: string;
}

export async function getClientes(
  businessId: number,
  search?: string,
  professionalId?: number | null
): Promise<{ clientes: Cliente[]; error: string | null }> {
  try {
    const params: (string | number)[] = [businessId];
    const searchFilter =
      search && search.trim().length > 0
        ? ` AND (c.nombre ILIKE $${params.length + 1} OR c.numero ILIKE $${params.length + 1})`
        : "";
    if (search && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
    }

    // Profesional: solo clientes con al menos una cita atendida por él
    const profFilter = professionalId != null
      ? ` AND EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.business_id = c.business_id
             AND a.numero = c.numero
             AND a.professional_id = $${params.push(professionalId)}
         )`
      : "";

    const { rows } = await pool.query<Cliente>(
      `SELECT
         c.id,
         c.numero,
         c.nombre,
         c.total_visitas,
         c.ultima_visita::text,
         c.primera_visita::text,
         (
           SELECT a.servicio
           FROM appointments a
           WHERE a.business_id = c.business_id
             AND a.numero = c.numero
             AND a.estado = 'Completada'
           ORDER BY a.fecha DESC, a.hora DESC
           LIMIT 1
         ) AS ultimo_servicio
       FROM customers c
       WHERE c.business_id = $1
         ${searchFilter}
         ${profFilter}
       ORDER BY c.ultima_visita DESC NULLS LAST`,
      params
    );

    return { clientes: rows, error: null };
  } catch (e) {
    console.error("[getClientes]", e);
    return { clientes: [], error: "Error cargando clientes" };
  }
}

// ─── Equipo — Gestión de usuarios (solo owner) ────────────────────────────────

export interface MiembroEquipo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  professional_id: number | null;
  professional_name: string | null;
  created_at: string;
}

export async function getEquipo(
  businessId: number
): Promise<{ miembros: MiembroEquipo[]; error: string | null }> {
  try {
    const { rows } = await pool.query<MiembroEquipo>(
      `SELECT u.id, u.email, u.name, u.role, u.active, u.professional_id,
              p.name AS professional_name, u.created_at::text
       FROM users u
       LEFT JOIN professionals p ON p.id = u.professional_id
       WHERE u.business_id = $1
       ORDER BY
         CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         u.name ASC`,
      [businessId]
    );
    return { miembros: rows, error: null };
  } catch (e) {
    console.error("[getEquipo]", e);
    return { miembros: [], error: "Error cargando el equipo" };
  }
}

export async function createMiembroEquipo(data: {
  businessId: number;
  email: string;
  password: string;
  name: string;
  role: "admin" | "profesional";
}) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  const { businessId, email, password, name, role } = data;

  if (!email || !password || !name) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (!["admin", "profesional"].includes(role)) {
    return { error: "Role inválido" };
  }

  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (existing.rows.length > 0) {
      return { error: "Ya existe un usuario con ese email" };
    }

    // ── Validación de límite de plan ──────────────────────────
    const limits = await client.query(
      `SELECT max_professionals, max_admins FROM businesses WHERE id = $1`,
      [businessId]
    );
    const { max_professionals, max_admins } = limits.rows[0];

    if (role === "profesional") {
      const count = await client.query(
        `SELECT COUNT(*) FROM users WHERE business_id = $1 AND role = 'profesional' AND active = true`,
        [businessId]
      );
      if (parseInt(count.rows[0].count) >= max_professionals) {
        return {
          error: `Tu plan permite hasta ${max_professionals} profesionales. Contacta a soporte para ampliar tu plan.`,
        };
      }
    }

    if (role === "admin") {
      const count = await client.query(
        `SELECT COUNT(*) FROM users WHERE business_id = $1 AND role = 'admin' AND active = true`,
        [businessId]
      );
      if (parseInt(count.rows[0].count) >= max_admins) {
        return {
          error: `Tu plan permite hasta ${max_admins} administrador${max_admins !== 1 ? "es" : ""}. Contacta a soporte para ampliar tu plan.`,
        };
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    let professionalId: number | null = null;

    if (role === "profesional") {
      const profResult = await client.query(
        `INSERT INTO professionals (business_id, name, active)
         VALUES ($1, $2, true)
         RETURNING id`,
        [businessId, name.trim()]
      );
      professionalId = profResult.rows[0].id;
    }

    await client.query(
      `INSERT INTO users (email, password_hash, name, business_id, role, professional_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), businessId, role, professionalId]
    );

    await client.query("COMMIT");

    auditar(businessId, parseInt(session.user.id), "create_miembro", "user", null, {
      name, email, role, professional_id: professionalId,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[createMiembroEquipo]", e);
    return { error: "Error creando el usuario" };
  } finally {
    client.release();
  }
}

export async function toggleMiembroActivo(userId: number, businessId: number, active: boolean) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE users SET active = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3
       RETURNING professional_id`,
      [active, userId, businessId]
    );
    // Mantiene sincronizado professionals.active con el estado del usuario,
    // para que no siga apareciendo disponible en el selector de agenda.
    const professionalId = rows[0]?.professional_id;
    if (professionalId != null) {
      await client.query(
        `UPDATE professionals SET active = $1, updated_at = NOW() WHERE id = $2`,
        [active, professionalId]
      );
    }
    await client.query("COMMIT");

    auditar(businessId, parseInt(session.user.id), "toggle_miembro", "user", userId, {
      active, professional_id: professionalId,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[toggleMiembroActivo]", e);
    return { error: "Error actualizando el usuario" };
  } finally {
    client.release();
  }
}

export async function updateMiembroRole(
  userId: number,
  businessId: number,
  role: "admin" | "profesional"
) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }
  if (!["admin", "profesional"].includes(role)) {
    return { error: "Role inválido" };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (role === "profesional") {
      // Si se está promoviendo a "profesional" y todavía no tiene un
      // professional_id enlazado, hay que crearlo — de lo contrario queda
      // huérfano (role='profesional' pero professional_id=NULL) y no
      // aparece en ningún selector ni filtro de agenda.
      const current = await client.query(
        `SELECT name, professional_id FROM users WHERE id = $1 AND business_id = $2`,
        [userId, businessId]
      );
      const row = current.rows[0];
      if (row && row.professional_id == null) {
        const profResult = await client.query(
          `INSERT INTO professionals (business_id, name, active)
           VALUES ($1, $2, true)
           RETURNING id`,
          [businessId, row.name]
        );
        await client.query(
          `UPDATE users SET role = $1, professional_id = $2, updated_at = NOW()
           WHERE id = $3 AND business_id = $4`,
          [role, profResult.rows[0].id, userId, businessId]
        );
      } else {
        // Ya tenía professional_id (p.ej. admin que antes fue profesional) —
        // solo aseguramos que la fila professionals esté activa de nuevo.
        if (row?.professional_id != null) {
          await client.query(
            `UPDATE professionals SET active = true WHERE id = $1`,
            [row.professional_id]
          );
        }
        await client.query(
          `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
          [role, userId, businessId]
        );
      }
    } else {
      await client.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
        [role, userId, businessId]
      );
    }

    await client.query("COMMIT");

    auditar(businessId, parseInt(session.user.id), "update_role", "user", userId, {
      role_nuevo: role,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[updateMiembroRole]", e);
    return { error: "Error actualizando el role" };
  } finally {
    client.release();
  }
}

export async function updateMiembroCredenciales(data: {
  userId: number;
  businessId: number;
  name: string;
  email: string;
  password?: string;
}) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  const { userId, businessId, name, email, password } = data;

  if (!name?.trim() || !email?.trim()) {
    return { error: "Nombre y email son obligatorios" };
  }
  if (password && password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length > 0) {
      return { error: "Ese email ya está en uso por otro usuario" };
    }

    const target = await pool.query(
      `SELECT role, professional_id FROM users WHERE id = $1 AND business_id = $2`,
      [userId, businessId]
    );
    if (target.rows.length === 0) {
      return { error: "Usuario no encontrado" };
    }
    if (target.rows[0].role === "owner") {
      return { error: "No se puede editar al dueño desde aquí" };
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        `UPDATE users SET name = $1, email = $2, password_hash = $3, updated_at = NOW()
         WHERE id = $4 AND business_id = $5`,
        [name.trim(), email.toLowerCase().trim(), passwordHash, userId, businessId]
      );
    } else {
      await pool.query(
        `UPDATE users SET name = $1, email = $2, updated_at = NOW()
         WHERE id = $3 AND business_id = $4`,
        [name.trim(), email.toLowerCase().trim(), userId, businessId]
      );
    }

    const professionalId = target.rows[0].professional_id;
    if (professionalId) {
      await pool.query(
        `UPDATE professionals SET name = $1, updated_at = NOW() WHERE id = $2`,
        [name.trim(), professionalId]
      );
    }

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    console.error("[updateMiembroCredenciales]", e);
    return { error: "Error actualizando el usuario" };
  }
}

export async function getClienteHistorial(
  businessId: number,
  clienteId: number
): Promise<{
  cliente: Omit<Cliente, "ultimo_servicio"> | null;
  historial: ClienteHistorialItem[];
  error: string | null;
}> {
  try {
    const { rows: clienteRows } = await pool.query(
      `SELECT id, numero, nombre, total_visitas,
              ultima_visita::text, primera_visita::text
       FROM customers
       WHERE id = $1 AND business_id = $2
       LIMIT 1`,
      [clienteId, businessId]
    );

    if (clienteRows.length === 0) {
      return { cliente: null, historial: [], error: "Cliente no encontrado" };
    }

    const { rows: historialRows } = await pool.query<ClienteHistorialItem>(
      `SELECT id, fecha::text, hora::text, servicio, estado
       FROM appointments
       WHERE business_id = $1
         AND numero = $2
       ORDER BY fecha DESC, hora DESC
       LIMIT 50`,
      [businessId, clienteRows[0].numero]
    );

    return {
      cliente: clienteRows[0],
      historial: historialRows,
      error: null,
    };
  } catch (e) {
    console.error("[getClienteHistorial]", e);
    return { cliente: null, historial: [], error: "Error cargando historial" };
  }
}

// ─── Slots disponibles ─────────────────────────────────────────────────────────

function generateSlots(openHour: number, closeHour: number): string[] {
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

export async function getAvailableSlots(
  businessId: number,
  fecha: string,
  professionalId?: number | null
): Promise<string[]> {
  try {
    const { rows: bizRows } = await pool.query(
      `SELECT schedule_text FROM businesses WHERE id = $1`,
      [businessId]
    );
    if (bizRows.length === 0) return [];
    const rawSchedule = bizRows[0].schedule_text;
    const schedule: Record<string, { open: number; close: number }> =
      typeof rawSchedule === 'string' ? JSON.parse(rawSchedule) : rawSchedule;

    const dateObj = new Date(fecha + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const daySchedule = schedule[String(dayOfWeek)];
    if (!daySchedule) return [];

    let slots = generateSlots(daySchedule.open, daySchedule.close);

    const exParams: (string | number)[] = [businessId, fecha];
    let exProfCondition: string;
    if (professionalId != null) {
      exProfCondition = `AND (professional_id = $${exParams.push(professionalId)} OR professional_id IS NULL)`;
    } else {
      exProfCondition = 'AND professional_id IS NULL';
    }

    const { rows: exceptions } = await pool.query(
      `SELECT tipo, hora_inicio::text, hora_fin::text
       FROM schedule_exceptions
       WHERE business_id = $1 AND fecha = $2 ${exProfCondition}`,
      exParams
    );

    for (const ex of exceptions) {
      if (ex.tipo === 'cerrado') return [];
      if (ex.tipo === 'horario_especial') {
        slots = slots.filter(s => s >= ex.hora_inicio!.substring(0, 5) && s < ex.hora_fin!.substring(0, 5));
      }
    }

    const aptParams: (string | number)[] = [businessId, fecha];
    const aptProfCondition = professionalId != null
      ? `AND professional_id = $${aptParams.push(professionalId)}`
      : '';

    const { rows: appointments } = await pool.query(
      `SELECT hora::text FROM appointments
       WHERE business_id = $1 AND fecha = $2 AND estado != 'Cancelada' ${aptProfCondition}`,
      aptParams
    );

    const booked = new Set(appointments.map(a => a.hora.substring(0, 5)));
    return slots.filter(s => !booked.has(s));
  } catch (e) {
    console.error('[getAvailableSlots]', e);
    return [];
  }
}
