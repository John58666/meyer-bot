"use server"

import { pool } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { auditar } from "@/lib/audit"

export interface BusinessProfile {
  id: number
  name: string
  slug: string
  whatsapp_instance: string
  owner_number: string
  timezone: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  tax_id: string | null
  currency: string
  allow_flexible_staff_hours: boolean
  min_booking_notice_hours: number
  logo_url: string | null
  multi_professional: boolean
}

export interface BusinessProfileInput {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  description?: string | null
  tax_id?: string | null
  currency?: string
  allow_flexible_staff_hours?: boolean
  min_booking_notice_hours?: number
  logo_url?: string | null
}

export async function getBusinessProfile(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const { rows } = await pool.query<BusinessProfile>(
      `SELECT id, name, slug, whatsapp_instance, owner_number, timezone,
              address, phone, email, description, tax_id, currency,
              allow_flexible_staff_hours, min_booking_notice_hours, logo_url,
              multi_professional
       FROM businesses WHERE id = $1`,
      [businessId]
    )
    if (rows.length === 0) return { error: "Negocio no encontrado" }
    return { profile: rows[0] }
  } catch (e) {
    console.error("[getBusinessProfile]", e)
    return { error: "Error al cargar el perfil" }
  }
}

export async function updateBusinessProfile(businessId: number, data: BusinessProfileInput) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" }

  if (!data.name?.trim()) return { error: "El nombre del negocio es obligatorio" }

  try {
    await pool.query(
      `UPDATE businesses SET
        name = $1,
        address = $2,
        phone = $3,
        email = $4,
        description = $5,
        tax_id = $6,
        currency = $7,
        allow_flexible_staff_hours = $8,
        min_booking_notice_hours = $9,
        logo_url = $10
       WHERE id = $11`,
      [
        data.name.trim(),
        data.address ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.description ?? null,
        data.tax_id?.trim() ?? null,
        data.currency ?? "COP",
        data.allow_flexible_staff_hours ?? true,
        data.min_booking_notice_hours ?? 24,
        data.logo_url ?? null,
        businessId,
      ]
    )

    auditar(
      businessId,
      parseInt(session.user.id),
      "update_business_profile",
      "business",
      businessId,
      { name: data.name.trim() }
    )

    revalidatePath("/dashboard/configuracion")
    return { ok: true }
  } catch (e) {
    console.error("[updateBusinessProfile]", e)
    return { error: "Error al guardar el perfil" }
  }
}
