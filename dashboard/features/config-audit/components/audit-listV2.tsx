"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  getAuditLogsV2,
  getAuditUsersV2,
} from "../actionsV2"
import type { AuditLogEntry } from "@/lib/audit-types"
import type { MiembroEquipo } from "@/lib/actions"
import {
  ACCIONES_LABELS,
  ENTIDAD_LABELS,
  describirDetalle,
} from "@/lib/audit-types"
import { EmptyStateV2 } from "@/components/shared/empty-stateV2"
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"

interface Props {
  businessId: number
}

function getActionColor(accion: string): string {
  if (accion.startsWith("create")) return "bg-zf-success-bg text-zf-success-text"
  if (accion.startsWith("cancel") || accion.startsWith("delete"))
    return "bg-zf-error-bg text-zf-error-text"
  if (accion.startsWith("update") || accion.startsWith("reschedule"))
    return "bg-zf-warning-bg text-zf-warning-text"
  if (accion.startsWith("complete") || accion.startsWith("reactivate"))
    return "bg-zf-accent-bg text-zf-accent-text"
  return "bg-zf-neutral-bg text-zf-text-secondary"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()

  const time = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  if (isSameDay) return `Hoy, ${time}`
  if (isYesterday) return `Ayer, ${time}`
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AuditListV2({ businessId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [members, setMembers] = useState<MiembroEquipo[]>([])
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const accionParam = searchParams.get("accion") ?? ""
  const userIdParam = searchParams.get("userId") ?? ""
  const desdeParam = searchParams.get("desde") ?? ""
  const hastaParam = searchParams.get("hasta") ?? ""
  const pageParam = Number(searchParams.get("page") ?? 1)

  const [localAccion, setLocalAccion] = useState(accionParam)
  const [localUserId, setLocalUserId] = useState(userIdParam)
  const [localDesde, setLocalDesde] = useState(desdeParam)
  const [localHasta, setLocalHasta] = useState(hastaParam)

  useEffect(() => {
    getAuditUsersV2(businessId).then((res) => {
      if ("miembros" in res && res.miembros) setMembers(res.miembros)
    })
  }, [businessId])

  useEffect(() => {
    getAuditLogsV2(businessId, {
      accion: accionParam || undefined,
      userId: userIdParam ? Number(userIdParam) : undefined,
      desde: desdeParam || undefined,
      hasta: hastaParam || undefined,
      page: pageParam || 1,
    }).then((res) => {
      if ("entries" in res && res.entries) {
        setEntries(res.entries)
        setTotal(res.total)
        setPages(res.pages)
        setCurrentPage(pageParam || 1)
      }
      setLoading(false)
    })
  }, [businessId, accionParam, userIdParam, desdeParam, hastaParam, pageParam])

  function buildUrl(page: number) {
    const params = new URLSearchParams()
    if (localAccion) params.set("accion", localAccion)
    if (localUserId) params.set("userId", localUserId)
    if (localDesde) params.set("desde", localDesde)
    if (localHasta) params.set("hasta", localHasta)
    if (page > 1) params.set("page", String(page))
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ""}`
  }

  function applyFilters() {
    router.push(buildUrl(1))
  }

  function clearFilters() {
    const hasFilters = localAccion || localUserId || localDesde || localHasta
    if (!hasFilters) return
    setLocalAccion("")
    setLocalUserId("")
    setLocalDesde("")
    setLocalHasta("")
    router.push(pathname)
  }

  const hasActiveFilters = !!(accionParam || userIdParam || desdeParam || hastaParam)

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function renderEntityName(entry: AuditLogEntry): string {
    const entidadLabel = ENTIDAD_LABELS[entry.entidad]
    if (entry.entidad_id) {
      if (entry.entidad === "appointment") return `Cita #${entry.entidad_id}`
      if (entry.entidad === "user") return `Usuario #${entry.entidad_id}`
      if (entry.entidad === "professional_schedule")
        return `Horario profesional #${entry.entidad_id}`
      if (entry.entidad === "business") return entidadLabel ?? "Negocio"
      if (entry.entidad === "bloqueo") return `Agenda #${entry.entidad_id}`
    }
    return entidadLabel ?? entry.entidad
  }

  const accionOptions = Object.entries(ACCIONES_LABELS)

  function resolveUserName(entry: AuditLogEntry) {
    if (entry.user_name) return entry.user_name
    const member = members.find((m) => m.id === entry.user_id)
    return member?.name ?? "—"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface p-3 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zf-text-muted">
              Acción
            </label>
            <select
              value={localAccion}
              onChange={(e) => setLocalAccion(e.target.value)}
              onBlur={applyFilters}
              className="w-full rounded-lg border border-zf-border bg-zf-bg px-3 py-1.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {accionOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zf-text-muted">
              Usuario
            </label>
            <select
              value={localUserId}
              onChange={(e) => setLocalUserId(e.target.value)}
              onBlur={applyFilters}
              className="w-full rounded-lg border border-zf-border bg-zf-bg px-3 py-1.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none"
            >
              <option value="">Todos</option>
              {members
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="min-w-[120px] flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zf-text-muted">
              Desde
            </label>
            <input
              type="date"
              value={localDesde}
              onChange={(e) => setLocalDesde(e.target.value)}
              onBlur={applyFilters}
              className="w-full rounded-lg border border-zf-border bg-zf-bg px-3 py-1.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none"
            />
          </div>

          <div className="min-w-[120px] flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zf-text-muted">
              Hasta
            </label>
            <input
              type="date"
              value={localHasta}
              onChange={(e) => setLocalHasta(e.target.value)}
              onBlur={applyFilters}
              className="w-full rounded-lg border border-zf-border bg-zf-bg px-3 py-1.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters && !localAccion && !localUserId && !localDesde && !localHasta}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zf-text-muted transition-colors hover:text-zf-text disabled:cursor-not-allowed disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-5 w-20 rounded bg-zf-border/30" />
                <div className="h-4 flex-1 rounded bg-zf-border/30" />
                <div className="h-4 w-20 rounded bg-zf-border/30" />
              </div>
            ))}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <EmptyStateV2
          icon={ShieldAlert}
          title="Sin registros de auditoría"
          description={
            hasActiveFilters
              ? "No hay registros que coincidan con los filtros seleccionados."
              : "Todavía no se han registrado eventos en el sistema."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zf-border/50 bg-zf-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zf-border/50 bg-zf-bg text-left text-xs font-semibold uppercase tracking-wide text-zf-text-muted">
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Entidad</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id
                const detalleItems = describirDetalle(entry.accion, entry.detalle)
                const hasStateChange =
                  entry.detalle?.estado_anterior != null &&
                  entry.detalle?.estado_nuevo != null
                const actionLabel = ACCIONES_LABELS[entry.accion] ?? entry.accion

                return (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    actionLabel={actionLabel}
                    userName={resolveUserName(entry)}
                    entityName={renderEntityName(entry)}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(entry.id)}
                    detalleItems={detalleItems}
                    hasStateChange={!!hasStateChange}
                    getActionColor={getActionColor}
                    formatDate={formatDate}
                  />
                )
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-zf-border/40 bg-zf-bg px-6 py-3">
            <p className="text-xs text-zf-text-secondary">
              {total} registro{total !== 1 ? "s" : ""} · página {currentPage} de {pages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push(buildUrl(currentPage - 1))}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border text-zf-text-secondary transition-colors hover:bg-zf-accent-bg disabled:opacity-30"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold text-zf-text">
                {currentPage} / {pages}
              </span>
              <button
                type="button"
                onClick={() => router.push(buildUrl(currentPage + 1))}
                disabled={currentPage >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border text-zf-text-secondary transition-colors hover:bg-zf-accent-bg disabled:opacity-30"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AuditRowProps {
  entry: AuditLogEntry
  actionLabel: string
  userName: string
  entityName: string
  isExpanded: boolean
  onToggle: () => void
  detalleItems: string[]
  hasStateChange: boolean
  getActionColor: (accion: string) => string
  formatDate: (iso: string) => string
}

