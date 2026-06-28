"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

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
