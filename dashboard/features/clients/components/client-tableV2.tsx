"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getClientesV2 } from "../actionsV2"
import { getInitials, formatDate } from "@/lib/utils"
import type { Cliente } from "@/lib/actions"
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  SearchX,
  Users,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react"
import { ClientDetailDrawerV2 } from "./client-detail-drawerV2"
import { NewClientModalV2 } from "./new-client-modalV2"

interface Props {
  businessId: number
}

export function ClientTableV2({ businessId }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (searchTerm?: string) => {
    setError("")
    setLoading(true)
    try {
      const res = await getClientesV2(businessId, searchTerm)
      if (res.clientes) setClientes(res.clientes)
      if (res.error) setError(res.error)
    } catch {
      setError("Error al cargar clientes")
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (search.length < 2 && search.length > 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true)
    searchTimerRef.current = setTimeout(() => {
      loadData(search || undefined)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search, loadData])

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedCliente(null)
  }

  const handleOpenCreate = () => {
    setEditingCliente(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (c: Cliente) => {
    setEditingCliente(c)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingCliente(null)
  }

  const handleModalSuccess = () => {
    loadData(search || undefined)
  }

  const getStatusLabel = (c: Cliente) => {
    if (!c.ultima_visita) return "Nuevo"
    const lastDate = new Date(c.ultima_visita + "T00:00:00")
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    return lastDate < ninetyDaysAgo ? "Inactivo" : "Activo"
  }

  if (loading && clientes.length === 0) {
    return (
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-9 w-64 rounded-lg bg-zf-border/30 animate-pulse" />
          <div className="h-9 w-36 rounded-lg bg-zf-border/20 animate-pulse" />
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-zf-border/20" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-error-bg">
            <AlertCircle className="h-7 w-7 text-zf-error-text" />
          </div>
          <p className="text-sm font-semibold text-zf-error-text">{error}</p>
          <button
            type="button"
            onClick={() => loadData()}
            className="rounded-xl bg-zf-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zf-text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zf-border bg-white py-2.5 pl-10 pr-3 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zf-text-muted" />
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-lg bg-zf-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Cliente
          </button>
        </div>

        <div className="rounded-xl border border-zf-border/50 bg-zf-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Users className="h-4 w-4 text-zf-accent-text" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zf-text">
                {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-zf-text-secondary">
                {search ? "Resultados de búsqueda" : "Total registrados"}
              </p>
            </div>
          </div>
        </div>

        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
              <SearchX className="h-6 w-6 text-zf-text-muted" />
            </div>
            <p className="text-sm font-medium text-zf-text-secondary">
              {search ? "Sin resultados para la búsqueda" : "Aún no hay clientes registrados"}
            </p>
            {!search && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 rounded-xl bg-zf-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                Registrar primer cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zf-border/50 bg-zf-surface">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zf-border/30 bg-zf-bg/50 text-[10px] font-bold uppercase text-zf-text-secondary">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Última visita</th>
                  <th className="px-5 py-3 text-center">Visitas</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zf-border/10">
                {clientes.map((c) => {
                  const status = getStatusLabel(c)
                  const isInactive = status === "Inactivo"
                  const isNuevo = status === "Nuevo"
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCliente(c)}
                      className="cursor-pointer transition-colors hover:bg-zf-accent-bg/15"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zf-accent-bg text-xs font-bold text-zf-accent-text">
                            {getInitials(c.nombre)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zf-text">{c.nombre}</p>
                            <p className="text-xs text-zf-text-secondary">{c.numero}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-zf-text-secondary">
                          <Phone className="h-3 w-3" />
                          {c.numero}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-zf-text-secondary">
                          {formatDate(c.ultima_visita)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-semibold text-zf-text">
                          {c.total_visitas}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={[
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            isNuevo
                              ? "bg-zf-accent-bg text-zf-accent-text"
                              : isInactive
                                ? "bg-zf-neutral-bg text-zf-text-muted"
                                : "bg-zf-success-bg text-zf-success-text",
                          ].join(" ")}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`https://wa.me/${c.numero.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-success-text transition-colors hover:bg-zf-success-bg"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(c) }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-secondary transition-colors hover:bg-zf-accent-bg hover:text-zf-accent-text"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCliente && (
        <ClientDetailDrawerV2
          open={drawerOpen}
          onClose={handleCloseDrawer}
          cliente={selectedCliente}
          businessId={businessId}
          onEdit={() => handleOpenEdit(selectedCliente)}
        />
      )}

      {modalOpen && (
        <NewClientModalV2
          open={modalOpen}
          onClose={handleCloseModal}
          businessId={businessId}
          cliente={editingCliente}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}
