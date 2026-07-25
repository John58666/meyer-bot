'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BloqueoRow, ScheduleData } from '@/lib/actions'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

interface CalendarViewProps {
  businessSchedule: ScheduleData
  bloqueos: BloqueoRow[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  currentMonth: number
  currentYear: number
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function CalendarView({
  businessSchedule,
  bloqueos,
  selectedDate,
  onSelectDate,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
}: CalendarViewProps) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [currentMonth, currentYear, firstDayOfWeek, daysInMonth])

  const bloqueoMap = useMemo(() => {
    const map = new Map<string, BloqueoRow[]>()
    for (const b of bloqueos) {
      const existing = map.get(b.fecha) ?? []
      existing.push(b)
      map.set(b.fecha, existing)
    }
    return map
  }, [bloqueos])

  function getBloqueosForDay(day: number): BloqueoRow[] {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return bloqueoMap.get(dateStr) ?? []
  }

  function isToday(day: number): boolean {
    const today = new Date()
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
  }

  function isSelected(day: number): boolean {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dateStr === selectedDate
  }

  function hasSchedule(day: number): boolean {
    return businessSchedule[String(day)] != null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-white">
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs text-[var(--text-muted)] font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, i) => {
          if (day == null) return <div key={`e-${i}`} className="aspect-square" />

          const dayBloqueos = getBloqueosForDay(day)
          const hasCerrado = dayBloqueos.some(b => b.tipo === 'cerrado')
          const hasEspecial = dayBloqueos.some(b => b.tipo === 'horario_especial')
          const today = isToday(day)
          const selected = isSelected(day)
          const configured = hasSchedule(day)

          return (
            <button
              key={day}
              onClick={() => {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                onSelectDate(dateStr)
              }}
              className={cn(
                'aspect-square flex flex-col items-center justify-center text-xs rounded-lg relative transition-colors',
                selected ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/10' :
                  today ? 'ring-1 ring-[var(--color-accent)]' : '',
                !configured && !hasCerrado && 'opacity-40',
                'hover:bg-white/5',
              )}
            >
              <span className={cn(
                'font-medium',
                selected ? 'text-white' : today ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]',
              )}>
                {day}
              </span>
              {(hasCerrado || hasEspecial) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasCerrado && <div className="w-1 h-1 rounded-full bg-[var(--color-danger)]" />}
                  {hasEspecial && <div className="w-1 h-1 rounded-full bg-[var(--color-warning)]" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {bloqueos.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-3">No hay bloqueos en este mes</p>
      )}
    </div>
  )
}
