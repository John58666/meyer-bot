"use client"

import { useState, useEffect, useTransition } from "react"
import { getServicesV2, createService, updateService, toggleServiceActive, deleteService, getProfessionalServicesV2, setProfessionalServices } from "@/features/config-services/actionsV2"
import type { ServiceRow, ServiceInput } from "@/lib/services"
import { getActiveProfessionals } from "@/lib/actions"
import { ModalV2 } from "@/components/shared/modalV2"
import { BadgeV2 } from "@/components/shared/badgeV2"
import { EmptyStateV2 } from "@/components/shared/empty-stateV2"
import { Plus, Pencil, Trash2, AlertCircle, Scissors } from "lucide-react"

interface ServicesListV2Props {
  businessId: number
}

export function ServicesListV2({ businessId }: ServicesListV2Props) {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formDuration, setFormDuration] = useState("30")
  const [formError, setFormError] = useState("")
  const [modalTab, setModalTab] = useState<"info" | "professionals">("info")
  const [professionals, setProfessionals] = useState<{ id: number; name: string }[]>([])
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set())

  function loadServices() {
    getServicesV2(businessId).then((res) => {
      if (res.services) setServices(res.services)
      else setError(res.error ?? "Error al cargar servicios")
      setLoading(false)
    })
  }

  useEffect(() => {
    loadServices()
  }, [businessId])

  function resetForm() {
    setFormName("")
    setFormPrice("")
    setFormDuration("30")
    setEditingId(null)
    setFormError("")
  }

  function openNew() {
    resetForm()
    setModalOpen(true)
  }

  function openEdit(svc: ServiceRow) {
    setFormName(svc.name)
    setFormPrice(String(svc.price))
    setFormDuration(String(svc.duration_minutes))
    setEditingId(svc.id)
    setFormError("")
    setModalOpen(true)
  }

  useEffect(() => {
    if (modalOpen) {
      setModalTab("info")
      getActiveProfessionals(businessId).then(async (profs) => {
        setProfessionals(profs)
        if (editingId) {
          const assigned = new Set<number>()
          for (const p of profs) {
            const serviceIds = await getProfessionalServicesV2(businessId, p.id)
            if ((serviceIds as number[]).includes(editingId)) assigned.add(p.id)
          }
          setAssignedIds(assigned)
        } else {
          setAssignedIds(new Set())
        }
      }).catch(() => {})
    }
  }, [modalOpen, editingId, businessId])

  function handleSaveForm() {
    setFormError("")

    if (!formName.trim()) {
      setFormError("El nombre del servicio es obligatorio")
      return
    }

    const price = parseInt(formPrice.replace(/\./g, ""))
    if (isNaN(price) || price <= 0) {
      setFormError("El precio debe ser un número válido mayor a 0")
      return
    }

    const duration = parseInt(formDuration)
    if (isNaN(duration) || duration < 15) {
      setFormError("La duración mínima es 15 minutos")
      return
    }
    if (duration > 480) {
      setFormError("La duración máxima es 480 minutos (8 horas)")
      return
    }

    const input: ServiceInput = {
      name: formName.trim(),
      price,
      duration_minutes: duration,
    }

    startTransition(async () => {
      if (editingId != null) {
        const res = await updateService(editingId, input)
        if (res.error) {
          setFormError(res.error)
          return
        }
      } else {
        const res = await createService(input)
        if (res.error) {
          setFormError(res.error)
          return
        }
      }
      setModalOpen(false)
      loadServices()
    })
  }

  function handleToggle(svc: ServiceRow) {
    setError("")
    startTransition(async () => {
      const res = await toggleServiceActive(svc.id, !svc.active)
      if (res.error) setError(res.error)
      else loadServices()
    })
  }

  function handleDelete(svc: ServiceRow) {
    if (!confirm(`¿Eliminar "${svc.name}"?`)) return
    setError("")
    startTransition(async () => {
      const res = await deleteService(svc.id)
      if (res.error) setError(res.error)
      else loadServices()
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 flex-1 rounded bg-zf-border/30" />
              <div className="h-4 w-16 rounded bg-zf-border/30" />
              <div className="h-4 w-16 rounded bg-zf-border/30" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zf-text-secondary">{services.length} servicio{services.length !== 1 ? "s" : ""}</p>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-full bg-zf-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Servicio
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyStateV2
          icon={Scissors}
          title="Sin servicios"
          description="Agrega tu primer servicio para empezar a recibir reservas."
          action={
            <button
              onClick={openNew}
              className="rounded-full bg-zf-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Agregar Servicio
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zf-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zf-border/50 bg-zf-bg">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zf-text-muted">Servicio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zf-text-muted">Duración</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zf-text-muted">Precio</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zf-text-muted">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zf-text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-b border-zf-border/30 transition-colors hover:bg-zf-accent-bg/30">
                  <td className="px-4 py-3 font-medium text-zf-text">{svc.name}</td>
                  <td className="px-4 py-3 text-right text-zf-text-secondary">{svc.duration_minutes} min</td>
                  <td className="px-4 py-3 text-right font-semibold text-zf-accent-text">
                    ${svc.price.toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(svc)}>
                      {svc.active ? (
                        <BadgeV2 variant="success">Activo</BadgeV2>
                      ) : (
                        <BadgeV2 variant="neutral">Inactivo</BadgeV2>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(svc)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zf-accent-bg hover:text-zf-accent-text"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(svc)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zf-error-bg hover:text-zf-error-text"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-zf-error-text">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <ModalV2
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId != null ? "Editar Servicio" : "Nuevo Servicio"}
      >
        <div className="-mx-6 -mt-4 mb-0 border-b border-zf-border/40">
          <div className="flex px-6 pt-2">
            <button type="button" onClick={() => setModalTab("info")} className={["px-4 py-2.5 text-sm font-semibold transition-all", modalTab === "info" ? "border-b-2 border-zf-primary text-zf-accent-text" : "text-zf-text-secondary hover:text-zf-text"].join(" ")}>Información</button>
            <button type="button" onClick={() => setModalTab("professionals")} className={["px-4 py-2.5 text-sm font-semibold transition-all", modalTab === "professionals" ? "border-b-2 border-zf-primary text-zf-accent-text" : "text-zf-text-secondary hover:text-zf-text"].join(" ")}>Profesionales</button>
          </div>
        </div>

        {modalTab === "info" ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zf-text-secondary">Nombre del Servicio</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Corte caballero" className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zf-text-secondary">Precio ($)</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="25000" min="0" className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zf-text-secondary">Duración (min)</label>
                <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="30" min="5" max="480" className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20" />
              </div>
            </div>
            {formError && <div className="flex items-center gap-2 text-sm text-zf-error-text"><AlertCircle className="h-4 w-4" />{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-zf-border py-3 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg active:scale-[0.97]">Cancelar</button>
              <button onClick={handleSaveForm} disabled={isPending} className="flex-1 rounded-xl bg-zf-primary py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50">{isPending ? "Guardando..." : editingId != null ? "Guardar Cambios" : "Agregar"}</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {professionals.length === 0 ? (
              <p className="text-xs text-zf-text-secondary py-4 text-center">No hay profesionales registrados</p>
            ) : (
              professionals.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-zf-border/30 bg-white p-3 hover:bg-zf-accent-bg/20">
                  <input type="checkbox" checked={assignedIds.has(p.id)} onChange={() => { const next = new Set(assignedIds); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setAssignedIds(next) }} className="h-4 w-4 accent-zf-primary" />
                  <span className="text-sm font-medium text-zf-text">{p.name}</span>
                </label>
              ))
            )}
            {editingId != null && (
              <button onClick={async () => { await setProfessionalServices(editingId, [...assignedIds]); setModalOpen(false); loadServices() }} className="mt-2 w-full rounded-xl bg-zf-primary py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]">Guardar Asignaciones</button>
            )}
          </div>
        )}
      </ModalV2>
    </div>
  )
}