function AuditRow({
  entry,
  actionLabel,
  userName,
  entityName,
  isExpanded,
  onToggle,
  detalleItems,
  hasStateChange,
  getActionColor,
  formatDate,
}: AuditRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={[
          "cursor-pointer border-b border-zf-border/30 transition-colors hover:bg-zf-accent-bg/20",
          isExpanded && "bg-zf-accent-bg/30",
        ].join(" ")}
      >
        <td className="px-6 py-4">
          <span
            className={[
              "inline-flex rounded px-2 py-1 text-xs font-bold uppercase",
              getActionColor(entry.accion),
            ].join(" ")}
          >
            {actionLabel}
          </span>
        </td>
        <td className="px-6 py-4 text-zf-text">{userName}</td>
        <td className="px-6 py-4 text-zf-text-secondary">{entityName}</td>
        <td className="px-6 py-4 text-zf-text-muted">{formatDate(entry.created_at)}</td>
        <td className="px-6 py-4 text-right">
          {detalleItems.length > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-zf-accent-text"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              {isExpanded ? "Ocultar" : "Ver detalles"}
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="text-xs text-zf-text-muted">—</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-zf-bg/50 px-6 py-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zf-text-secondary">
                <span>
                  <strong className="text-zf-text">Entidad:</strong> {entityName}
                </span>
                {entry.entidad_id && (
                  <span>
                    <strong className="text-zf-text">ID:</strong> {entry.entidad_id}
                  </span>
                )}
                {entry.ip_address && (
                  <span>
                    <strong className="text-zf-text">IP:</strong> {entry.ip_address}
                  </span>
                )}
              </div>

              {hasStateChange && entry.detalle?.estado_anterior != null && entry.detalle?.estado_nuevo != null && (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 rounded-lg border border-zf-error-bg/60 bg-zf-error-bg/30 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-zf-error-text">
                      Antes
                    </p>
                    <p className="text-sm text-zf-text">
                      {String(entry.detalle.estado_anterior)}
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg border border-zf-success-bg/60 bg-zf-success-bg/30 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-zf-success-text">
                      Después
                    </p>
                    <p className="text-sm text-zf-text">
                      {String(entry.detalle.estado_nuevo)}
                    </p>
                  </div>
                </div>
              )}

              {detalleItems.length > 0 && (
                <div className="rounded-lg border border-zf-border bg-zf-surface p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zf-text-muted">
                    Detalle
                  </p>
                  <ul className="space-y-1.5">
                    {detalleItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zf-text">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zf-text-muted" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.detalle && !hasStateChange && detalleItems.length === 0 && (
                <pre className="overflow-x-auto rounded-lg border border-zf-border bg-zf-bg p-3 text-xs text-zf-text-secondary">
                  {JSON.stringify(entry.detalle, null, 2)}
                </pre>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
