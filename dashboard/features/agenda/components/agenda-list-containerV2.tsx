"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { format, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import {
  getAppointmentsByMonthV2,
  getBloqueosV2,
  updateAppointmentStatusV2,
  deleteBloqueoV2,
} from "../actionsV2"
import type { AppointmentRow } from "@/lib/appointments"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  SearchX,
  CalendarDays,
  RefreshCw,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DayAccordionV2 } from "./parts/day-accordionV2"

interface BloqueoRow {
  id: number
  fecha: string
  tipo: string
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
  professional_id: number | null
  professional_name?: string | null
}

interface Props {
  businessId: number
  professionals: { id: number; name: string }[]
  isOwnerOrAdmin: boolean
  userProfessionalId: number | null
  onNewAppointment: () => void
  onAppointmentClick: (apt: AppointmentRow) => void
}

type FilterKey = "todos" | "pendientes" | "confirmadas" | "completadas" | "canceladas" | "bloqueos"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "TODOS" },
  { key: "pendientes", label: "PENDIENTES" },
  { key: "confirmadas", label: "CONFIRMADAS" },
  { key: "completadas", label: "COMPLETADAS" },
  { key: "canceladas", label: "CANCELADAS" },
  { key: "bloqueos", label: "BLOQUEOS" },
]

const STATUS_MAP: Record<string, string> = {
  pendientes: "Pendiente",
  confirmadas: "Confirmada",
  completadas: "Completada",
  canceladas: "Cancelada",
}

