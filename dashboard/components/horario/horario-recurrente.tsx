'use client'

import { useState } from 'react'
import { updateProfessionalSchedule, type ScheduleData } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface HorarioRecurrenteProps {
  businessId: number
  professionalId: number
  initialSchedule: ScheduleData
  businessSchedule: ScheduleData
}

export function HorarioRecurrente({ businessId, professionalId, initialSchedule, businessSchedule }: HorarioRecurrenteProps) {
  const [schedule, setSchedule] = useState<ScheduleData>(initialSchedule)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function isOpen(day: number) {
    return schedule[String(day)] != null
  }

  function toggleDay(day: number) {
    setSchedule(prev => {
      const next = { ...prev }
      if (next[String(day)]) {
        delete next[String(day)]
      } else {
        const bizDay = businessSchedule[String(day)]
        next[String(day)] = bizDay ? { ...bizDay } : { open: 9, close: 19 }
      }
      return next
    })
    setSaved(false)
    setError('')
  }

  function updateHour(day: number, field: 'open' | 'close', value: number) {
    setSchedule(prev => {
      const next = { ...prev }
      if (next[String(day)]) {
        next[String(day)] = { ...next[String(day)], [field]: value }
      }
      return next
    })
    setSaved(false)
    setError('')
  }

  function hasErrors() {
    for (const [, hs] of Object.entries(schedule)) {
      if (hs.close <= hs.open) return true
    }
    return false
  }

  async function handleSave() {
    if (hasErrors()) return
    setError('')
    setSaving(true)
    const result = await updateProfessionalSchedule(businessId, professionalId, schedule)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  function isCustomized(): boolean {
    const bizKeys = Object.keys(businessSchedule).sort().join(',')
    const myKeys = Object.keys(schedule).sort().join(',')
    if (bizKeys !== myKeys) return true
    for (const [day, hs] of Object.entries(businessSchedule)) {
      const my = schedule[day]
      if (!my || my.open !== hs.open || my.close !== hs.close) return true
    }
    return false
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4">
      <h2 className="text-base font-semibold text-white mb-1">Horario recurrente</h2>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        {isCustomized() ? 'Horario personalizado (difiere del horario del negocio)' : 'Usa el horario general del negocio'}
      </p>

      <div className="space-y-1">
        {DAY_LABELS.map((label, day) => {
          const open = isOpen(day)
          const hs = schedule[String(day)]
          return (
            <div
              key={day}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors',
                open
                  ? 'bg-[var(--bg-primary)] border-[var(--border-subtle)]'
                  : 'bg-[var(--bg-primary)] border-transparent opacity-50',
              )}
            >
              <button
                onClick={() => toggleDay(day)}
                className="shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors"
                title={open ? 'Cerrar día' : 'Abrir día'}
              >
                {open ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
              </button>

              <span className={cn('text-sm w-20', open ? 'text-white font-medium' : 'text-[var(--text-secondary)]')}>
                {label}
              </span>

              {open && hs && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <select
                    value={hs.open}
                    onChange={e => updateHour(day, 'open', parseInt(e.target.value))}
                    className="px-1.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-[var(--color-accent)]/60"
                  >
                    {HOURS.filter(h => h < (schedule[String(day)]?.close ?? 24)).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="text-[var(--text-secondary)] text-xs">a</span>
                  <select
                    value={hs.close}
                    onChange={e => updateHour(day, 'close', parseInt(e.target.value))}
                    className="px-1.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-[var(--color-accent)]/60"
                  >
                    {HOURS.filter(h => h > (schedule[String(day)]?.open ?? 0)).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] flex items-center gap-1 mt-3">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || hasErrors()}
        className={cn(
          'w-full rounded-full h-10 text-sm font-semibold text-white transition-all mt-4',
          saved ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)] hover:opacity-90',
          (saving || hasErrors()) && 'opacity-50 pointer-events-none',
        )}
      >
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar horario'}
      </button>
    </div>
  )
}
