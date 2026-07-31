"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"

export interface EmployeeStats {
  completadas: number
  canceladas: number
  total: number
  ingresos: number
}

export interface EmployeeReview {
  id: number
  rating: number
  comment: string | null
  customerName: string
  created_at: string
}

export async function getEmployeeStatsV2(businessId: number, professionalId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", stats: null as EmployeeStats | null }
  if (session.user.businessId !== businessId) return { error: "No autorizado", stats: null as EmployeeStats | null }

  try {
    const { rows: statsRows } = await pool.query<{ completadas: number; canceladas: number; total: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE estado = 'Completada')::int AS completadas,
         COUNT(*) FILTER (WHERE estado = 'Cancelada')::int AS canceladas,
         COUNT(*)::int AS total
       FROM appointments
       WHERE business_id = $1 AND professional_id = $2
         AND fecha >= date_trunc('month', CURRENT_DATE)`,
      [businessId, professionalId]
    )

    const { rows: revenueRows } = await pool.query<{ ingresos: number }>(
      `SELECT COALESCE(SUM(s.price), 0)::numeric(12,2)::float AS ingresos
       FROM appointments a
       JOIN services s ON s.name = a.servicio AND s.business_id = a.business_id
       WHERE a.business_id = $1 AND a.professional_id = $2
         AND a.estado = 'Completada'
         AND a.fecha >= date_trunc('month', CURRENT_DATE)`,
      [businessId, professionalId]
    )

    return {
      stats: {
        ...statsRows[0],
        ingresos: revenueRows[0]?.ingresos ?? 0,
      },
    }
  } catch {
    return { error: "Error al cargar estadísticas", stats: null as EmployeeStats | null }
  }
}

export async function getEmployeeReviewsV2(businessId: number, professionalId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", reviews: [] as EmployeeReview[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", reviews: [] as EmployeeReview[] }

  try {
    const { rows } = await pool.query<EmployeeReview>(
      `SELECT r.id, r.rating, r.comment, c.nombre AS "customerName", r.created_at::text
       FROM reviews r
       JOIN customers c ON c.id = r.customer_id
       WHERE r.business_id = $1 AND r.professional_id = $2
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [businessId, professionalId]
    )
    return { reviews: rows }
  } catch {
    return { error: "Error al cargar reseñas", reviews: [] as EmployeeReview[] }
  }
}
