"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  getWeekAppointmentsV2,
  getProfessionalsV2,
  getBusinessNameV2,
  getBloqueosV2,
} from "../actionsV2"
import type { WeekAppointment, AppointmentRow } from "@/lib/appointments"
import { DAYS_FULL, MONTHS_ES, STATUS_BADGE } from "../constants"
import { formatHora } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  AlertCircle,
  SearchX,
  LayoutList,
  RefreshCw,
} from "lucide-react"
import { AgendaModalV2 } from "./agenda-modalV2"
import { AppointmentDetailDrawerV2 } from "./appointment-detail-drawerV2"
import { AgendaListContainerV2 } from "./agenda-list-containerV2"
import { TimelineGridV2 } from "./timeline-gridV2"

interface Props {
  businessId: number
  businessName?: string
  isOwnerOrAdmin: boolean
  userProfessionalId: number | null
}

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

export function WeekViewV2({ businessId, businessName: initialName, isOwnerOrAdmin, userProfessionalId }: Props) {
  const [appointments, setAppointments] = useState<Record<string, WeekAppointment[]>>({})
  const [professionals, setProfessionals] = useState<{ id: number; name: string }[]>([])
  const [bloqueos, setBloqueos] = useState<{ id: number; fecha: string; tipo: string; hora_inicio: string | null; hora_fin: string | null; motivo: string | null; professional_id: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [businessName, setBusinessName] = useState(initialName ?? "")

  const [currentDay, setCurrentDay] = useState(todayISO())
  const [viewMode, setViewMode] = useState<"professional" | "list">("professional")
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(
    isOwnerOrAdmin ? null : userProfessionalId
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [preselectedSlot, setPreselectedSlot] = useState<{
    date: string; hour: string; professionalId: number | null
  } | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerAppointment, setDrawerAppointment] = useState<AppointmentRow | WeekAppointment | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async () => {
    setError("")
    const hasData = Object.keys(appointments).length > 0
    if (!hasData) setLoading(true)
    else setRefreshing(true)

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
    } catch {
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, selectedProfessionalId, userProfessionalId, initialName])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    intervalRef.current = setInterval(() => loadData(), 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
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

  const handleToday = () => setCurrentDay(todayISO())

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

  const handleAppointmentClick = (idOrApt: number | WeekAppointment | AppointmentRow) => {
    if (typeof idOrApt === "number") {
      const all = Object.values(appointments).flat()
      const found = all.find((a) => a.id === idOrApt)
      if (found) {
        setDrawerAppointment({ ...found, fecha: found.fecha ?? currentDay })
        setDrawerOpen(true)
      }
      return
    }
    setDrawerAppointment(idOrApt)
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
  const year = dayDate.getFullYear()
  const isToday = currentDay === todayISO()

  const dayAppointments = appointments[currentDay] ?? []

  const displayProfessionals = isOwnerOrAdmin ? professionals : []

  const gridColumns = displayProfessionals.length > 0
    ? displayProfessionals
    : [{ id: -1, name: businessName }]

  const gridAppointments = useMemo(() => {
    const result: {
      id: number
      columnId: number
      startMinute: number
      durationMin: number
      hora: string
      nombre: string
      servicio: string
      estado: string
      isBlock?: boolean
      motivo?: string
    }[] = []

    const isOwner = isOwnerOrAdmin

    for (const bloq of bloqueos) {
      if (bloq.fecha !== currentDay) continue
      if (bloq.tipo === "cerrado_anual") continue
      const startH = bloq.hora_inicio ? parseInt(bloq.hora_inicio.slice(0, 2)) : 8
      const startM = bloq.hora_inicio ? parseInt(bloq.hora_inicio.slice(3, 5)) : 0
      const endH = bloq.hora_fin ? parseInt(bloq.hora_fin.slice(0, 2)) : 20
      const endM = bloq.hora_fin ? parseInt(bloq.hora_fin.slice(3, 5)) : 0
      const startMin = startH * 60 + startM
      const durMin = Math.max(30, (endH * 60 + endM) - startMin)
      const colId = isOwner && bloq.professional_id ? bloq.professional_id : gridColumns[0].id

      result.push({
        id: bloq.id + 100000,
        columnId: colId,
        startMinute: startMin,
        durationMin: durMin,
        hora: bloq.hora_inicio ? formatHora(bloq.hora_inicio) : "Todo el día",
        nombre: bloq.motivo ?? "Bloqueo",
        servicio: "",
        estado: "Pendiente",
        isBlock: true,
        motivo: bloq.motivo ?? undefined,
      })
    }

    for (const apt of dayAppointments) {
      const [h, m] = apt.hora.split(":").map(Number)
      const startMin = h * 60 + m
      const colId = isOwner && (apt as WeekAppointment & { professional_id?: number }).professional_id
        ? (apt as WeekAppointment & { professional_id?: number }).professional_id!
        : gridColumns[0].id

      result.push({
        id: apt.id,
        columnId: colId,
        startMinute: startMin,
        durationMin: 60,
        hora: formatHora(apt.hora),
        nombre: apt.nombre,
        servicio: apt.servicio,
        estado: apt.estado,
      })
    }

    return result
  }, [dayAppointments, bloqueos, currentDay, gridColumns, isOwnerOrAdmin])

  if (loading) {
    return (
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-40 rounded-lg bg-zf-border/30 animate-pulse" />
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
          <button type="button" onClick={loadData}
            className="rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-zf-border/50 bg-zf-surface">
        <div className="flex flex-col gap-3 border-b border-zf-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePrevDay}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button"
                className="rounded-lg border border-zf-border bg-white px-4 py-1.5 text-sm font-semibold text-zf-text hover:bg-zinc-50 transition-colors min-w-[160px]">
                {dayNum} de {dayMonth}, {year}
              </button>
              <button type="button" onClick={handleNextDay}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]">
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isToday && (
                <button type="button" onClick={handleToday}
                  className="flex h-8 items-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 active:scale-[0.97]">
                  Hoy
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRefresh} disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 disabled:opacity-50"
              title="Actualizar">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
            <button type="button" onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.97]">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva Cita</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end border-b border-zf-border/40 bg-zf-bg/60 px-6 py-2">
          <div className="flex rounded-lg bg-zf-bg/80 p-0.5">
            <button type="button" onClick={() => setViewMode("professional")}
              className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                viewMode === "professional" ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text")}>
              <CalendarDays className="h-3 w-3" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            <button type="button" onClick={() => setViewMode("list")}
              className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all",
                viewMode === "list" ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text")}>
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
        ) : dayAppointments.length === 0 && bloqueos.filter(b => b.fecha === currentDay).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
              <SearchX className="h-6 w-6 text-zf-text-muted" />
            </div>
            <p className="text-sm font-medium text-zf-text-secondary">No hay citas para este día</p>
            <button type="button" onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]">
              <Plus className="h-4 w-4" />Agendar primera cita
            </button>
          </div>
        ) : gridColumns.length <= 1 && !isOwnerOrAdmin ? (
          <div className="p-6 space-y-3">
            {dayAppointments.map((apt) => {
              const style = STATUS_BADGE[apt.estado] ?? STATUS_BADGE.Pendiente
              const isCancelled = apt.estado === "Cancelada"
              return (
                <button key={apt.id} type="button" onClick={() => handleAppointmentClick(apt)}
                  className="w-full cursor-pointer rounded-xl border border-zf-border/40 bg-white p-4 text-left transition-all hover:shadow-md active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-sm font-semibold text-zinc-700">{formatHora(apt.hora)}</span>
                    <div className="flex-1 space-y-0.5">
                      <p className={`text-sm font-semibold text-zf-text ${isCancelled ? "line-through" : ""}`}>{apt.nombre}</p>
                      <p className={`text-xs text-zf-text-secondary ${isCancelled ? "line-through" : ""}`}>{apt.servicio}</p>
                      <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: style.badge, color: style.badgeText }}>{apt.estado}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className={cn("transition-opacity duration-200", refreshing && "opacity-50 pointer-events-none")}>
            <TimelineGridV2
              columns={gridColumns}
              appointments={gridAppointments}
              startHour={8}
              endHour={20}
              hourHeight={90}
              onSlotClick={(colId, hour) => handleOpenModal(currentDay, hour, colId > 0 ? colId : null)}
              onAppointmentClick={(id) => handleAppointmentClick(id)}
              isToday={isToday}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <AgendaModalV2 open={modalOpen} onClose={handleCloseModal}
          businessId={businessId} preselectedSlot={preselectedSlot}
          professionals={professionals} onSuccess={loadData} />
      )}

      {drawerAppointment && (
        <AppointmentDetailDrawerV2 open={drawerOpen} onClose={handleCloseDrawer}
          appointment={drawerAppointment} onUpdated={handleAppointmentUpdated} />
      )}
    </>
  )
}
