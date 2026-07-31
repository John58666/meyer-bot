"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { auditar } from "@/lib/audit"

export interface Product {
  id: number
  business_id: number
  sku: string | null
  name: string
  description: string | null
  category: string | null
  product_type: string
  cost_price: number
  sale_price: number | null
  current_stock: number
  min_stock_alert: number
  iva_included: boolean
  iva_percentage: number
  supplier: string | null
  active: boolean
}

export interface ProductInput {
  sku?: string | null
  name: string
  description?: string | null
  category?: string | null
  product_type?: "retail" | "supply"
  cost_price: number
  sale_price?: number | null
  current_stock?: number
  min_stock_alert?: number
  iva_included?: boolean
  iva_percentage?: number
  supplier?: string | null
}

export async function getProductsV2(
  businessId: number,
  search?: string,
  productType?: string,
  page = 1
) {
  const session = await auth()
  if (!session) return { error: "No autenticado", products: [] as Product[], total: 0, pages: 0, lowStock: 0, noStock: 0, inventoryValue: 0 }
  if (session.user.businessId !== businessId) return { error: "No autorizado", products: [] as Product[], total: 0, pages: 0, lowStock: 0, noStock: 0, inventoryValue: 0 }

  const limit = 10
  const offset = (page - 1) * limit

  try {
    const params: (string | number)[] = [businessId]
    const conditions: string[] = ["p.business_id = $1"]

    if (search?.trim()) {
      params.push(`%${search.trim()}%`)
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`)
    }
    if (productType && productType !== "all") {
      params.push(productType)
      conditions.push(`p.product_type = $${params.length}`)
    }

    const whereClause = conditions.join(" AND ")

    const statsQuery = pool.query(
      `SELECT COUNT(*)::int AS total_stats,
              COUNT(*) FILTER (WHERE current_stock <= min_stock_alert AND current_stock > 0)::int AS low_stock,
              COUNT(*) FILTER (WHERE current_stock <= 0)::int AS no_stock,
              COALESCE(SUM(cost_price * current_stock), 0)::float AS inventory_value
       FROM products WHERE business_id = $1`, [businessId]
    )

    const countQuery = pool.query<{ count: string }>(
      `SELECT COUNT(*)::int FROM products p WHERE ${whereClause}`, params
    )

    const [statsResult, countResult] = await Promise.all([statsQuery, countQuery])

    const total = parseInt(countResult.rows[0]?.count ?? "0")

    const { rows } = await pool.query<Product>(
      `SELECT p.* FROM products p
       WHERE ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const s = statsResult.rows[0] ?? { low_stock: 0, no_stock: 0, inventory_value: 0 }

    return {
      products: rows, total, pages: Math.ceil(total / limit),
      lowStock: parseInt(s.low_stock ?? "0"), noStock: parseInt(s.no_stock ?? "0"),
      inventoryValue: parseFloat(s.inventory_value ?? "0"),
    }
  } catch {
    return { error: "Error al cargar productos", products: [] as Product[], total: 0, pages: 0, lowStock: 0, noStock: 0, inventoryValue: 0 }
  }
}

export async function createProductV2(businessId: number, data: ProductInput) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  const name = data.name?.trim()
  if (!name) return { error: "El nombre es obligatorio" }
  if (!data.cost_price && data.cost_price !== 0 || data.cost_price < 0) return { error: "El costo de compra debe ser ≥ 0" }

  const isSupply = data.product_type === "supply"
  const salePrice = isSupply ? null : (data.sale_price ?? null)
  const ivaIncluded = isSupply ? false : (data.iva_included ?? true)
  const ivaPercentage = isSupply ? 0 : (data.iva_percentage ?? 0)

  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO products (business_id, sku, name, description, category, product_type, cost_price, sale_price, current_stock, min_stock_alert, iva_included, iva_percentage, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [businessId, data.sku || null, name, data.description || null, data.category || null,
       isSupply ? "supply" : "retail", data.cost_price, salePrice,
       data.current_stock ?? 0, data.min_stock_alert ?? 5,
       ivaIncluded, ivaPercentage, data.supplier || null]
    )

    auditar(businessId, parseInt(session.user.id), "create_product", "product", rows[0].id, {
      name, product_type: isSupply ? "supply" : "retail", cost_price: data.cost_price,
    })
    return { ok: true, id: rows[0].id }
  } catch (e) {
    console.error("[createProductV2]", e)
    return { error: "Error al crear el producto" }
  }
}

export async function updateProductV2(businessId: number, productId: number, data: ProductInput) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  const name = data.name?.trim()
  if (!name) return { error: "El nombre es obligatorio" }
  if (data.cost_price != null && data.cost_price < 0) return { error: "El costo de compra debe ser ≥ 0" }

  try {
    const { rows: existing } = await pool.query<Product>(
      `SELECT * FROM products WHERE id = $1 AND business_id = $2`, [productId, businessId]
    )
    if (existing.length === 0) return { error: "Producto no encontrado" }

    const current = existing[0]
    const isSupply = (data.product_type ?? current.product_type) === "supply"
    const salePrice = isSupply ? null : (data.sale_price ?? current.sale_price)
    const ivaIncluded = isSupply ? false : (data.iva_included ?? current.iva_included)
    const ivaPercentage = isSupply ? 0 : (data.iva_percentage ?? current.iva_percentage)

    await pool.query(
      `UPDATE products SET name = $1, sku = $2, description = $3, category = $4,
       product_type = $5, cost_price = $6, sale_price = $7, current_stock = $8,
       min_stock_alert = $9, iva_included = $10, iva_percentage = $11,
       supplier = $12, updated_at = NOW()
       WHERE id = $13 AND business_id = $14`,
      [name, data.sku ?? current.sku, data.description ?? current.description,
       data.category ?? current.category, isSupply ? "supply" : "retail",
       data.cost_price ?? current.cost_price, salePrice,
       data.current_stock ?? current.current_stock,
       data.min_stock_alert ?? current.min_stock_alert,
       ivaIncluded, ivaPercentage, data.supplier ?? current.supplier,
       productId, businessId]
    )

    auditar(businessId, parseInt(session.user.id), "update_product", "product", productId, {
      name, product_type: isSupply ? "supply" : "retail",
    })
    return { ok: true }
  } catch (e) {
    console.error("[updateProductV2]", e)
    return { error: "Error al actualizar el producto" }
  }
}

export async function toggleProductActiveV2(businessId: number, productId: number, active: boolean) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  try {
    const { rowCount } = await pool.query(
      `UPDATE products SET active = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
      [active, productId, businessId]
    )
    if (rowCount === 0) return { error: "Producto no encontrado" }

    auditar(businessId, parseInt(session.user.id), "toggle_product", "product", productId, {
      active,
    })
    return { ok: true }
  } catch {
    return { error: "Error al cambiar el estado del producto" }
  }
}

export async function deleteProductV2(businessId: number, productId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM products WHERE id = $1 AND business_id = $2`,
      [productId, businessId]
    )
    if (rowCount === 0) return { error: "Producto no encontrado" }

    auditar(businessId, parseInt(session.user.id), "delete_product", "product", productId, null)
    return { ok: true }
  } catch {
    return { error: "Error al eliminar el producto" }
  }
}
