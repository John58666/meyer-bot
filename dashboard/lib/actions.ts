"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { parsePrice } from "@/lib/parse-services";

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

  if (!nombre || !numero || !servicio || !fecha || !hora) {
    return { error: "Todos los campos son obligatorios" };
  }

  try {
    if (!forceOverride) {
      const { rows } = await pool.query(
        `SELECT id FROM appointments
         WHERE business_id = $1 AND fecha = $2 AND hora = $3::time AND estado != 'Cancelada'`,
        [businessId, fecha, hora],
      );
      if (rows.length > 0) return { conflict: true };
    }

    await pool.query(
      `INSERT INTO appointments (business_id, fecha, hora, nombre, servicio, numero, estado)
       VALUES ($1, $2, $3::time, $4, $5, $6, 'Pendiente')`,
      [businessId, fecha, hora, nombre.trim(), servicio, numero.trim()]
    );

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

  try {
    await pool.query(
      `UPDATE appointments
       SET estado = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3`,
      [estado, id, session.user.businessId]
    );
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
    await pool.query(
      `UPDATE appointments
       SET fecha = $1, hora = $2::time, estado = 'Pendiente', updated_at = NOW()
       WHERE id = $3 AND business_id = $4`,
      [fecha, hora, id, session.user.businessId]
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    return { error: "Error al reagendar la cita" };
  }
}

// ─── MÉTRICAS ────────────────────────────────────────────────────────────────

export type RangoMetricas = 'hoy' | 'semana' | 'mes';

export interface FilaCita {
  estado: string;
  servicio: string;
  hora_slot: number;
  fecha: string;
}

export interface MetricasData {
  totalCitas: number;
  completadas: number;
  pendientes: number;
  canceladas: number;
  tasaCancelacion: number;
  ingresos: number;
  horaPico: number | null;
  historialPorDia: Array<{
    fecha: string;
    total: number;
    ingresos: number;
  }>;
}

export async function getMetricas(
  businessId: number,
  rango: RangoMetricas,
  professionalId?: number | null
): Promise<{ data: MetricasData | null; error: string | null }> {
  try {
    // Calcular rango de fechas en zona America/Bogota
    const ahora = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );

    let fechaDesde: string;
    let fechaHasta: string;

    if (rango === 'hoy') {
      const iso = ahora.toISOString().split('T')[0];
      fechaDesde = iso;
      fechaHasta = iso;
    } else if (rango === 'semana') {
      const dia = ahora.getDay();
      const diffLunes = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(ahora);
      lunes.setDate(ahora.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      fechaDesde = lunes.toISOString().split('T')[0];
      fechaHasta = domingo.toISOString().split('T')[0];
    } else {
      const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      fechaDesde = primerDia.toISOString().split('T')[0];
      fechaHasta = ultimoDia.toISOString().split('T')[0];
    }

    // Query condicional: solo filtra professional_id si se pasa explícitamente
    // (evita referenciar la columna si aún no existe en el schema)
    const baseParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
    const profFilter = professionalId != null
      ? ` AND professional_id = $${baseParams.push(professionalId)}`
      : '';

    const { rows: filas } = await pool.query<FilaCita>(
      `SELECT
         estado,
         servicio,
         EXTRACT(HOUR FROM hora)::int AS hora_slot,
         fecha::text
       FROM appointments
       WHERE business_id = $1
         AND fecha BETWEEN $2 AND $3
         ${profFilter}
       ORDER BY fecha ASC, hora ASC`,
      baseParams
    );

    const { rows: negocioRows } = await pool.query<{ services_text: string }>(
      `SELECT services_text FROM businesses WHERE id = $1 LIMIT 1`,
      [businessId]
    );
    const precioMap = parsePrice(negocioRows[0]?.services_text ?? '');

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

    const conteoHoras: Record<number, number> = {};
    filas
      .filter(f => f.estado !== 'Cancelada')
      .forEach(f => {
        conteoHoras[f.hora_slot] = (conteoHoras[f.hora_slot] ?? 0) + 1;
      });
    const horaPico = Object.keys(conteoHoras).length > 0
      ? parseInt(
          Object.entries(conteoHoras).sort((a, b) => b[1] - a[1])[0][0]
        )
      : null;

    const porDia: Record<string, { total: number; ingresos: number }> = {};
    filas.forEach(f => {
      if (!porDia[f.fecha]) porDia[f.fecha] = { total: 0, ingresos: 0 };
      if (f.estado !== 'Cancelada') {
        porDia[f.fecha].total += 1;
      }
      if (f.estado === 'Completada') {
        porDia[f.fecha].ingresos += precioMap.get(f.servicio) ?? 0;
      }
    });

    const historialPorDia = Object.entries(porDia)
      .map(([fecha, v]) => ({ fecha, ...v }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      data: {
        totalCitas,
        completadas,
        pendientes,
        canceladas,
        tasaCancelacion,
        ingresos,
        horaPico,
        historialPorDia,
      },
      error: null,
    };
  } catch (e) {
    console.error('[getMetricas]', e);
    return { data: null, error: 'Error cargando métricas' };
  }
}

// ─── Bloqueos de agenda ───────────────────────────────────────────────────────

export async function getBloqueos(businessId: number) {
  const { rows } = await pool.query(
    `SELECT id, fecha::text, tipo, hora_inicio::text, hora_fin::text, motivo
     FROM schedule_exceptions
     WHERE business_id = $1
       AND professional_id IS NULL
       AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
     ORDER BY fecha ASC`,
    [businessId]
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
}) {
  const { businessId, fecha, tipo, hora_inicio, hora_fin, motivo } = data

  if (tipo === 'horario_especial') {
    if (!hora_inicio || !hora_fin)
      return { error: 'Horario especial requiere hora de inicio y fin' }
    if (hora_inicio >= hora_fin)
      return { error: 'La hora de inicio debe ser menor que la hora de fin' }
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  if (fecha < today) return { error: 'No se pueden bloquear fechas pasadas' }

  await pool.query(
    `INSERT INTO schedule_exceptions (business_id, fecha, tipo, hora_inicio, hora_fin, motivo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      businessId,
      fecha,
      tipo,
      tipo === 'horario_especial' ? hora_inicio : null,
      tipo === 'horario_especial' ? hora_fin : null,
      motivo || null,
    ]
  )
  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function deleteBloqueo(id: number, businessId: number) {
  await pool.query(
    `DELETE FROM schedule_exceptions WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  )
  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function updateServicesText(businessId: number, servicesText: string) {
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
  revalidatePath('/dashboard/configuracion')
  return { ok: true }
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
  search?: string
): Promise<{ clientes: Cliente[]; error: string | null }> {
  try {
    const params: (string | number)[] = [businessId];
    const searchFilter =
      search && search.trim().length > 0
        ? ` AND (c.nombre ILIKE $2 OR c.numero ILIKE $2)`
        : "";
    if (search && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
    }

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
       ORDER BY c.ultima_visita DESC NULLS LAST`,
      params
    );

    return { clientes: rows, error: null };
  } catch (e) {
    console.error("[getClientes]", e);
    return { clientes: [], error: "Error cargando clientes" };
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
