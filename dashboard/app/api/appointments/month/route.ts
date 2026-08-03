import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAppointmentsByMonth } from "@/lib/appointments"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autenticado", appointments: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get("businessId") || "")
  const year = parseInt(searchParams.get("year") || "")
  const month = parseInt(searchParams.get("month") || "")
  const professionalId = searchParams.get("professionalId")

  if (!businessId || !year || !month) {
    return NextResponse.json({ error: "Parámetros requeridos", appointments: [] }, { status: 400 })
  }

  if (session.user.businessId !== businessId) {
    return NextResponse.json({ error: "No autorizado", appointments: [] }, { status: 403 })
  }

  try {
    const rows = await getAppointmentsByMonth(
      businessId, year, month,
      professionalId ? parseInt(professionalId) : null
    )
    return NextResponse.json({ appointments: rows })
  } catch {
    return NextResponse.json({ error: "Error al cargar citas", appointments: [] }, { status: 500 })
  }
}
