// components/calendar-month-view.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, getDaysInMonth, getDay, addMonths, subMonths, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DayAppointmentsSheet } from '@/components/day-appointments-sheet'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Appointment = {
  id: number
  fecha: string  // YYYY-MM-DD
  hora: string   // HH:MM:SS
  nombre: string
  servicio: string
  numero: string
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada'
}

// ─── Constantes de color por estado ──────────────────────────────────────────

const ESTADO_DOT: Record<string, string> = {
  Pendiente:  'bg-purple-500',
  Confirmada: 'bg-blue-500',
  Completada: 'bg-green-500',
  Cancelada:  'bg-red-400',
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ─── Construye la grilla del mes (semanas empezando el lunes) ─────────────────

function buildGrid(month: Date): Array<Array<Date | null>> {
  const year      = month.getFullYear()
  const monthIdx  = month.getMonth()
  const firstDay  = new Date(year, monthIdx, 1)
  const days      = getDaysInMonth(month)
  // getDay() devuelve 0=Dom…6=Sáb → convertir a 0=Lun…6=Dom
  const startPad  = (getDay(firstDay) + 6) % 7

  const cells: Array<Date | null> = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(year, monthIdx, i + 1)),
  ]
  // Completar última fila
  while (cells.length % 7 !== 0) cells.push(null)

  const grid: Array<Array<Date | null>> = []
  for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7))
  return grid
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CalendarMonthView() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, Appointment[]>>({})
  const [loading, setLoading]       = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen]   = useState(false)

  // ── Fetch del mes ────────────────────────────────────────────────────────────
  const fetchMonth = useCallback(async (date: Date) => {
    setLoading(true)
    try {
      const year  = date.getFullYear()
      const month = date.getMonth() + 1
      const res   = await fetch(`/api/appointments/month?year=${year}&month=${month}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data  = await res.json() as { appointments: Appointment[] }

      const byDate: Record<string, Appointment[]> = {}
      for (const appt of data.appointments) {
        // appt.fecha viene como YYYY-MM-DD desde PostgreSQL
        if (!byDate[appt.fecha]) byDate[appt.fecha] = []
        byDate[appt.fecha].push(appt)
      }
      setAppointmentsByDate(byDate)
    } catch (err) {
      console.error('[CalendarMonthView] fetchMonth error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch al cambiar de mes + polling 30s (idéntico al resto del dashboard)
  useEffect(() => {
    fetchMonth(currentMonth)
    const id = setInterval(() => fetchMonth(currentMonth), 30_000)
    return () => clearInterval(id)
  }, [currentMonth, fetchMonth])

  // ── Grilla ───────────────────────────────────────────────────────────────────
  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDayClick = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    if (!appointmentsByDate[key]?.length) return
    setSelectedDate(date)
    setSheetOpen(true)
  }

  const selectedKey          = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedAppointments = selectedKey ? (appointmentsByDate[selectedKey] ?? []) : []

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Navegación de mes ── */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h2 className={cn(
          'text-sm font-semibold capitalize transition-opacity',
          loading && 'opacity-40',
        )}>
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>

        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Cabecera de días ── */}
      <div className="grid grid-cols-7 border-b border-border mb-0">
        {DIAS_SEMANA.map(d => (
          <div
            key={d}
            className="text-center text-[11px] font-medium text-muted-foreground py-1.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Grilla del mes ── */}
      <div className={cn(
        'border-l border-t border-border transition-opacity rounded-b-lg overflow-hidden',
        loading && 'opacity-50 pointer-events-none',
      )}>
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((date, di) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${wi}-${di}`}
                    className="h-[72px] border-r border-b border-border bg-muted/30"
                  />
                )
              }

              const key            = format(date, 'yyyy-MM-dd')
              const appts          = appointmentsByDate[key] ?? []
              const uniqueStatuses = [...new Set(appts.map(a => a.estado))]
              const today          = isToday(date)
              const hasAppts       = appts.length > 0

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    'h-[72px] border-r border-b border-border p-1.5',
                    'flex flex-col items-center',
                    hasAppts
                      ? 'cursor-pointer hover:bg-accent/40 active:bg-accent/60 transition-colors'
                      : 'cursor-default',
                  )}
                >
                  {/* Número del día */}
                  <span className={cn(
                    'text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium',
                    today
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground',
                  )}>
                    {date.getDate()}
                  </span>

                  {/* Puntos de estado */}
                  {uniqueStatuses.length > 0 && (
                    <div className="flex gap-[3px] mt-1 flex-wrap justify-center">
                      {uniqueStatuses.map(status => (
                        <span
                          key={status}
                          title={status}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            ESTADO_DOT[status] ?? 'bg-muted-foreground',
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Conteo */}
                  {appts.length > 0 && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                      {appts.length} {appts.length === 1 ? 'cita' : 'citas'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Leyenda ── */}
      <div className="flex flex-wrap gap-3 mt-3 px-1">
        {Object.entries(ESTADO_DOT).map(([estado, color]) => (
          <div key={estado} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', color)} />
            <span className="text-[11px] text-muted-foreground">{estado}</span>
          </div>
        ))}
      </div>

      {/* ── Sheet del día ── */}
      <DayAppointmentsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        appointments={selectedAppointments}
        onActionComplete={() => fetchMonth(currentMonth)}
      />
    </>
  )
}
