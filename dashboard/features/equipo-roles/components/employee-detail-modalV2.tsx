"use client"

import { useState, useEffect, useCallback } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import type { MiembroEquipo } from "@/lib/actions"
import {
  getTeamMemberScheduleV2,
  getTeamMemberServicesNamesV2,
} from "@/features/config-team/actionsV2"
import { getEmployeeStatsV2, getEmployeeReviewsV2 } from "../actionsV2"
import type { EmployeeStats, EmployeeReview } from "../actionsV2"
import { getInitials } from "@/lib/utils"
import {
  AlertCircle,
  Mail,
  Clock,
  Scissors,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  member: MiembroEquipo
  businessId: number
}

export function EmployeeDetailModalV2({ open, onClose, member, businessId }: Props) {
  const professionalId = member.professional_id

  const [schedule, setSchedule] = useState<{
    schedule: Record<string, { open: number; close: number }> | null
    hasCustom: boolean
    businessSchedule: Record<string, { open: number; close: number }>
  } | null>(null)
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  const [stats, setStats] = useState<EmployeeStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const [services, setServices] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(false)

  const [reviews, setReviews] = useState<EmployeeReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  const [error, setError] = useState("")

  const [showSchedule, setShowSchedule] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

  const loadData = useCallback(async () => {
    if (!professionalId) return
    setError("")

    const loadSchedule = async () => {
      setLoadingSchedule(true)
      const res = await getTeamMemberScheduleV2(businessId, professionalId)
      if (res.schedule || res.businessSchedule) {
        setSchedule({ schedule: res.schedule as Record<string, { open: number; close: number }> | null, hasCustom: res.hasCustom, businessSchedule: res.businessSchedule })
      }
      setLoadingSchedule(false)
    }

    const loadStats = async () => {
      setLoadingStats(true)
      const res = await getEmployeeStatsV2(businessId, professionalId)
      if (res.stats) setStats(res.stats)
      setLoadingStats(false)
    }

    const loadServices = async () => {
      setLoadingServices(true)
      const res = await getTeamMemberServicesNamesV2(businessId, professionalId)
      if (res.names) setServices(res.names)
      setLoadingServices(false)
    }

    const loadReviews = async () => {
      setLoadingReviews(true)
      const res = await getEmployeeReviewsV2(businessId, professionalId)
      if (res.reviews) setReviews(res.reviews)
      setLoadingReviews(false)
    }

    await Promise.all([loadSchedule(), loadStats(), loadServices(), loadReviews()])
  }, [businessId, professionalId])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData()
    }
  }, [open, loadData])

  if (!professionalId) {
    return (
      <ModalV2 open={open} onClose={onClose} title="Detalle del Miembro">
        <p className="text-sm text-zf-text-secondary">Este miembro no tiene perfil profesional asociado.</p>
      </ModalV2>
    )
  }

  const activeSchedule = schedule?.hasCustom && schedule.schedule ? schedule.schedule : schedule?.businessSchedule

  return (
    <ModalV2 open={open} onClose={onClose} title={member.name} className="w-full max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl bg-zf-bg/60 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-accent-bg text-lg font-bold text-zf-accent-text">
            {getInitials(member.name)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zf-text">{member.name}</h3>
              <span className={[
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                member.active ? "bg-zf-success-bg text-zf-success-text" : "bg-zf-neutral-bg text-zf-text-muted",
              ].join(" ")}>
                {member.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zf-text-secondary">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
              <span className="rounded-full bg-zf-accent-bg px-2 py-0.5 font-semibold text-zf-accent-text">{member.role}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {loadingStats ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zf-border/20" />
            ))
          ) : stats ? (
            <>
              <div className="rounded-xl bg-zf-bg/60 p-3 text-center">
                <p className="text-lg font-bold text-zf-text">{stats.completadas}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Completadas</p>
              </div>
              <div className="rounded-xl bg-zf-bg/60 p-3 text-center">
                <p className="text-lg font-bold text-zf-text">
                  {stats.total > 0 ? Math.round((stats.canceladas / stats.total) * 100) : 0}%
                </p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Cancelación</p>
              </div>
              <div className="rounded-xl bg-zf-bg/60 p-3 text-center">
                <p className="text-lg font-bold text-zf-text">
                  ${stats.ingresos?.toLocaleString() ?? 0}
                </p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Ingresos mes</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-t border-zf-border/40 pt-4">
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex w-full items-center justify-between text-sm font-semibold text-zf-text-secondary hover:text-zf-text"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horario {schedule?.hasCustom ? "(Personalizado)" : "(Heredado del negocio)"}
            </span>
            {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showSchedule && (
            <div className="mt-3 space-y-2">
              {loadingSchedule ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-zf-border/20" />
                ))
              ) : activeSchedule ? (
                DAYS.map((day, idx) => {
                  const dayData = activeSchedule[String(idx)]
                  return (
                    <div key={day} className="flex items-center justify-between rounded-lg border border-zf-border/30 bg-white px-3 py-2">
                      <span className="text-xs font-semibold text-zf-text w-24">{day}</span>
                      {dayData ? (
                        <span className="text-xs text-zf-text-secondary">
                          {String(dayData.open).padStart(2, "0")}:00 — {String(dayData.close).padStart(2, "0")}:00
                        </span>
                      ) : (
                        <span className="text-xs text-zf-text-muted">Cerrado</span>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-zf-text-muted">Sin horario configurado</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zf-border/40 pt-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
            <Scissors className="h-3.5 w-3.5" />
            Servicios asignados
          </h4>
          {loadingServices ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-zf-border/20" />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <span key={s} className="rounded-full bg-zf-accent-bg/50 px-3 py-1 text-xs font-medium text-zf-accent-text">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zf-text-muted">Sin servicios asignados</p>
          )}
        </div>

        <div className="border-t border-zf-border/40 pt-4">
          <button
            type="button"
            onClick={() => setShowReviews(!showReviews)}
            className="flex w-full items-center justify-between text-sm font-semibold text-zf-text-secondary hover:text-zf-text"
          >
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reseñas de clientes ({reviews.length})
            </span>
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReviews && (
            <div className="mt-3 space-y-3">
              {loadingReviews ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-zf-border/20" />
                ))
              ) : reviews.length > 0 ? (
                reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-zf-border/30 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={[
                              "h-3.5 w-3.5",
                              i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-zf-border",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-zf-text-muted">
                        {new Date(r.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-zf-text">{r.customerName}</p>
                    {r.comment && (
                      <p className="mt-1 text-xs text-zf-text-secondary">{r.comment}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <MessageSquare className="h-5 w-5 text-zf-text-muted" />
                  <p className="text-xs text-zf-text-muted">Sin reseñas aún</p>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </ModalV2>
  )
}
