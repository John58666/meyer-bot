"use server"

import { getAllServices, createService, updateService, toggleServiceActive, deleteService } from "@/lib/services"
import { auth } from "@/auth"
import type { ServiceRow, ServiceInput } from "@/lib/services"


export { createService, updateService, toggleServiceActive, deleteService }

export async function getServicesV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }
  try {
    const services = await getAllServices(businessId)
    return { services }
  } catch {
    return { error: "Error al cargar servicios" }
  }
}
