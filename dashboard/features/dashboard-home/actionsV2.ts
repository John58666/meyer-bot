"use server"

import { auth } from "@/auth"
import { getMetricas, getMetricasDrawer } from "@/lib/actions"
import type { MetricasData, RangoMetricas } from "@/lib/actions"

export type { MetricasData, RangoMetricas }

export async function getMetricasV2(
  businessId: number,
  rango: RangoMetricas = "semana",
  professionalId?: number | null,
  fechaDesde?: string,
  fechaHasta?: string
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", data: null as MetricasData | null }
  if (session.user.businessId !== businessId) return { error: "No autorizado", data: null as MetricasData | null }

  try {
    const { data, error } = await getMetricas(businessId, rango, professionalId, fechaDesde, fechaHasta)
    return { data, error }
  } catch {
    return { error: "Error al cargar métricas", data: null as MetricasData | null }
  }
}

export async function getOcupacionHeatmapV2(
  businessId: number,
  professionalId?: number | null,
  rango?: RangoMetricas
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", grid: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", grid: [] }

  try {
    const { data, error } = await getMetricasDrawer(businessId, "ocupacion", {
      professionalId: professionalId ?? undefined,
      rango: rango ?? "semana",
    })
    if (error || !data) return { error: error ?? "Sin datos de ocupación", grid: [] }
    if (data.tipo === "ocupacion") return { grid: data.grid }
    return { grid: [] }
  } catch {
    return { error: "Error al cargar heatmap", grid: [] }
  }
}