export function AgendaListContainerV2({
  businessId,
  professionals,
  isOwnerOrAdmin,
  userProfessionalId,
  onNewAppointment,
  onAppointmentClick,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [bloqueos, setBloqueos] = useState<BloqueoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos")
  const [searchText, setSearchText] = useState("")
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es })
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth()

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const profId = isOwnerOrAdmin ? selectedProfessionalId : userProfessionalId
      const [aptsRes, bloqRes] = await Promise.all([
        getAppointmentsByMonthV2(businessId, year, month, profId),
        getBloqueosV2(businessId, profId),
      ])
      setAppointments(aptsRes.appointments)
      setBloqueos(bloqRes.bloqueos)
    } catch {
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, year, month, selectedProfessionalId, isOwnerOrAdmin, userProfessionalId])

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

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1))
  const handleTodayMonth = () => setCurrentMonth(new Date())

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const handleToggleDay = (dateStr: string) => {
    setExpandedDay((prev) => (prev === dateStr ? null : dateStr))
  }

  const handleComplete = async (id: number) => {
    try {
      await updateAppointmentStatusV2(id, "Completada")
      loadData()
    } catch { /* handled in server action */ }
  }

  const handleCancel = async (id: number) => {
    try {
      await updateAppointmentStatusV2(id, "Cancelada")
      loadData()
    } catch { /* handled in server action */ }
  }

  const handleWhatsApp = (numero: string) => {
    window.open(`https://wa.me/${numero}`, "_blank")
  }

  const handleUnlock = async (bloqueoId: number) => {
    try {
      await deleteBloqueoV2(bloqueoId, businessId)
      loadData()
    } catch { /* handled in server action */ }
  }

  const filteredAppointments = useMemo(() => {
    let result = appointments
    if (activeFilter !== "todos" && activeFilter !== "bloqueos") {
      const targetStatus = STATUS_MAP[activeFilter]
      result = result.filter((a) => a.estado === targetStatus)
    } else if (activeFilter === "bloqueos") {
      return []
    }

    if (searchText) {
      const low = searchText.toLowerCase()
      result = result.filter(
        (a) =>
          (a.nombre ?? "").toLowerCase().includes(low) ||
          (a.servicio ?? "").toLowerCase().includes(low) ||
          (a.numero ?? "").toLowerCase().includes(low)
      )
    }
    return result
  }, [appointments, activeFilter, searchText])

  const filteredBloqueos = useMemo(() => {
    if (activeFilter !== "todos" && activeFilter !== "bloqueos") return []
    let result = bloqueos
    if (searchText) {
      const low = searchText.toLowerCase()
      result = result.filter((b) => (b.motivo ?? "").toLowerCase().includes(low))
    }
    return result
  }, [bloqueos, activeFilter, searchText])

  const daysWithData = useMemo(() => {
    const map = new Map<string, { appointments: AppointmentRow[]; bloqueos: BloqueoRow[] }>()

    for (const apt of filteredAppointments) {
      if (!map.has(apt.fecha)) map.set(apt.fecha, { appointments: [], bloqueos: [] })
      map.get(apt.fecha)!.appointments.push(apt)
    }

    if (activeFilter === "todos" || activeFilter === "bloqueos") {
      for (const b of filteredBloqueos) {
        if (!map.has(b.fecha)) map.set(b.fecha, { appointments: [], bloqueos: [] })
        map.get(b.fecha)!.bloqueos.push(b)
      }
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredAppointments, filteredBloqueos, activeFilter])

  useEffect(() => {
    if (daysWithData.length > 0) {
      const todayEntry = daysWithData.find(([date]) => date === todayStr)
      if (todayEntry) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpandedDay(todayStr)
      } else if (expandedDay === null || (!daysWithData.find(([d]) => d === expandedDay))) {
        setExpandedDay(daysWithData[0][0])
      }
    } else {
      setExpandedDay(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysWithData, todayStr])

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-zf-border/20" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-zf-border/20" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <div key={f.key} className="h-8 w-24 animate-pulse rounded-full bg-zf-border/20" />
          ))}
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zf-border/20" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-error-bg">
          <AlertCircle className="h-7 w-7 text-zf-error-text" />
        </div>
        <p className="text-sm font-semibold text-zf-error-text">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-zf-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const monthIsEmpty = appointments.length === 0 && bloqueos.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zf-accent-bg active:scale-[0.97]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-lg font-bold capitalize text-zf-text">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zf-accent-bg active:scale-[0.97]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleTodayMonth}
              className="flex h-9 items-center rounded-lg bg-zf-accent-bg px-3 text-xs font-semibold text-zf-accent-text transition-colors hover:bg-zf-accent-bg/70 active:scale-[0.97]"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zf-accent-bg disabled:opacity-50 active:scale-[0.97]"
            title="Actualizar"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
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
            className="flex items-center gap-1.5 rounded-xl bg-zf-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">NUEVA CITA</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.97]",
              activeFilter === f.key
                ? "bg-zf-primary text-white shadow-sm"
                : "border border-zf-border/50 text-zf-text-secondary hover:border-zf-text-muted hover:text-zf-text"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zf-text-muted" />
        <input
          type="text"
          placeholder="Buscar cliente o servicio..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-9 w-full rounded-xl border border-zf-border bg-white pl-9 pr-3 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
        />
      </div>

      {monthIsEmpty && !loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
            <CalendarDays className="h-6 w-6 text-zf-text-muted" />
          </div>
          <p className="text-sm font-medium text-zf-text-secondary">
            Sin citas en {monthLabel}
          </p>
          <button
            type="button"
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 rounded-xl bg-zf-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            NUEVA CITA
          </button>
        </div>
      ) : daysWithData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
            <SearchX className="h-6 w-6 text-zf-text-muted" />
          </div>
          <p className="text-sm font-medium text-zf-text-secondary">
            Sin resultados para este filtro
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("todos")
              setSearchText("")
            }}
            className="rounded-xl border border-zf-border bg-white px-5 py-2 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg active:scale-[0.97]"
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {daysWithData.map(([date, data]) => (
            <DayAccordionV2
              key={date}
              dateStr={date}
              appointments={data.appointments}
              bloqueos={data.bloqueos}
              isExpanded={expandedDay === date}
              onToggle={() => handleToggleDay(date)}
              onAppointmentClick={onAppointmentClick}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onWhatsApp={handleWhatsApp}
              onUnlock={handleUnlock}
            />
          ))}
        </div>
      )}
    </div>
  )
}
