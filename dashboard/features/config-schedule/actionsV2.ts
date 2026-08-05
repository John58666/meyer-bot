"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import {
  getBloqueos,
  createBloqueo,
  deleteBloqueo,
  updateBloqueo,
  updateScheduleText,
  checkConflictosBloqueo,
  cancelAppointmentsAndNotify,
} from "@/lib/actions"
import type { ScheduleData, DaySchedule } from "@/lib/actions"


export type BloqueoRow = {
  id: number
  fecha: string
  tipo: "cerrado" | "horario_especial"
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
  professional_id: number | null
  professional_name: string | null
}

export async function getBusinessScheduleV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  try {
    const { rows } = await pool.query(
      `SELECT schedule_text FROM businesses WHERE id = $1`,
      [businessId]
    )
    const raw = rows[0]?.schedule_text
    const businessSchedule: ScheduleData =
      typeof raw === "string" ? JSON.parse(raw) : raw ?? {}
    return { schedule: businessSchedule }
  } catch {
    return { error: "Error al cargar el horario del negocio" }
  }
}

export async function saveBusinessScheduleV2(
  businessId: number,
  schedule: ScheduleData
) {
  return updateScheduleText(businessId, schedule)
}

export async function getBloqueosV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", bloqueos: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", bloqueos: [] }

  try {
    const isProfessional = session.user.role === "profesional"
    const professionalId = isProfessional ? session.user.professionalId : null
    const rows = await getBloqueos(businessId, professionalId, !isProfessional)
    return { bloqueos: rows }
  } catch {
    return { error: "Error al cargar bloqueos", bloqueos: [] }
  }
}

export async function createBloqueoV2(data: {
  businessId: number
  fecha: string
  tipo: "cerrado" | "horario_especial"
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
  professionalId?: number | null
}) {
  return createBloqueo(data)
}

export async function deleteBloqueoV2(id: number, businessId: number) {
  return deleteBloqueo(id, businessId)
}

export async function updateBloqueoV2(data: {
  id: number
  businessId: number
  fecha: string
  tipo: "cerrado" | "horario_especial"
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
  professionalId?: number | null
}) {
  return updateBloqueo(data)
}

export async function getProfessionalsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", professionals: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", professionals: [] }

  try {
    const { rows } = await pool.query<{ id: number; name: string }>(
      `SELECT p.id, p.name FROM professionals p
       WHERE p.business_id = $1 AND p.active = true
         AND NOT EXISTS (
           SELECT 1 FROM users u
           WHERE u.professional_id = p.id AND u.role IN ('admin','owner')
         )
       ORDER BY p.name`,
      [businessId]
    )
    return { professionals: rows }
  } catch {
    return { error: "Error al cargar profesionales", professionals: [] }
  }
}

export async function checkBloqueoConflictosV2(
  businessId: number,
  fecha: string,
  professionalId?: number | null
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", conflicts: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", conflicts: [] }

  try {
    const conflicts = await checkConflictosBloqueo(
      businessId,
      fecha,
      professionalId
    )
    return { conflicts }
  } catch {
    return { error: "Error al verificar conflictos", conflicts: [] }
  }
}

export async function cancelAppsAndNotifyV2(
  businessId: number,
  appointmentIds: number[],
  motivo?: string
) {
  return cancelAppointmentsAndNotify(businessId, appointmentIds, motivo)
}
