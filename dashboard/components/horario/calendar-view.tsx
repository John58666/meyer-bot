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
  }, [firstDayOfWeek, daysInMonth])

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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-semibold text-white tracking-tight">
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <button
          onClick={onNextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
                'aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all',
                selected
                  ? 'bg-[var(--color-accent)] shadow-sm shadow-[var(--color-accent)]/20'
                  : today
                    ? 'bg-white/8'
                    : configured
                      ? 'hover:bg-white/8 bg-white/3'
                      : 'hover:bg-white/5',
              )}
            >
              <span className={cn(
                'text-sm font-semibold leading-none',
                selected ? 'text-white' : today ? 'text-[var(--color-accent)]' : 'text-white/80',
                !configured && !selected && 'text-white/40',
              )}>
                {day}
              </span>
              {(hasCerrado || hasEspecial) && (
                <div className="flex gap-1 mt-1">
                  {hasCerrado && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />}
                  {hasEspecial && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
