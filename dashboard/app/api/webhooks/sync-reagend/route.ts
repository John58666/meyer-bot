import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { describirDetalle } from "@/lib/audit-types";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    appointmentId?: number;
    businessId?: number;
    servicio?: string;
    fecha?: string;
    hora?: string;
    nombre?: string;
    estado?: string;
    professional_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { appointmentId, businessId } = body;
  if (!appointmentId || !businessId) {
    return NextResponse.json({ error: "appointmentId y businessId requeridos" }, { status: 400 });
  }

  try {
    const { rows: apt } = await pool.query(
      `SELECT a.nombre, a.servicio, a.fecha::text, a.hora::text, a.estado,
              COALESCE(p.name, '') as professional_name
       FROM appointments a
       LEFT JOIN professionals p ON a.professional_id = p.id
       WHERE a.id = $1 AND a.business_id = $2`,
      [appointmentId, businessId],
    );

    if (apt.length === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const a = apt[0];

    const detalle = {
      nombre: a.nombre || body.nombre || "",
      servicio: a.servicio || body.servicio || "",
      fecha: a.fecha || body.fecha || "",
      hora: a.hora || body.hora || "",
      estado: a.estado || body.estado || "Pendiente",
      professional_name: a.professional_name || body.professional_name || "",
      origen: "whatsapp",
    };

    await pool.query(
      `INSERT INTO audit_log (business_id, user_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, NULL, 'reschedule_appointment', 'appointment', $2, $3)`,
      [businessId, appointmentId, JSON.stringify(detalle)],
    );

    const descripcion = describirDetalle("reschedule_appointment", detalle).join(" | ");
    await pool.query(
      `INSERT INTO notifications (business_id, user_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, NULL, 'reschedule_appointment', 'appointment', $2, $3)`,
      [businessId, appointmentId, descripcion || null],
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");

    return NextResponse.json({ ok: true });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[webhook sync-reagend]", e);
    try {
      await pool.query(
        `INSERT INTO webhook_dead_letter (business_id, event_type, appointment_id, payload, error_message)
         VALUES ($1, 'sync-reagend', $2, $3, $4)`,
        [businessId, appointmentId, JSON.stringify(body), errMsg],
      );
    } catch (_) { /* silent */ }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
