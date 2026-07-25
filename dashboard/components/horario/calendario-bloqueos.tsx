'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { deleteBloqueo, getBloqueos } from '@/lib/actions'
import { BottomSheetBloqueo } from './bottom-sheet-bloqueo'
import { cn } from '@/lib/utils'
import type { BloqueoRow } from '@/lib/actions'

interface CalendarioBloqueosProps {
  businessId: number
  professionalId?: number | null
  initialBloqueos: BloqueoRow[]
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

export function CalendarioBloqueos({ businessId, professionalId, initialBloqueos }: CalendarioBloqueosProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return now.getMonth()
  })
  const [currentYear, setCurrentYear] = useState(() => {
    const now = new Date()
    return now.getFullYear()
  })
  const [bloqueos, setBloqueos] = useState(initialBloqueos)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  async function refetchBloqueos() {
    const result = await getBloqueos(businessId, professionalId, false)
    if (Array.isArray(result)) setBloqueos(result)
  }

  function goPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function goNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

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

  async function handleDelete(id: number) {
    setDeletingId(id)
    const result = await deleteBloqueo(id, businessId)
    if (result?.ok) {
      setBloqueos(prev => prev.filter(b => b.id !== id))
    }
    setDeletingId(null)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingBloqueos = bloqueos
    .filter(b => b.fecha >= todayStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 20)

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4">
      <h2 className="text-base font-semibold text-white mb-1">Excepciones</h2>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Días bloqueados o con horario especial</p>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-white">
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <button
          onClick={goNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs text-[var(--text-muted)] font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-4">
        {calendarDays.map((day, i) => {
          if (day == null) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }
          const dayBloqueos = getBloqueosForDay(day)
          const hasCerrado = dayBloqueos.some(b => b.tipo === 'cerrado')
          const hasEspecial = dayBloqueos.some(b => b.tipo === 'horario_especial')
          const today = isToday(day)

          return (
            <div
              key={day}
              className={cn(
                'aspect-square flex items-center justify-center text-xs rounded-lg relative',
                today && 'ring-1 ring-[var(--color-accent)]',
                hasCerrado ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]' :
                  hasEspecial ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]' :
                  'text-[var(--text-secondary)] hover:bg-white/5',
              )}
              title={dayBloqueos.map(b => `${b.tipo}: ${b.motivo ?? ''}`).join(', ')}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-danger)]/30" />
          <span className="text-[10px] text-[var(--text-muted)]">Cerrado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-warning)]/30" />
          <span className="text-[10px] text-[var(--text-muted)]">Esp.</span>
        </div>
      </div>

      <div className="space-y-1 mb-4 max-h-[200px] overflow-y-auto">
        {upcomingBloqueos.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">No hay bloqueos próximos</p>
        )}
        {upcomingBloqueos.map(b => (
          <div
            key={b.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
          >
            <div className="min-w-0">
              <p className="text-xs text-white truncate">
                {new Date(b.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {b.tipo === 'cerrado' ? 'Cerrado' : `${b.hora_inicio?.slice(0, 5)}-${b.hora_fin?.slice(0, 5)}`}
                {b.motivo ? ` · ${b.motivo}` : ''}
              </p>
            </div>
            <button
              onClick={() => handleDelete(b.id)}
              disabled={deletingId === b.id}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <BottomSheetBloqueo
        businessId={businessId}
        professionalId={professionalId}
        preselectFecha={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}
        onCreated={refetchBloqueos}
      />
    </div>
  )
}
