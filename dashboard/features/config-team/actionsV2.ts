"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import {
  getEquipo,
  createMiembroEquipo,
  updateMiembroCredenciales,
  toggleMiembroActivo,
  updateMiembroRole,
  deleteTeamMember,
  getFutureAppointmentsForProfessional,
  cancelAppointmentsAndNotify,
  getProfessionalSchedule,
  updateProfessionalSchedule,
  deleteProfessionalSchedule,
} from "@/lib/actions"
import { getAllServices, getProfessionalServices, setProfessionalServices } from "@/lib/services"
import type { MiembroEquipo, DaySchedule, ScheduleData } from "@/lib/actions"

export type { MiembroEquipo, DaySchedule, ScheduleData }

export { createMiembroEquipo, updateMiembroCredenciales }

export async function updateTeamMemberRoleV2(
  userId: number,
  businessId: number,
  role: "admin" | "profesional"
) {
  return updateMiembroRole(userId, businessId, role)
}

export async function getTeamV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", miembros: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", miembros: [] }
  try {
    const res = await getEquipo(businessId)
    return { miembros: res.miembros, error: res.error }
  } catch {
    return { error: "Error al cargar el equipo", miembros: [] }
  }
}

export async function toggleTeamMemberStatus(userId: number, businessId: number, active: boolean) {
  return toggleMiembroActivo(userId, businessId, active)
}

export async function deleteTeamMemberV2(userId: number, businessId: number) {
  return deleteTeamMember(userId, businessId)
}

export async function getFutureAppointmentsV2(businessId: number, professionalId: number) {
  return getFutureAppointmentsForProfessional(businessId, professionalId)
}

export async function cancelFutureAppointmentsV2(
  businessId: number,
  appointmentIds: number[],
  motivo?: string
) {
  return cancelAppointmentsAndNotify(businessId, appointmentIds, motivo)
}

export async function getTeamServicesV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", services: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", services: [] }
  try {
    const services = await getAllServices(businessId)
    return { services }
  } catch {
    return { error: "Error al cargar servicios", services: [] }
  }
}

export async function getTeamMemberServicesV2(businessId: number, professionalId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", serviceIds: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", serviceIds: [] }
  try {
    const serviceIds = await getProfessionalServices(businessId, professionalId)
    return { serviceIds }
  } catch {
    return { error: "Error al cargar servicios asignados", serviceIds: [] }
  }
}

export async function getTeamMemberServicesNamesV2(businessId: number, professionalId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", names: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", names: [] }
  try {
    const { rows } = await pool.query<{ name: string }>(
      `SELECT s.name
       FROM professional_services ps
       JOIN services s ON s.id = ps.service_id
       WHERE ps.professional_id = $1 AND s.business_id = $2 AND s.active = true
       ORDER BY s.name`,
      [professionalId, businessId]
    )
    return { names: rows.map((r) => r.name) }
  } catch {
    return { error: "Error al cargar especialidades", names: [] }
  }
}

export async function setTeamMemberServicesV2(professionalId: number, serviceIds: number[]) {
  return setProfessionalServices(professionalId, serviceIds)
}

export async function getTeamMemberScheduleV2(businessId: number, professionalId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", schedule: null, hasCustom: false, businessSchedule: {} }
  if (session.user.businessId !== businessId) return { error: "No autorizado", schedule: null, hasCustom: false, businessSchedule: {} }
  try {
    const bizResult = await pool.query(
      `SELECT schedule_text FROM businesses WHERE id = $1`,
      [businessId]
    )
    const rawBiz = bizResult.rows[0]?.schedule_text
    const businessSchedule: ScheduleData = typeof rawBiz === "string" ? JSON.parse(rawBiz) : (rawBiz ?? {})

    const schedule = await getProfessionalSchedule(businessId, professionalId)
    return { schedule, hasCustom: schedule != null, businessSchedule }
  } catch {
    return { error: "Error al cargar horario", schedule: null, hasCustom: false, businessSchedule: {} }
  }
}

export async function updateTeamMemberScheduleV2(
  businessId: number,
  professionalId: number,
  schedule: ScheduleData
) {
  return updateProfessionalSchedule(businessId, professionalId, schedule)
}

export async function resetTeamMemberScheduleV2(businessId: number, professionalId: number) {
  return deleteProfessionalSchedule(businessId, professionalId)
}
