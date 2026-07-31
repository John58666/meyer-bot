"use client"

import { useState, useTransition, useEffect } from "react"
import {
  getTeamV2,
  getTeamMemberServicesNamesV2,
  toggleTeamMemberStatus,
  deleteTeamMemberV2,
  getFutureAppointmentsV2,
  cancelFutureAppointmentsV2,
} from "../actionsV2"
import type { MiembroEquipo } from "../actionsV2"
import { ModalV2 } from "@/components/shared/modalV2"
import { BadgeV2 } from "@/components/shared/badgeV2"
import { EmptyStateV2 } from "@/components/shared/empty-stateV2"
import { TeamMemberModalV2 } from "./team-member-modalV2"
import { TeamPermissionsModalV2 } from "./team-permissions-modalV2"
import { TeamScheduleEditorV2 } from "./team-schedule-editorV2"
import { EmployeeDetailModalV2 } from "@/features/equipo-roles/components/employee-detail-modalV2"
import {
  Plus,
  MoreVertical,
  Settings2,
  Clock,
  Trash2,
  Power,
  AlertCircle,
  Users,
  User,
  Loader2,
} from "lucide-react"

interface Props {
  businessId: number
}

interface FutureAppt {
  id: number
  fecha: string
  hora: string
  servicio: string
  nombre: string
}

