"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  getBloqueosV2,
  updateAppointmentStatusV2,
  deleteBloqueoV2,
} from "../actionsV2"
import type { AppointmentRow } from "@/lib/appointments"
import {
  Plus,
  AlertCircle,
  SearchX,
  CalendarDays,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DayAccordionV2 } from "./parts/day-accordionV2"
import { DayStripV2 } from "./parts/day-stripV2"

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

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
  const [searchText, setSearchText] = useState("")
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const initialLoadDone = useRef(false)
  const lastLenRef = useRef({ apts: 0, bloqs: 0 })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })

  const loadData = useCallback(async () => {
    setError("")
    if (!initialLoadDone.current) setLoading(true)
    else setRefreshing(true)
    try {
      const profId = isOwnerOrAdmin ? selectedProfessionalId : userProfessionalId
      const params = new URLSearchParams({ businessId: String(businessId), year: String(year), month: String(month) })
      if (profId) params.set("professionalId", String(profId))
      const [aptsRes, bloqRes] = await Promise.all([
        fetch(`/api/appointments/month?${params}`).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
        getBloqueosV2(businessId, profId),
      ])
      const newApts = aptsRes.appointments
      const newBloqs = bloqRes.bloqueos
      if (!initialLoadDone.current) {
        setAppointments(newApts)
        setBloqueos(newBloqs)
        lastLenRef.current = { apts: newApts.length, bloqs: newBloqs.length }
      } else {
        const { apts: prevApts, bloqs: prevBloqs } = lastLenRef.current
        if (newApts.length !== prevApts) {
          setAppointments(newApts)
          lastLenRef.current.apts = newApts.length
        }
        if (newBloqs.length !== prevBloqs) {
          setBloqueos(newBloqs)
          lastLenRef.current.bloqs = newBloqs.length
        }
      }
      initialLoadDone.current = true
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
    const interval = setInterval(() => loadData(), 30000)
    const onVisible = () => { if (document.visibilityState === "visible") loadData() }
    const onFocus = () => loadData()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadData])

  const handleToggleDay = (dateStr: string) => {
    setExpandedDay((prev) => (prev === dateStr ? null : dateStr))
  }

  const handleComplete = async (id: number) => {
    try {
      const result = await updateAppointmentStatusV2(id, "Completada")
      if ("ok" in result || !("error" in result)) loadData()
    } catch { /* handled in server action */ }
  }

  const handleCancel = async (id: number) => {
    try {
      const result = await updateAppointmentStatusV2(id, "Cancelada")
      if ("ok" in result || !("error" in result)) loadData()
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
    if (!searchText) return appointments
    const low = searchText.toLowerCase()
    return appointments.filter(
      (a) =>
        (a.nombre ?? "").toLowerCase().includes(low) ||
        (a.servicio ?? "").toLowerCase().includes(low) ||
        (a.numero ?? "").toLowerCase().includes(low)
    )
  }, [appointments, searchText])

  const filteredBloqueos = useMemo(() => {
    if (!searchText) return bloqueos
    const low = searchText.toLowerCase()
    return bloqueos.filter((b) => (b.motivo ?? "").toLowerCase().includes(low))
  }, [bloqueos, searchText])

  const daysWithData = useMemo(() => {
    const map = new Map<string, { appointments: AppointmentRow[]; bloqueos: BloqueoRow[] }>()

    for (const apt of filteredAppointments) {
      if (!map.has(apt.fecha)) map.set(apt.fecha, { appointments: [], bloqueos: [] })
      map.get(apt.fecha)!.appointments.push(apt)
    }

    for (const b of filteredBloqueos) {
      if (!map.has(b.fecha)) map.set(b.fecha, { appointments: [], bloqueos: [] })
      map.get(b.fecha)!.bloqueos.push(b)
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredAppointments, filteredBloqueos])

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
          className="rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const monthIsEmpty = appointments.length === 0 && bloqueos.length === 0

  return (
    <div className="space-y-4">
      <DayStripV2
        selectedDay={`${year}-${String(month).padStart(2, "0")}-01`}
        onSelectDay={(dateStr) => {
          const d = new Date(dateStr + "T00:00:00")
          setCurrentMonth(d)
        }}
        onPrevWeek={() => {
          const m = new Date(currentMonth)
          m.setMonth(m.getMonth() - 1)
          setCurrentMonth(m)
        }}
        onNextWeek={() => {
          const m = new Date(currentMonth)
          m.setMonth(m.getMonth() + 1)
          setCurrentMonth(m)
        }}
        showMonthPicker={false}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zf-text-muted" />
        <input
          type="text"
          placeholder="Buscar cliente o servicio..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-9 w-full rounded-xl border border-zf-border bg-white pl-9 pr-3 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800/20"
        />
      </div>
        {isOwnerOrAdmin && professionals.length > 1 && (
          <select
            value={selectedProfessionalId ?? ""}
            onChange={(e) =>
              setSelectedProfessionalId(e.target.value ? parseInt(e.target.value) : null)
            }
            className="h-9 rounded-lg border border-zf-border bg-white px-3 text-xs text-zf-text focus:border-zinc-800 focus:outline-none"
          >
            <option value="">Todos los profesionales</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {monthIsEmpty && !loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
            <CalendarDays className="h-6 w-6 text-zf-text-muted" />
          </div>
          <p className="text-sm font-medium text-zf-text-secondary">
            Sin citas en {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </p>
          <button
            type="button"
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
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
            onClick={() => setSearchText("")}
            className="rounded-xl border border-zf-border bg-white px-5 py-2 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zinc-100 active:scale-[0.97]"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-2 transition-opacity duration-300", refreshing && "opacity-50")}>
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
