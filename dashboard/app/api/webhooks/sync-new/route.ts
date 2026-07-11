import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

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
    await pool.query(
      `INSERT INTO audit_log (business_id, user_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, NULL, 'create_appointment', 'appointment', $2, $3)`,
      [
        businessId,
        appointmentId,
        JSON.stringify({
          nombre: body.nombre || "",
          servicio: body.servicio || "",
          fecha: body.fecha || "",
          hora: body.hora || "",
          estado: body.estado || "Pendiente",
          professional_name: body.professional_name || "",
          origen: "whatsapp",
        }),
      ],
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook sync-new]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
