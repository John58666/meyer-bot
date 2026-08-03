import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { pool } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autenticado", services: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get("businessId") || "")
  const professionalId = parseInt(searchParams.get("professionalId") || "")

  if (!businessId || !professionalId) {
    return NextResponse.json({ error: "businessId y professionalId requeridos", services: [] }, { status: 400 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.price, s.duration_minutes
       FROM services s
       JOIN professional_services ps ON ps.service_id = s.id AND ps.professional_id = $1
       WHERE s.business_id = $2 AND s.active = true AND ps.is_active = true
       ORDER BY s.name`,
      [professionalId, businessId]
    )
    return NextResponse.json({ services: rows })
  } catch {
    return NextResponse.json({ error: "Error al cargar servicios", services: [] }, { status: 500 })
  }
}
