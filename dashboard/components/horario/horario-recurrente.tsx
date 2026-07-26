'use client'

import { useState } from 'react'
import { updateProfessionalSchedule, deleteProfessionalSchedule, type ScheduleData } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { ToggleLeft, ToggleRight, AlertCircle, X } from 'lucide-react'

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface HorarioRecurrenteProps {
  businessId: number
  professionalId: number
  initialSchedule: ScheduleData
  businessSchedule: ScheduleData
  hasCustomSchedule: boolean
}

function dayKey(day: number) {
  return String(day)
}

function daysDiffer(a: ScheduleData, b: ScheduleData): boolean {
  const keysA = Object.keys(a).sort().join(',')
  const keysB = Object.keys(b).sort().join(',')
  if (keysA !== keysB) return true
  for (const d of Object.keys(a)) {
    const ha = a[d]
    const hb = b[d]
    if (!hb || ha.open !== hb.open || ha.close !== hb.close) return true
  }
  return false
}

function isDayCustom(day: number, schedule: ScheduleData, businessSchedule: ScheduleData): boolean {
  const dk = dayKey(day)
  const my = schedule[dk]
  const biz = businessSchedule[dk]
  if (!my && !biz) return false
  if (!my || !biz) return true
  return my.open !== biz.open || my.close !== biz.close
}

export function HorarioRecurrente({ businessId, professionalId, initialSchedule, businessSchedule, hasCustomSchedule }: HorarioRecurrenteProps) {
  const [useCustom, setUseCustom] = useState(hasCustomSchedule)
  const [schedule, setSchedule] = useState<ScheduleData>(initialSchedule)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)

  const isReadOnly = !useCustom

  function isOpen(day: number) {
    return schedule[dayKey(day)] != null
  }

  function toggleDay(day: number) {
    if (isReadOnly) return
    setSchedule(prev => {
      const next = { ...prev }
      const dk = dayKey(day)
      if (next[dk]) {
        delete next[dk]
      } else {
        const bizDay = businessSchedule[dk]
        next[dk] = bizDay ? { ...bizDay } : { open: 9, close: 19 }
      }
      return next
    })
    setSaved(false)
    setError('')
  }

  function updateHour(day: number, field: 'open' | 'close', value: number) {
    if (isReadOnly) return
    setSchedule(prev => {
      const next = { ...prev }
      const dk = dayKey(day)
      if (next[dk]) {
        next[dk] = { ...next[dk], [field]: value }
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

  async function handleEnableCustom() {
    setUseCustom(true)
    setSchedule({ ...businessSchedule })
    setSaved(false)
    setError('')
    setConfirmRestore(false)
  }

  async function handleDisableCustom() {
    const currentDiffers = daysDiffer(schedule, businessSchedule)
    if (currentDiffers && !confirmRestore) {
      setConfirmRestore(true)
      return
    }
    setError('')
    setSaving(true)
    const result = await deleteProfessionalSchedule(businessId, professionalId)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setUseCustom(false)
      setSchedule({ ...businessSchedule })
      setSaved(false)
      setConfirmRestore(false)
    }
  }

  function handleCancelRestore() {
    setConfirmRestore(false)
  }

  async function handleSave() {
    if (hasErrors() || !useCustom) return
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

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-white">Horario recurrente</h2>
        <button
          onClick={useCustom ? handleDisableCustom : handleEnableCustom}
          disabled={saving}
          className={cn(
            'text-xs font-medium rounded-full px-3 py-1.5 border transition-all',
            useCustom
              ? 'text-[var(--color-accent)] border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10'
              : 'text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-white hover:border-white/20'
          )}
        >
          {saving && !useCustom ? 'Restaurando...' : useCustom ? 'Usar horario propio' : 'Usar horario del negocio'}
        </button>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        {useCustom
          ? 'Horario personalizado — puedes editar cada día'
          : 'Usa el horario general del negocio — activa "Usar horario propio" para personalizar'}
      </p>

      {confirmRestore && (
        <div className="mb-4 p-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <p className="text-xs text-[var(--color-warning)] font-medium mb-2">
            ¿Restaurar horario del negocio? Se perderán los cambios no guardados de este horario.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDisableCustom}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-warning)] text-black hover:opacity-90 transition-opacity"
            >
              Sí, restaurar
            </button>
            <button
              onClick={handleCancelRestore}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {DAY_LABELS.map((label, day) => {
          const open = isOpen(day)
          const hs = schedule[dayKey(day)]
          const customized = useCustom && isDayCustom(day, schedule, businessSchedule)
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
                className={cn(
                  'shrink-0 transition-colors',
                  isReadOnly ? 'text-[var(--text-muted)] cursor-default' : 'text-[var(--text-secondary)] hover:text-white'
                )}
                title={isReadOnly ? '' : (open ? 'Cerrar día' : 'Abrir día')}
              >
                {open ? <ToggleRight size={20} className={isReadOnly ? 'text-[var(--text-muted)]' : 'text-green-400'} /> : <ToggleLeft size={20} />}
              </button>

              <span className={cn('text-sm w-20', open ? 'text-white font-medium' : 'text-[var(--text-secondary)]')}>
                {label}
              </span>

              {customized && (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                  Personalizado
                </span>
              )}

              {open && hs && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <select
                    value={hs.open}
                    onChange={e => updateHour(day, 'open', parseInt(e.target.value))}
                    disabled={isReadOnly}
                    className="px-1.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-[var(--color-accent)]/60 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {HOURS.filter(h => h < (schedule[dayKey(day)]?.close ?? 24)).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span className="text-[var(--text-secondary)] text-xs">a</span>
                  <select
                    value={hs.close}
                    onChange={e => updateHour(day, 'close', parseInt(e.target.value))}
                    disabled={isReadOnly}
                    className="px-1.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-[var(--color-accent)]/60 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {HOURS.filter(h => h > (schedule[dayKey(day)]?.open ?? 0)).map(h => (
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

      {useCustom && (
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
      )}
    </div>
  )
}
