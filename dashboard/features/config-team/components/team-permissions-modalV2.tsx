"use client"

import { useState, useTransition, useEffect } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import { BadgeV2 } from "@/components/shared/badgeV2"
import {
  getTeamServicesV2,
  getTeamMemberServicesV2,
  setTeamMemberServicesV2,
  updateTeamMemberRoleV2,
} from "../actionsV2"
import type { MiembroEquipo } from "../actionsV2"
import { AlertCircle, Check, Scissors } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  member: MiembroEquipo | null
}

interface ServiceItem {
  id: number
  name: string
  active: boolean
}

export function TeamPermissionsModalV2({ open, onClose, businessId, member }: Props) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [currentRole, setCurrentRole] = useState<"admin" | "profesional">("profesional")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending] = useTransition()

  const isOwner = member?.role === "owner"
  const originalRole = member?.role ?? "profesional"

  useEffect(() => {
    if (!open || !member) return

    async function load() {
      if (!member) return
      const m = member
      setCurrentRole(m.role === "owner" ? "profesional" : (m.role as "admin" | "profesional"))
      setError("")
      setSaved(false)
      setLoading(true)
      if (!member) return
      try {
        const [servicesRes, roleServicesRes] = await Promise.all([
          getTeamServicesV2(businessId),
          member.professional_id
            ? getTeamMemberServicesV2(businessId, member.professional_id)
            : Promise.resolve<{ serviceIds: number[]; error?: string }>({ serviceIds: [] }),
        ])
        if (servicesRes.services) setServices(servicesRes.services)
        else if (servicesRes.error) setError(servicesRes.error)
        if ("error" in roleServicesRes && roleServicesRes.error) setError(roleServicesRes.error)
        if (roleServicesRes.serviceIds) setSelectedIds(roleServicesRes.serviceIds)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, member, businessId])

  function toggleService(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  function handleRoleChange(role: "admin" | "profesional") {
    setCurrentRole(role)
    setSaved(false)
  }

  async function handleSave() {
    if (!member) return
    setSaving(true)
    setError("")

    const ops: Promise<{ error?: string }>[] = []

    const effectiveRole = isOwner ? "owner" : currentRole
    const targetRole = isOwner ? "owner" : currentRole

    if (effectiveRole !== originalRole && originalRole !== "owner" && targetRole !== "owner") {
      ops.push(
        (async () => {
          const res = await updateTeamMemberRoleV2(member.id, businessId, targetRole as "admin" | "profesional")
          return res
        })()
      )
    }

    if (member.professional_id && (targetRole === "profesional" || originalRole === "profesional")) {
      ops.push(
        (async () => {
          const res = await setTeamMemberServicesV2(member.professional_id!, selectedIds)
          return res as { error?: string }
        })()
      )
    }

    try {
      const results = await Promise.all(ops)
      const firstError = results.find((r) => r?.error)
      if (firstError?.error) {
        setError(firstError.error)
      } else {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          onClose()
        }, 1200)
      }
    } catch {
      setError("Error guardando los permisos")
    } finally {
      setSaving(false)
    }
  }

  if (!member) return null

  const isRoleLocked = isOwner

  return (
    <ModalV2
      open={open}
      onClose={onClose}
      title="Editar Permisos"
      description={member.name}
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zf-text-secondary">
            Rol del usuario
          </h3>
          <p className="mt-1 text-xs text-zf-text-secondary">
            {isOwner
              ? "El dueño del negocio no puede cambiar de rol."
              : "Determina el nivel de acceso en el dashboard."}
          </p>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => !isOwner && handleRoleChange("profesional")}
              disabled={isRoleLocked}
              className={[
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                isOwner
                  ? "border-zf-border opacity-50"
                  : currentRole === "profesional"
                    ? "border-zf-primary/40 bg-zf-accent-bg/40"
                    : "border-zf-border hover:bg-zf-accent-bg/20",
                isRoleLocked ? "cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "h-5 w-5 shrink-0 rounded-full border-2 transition-all",
                  !isOwner && currentRole === "profesional"
                    ? "border-zf-primary bg-zf-primary"
                    : "border-zf-border",
                ].join(" ")}
              >
                {!isOwner && currentRole === "profesional" && (
                  <span className="mx-auto mt-0.5 block h-3 w-3 rounded-full bg-white" />
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zf-text">Profesional</span>
                <span className="text-xs text-zf-text-secondary">
                  Acceso solo a sus citas, clientes y métricas propias
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => !isOwner && handleRoleChange("admin")}
              disabled={isRoleLocked}
              className={[
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                isOwner
                  ? "border-zf-primary/40 bg-zf-accent-bg/40"
                  : currentRole === "admin"
                    ? "border-zf-primary/40 bg-zf-accent-bg/40"
                    : "border-zf-border hover:bg-zf-accent-bg/20",
                isRoleLocked ? "cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "h-5 w-5 shrink-0 rounded-full border-2 transition-all",
                  (isOwner || currentRole === "admin")
                    ? "border-zf-primary bg-zf-primary"
                    : "border-zf-border",
                ].join(" ")}
              >
                {(isOwner || currentRole === "admin") && (
                  <span className="mx-auto mt-0.5 block h-3 w-3 rounded-full bg-white" />
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zf-text">
                  Administrador
                  {isOwner && <span className="ml-2 text-xs text-zf-accent-text">(Dueño)</span>}
                </span>
                <span className="text-xs text-zf-text-secondary">
                  Acceso total excepto gestión de equipo
                </span>
              </div>
            </button>
          </div>
        </div>

        {member.professional_id != null && currentRole === "profesional" && (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zf-text-secondary">
                Servicios asignados
              </h3>
              <span className="text-xs text-zf-text-secondary">
                {selectedIds.length} de {services.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-zf-text-secondary">
              El profesional solo podrá atender estas citas.
            </p>

            {loading ? (
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-zf-border/20" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-zf-border/40 bg-zf-bg py-6 text-center">
                <Scissors className="h-6 w-6 text-zf-text-muted" />
                <p className="mt-2 text-xs text-zf-text-secondary">
                  No hay servicios activos en el negocio.
                </p>
              </div>
            ) : (
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {services.map((svc) => {
                  const selected = selectedIds.includes(svc.id)
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        selected
                          ? "border-zf-primary/40 bg-zf-accent-bg/30"
                          : "border-zf-border hover:bg-zf-accent-bg/20",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                          selected
                            ? "border-zf-primary bg-zf-primary text-white"
                            : "border-zf-border",
                        ].join(" ")}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="flex-1 text-sm text-zf-text">{svc.name}</span>
                      {!svc.active && (
                        <BadgeV2 variant="neutral" className="text-[10px]">
                          Inactivo
                        </BadgeV2>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!member.professional_id && currentRole === "profesional" && !loading && (
          <p className="rounded-lg bg-zf-warning-bg/30 p-3 text-xs text-zf-warning-text">
            Al guardar, se creará un perfil de profesional para este usuario y se podrá asignar
            servicios.
          </p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-zf-error-text">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || isPending}
            className="flex-1 rounded-xl border border-zf-border py-3 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isPending}
            className={[
              "flex-1 rounded-xl py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.97] disabled:opacity-50",
              saved
                ? "bg-zf-success-bg text-zf-success-text"
                : "bg-zf-primary text-white hover:opacity-90",
            ].join(" ")}
          >
            {saving || isPending
              ? "Guardando..."
              : saved
                ? "✓ Guardado"
                : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </ModalV2>
  )
}
