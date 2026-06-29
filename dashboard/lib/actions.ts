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
