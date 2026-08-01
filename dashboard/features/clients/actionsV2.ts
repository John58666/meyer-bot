"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { auditar } from "@/lib/audit"
import {
  getClientes,
  getClienteHistorial,
} from "@/lib/actions"
import type { Cliente } from "@/lib/actions"


export interface ClienteFull extends Cliente {
  email: string | null
  direccion: string | null
  notas: string | null
}

export interface ClienteInput {
  nombre: string
  numero: string
  email?: string
  direccion?: string
  notas?: string
}

export async function getClientesV2(businessId: number, search?: string) {
  const session = await auth()
  if (!session) return { error: "No autenticado", clientes: [] }
  if (session.user.businessId !== businessId) return { error: "No autorizado", clientes: [] }

  try {
    return getClientes(businessId, search)
  } catch {
    return { error: "Error al cargar clientes", clientes: [] }
  }
}

export async function getClienteByIdV2(businessId: number, clienteId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  try {
    const { rows } = await pool.query<ClienteFull>(
      `SELECT id, numero, nombre, total_visitas, ultima_visita::text, primera_visita::text,
              email, direccion, notas
       FROM customers
       WHERE id = $1 AND business_id = $2
       LIMIT 1`,
      [clienteId, businessId]
    )
    if (rows.length === 0) return { error: "Cliente no encontrado" }
    return { cliente: rows[0] }
  } catch {
    return { error: "Error al cargar cliente" }
  }
}

export async function getClienteHistorialV2(businessId: number, clienteId: number) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  try {
    return getClienteHistorial(businessId, clienteId)
  } catch {
    return { error: "Error al cargar historial" }
  }
}

export async function createClienteV2(businessId: number, data: ClienteInput) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  const nombre = data.nombre?.trim()
  const numero = data.numero?.trim()

  if (!nombre || !numero) return { error: "Nombre y teléfono son obligatorios" }

  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO customers (business_id, numero, nombre, email, direccion, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (business_id, numero)
       DO UPDATE SET nombre = $3, email = $4, direccion = $5, notas = $6
       RETURNING id`,
      [businessId, numero, nombre, data.email ?? null, data.direccion ?? null, data.notas ?? null]
    )
    const clienteId = rows[0].id
    auditar(businessId, parseInt(session.user.id), "create_cliente", "cliente", clienteId, {
      nombre, numero, email: data.email ?? null, direccion: data.direccion ?? null,
    })
    return { ok: true, id: clienteId }
  } catch (e) {
    console.error("[createClienteV2]", e)
    return { error: "Error al crear el cliente" }
  }
}

export async function updateClienteV2(businessId: number, clienteId: number, data: ClienteInput) {
  const session = await auth()
  if (!session) return { error: "No autenticado" }
  if (session.user.businessId !== businessId) return { error: "No autorizado" }

  const nombre = data.nombre?.trim()
  const numero = data.numero?.trim()

  if (!nombre || !numero) return { error: "Nombre y teléfono son obligatorios" }

  try {
    const { rowCount } = await pool.query(
      `UPDATE customers
       SET nombre = $1, numero = $2, email = $3, direccion = $4, notas = $5
       WHERE id = $6 AND business_id = $7`,
      [nombre, numero, data.email ?? null, data.direccion ?? null, data.notas ?? null, clienteId, businessId]
    )
    if (rowCount === 0) return { error: "Cliente no encontrado" }
    auditar(businessId, parseInt(session.user.id), "update_cliente", "cliente", clienteId, {
      nombre, numero, email: data.email ?? null, direccion: data.direccion ?? null,
    })
    return { ok: true }
  } catch (e) {
    console.error("[updateClienteV2]", e)
    return { error: "Error al actualizar el cliente" }
  }
}
