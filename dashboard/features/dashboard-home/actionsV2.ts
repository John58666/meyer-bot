"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { getMetricas, getMetricasDrawer } from "@/lib/actions"
import type { MetricasData, RangoMetricas } from "@/lib/actions"

export interface Notification {
  id: number
  accion: string
  entidad: string
  detalle: string | null
  leida: boolean
  created_at: string
}

export async function getMetricasV2(
  businessId: number, rango: RangoMetricas = "semana",
  professionalId?: number | null, fechaDesde?: string, fechaHasta?: string
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", data: null }
  if (session.user.businessId !== businessId) return { error: "No autorizado", data: null }
  try { const { data, error } = await getMetricas(businessId, rango, professionalId, fechaDesde, fechaHasta); return { data, error } }
  catch { return { error: "Error al cargar métricas", data: null } }
}

export async function getOcupacionHeatmapV2(businessId: number, professionalId?: number | null, rango?: RangoMetricas) {
  const session = await auth()
  if (!session) return { error: "No autenticado", grid: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", grid: [] }
  try {
    const { data, error } = await getMetricasDrawer(businessId, "ocupacion", { professionalId: professionalId ?? undefined, rango: rango ?? "semana" })
    if (error || !data) return { error: error ?? "Sin datos", grid: [] }
    if (data.tipo === "ocupacion") return { grid: data.grid }
    return { grid: [] }
  } catch { return { error: "Error", grid: [] } }
}

export async function getNotificationsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", notifications: [] as Notification[], unread: 0 }
  try {
    const { rows } = await pool.query<Notification>(
      `SELECT id, accion, entidad, detalle, leida, created_at::text FROM notifications WHERE business_id = $1 ORDER BY created_at DESC LIMIT 10`, [businessId]
    )
    const { rows: cr } = await pool.query<{ count: string }>(`SELECT COUNT(*)::int FROM notifications WHERE business_id = $1 AND leida = false`, [businessId])
    return { notifications: rows, unread: parseInt(cr[0]?.count ?? "0") }
  } catch { return { error: "Error", notifications: [] as Notification[], unread: 0 } }
}

export async function markNotificationReadV2(id: number, businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  try { await pool.query(`UPDATE notifications SET leida = true WHERE id = $1 AND business_id = $2`, [id, businessId]); return { ok: true } }
  catch { return { error: "Error" } }
}
