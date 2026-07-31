"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { getWeekAppointments, getAppointmentsByMonth } from "@/lib/appointments"
import { getServices } from "@/lib/services"
import {
  getActiveProfessionals,
  getClientes,
  getAvailableSlots,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  createBloqueo,
} from "@/lib/actions"
import type { WeekAppointment, AppointmentRow } from "@/lib/appointments"
import type { ServiceRow } from "@/lib/services"
import type { Cliente } from "@/lib/actions"

export type { WeekAppointment, ServiceRow, Cliente, AppointmentRow }

export type Professional = { id: number; name: string }

export async function getWeekAppointmentsV2(
  businessId: number,
  professionalId?: number | null
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", appointments: {} as Record<string, WeekAppointment[]> }
  if (session.user.businessId !== businessId) return { error: "No autorizado", appointments: {} as Record<string, WeekAppointment[]> }

  try {
    const appointments = await getWeekAppointments(businessId, professionalId)
    return { appointments }
  } catch {
    return { error: "Error al cargar las citas de la semana", appointments: {} as Record<string, WeekAppointment[]> }
  }
}

export async function getAppointmentsByMonthV2(
  businessId: number,
  year: number,
  month: number,
  professionalId?: number | null
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", appointments: [] as AppointmentRow[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", appointments: [] as AppointmentRow[] }

  try {
    const rows = await getAppointmentsByMonth(businessId, year, month, professionalId)
    return { appointments: rows }
  } catch {
    return { error: "Error al cargar las citas del mes", appointments: [] as AppointmentRow[] }
  }
}

export async function getProfessionalsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", professionals: [] as Professional[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", professionals: [] as Professional[] }

  try {
    const rows = await getActiveProfessionals(businessId)
    return { professionals: rows as Professional[] }
  } catch {
    return { error: "Error al cargar profesionales", professionals: [] as Professional[] }
  }
}

export async function getClientesV2(businessId: number, search?: string) {
  const session = await auth()
  if (!session) return { error: "No autenticado", clientes: [] as Cliente[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", clientes: [] as Cliente[] }

  try {
    return getClientes(businessId, search)
  } catch {
    return { error: "Error al buscar clientes", clientes: [] as Cliente[] }
  }
}

export async function getServicesV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", services: [] as ServiceRow[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", services: [] as ServiceRow[] }

  try {
    const rows = await getServices(businessId)
    return { services: rows }
  } catch {
    return { error: "Error al cargar servicios", services: [] as ServiceRow[] }
  }
}

export async function getAvailableSlotsV2(
  businessId: number,
  fecha: string,
  professionalId?: number | null
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", slots: [] as string[] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", slots: [] as string[] }

  try {
    const slots = await getAvailableSlots(businessId, fecha, professionalId)
    return { slots }
  } catch {
    return { error: "Error al cargar slots disponibles", slots: [] as string[] }
  }
}

export async function createAppointmentV2(formData: FormData) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const result = await createAppointment(formData)
    return result
  } catch {
    return { error: "Error al crear la cita" }
  }
}

export async function updateAppointmentStatusV2(
  id: number,
  estado: "Completada" | "Cancelada" | "Pendiente"
) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const result = await updateAppointmentStatus(id, estado)
    return result
  } catch {
    return { error: "Error al actualizar la cita" }
  }
}

export async function rescheduleAppointmentV2(
  id: number,
  fecha: string,
  hora: string
) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const result = await rescheduleAppointment(id, fecha, hora)
    return result
  } catch {
    return { error: "Error al reagendar la cita" }
  }
}

export async function getBusinessNameV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", name: "" }
  if (session.user.businessId !== businessId) return { error: "No autorizado", name: "" }

  try {
    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM businesses WHERE id = $1`,
      [businessId]
    )
    return { name: rows[0]?.name ?? "" }
  } catch {
    return { error: "Error al cargar datos del negocio", name: "" }
  }
}

export async function createBloqueoV2(data: {
  businessId: number
  professionalId?: number | null
  fecha: string
  tipo: "cerrado" | "horario_especial"
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
}) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const result = await createBloqueo(data)
    return result as { ok: true } | { error: string }
  } catch {
    return { error: "Error al crear el bloqueo" }
  }
}
