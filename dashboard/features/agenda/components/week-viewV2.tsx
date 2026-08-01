"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  getWeekAppointmentsV2,
  getProfessionalsV2,
  getBusinessNameV2,
  getBloqueosV2,
} from "../actionsV2"
import type { WeekAppointment, AppointmentRow } from "@/lib/appointments"
import { DAYS_FULL, MONTHS_ES, STATUS_BADGE } from "../constants"
import { formatHora } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  AlertCircle,
  SearchX,
  LayoutList,
  RefreshCw,
  Lock,
} from "lucide-react"
import { AgendaModalV2 } from "./agenda-modalV2"
import { AppointmentDetailDrawerV2 } from "./appointment-detail-drawerV2"
import { AgendaListContainerV2 } from "./agenda-list-containerV2"

interface Props {
  businessId: number
  businessName?: string
  isOwnerOrAdmin: boolean
  userProfessionalId: number | null
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8)

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

function getWeekDates(dayStr?: string): string[] {
  const d = new Date((dayStr ?? todayISO()) + "T00:00:00")
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date.toISOString().slice(0, 10)
  })
}

export function WeekViewV2({ businessId, businessName: initialName, isOwnerOrAdmin, userProfessionalId }: Props) {
  const [appointments, setAppointments] = useState<Record<string, WeekAppointment[]>>({})
  const [professionals, setProfessionals] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [businessName, setBusinessName] = useState(initialName ?? "")

  const [currentDay, setCurrentDay] = useState(todayISO())
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(
    isOwnerOrAdmin ? null : userProfessionalId
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [preselectedSlot, setPreselectedSlot] = useState<{
    date: string
    hour: string
    professionalId: number | null
  } | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerAppointment, setDrawerAppointment] = useState<AppointmentRow | WeekAppointment | null>(null)
  const [viewMode, setViewMode] = useState<"professional" | "list">("professional")
  const [rangeMode, setRangeMode] = useState<"day" | "week">("day")
  const [bloqueos, setBloqueos] = useState<{ id: number; fecha: string; tipo: string; hora_inicio: string | null; hora_fin: string | null; motivo: string | null; professional_id: number | null }[]>([])
  const [ocupacion, setOcupacion] = useState({ total: 0, ocupadas: 0, pct: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const profId = selectedProfessionalId ?? userProfessionalId

      const [apptsRes, profsRes, bizRes, bloqRes] = await Promise.all([
        getWeekAppointmentsV2(businessId, profId),
        getProfessionalsV2(businessId),
        initialName ? Promise.resolve({ name: initialName }) : getBusinessNameV2(businessId),
        getBloqueosV2(businessId, profId),
      ])

      setAppointments(apptsRes.appointments)
      setProfessionals(profsRes.professionals)
      if (!initialName && bizRes.name) setBusinessName(bizRes.name)
      setBloqueos(bloqRes.bloqueos)

      const weekDates = getWeekDates()
      const allAppts = Object.values(apptsRes.appointments).flat()
      const bloqsEnSemana = bloqRes.bloqueos.filter(b => weekDates.includes(b.fecha))
      const ocupadas = allAppts.filter(a => a.estado !== "Cancelada").length
      const total = ocupadas + bloqsEnSemana.length + 10
      const pct = total > 0 ? Math.round((ocupadas / total) * 100) : 0
      setOcupacion({ total, ocupadas, pct })
    } catch {
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [businessId, selectedProfessionalId, userProfessionalId, initialName])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadData()
    }, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handlePrevDay = () => {
    const d = new Date(currentDay + "T00:00:00")
    d.setDate(d.getDate() - 1)
    setCurrentDay(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(currentDay + "T00:00:00")
    d.setDate(d.getDate() + 1)
    setCurrentDay(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    setCurrentDay(todayISO())
  }

  const handleOpenModal = (date?: string, hour?: string, professionalId?: number | null) => {
    setPreselectedSlot({
      date: date ?? currentDay,
      hour: hour ?? "",
      professionalId: professionalId ?? selectedProfessionalId,
    })
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setPreselectedSlot(null)
  }

  const handleAppointmentClick = (appointment: WeekAppointment | AppointmentRow) => {
    setDrawerAppointment({
      ...appointment,
      fecha: appointment.fecha ?? currentDay,
    })
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setDrawerAppointment(null)
  }

  const handleAppointmentUpdated = () => {
    loadData()
    handleCloseDrawer()
  }

  const dayDate = new Date(currentDay + "T00:00:00")
  const dayName = DAYS_FULL[dayDate.getDay()]
  const dayNum = dayDate.getDate()
  const dayMonth = MONTHS_ES[dayDate.getMonth()]
  const isToday = currentDay === todayISO()

  const dayAppointments = appointments[currentDay] ?? []
  const totalDia = dayAppointments.length

  const displayProfessionals = isOwnerOrAdmin ? professionals : []

  const columnsForGrid = displayProfessionals.length > 0
    ? displayProfessionals
    : [{ id: -1, name: businessName }]

  if (loading) {
    return (
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-40 rounded-lg bg-zf-border/30 animate-pulse" />
            <div className="h-5 w-28 rounded bg-zf-border/20 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-zf-border/20 animate-pulse" />
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-zf-border/20" />
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
            className="rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface">
        {viewMode === "professional" && (
        <div className="flex flex-col gap-4 border-b border-zf-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
              <CalendarDays className="h-4 w-4 text-zinc-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zf-text">
                {businessName || "Agenda"}
              </h3>
              <p className="text-xs text-zf-text-secondary">
                {totalDia} {totalDia === 1 ? "cita" : "citas"} · {dayName} {dayNum} de {dayMonth}
                {isToday && <span className="ml-1 font-semibold text-zinc-700">· Hoy</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {isOwnerOrAdmin && professionals.length > 1 && (
              <select
                value={selectedProfessionalId ?? ""}
                onChange={(e) =>
                  setSelectedProfessionalId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="h-9 rounded-lg border border-zf-border bg-white px-3 text-xs text-zf-text focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
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
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Cita
            </button>
          </div>
        </div>
        )}

        {viewMode === "professional" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zf-border/40 bg-zf-bg/60 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 items-center gap-2 rounded-lg border border-zf-border bg-white px-3">
              <Clock className="h-3.5 w-3.5 text-zf-text-muted" />
              <span className="text-xs font-semibold text-zf-text">
                {rangeMode === "week" ? `${DAYS_FULL[1].slice(0,3)}-${DAYS_FULL[5].slice(0,3)} ${dayMonth}` : `${dayName} ${dayNum} ${dayMonth}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextDay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="flex h-8 items-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100/70"
              >
                Hoy
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end gap-0.5 sm:flex">
              <div className="flex items-center gap-2 text-xs text-zf-text-secondary">
                <span>Ocupación {rangeMode === "week" ? "semanal" : "hoy"}: {ocupacion.ocupadas}/{ocupacion.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-28 overflow-hidden rounded-full bg-zf-bg">
                  <div
                    className="h-full rounded-full bg-zinc-800 transition-all"
                    style={{ width: `${Math.min(ocupacion.pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-zinc-700">{ocupacion.pct}%</span>
              </div>
            </div>

            <div className="flex rounded-lg bg-zf-bg/80 p-0.5">
              <button
                type="button"
                onClick={() => setRangeMode("day")}
                className={[
                  "rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all",
                  rangeMode === "day" ? "bg-white text-zinc-700 shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
                ].join(" ")}
              >
                Día
              </button>
              <button
                type="button"
                onClick={() => setRangeMode("week")}
                className={[
                  "rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all",
                  rangeMode === "week" ? "bg-white text-zinc-700 shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
                ].join(" ")}
              >
                Semana
              </button>
            </div>

          </div>
        </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-b border-zf-border/40 bg-zf-bg/60 px-6 py-2">
          <div className="flex rounded-lg bg-zf-bg/80 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("professional")}
              className={[
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                viewMode === "professional" ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
              ].join(" ")}
            >
              <CalendarDays className="h-3 w-3" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={[
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                viewMode === "list" ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
              ].join(" ")}
            >
              <LayoutList className="h-3 w-3" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <AgendaListContainerV2
            businessId={businessId}
            professionals={professionals}
            isOwnerOrAdmin={isOwnerOrAdmin}
            userProfessionalId={userProfessionalId}
            onNewAppointment={() => handleOpenModal()}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : dayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
              <SearchX className="h-6 w-6 text-zf-text-muted" />
            </div>
            <p className="text-sm font-medium text-zf-text-secondary">
              No hay citas para este día
            </p>
            <p className="text-xs text-zf-text-muted">
              Haz clic en &quot;Nueva Cita&quot; para agendar
            </p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Agendar primera cita
            </button>
          </div>
        ) : columnsForGrid.length <= 1 && !isOwnerOrAdmin ? (
          <div className="p-6 space-y-3">
            {dayAppointments.map((apt) => (
              <div
                key={apt.id}
                onClick={() => handleAppointmentClick(apt)}
                className="cursor-pointer rounded-xl border border-zf-border/40 bg-white p-4 transition-all hover:shadow-md active:scale-[0.98]"
              >
                {renderAppointmentCard(apt)}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[600px]"
              style={{
                gridTemplateColumns: `80px repeat(${columnsForGrid.length}, 1fr)`,
              }}
            >
              <div className="flex items-center justify-center border-b border-zf-border/40 bg-zf-bg/60 py-3 text-[10px] font-bold uppercase tracking-wider text-zf-text-secondary">
                Hora
              </div>
              {columnsForGrid.map((prof) => (
                <div
                  key={prof.id}
                  className="flex flex-col items-center justify-center gap-1 border-b border-zf-border/40 bg-zf-bg/60 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700">
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-zf-text">
                    {prof.name}
                  </span>
                </div>
              ))}

              {HOURS.map((hour) => {
                const hourStr = `${String(hour).padStart(2, "0")}:00`
                return (
                  <div
                    key={hour}
                    className="contents"
                  >
                    <div className="flex items-start justify-center border-b border-r border-zf-border/30 pt-2 text-xs font-medium text-zf-text-muted">
                      {formatHora(hourStr)}
                    </div>
                    {columnsForGrid.map((prof) => {
                      const apt = dayAppointments.find((a) => {
                        const aHour = a.hora.slice(0, 2)
                        return aHour === String(hour).padStart(2, "0")
                          && (isOwnerOrAdmin
                            ? (a as WeekAppointment & { professional_id?: number }).professional_id === prof.id
                            : true)
                      })

                      const bloq = bloqueos.find((b) =>
                        b.fecha === currentDay
                        && (!isOwnerOrAdmin || b.professional_id === prof.id || b.professional_id === null)
                        && b.tipo !== "cerrado_anual"
                        && (!b.hora_inicio || (hourStr >= b.hora_inicio && hourStr < (b.hora_fin ?? "24:00")))
                      )

                      if (bloq && !apt) {
                        const isFullDay = bloq.hora_inicio === null || bloq.hora_fin === null
                        return (
                          <div key={`${prof.id}-${hour}-bloq`} className="border-b border-r border-zf-border/30 p-1">
                            <div
                              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md bg-zf-bg/80 text-center"
                              style={{
                                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)",
                              }}
                            >
                              <Lock className="h-3.5 w-3.5 text-zf-text-muted" />
                              <span className="text-[10px] font-medium text-zf-text-muted leading-tight">
                                {isFullDay || bloq.tipo === "cerrado"
                                  ? (bloq.motivo ?? "Cerrado")
                                  : bloq.motivo
                                    ? bloq.motivo.length > 15 ? bloq.motivo.slice(0, 15) + "…" : bloq.motivo
                                    : "Bloqueado"}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      if (apt) {
                        const style = STATUS_BADGE[apt.estado] ?? STATUS_BADGE.Pendiente
                        const isCancelled = apt.estado === "Cancelada"
                        return (
                          <div
                            key={`${prof.id}-${hour}`}
                            className="border-b border-r border-zf-border/30 p-1"
                          >
                            <button
                              type="button"
                              onClick={() => handleAppointmentClick(apt)}
                              className="w-full rounded-r-lg p-2.5 text-left transition-all hover:brightness-[0.97] active:scale-[0.98]"
                              style={{
                                backgroundColor: style.bg,
                                borderLeft: `4px solid ${style.border}`,
                                opacity: isCancelled ? 0.4 : 1,
                                filter: isCancelled ? "grayscale(0.5)" : undefined,
                              }}
                            >
                              <span
                                className="mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                style={{
                                  backgroundColor: style.badge,
                                  color: style.badgeText,
                                }}
                              >
                                {apt.estado}
                              </span>
                              <div className={`text-sm font-bold text-zf-text ${isCancelled ? "line-through" : ""}`}>
                                {apt.nombre}
                              </div>
                              <div className={`text-[11px] text-zf-text-secondary ${isCancelled ? "line-through" : ""}`}>
                                {apt.servicio}
                              </div>
                            </button>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={`${prof.id}-${hour}`}
                          className="group relative flex cursor-pointer items-center justify-center border-b border-r border-zf-border/30 transition-colors hover:bg-zinc-100/30"
                          onClick={() => handleOpenModal(currentDay, hourStr, prof.id > 0 ? prof.id : null)}
                        >
                          <span className="text-[10px] font-medium text-zf-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                            + Crear
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <AgendaModalV2
          open={modalOpen}
          onClose={handleCloseModal}
          businessId={businessId}
          preselectedSlot={preselectedSlot}
          professionals={professionals}
          onSuccess={loadData}
        />
      )}

      {drawerAppointment && (
        <AppointmentDetailDrawerV2
          open={drawerOpen}
          onClose={handleCloseDrawer}
          appointment={drawerAppointment}
          onUpdated={handleAppointmentUpdated}
        />
      )}
    </>
  )
}

function renderAppointmentCard(apt: WeekAppointment) {
  const style = STATUS_BADGE[apt.estado] ?? STATUS_BADGE.Pendiente
  const isCancelled = apt.estado === "Cancelada"
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 flex-shrink-0 text-sm font-semibold text-zinc-700">
        {formatHora(apt.hora)}
      </span>
      <div className="flex-1 space-y-0.5">
        <p className={`text-sm font-semibold text-zf-text ${isCancelled ? "line-through" : ""}`}>
          {apt.nombre}
        </p>
        <p className={`text-xs text-zf-text-secondary ${isCancelled ? "line-through" : ""}`}>
          {apt.servicio}
        </p>
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{
            backgroundColor: style.badge,
            color: style.badgeText,
          }}
        >
          {apt.estado}
        </span>
      </div>
    </div>
  )
}
