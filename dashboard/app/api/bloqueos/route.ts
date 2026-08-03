import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autenticado", bloqueos: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get("businessId") || "")
  const professionalId = searchParams.get("professionalId")

  if (!businessId) {
    return NextResponse.json({ error: "businessId requerido", bloqueos: [] }, { status: 400 })
  }

  if (session.user.businessId !== businessId) {
    return NextResponse.json({ error: "No autorizado", bloqueos: [] }, { status: 403 })
  }

  try {
    const profId = professionalId ? parseInt(professionalId) : null
    const { rows } = await pool.query(
      `SELECT se.id, se.fecha::text, se.tipo, se.hora_inicio::text, se.hora_fin::text, se.motivo, se.professional_id, p.name AS professional_name
       FROM schedule_exceptions se
       LEFT JOIN professionals p ON se.professional_id = p.id
       WHERE se.business_id = $1
         AND se.deleted_at IS NULL
         AND ($2::int IS NULL OR se.professional_id IS NULL OR se.professional_id = $2)
       ORDER BY se.fecha DESC`,
      [businessId, profId]
    )
    return NextResponse.json({ bloqueos: rows })
  } catch {
    return NextResponse.json({ error: "Error al cargar bloqueos", bloqueos: [] }, { status: 500 })
  }
}