export function TeamListV2({ businessId }: Props) {
  const [members, setMembers] = useState<MiembroEquipo[]>([])
  const [specialties, setSpecialties] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalCreate, setModalCreate] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [expandedScheduleId, setExpandedScheduleId] = useState<number | null>(null)
  const [memberToPermission, setMemberToPermission] = useState<MiembroEquipo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MiembroEquipo | null>(null)
  const [futureAppts, setFutureAppts] = useState<FutureAppt[]>([])
  const [loadingFuture, setLoadingFuture] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [togglePendingId, setTogglePendingId] = useState<number | null>(null)
  const [detailMember, setDetailMember] = useState<MiembroEquipo | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadTeam() {
      setError("")
      const res = await getTeamV2(businessId)
      if ("error" in res && res.error) setError(res.error)
      if (res.miembros) {
        setMembers(res.miembros)
        setLoading(false)
        const profIds = res.miembros
          .filter((m) => m.professional_id != null)
          .map((m) => m.professional_id as number)
        if (profIds.length > 0) {
          const results = await Promise.all(
            profIds.map((pid) => getTeamMemberServicesNamesV2(businessId, pid))
          )
          const map: Record<number, string[]> = {}
          profIds.forEach((pid, idx) => {
            const r = results[idx]
            if ("names" in r && r.names) map[pid] = r.names
            else map[pid] = []
          })
          setSpecialties(map)
        }
      } else {
        setLoading(false)
      }
    }
    loadTeam()
  }, [businessId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest("[data-team-menu]")) closeMenu()
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function closeMenu() {
    setOpenMenuId(null)
  }

  function handleToggleActive(member: MiembroEquipo) {
    closeMenu()
    setTogglePendingId(member.id)
    setError("")
    startTransition(async () => {
      const res = await toggleTeamMemberStatus(member.id, businessId, !member.active)
      if ("error" in res && res.error) setError(res.error)
      else setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, active: !member.active } : m)))
    })
    setTogglePendingId(null)
  }

  function openDeleteConfirmation(member: MiembroEquipo) {
    closeMenu()
    if (member.role === "owner") {
      setError("No se puede eliminar al dueño del negocio")
      return
    }
    setDeleteTarget(member)
    setConfirmingDelete(true)
    setFutureAppts([])
  }

  useEffect(() => {
    if (!confirmingDelete || !deleteTarget) return
    async function loadFuture() {
      const target = deleteTarget!
      if (!target.professional_id) return
      setLoadingFuture(true)
      const res = await getFutureAppointmentsV2(businessId, target.professional_id)
      if (Array.isArray(res)) setFutureAppts(res)
      setLoadingFuture(false)
    }
    loadFuture()
  }, [confirmingDelete, deleteTarget, businessId])

  async function handleConfirmDeleteAndCancelAppts() {
    if (!deleteTarget) return
    const target = deleteTarget
    if (futureAppts.length > 0) {
      setDeletePending(true)
      setError("")
      const res = await cancelFutureAppointmentsV2(
        businessId,
        futureAppts.map((a) => a.id),
        `Profesional ${target.name} eliminado`
      )
      if ("error" in res && res.error) {
        setError(res.error)
        setDeletePending(false)
        return
      }
      setFutureAppts([])
      setDeletePending(false)
    }
    await performDelete()
  }

  async function performDelete() {
    if (!deleteTarget) return
    setDeletePending(true)
    setError("")
    const res = await deleteTeamMemberV2(deleteTarget.id, businessId)
    if ("error" in res && res.error) {
      setError(res.error)
      setDeletePending(false)
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === deleteTarget.id ? { ...m, active: false } : m)))
    setDeletePending(false)
    setDeleteTarget(null)
    setConfirmingDelete(false)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setConfirmingDelete(false)
    setFutureAppts([])
    setError("")
  }

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("")
  }

  function getRoleBadge(role: string) {
    if (role === "owner") return <BadgeV2 variant="warning">Dueño</BadgeV2>
    if (role === "admin") return <BadgeV2 variant="info">Administrador</BadgeV2>
    return <BadgeV2 variant="success">Profesional</BadgeV2>
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-zf-border/30" />
              <div className="h-4 flex-1 rounded bg-zf-border/30" />
              <div className="h-5 w-16 rounded bg-zf-border/30" />
              <div className="h-5 w-16 rounded bg-zf-border/30" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zf-text-secondary">
          {members.length} miembro{members.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModalCreate(true)}
          className="flex items-center gap-1.5 rounded-full bg-zf-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar Miembro
        </button>
      </div>

      {members.length === 0 ? (
        <EmptyStateV2
          icon={Users}
          title="Sin miembros"
          description="Agrega tu primer miembro al equipo para empezar a gestionar la agenda."
          action={
            <button
              onClick={() => setModalCreate(true)}
              className="rounded-full bg-zf-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Agregar Miembro
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zf-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zf-border/50 bg-zf-bg text-left text-xs font-semibold uppercase tracking-wide text-zf-text-muted">
                <th className="px-6 py-4">Profesional</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Especialidades</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isExpanded = expandedScheduleId === m.id
                const specs = m.professional_id ? specialties[m.professional_id] ?? [] : []
                const showSpecialties = m.role !== "owner" && m.professional_id != null && specs.length > 0
                return (
                  <TeamRow
                    key={m.id}
                    member={m}
                    specialties={specs}
                    showSpecialties={showSpecialties}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onOpenPermissions={() => {
                      closeMenu()
                      setMemberToPermission(m)
                    }}
                    onToggleSchedule={() => {
                      closeMenu()
                      setExpandedScheduleId(isExpanded ? null : m.id)
                    }}
                    onToggleActive={() => handleToggleActive(m)}
                    onDelete={() => openDeleteConfirmation(m)}
                    getInitials={getInitials}
                    getRoleBadge={getRoleBadge}
                    togglePending={togglePendingId === m.id}
                    isPending={isPending}
                    isExpanded={isExpanded}
                    onViewDetail={() => { closeMenu(); setDetailMember(m) }}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-zf-error-bg/30 p-3 text-sm text-zf-error-text">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-2 flex items-start gap-2 rounded-lg bg-zf-accent-bg/20 p-3 text-xs text-zf-text-secondary">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <strong className="text-zf-text">Tip de Gestión:</strong> Usa{" "}
          <span className="font-semibold">Editar Permisos</span> para asignar servicios al
          profesional o cambiar su rol. El{" "}
          <span className="font-semibold">Horario</span> puede ser heredado del negocio o
          personalizado por semana.
        </p>
      </div>

      {members.map((m) => {
        if (m.id !== expandedScheduleId || !m.professional_id) return null
        return (
          <div
            key={`expanded-sched-${m.id}`}
            className="mt-2 overflow-hidden rounded-xl border border-zf-primary/30 bg-zf-accent-bg/10"
          >
            <TeamScheduleEditorV2
              businessId={businessId}
              professionalId={m.professional_id}
              memberName={m.name}
            />
          </div>
        )
      })}

      <TeamMemberModalV2
        open={modalCreate}
        onClose={() => setModalCreate(false)}
        businessId={businessId}
        onCreated={() => {}}
      />

      <TeamPermissionsModalV2
        open={memberToPermission !== null}
        onClose={() => setMemberToPermission(null)}
        businessId={businessId}
        member={memberToPermission}
      />

      <ModalV2
        open={confirmingDelete}
        onClose={closeDeleteModal}
        title="Eliminar miembro"
        description={deleteTarget?.name}
      >
        <div className="space-y-4">
          <p className="text-sm text-zf-text-secondary">
            {deleteTarget?.role === "owner"
              ? "El dueño del negocio no puede ser eliminado."
              : "Este miembro será desactivado del equipo. No perderá datos históricos pero no podrá acceder al dashboard."}
          </p>

          {deleteTarget?.professional_id && (
            <div className="rounded-lg border border-zf-border bg-zf-bg p-3">
              <p className="text-xs font-medium text-zf-text-secondary">Citas futuras</p>
              {loadingFuture ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-zf-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </div>
              ) : futureAppts.length === 0 ? (
                <p className="mt-1 text-sm text-zf-text">No hay citas futuras pendientes.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-zf-text">
                    {futureAppts.length} cita{futureAppts.length !== 1 ? "s" : ""} pendiente
                    {futureAppts.length !== 1 ? "s" : ""}. Se cancelarán y notificarán al cliente
                    vía WhatsApp.
                  </p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-zf-text-secondary">
                    {futureAppts.map((a) => (
                      <li key={a.id}>
                        {a.fecha} {a.hora} — {a.servicio} — {a.nombre}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-zf-error-text">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deletePending}
              className="flex-1 rounded-xl border border-zf-border py-3 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAndCancelAppts}
              disabled={deletePending || deleteTarget?.role === "owner"}
              className="flex-1 rounded-xl bg-zf-error-text py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              {deletePending ? "Eliminando..." : "Eliminar y cancelar citas"}
            </button>
          </div>
        </div>
      </ModalV2>

      {detailMember && (
        <EmployeeDetailModalV2
          open={!!detailMember}
          onClose={() => setDetailMember(null)}
          member={detailMember}
          businessId={businessId}
        />
      )}
    </div>
  )
}

interface RowProps {
  member: MiembroEquipo
  specialties: string[]
  showSpecialties: boolean
  openMenuId: number | null
  setOpenMenuId: (id: number | null) => void
  onOpenPermissions: () => void
  onToggleSchedule: () => void
  onToggleActive: () => void
  onDelete: () => void
  onViewDetail: () => void
  getInitials: (name: string) => string
  getRoleBadge: (role: string) => React.ReactNode
  togglePending: boolean
  isPending: boolean
  isExpanded: boolean
}

function TeamRow({
  member,
  specialties,
  showSpecialties,
  openMenuId,
  setOpenMenuId,
  onOpenPermissions,
  onToggleSchedule,
  onToggleActive,
  onDelete,
  onViewDetail,
  getInitials,
  getRoleBadge,
  togglePending,
  isPending,
  isExpanded,
}: RowProps) {
  const isMenuOpen = openMenuId === member.id

  return (
    <>
      <tr
        className={[
          "border-b border-zf-border/30 transition-colors hover:bg-zf-accent-bg/20",
          !member.active && "bg-zf-neutral-bg/20",
          isExpanded && "border-zf-primary/30",
        ].join(" ")}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
                member.active
                  ? "bg-zf-accent-bg text-zf-accent-text"
                  : "bg-zf-neutral-bg text-zf-text-muted",
              ].join(" ")}
            >
              {getInitials(member.name)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-zf-text">{member.name}</span>
              <span className="text-xs text-zf-text-muted">{member.email}</span>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
        <td className="px-6 py-4">
          {showSpecialties ? (
            <div className="flex flex-wrap gap-1">
              {specialties.map((s) => (
                <span
                  key={s}
                  className="rounded bg-zf-neutral-bg px-2 py-0.5 text-xs text-zf-text-secondary"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-zf-text-muted">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          {member.active ? (
            <span className="inline-flex items-center rounded-full bg-zf-success-bg px-3 py-1 text-xs font-medium text-zf-success-text">
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zf-neutral-bg px-3 py-1 text-xs font-medium text-zf-text-muted">
              Inactivo
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-center">
          <div
            data-team-menu=""
            className="relative inline-block"
          >
            <button
              type="button"
              onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zf-text-muted transition-colors hover:bg-zf-accent-bg hover:text-zf-text"
              aria-label="Acciones"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-zf-border/50 bg-zf-surface py-1 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={onOpenPermissions}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zf-text transition-colors hover:bg-zf-accent-bg"
                >
                  <Settings2 className="h-4 w-4 text-zf-text-muted" />
                  Editar Permisos
                </button>

                {member.professional_id != null && (
                  <button
                    type="button"
                    onClick={onToggleSchedule}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zf-text transition-colors hover:bg-zf-accent-bg"
                  >
                    <Clock className="h-4 w-4 text-zf-text-muted" />
                    {isExpanded ? "Ocultar horario" : "Configurar Turno"}
                  </button>
                )}

                {member.role !== "owner" && (
                  <button
                    type="button"
                    onClick={onToggleActive}
                    disabled={togglePending || isPending}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zf-text transition-colors hover:bg-zf-accent-bg disabled:opacity-50"
                  >
                    <Power className="h-4 w-4 text-zf-text-muted" />
                    {member.active ? "Desactivar" : "Activar"}
                  </button>
                )}

                {member.role !== "owner" && (
                  <>
                    <div className="my-1 border-t border-zf-border/30" />
                <button
                  type="button"
                  onClick={() => { onViewDetail(); setOpenMenuId(null) }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zf-text transition-colors hover:bg-zf-accent-bg"
                >
                  <User className="h-4 w-4 text-zf-text-muted" />
                  Ver detalle
                </button>

                <div className="my-1 border-t border-zf-border/30" />

                <button
                      type="button"
                      onClick={onDelete}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zf-error-text transition-colors hover:bg-zf-error-bg/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}