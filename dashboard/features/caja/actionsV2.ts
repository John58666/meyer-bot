"use server"

import { auth } from "@/auth"
import { getServices } from "@/lib/services"
import { getProductsV2 } from "@/features/inventory/actionsV2"
import { getPaymentMethods } from "@/features/config-payments/actionsV2"
import type { ServiceRow } from "@/lib/services"
import type { Product } from "@/features/inventory/actionsV2"

export async function getCatalogServicesV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", services: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", services: [] }
  try {
    const rows = await getServices(businessId)
    return { services: rows }
  } catch {
    return { error: "Error al cargar servicios", services: [] }
  }
}

export async function getCatalogProductsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", products: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", products: [] }
  try {
    const res = await getProductsV2(businessId)
    return { products: res.products.filter(p => p.active && p.current_stock > 0) }
  } catch {
    return { error: "Error al cargar productos", products: [] }
  }
}

export async function getPaymentMethodsV2(businessId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado", methods: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", methods: [] }
  try {
    const methods = await getPaymentMethods(businessId)
    return { methods: methods.methods?.filter(m => m.is_active) ?? [] }
  } catch {
    return { error: "Error al cargar métodos de pago", methods: [] }
  }
}
