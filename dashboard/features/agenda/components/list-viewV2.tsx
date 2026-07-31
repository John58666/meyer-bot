"use client"

import { useState, useEffect, useCallback } from "react"
import { format, addMonths, subMonths, getDaysInMonth } from "date-fns"
import { es } from "date-fns/locale"
import {
  getAppointmentsByMonthV2,
} from "../actionsV2"
import type { AppointmentRow } from "../actionsV2"
import { STATUS_BADGE } from "../constants"
import { formatHora } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  SearchX,
  ChevronDown,
  ChevronUp,
  User,
  Scissors,
} from "lucide-react"

interface Props {
  businessId: number
  professionals: { id: number; name: string }[]
  isOwnerOrAdmin: boolean
  userProfessionalId: number | null
  onNewAppointment: () => void
  onAppointmentClick: (appointment: AppointmentRow) => void
}

const DIAS_LABEL: Record<string, string> = {
  "0": "Domingo", "1": "Lunes", "2": "Martes", "3": "Miércoles",
  "4": "Jueves", "5": "Viernes", "6": "Sábado",
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return `${DIAS_LABEL[String(d.getDay())]} ${d.getDate()}`
}

export function ListViewV2({
  businessId,
  professionals,
  isOwnerOrAdmin,
  userProfessionalId,
  onNewAppointment,
  onAppointmentClick,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(
    userProfessionalId
  )
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es })
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const totalDays = getDaysInMonth(currentMonth)

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const profId = isOwnerOrAdmin ? selectedProfessionalId : userProfessionalId
      const res = await getAppointmentsByMonthV2(businessId, year, month, profId)
      setAppointments(res.appointments)
      setExpandedDay(null)
    } catch {
      setError("Error al cargar las citas del mes")
    } finally {
      setLoading(false)
    }
  }, [businessId, year, month, selectedProfessionalId, isOwnerOrAdmin, userProfessionalId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1))
  const handleTodayMonth = () => setCurrentMonth(new Date())

  const appointmentsByDate = new Map<string, AppointmentRow[]>()
  for (const apt of appointments) {
    const date = apt.fecha
    if (!appointmentsByDate.has(date)) appointmentsByDate.set(date, [])
    appointmentsByDate.get(date)!.push(apt)
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-36 rounded-lg bg-zf-border/30 animate-pulse" />
          <div className="h-9 w-32 rounded-lg bg-zf-border/20 animate-pulse" />
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
            onClick={loadData}
            className="rounded-xl bg-zf-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zf-border/50 bg-zf-surface px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zf-accent-bg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-zf-text capitalize min-w-[120px] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zf-accent-bg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleTodayMonth}
            className="ml-1 flex h-8 items-center rounded-lg bg-zf-accent-bg px-3 text-xs font-semibold text-zf-accent-text transition-colors hover:bg-zf-accent-bg/70"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOwnerOrAdmin && professionals.length > 1 && (
            <select
              value={selectedProfessionalId ?? ""}
              onChange={(e) =>
                setSelectedProfessionalId(e.target.value ? parseInt(e.target.value) : null)
              }
              className="h-9 rounded-lg border border-zf-border bg-white px-3 text-xs text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            >
              <option value="">Todos los profesionales</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 rounded-lg bg-zf-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Cita
          </button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
            <SearchX className="h-6 w-6 text-zf-text-muted" />
          </div>
          <p className="text-sm font-medium text-zf-text-secondary">
            Sin citas en {monthLabel}
          </p>
          <p className="text-xs text-zf-text-muted">
            Haz clic en &quot;Nueva Cita&quot; para agendar
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-zf-border/50 bg-zf-surface p-4">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const dayAppts = appointmentsByDate.get(dateStr) ?? []
            const isToday = dateStr === todayStr
            const isExpanded = expandedDay === dateStr || (expandedDay === null && isToday)
            const totalDia = dayAppts.length

            return (
              <div
                key={dateStr}
                className="overflow-hidden rounded-xl shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : dateStr)}
                  className={[
                    "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
                    isExpanded
                      ? "bg-zf-accent-bg/20"
                      : isToday
                        ? "bg-zf-accent-bg/10 hover:bg-zf-accent-bg/20"
                        : "bg-white hover:bg-zf-accent-bg/5",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      isToday
                        ? "bg-zf-primary text-white"
                        : "bg-zf-bg text-zf-text-secondary",
                    ].join(" ")}>
                      {day}
                    </div>
                    <div>
                      <p className={[
                        "text-sm font-semibold",
                        isToday ? "text-zf-accent-text" : "text-zf-text",
                      ].join(" ")}>
                        {getDayLabel(dateStr)}
                        {isToday && <span className="ml-1.5 text-xs font-bold text-zf-primary">Hoy</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {totalDia > 0 && (
                      <span className="rounded-full bg-zf-accent-bg px-2 py-0.5 text-xs font-semibold text-zf-accent-text">
                        {totalDia} {totalDia === 1 ? "cita" : "citas"}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zf-text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zf-text-muted" />
                    )}
                  </div>
                </button>

                {isExpanded && dayAppts.length > 0 && (
                  <div className="overflow-x-auto border-t border-zf-border/30">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zf-border/20 bg-zf-bg/40 text-[10px] font-bold uppercase text-zf-text-secondary">
                          <th className="px-4 py-2.5">Hora</th>
                          <th className="px-4 py-2.5">Cliente</th>
                          <th className="px-4 py-2.5">Teléfono</th>
                          <th className="px-4 py-2.5">Servicio</th>
                          <th className="px-4 py-2.5">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zf-border/10">
                        {dayAppts.map((apt) => {
                          const style = STATUS_BADGE[apt.estado] ?? STATUS_BADGE.Pendiente
                          const isCancelled = apt.estado === "Cancelada"
                          return (
                            <tr
                              key={apt.id}
                              onClick={() => onAppointmentClick(apt)}
                              className={[
                                "cursor-pointer transition-colors hover:bg-zf-accent-bg/15",
                                isCancelled ? "opacity-40" : "",
                              ].join(" ")}
                            >
                              <td className="px-4 py-3">
                                <span className={[
                                  "text-sm font-semibold text-zf-accent-text",
                                  isCancelled ? "line-through" : "",
                                ].join(" ")}>
                                  {formatHora(apt.hora)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={[
                                  "text-sm font-medium text-zf-text",
                                  isCancelled ? "line-through" : "",
                                ].join(" ")}>
                                  {apt.nombre}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-zf-text-secondary">
                                  {apt.numero}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Scissors className="h-3 w-3 text-zf-text-muted" />
                                  <span className={[
                                    "text-sm text-zf-text",
                                    isCancelled ? "line-through" : "",
                                  ].join(" ")}>
                                    {apt.servicio}
                                  </span>
                                </div>
                                {apt.profesional && (
                                  <div className="mt-0.5 flex items-center gap-1">
                                    <User className="h-3 w-3 text-zf-text-muted" />
                                    <span className="text-xs text-zf-text-secondary">
                                      {apt.profesional}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                  style={{
                                    backgroundColor: style.badge,
                                    color: style.badgeText,
                                  }}
                                >
                                  {style.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && dayAppts.length === 0 && (
                  <div className="border-t border-zf-border/30 px-4 py-4 text-center text-xs text-zf-text-muted">
                    Sin citas este día
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
