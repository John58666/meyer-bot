'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutList, CalendarDays, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CalendarMonthView } from '@/components/calendar-month-view'
import type { WeekAppointment } from '@/lib/appointments'

type ViewMode = 'lista' | 'calendario'
const STORAGE_KEY = 'meyer-semana-view'
const STORAGE_PROF_KEY = 'meyer-semana-prof'

interface Professional {
  id: number
  name: string
}

interface SemanaClientProps {
  children: React.ReactNode
  multiProfessional: boolean
  servicesText: string
  professionals?: Professional[]
  initialProfessionalId?: number | null
}

function formatHora(hora: string): string {
  const [h, m] = hora.split(":")
  const hour = parseInt(h)
  const suffix = hour >= 12 ? "PM" : "AM"
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${suffix}`
}

const DAYS_ES: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

const statusConfig: Record<string, { bg: string; text: string }> = {
  Pendiente:  { bg: "bg-[var(--color-warning)]/10",  text: "text-[var(--color-warning)]" },
  Confirmada: { bg: "bg-[var(--color-success)]/10",  text: "text-[var(--color-success)]" },
  Completada: { bg: "bg-white/5",                    text: "text-[var(--text-secondary)]" },
  Cancelada:  { bg: "bg-[var(--color-danger)]/10",   text: "text-[var(--color-danger)]"  },
}

function getWeekDays(todayISO: string): string[] {
  const today = new Date(todayISO + "T00:00:00")
  const day = today.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() + diffToMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function SemanaClient({ children, multiProfessional, servicesText, professionals = [], initialProfessionalId }: SemanaClientProps) {
  const [mode, setMode] = useState<ViewMode>('lista')
  const [selectedProf, setSelectedProf] = useState<string>(
    initialProfessionalId ? String(initialProfessionalId) : ''
  )
  const [filteredAppointments, setFilteredAppointments] = useState<Record<string, WeekAppointment[]> | null>(null)
  const [loadingFiltered, setLoadingFiltered] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'lista' || saved === 'calendario') setMode(saved)
    const savedProf = localStorage.getItem(STORAGE_PROF_KEY)
    if (savedProf) setSelectedProf(savedProf)
  }, [])

  const switchMode = (next: ViewMode) => {
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })

  const fetchFiltered = useCallback(async (profId: string) => {
    setLoadingFiltered(true)
    try {
      const res = await fetch(`/api/appointments/week?professionalId=${profId}`)
      if (!res.ok) throw new Error()
      const data = await res.json() as { appointments: Record<string, WeekAppointment[]> }
      setFilteredAppointments(data.appointments)
    } catch {
      setFilteredAppointments(null)
    } finally {
      setLoadingFiltered(false)
    }
  }, [])

  const handleProfChange = (val: string) => {
    setSelectedProf(val)
    localStorage.setItem(STORAGE_PROF_KEY, val)
    if (mode === 'lista') {
      if (val) {
        fetchFiltered(val)
      } else {
        setFilteredAppointments(null)
      }
    }
  }

  const displayAppointments = filteredAppointments
  const hasFilter = selectedProf !== ''
  const weekDays = getWeekDays(todayISO)
  const totalSemana = displayAppointments
    ? Object.values(displayAppointments).flat().length
    : 0

  return (
    <div className="space-y-4">
      {/* ── Filtro por profesional + Toggle ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {multiProfessional && professionals.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-muted)]" />
            <select
              value={selectedProf}
              onChange={(e) => handleProfChange(e.target.value)}
              className="h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white text-xs px-2 focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">Todos los profesionales</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Modo de vista"
          className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1 ml-auto"
        >
          <ToggleButton
            active={mode === 'lista'}
            onClick={() => switchMode('lista')}
            icon={<LayoutList className="h-4 w-4" />}
            label="Lista"
          />
          <ToggleButton
            active={mode === 'calendario'}
            onClick={() => switchMode('calendario')}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Calendario"
          />
        </div>
      </div>

      {/* ── Contenido ── */}
      {mode === 'lista' ? (
        hasFilter && displayAppointments ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {totalSemana} {totalSemana === 1 ? "cita" : "citas"} esta semana
              {loadingFiltered && (
                <span className="ml-2 text-xs text-[var(--text-muted)]">actualizando...</span>
              )}
            </p>
            {weekDays.map((dateISO) => {
              const date = new Date(dateISO + "T00:00:00Z")
              const dayName = DAYS_ES[date.getUTCDay()]
              const dayNum = date.getUTCDate()
              const month = MONTHS_ES[date.getUTCMonth()]
              const isToday = dateISO === todayISO
              const dayCitas = displayAppointments[dateISO] ?? []

              return (
                <div key={dateISO}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isToday ? "bg-[var(--color-accent)] text-white" : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                    }`}>
                      {dayNum}
                    </div>
                    <span className={`text-sm font-medium ${isToday ? "text-white" : "text-[var(--text-secondary)]"}`}>
                      {dayName} {dayNum} de {month}
                      {isToday && <span className="ml-2 text-xs text-[var(--color-accent)]">hoy</span>}
                    </span>
                    {dayCitas.length > 0 && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {dayCitas.length} {dayCitas.length === 1 ? "cita" : "citas"}
                      </span>
                    )}
                  </div>

                  {dayCitas.length === 0 ? (
                    <div className="ml-11 py-3 px-4 rounded-lg border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-muted)]">
                      Sin citas
                    </div>
                  ) : (
                    <div className="ml-11 space-y-2">
                      {dayCitas.map((apt) => {
                        const status = statusConfig[apt.estado] ?? statusConfig.Pendiente
                        return (
                          <div
                            key={apt.id}
                            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 flex items-center gap-3"
                          >
                            <span className="text-sm font-medium text-[var(--color-accent)] w-16 flex-shrink-0">
                              {formatHora(apt.hora)}
                            </span>
                            <div className="flex-1 flex-col gap-0.5">
                              <p className="text-sm font-semibold text-white leading-tight">{apt.nombre}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{apt.servicio}</p>
                              {multiProfessional && (
                                <p className="text-xs text-[var(--text-muted)]">
                                  {(apt as WeekAppointment & { profesional?: string }).profesional ?? "—"}
                                </p>
                              )}
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start mt-0.5 ${status.bg} ${status.text}`}>
                                {apt.estado}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          // Cuando no hay filtro, mostrar el server-rendered children
          <div>{children}</div>
        )
      ) : (
        <CalendarMonthView
          multiProfessional={multiProfessional}
          servicesText={servicesText}
          professionals={professionals}
          professionalFilter={selectedProf ? parseInt(selectedProf, 10) : undefined}
        />
      )}
    </div>
  )
}

function ToggleButton({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5',
        'text-sm font-medium transition-all duration-150',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
