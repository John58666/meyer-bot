"use server"

import { auth } from "@/auth"
import { getAuditLogs } from "@/lib/audit"
import {
  getEquipo,
  getActiveProfessionals,
} from "@/lib/actions"
import type { MiembroEquipo } from "@/lib/actions"
import type { AuditLogEntry, AuditLogFilters } from "@/lib/audit-types"

export type { AuditLogEntry, AuditLogFilters, MiembroEquipo }

export async function getAuditLogsV2(
  businessId: number,
  filters: { accion?: string; userId?: number; desde?: string; hasta?: string; page: number }
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", entries: [], total: 0, pages: 1 }
  if (session.user.businessId !== businessId) return { error: "No autorizado", entries: [], total: 0, pages: 1 }
  try {
    const result = await getAuditLogs(businessId, filters)
    return { entries: result.entries, total: result.total, pages: result.pages }
  } catch {
    return { error: "Error al cargar auditoría", entries: [], total: 0, pages: 1 }
  }
}

export async function getAuditUsersV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", miembros: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", miembros: [] }
  try {
    const res = await getEquipo(businessId)
    return { miembros: res.miembros, error: res.error }
  } catch {
    return { error: "Error al cargar usuarios", miembros: [] }
  }
}

export async function getAuditProfessionalsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", professionals: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", professionals: [] }
  try {
    const professionals = await getActiveProfessionals(businessId)
    return { professionals }
  } catch {
    return { error: "Error al cargar profesionales", professionals: [] }
  }
}
