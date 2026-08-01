"use server"

import { pool } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export interface PaymentMethod {
  id: number
  business_id: number
  name: string
  tipo: "cash" | "card" | "transfer" | "digital"
  instructions: Record<string, unknown> | null
  is_active: boolean
  created_at: string
}

export async function getPaymentMethods(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }

  try {
    const { rows } = await pool.query<PaymentMethod>(
      `SELECT id, business_id, name, tipo, instructions, is_active, created_at
       FROM payment_methods
       WHERE business_id = $1
       ORDER BY
         CASE tipo
           WHEN 'cash' THEN 1
           WHEN 'card' THEN 2
           WHEN 'transfer' THEN 3
           WHEN 'digital' THEN 4
         END, name`,
      [businessId]
    )
    return { methods: rows }
  } catch (e) {
    console.error("[getPaymentMethods]", e)
    return { error: "Error al cargar métodos de pago" }
  }
}

export async function togglePaymentMethod(id: number, businessId: number, isActive: boolean) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" }

  try {
    await pool.query(
      `UPDATE payment_methods SET is_active = $1 WHERE id = $2 AND business_id = $3`,
      [isActive, id, businessId]
    )

    revalidatePath("/dashboard/configuracion")
    return { ok: true }
  } catch (e) {
    console.error("[togglePaymentMethod]", e)
    return { error: "Error al actualizar método de pago" }
  }
}

export async function updatePaymentMethod(id: number, businessId: number, data: { name: string; tipo: string; instructions?: string }) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" }

  const name = data.name?.trim()
  if (!name) return { error: "El nombre es obligatorio" }

  try {
    await pool.query(
      `UPDATE payment_methods SET name = $1, tipo = $2, instructions = $3 WHERE id = $4 AND business_id = $5`,
      [name, data.tipo, data.instructions || null, id, businessId]
    )
    revalidatePath("/dashboard/configuracion")
    return { ok: true }
  } catch (e) {
    console.error("[updatePaymentMethod]", e)
    return { error: "Error al actualizar método de pago" }
  }
}
