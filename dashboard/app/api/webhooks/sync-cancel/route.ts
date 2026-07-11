import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { appointmentId?: number; businessId?: number };
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
    // Obtener datos de la cita cancelada para auditoría
    const { rows: apt } = await pool.query(
      `SELECT nombre, servicio, fecha::text, hora::text, estado, professional_id
       FROM appointments WHERE id = $1 AND business_id = $2`,
      [appointmentId, businessId],
    );

    if (apt.length === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Escribir en audit_log (user_id = null = vía n8n/WhatsApp)
    await pool.query(
      `INSERT INTO audit_log (business_id, user_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, NULL, 'cancel_appointment', 'appointment', $2, $3)`,
      [
        businessId,
        appointmentId,
        JSON.stringify({
          nombre: apt[0].nombre,
          servicio: apt[0].servicio,
          fecha: apt[0].fecha,
          origen: "whatsapp",
          professional_id: apt[0].professional_id,
        }),
      ],
    );

    // Revalidar rutas del dashboard para refrescar cache
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook sync-cancel]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
