'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createBloqueo, deleteBloqueo, checkConflictosBloqueo } from '@/lib/actions'
import { Trash2, AlertCircle, Ban, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { BloqueoRow, ScheduleData } from '@/lib/actions'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface DayDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: number
  professionalId: number | null
  selectedDate: string | null
  businessSchedule: ScheduleData
  bloqueos: BloqueoRow[]
  onBloqueoChanged: () => void
}

export function DayDetailSheet({
  open,
  onOpenChange,
  businessId,
  professionalId,
  selectedDate,
  businessSchedule,
  bloqueos,
  onBloqueoChanged,
}: DayDetailSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [conflictCount, setConflictCount] = useState(0)
  const [forceOverride, setForceOverride] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState<'cerrado' | 'horario_especial'>('cerrado')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('18:00')
  const [motivo, setMotivo] = useState('')

  const dayBloqueos = selectedDate
    ? bloqueos.filter(b => b.fecha === selectedDate)
    : []

  const dayOfWeek = selectedDate
    ? new Date(selectedDate + 'T12:00:00').getDay()
    : -1

  const daySchedule = selectedDate
    ? businessSchedule[String(dayOfWeek)]
    : null

  const isPastDate = selectedDate
    ? selectedDate < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    : false

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}:00`
  }

  function handleCloseDay() {
    if (!selectedDate || isPastDate) return
    setError('')
    setConflictCount(0)
    setForceOverride(false)
    setShowForm(false)
    setTipo('cerrado')

    startTransition(async () => {
      if (!forceOverride && professionalId != null) {
        const count = await checkConflictosBloqueo(businessId, selectedDate, professionalId)
        setConflictCount(count)
        if (count > 0) return
      }
      setConflictCount(0)

      const result = await createBloqueo({
        businessId,
        fecha: selectedDate,
        tipo: 'cerrado',
        professionalId,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        toast.success('Día bloqueado')
        onBloqueoChanged()
      }
    })
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate) return
    setError('')
    setConflictCount(0)

    if (tipo === 'horario_especial') {
      if (!horaInicio || !horaFin) {
        setError('Horario especial requiere hora de inicio y fin')
        return
      }
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser menor que la de fin')
        return
      }
    }

    startTransition(async () => {
      if (!forceOverride && professionalId != null) {
        const count = await checkConflictosBloqueo(businessId, selectedDate, professionalId)
        setConflictCount(count)
        if (count > 0) return
      }
      setConflictCount(0)

      const result = await createBloqueo({
        businessId,
        fecha: selectedDate,
        tipo,
        hora_inicio: tipo === 'horario_especial' ? horaInicio : undefined,
        hora_fin: tipo === 'horario_especial' ? horaFin : undefined,
        motivo: motivo || undefined,
        professionalId,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        toast.success(tipo === 'cerrado' ? 'Día bloqueado' : 'Horario especial guardado')
        setShowForm(false)
        setTipo('cerrado')
        setHoraInicio('09:00')
        setHoraFin('18:00')
        setMotivo('')
        onBloqueoChanged()
      }
    })
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    const result = await deleteBloqueo(id, businessId)
    if (result?.ok) {
      onBloqueoChanged()
    }
    setDeletingId(null)
  }

  const showCreateActions = selectedDate && !isPastDate

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        key={selectedDate || 'empty'}
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto sm:max-w-md sm:ml-auto sm:rounded-l-2xl sm:rounded-t-none sm:border-l"
      >
        {selectedDate ? (
          <>
            <SheetHeader className="mb-2">
              <SheetTitle>
                <span className="text-[var(--text-secondary)] font-normal text-xs block">
                  {DAY_NAMES[dayOfWeek]}
                </span>
                {formatDate(selectedDate)}
              </SheetTitle>
            </SheetHeader>

            {daySchedule ? (
              <div className="px-1 mb-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Clock className="h-3.5 w-3.5" />
                  Horario base: {formatHour(daySchedule.open)} - {formatHour(daySchedule.close)}
                </div>
              </div>
            ) : !isPastDate && (
              <div className="px-1 mb-4">
                <p className="text-xs text-[var(--text-muted)]">
                  No hay horario configurado para este día. Puedes crear un horario especial o bloquearlo.
                </p>
              </div>
            )}

            {isPastDate && (
              <div className="px-1 mb-4">
                <p className="text-xs text-[var(--text-muted)]">No se pueden modificar días pasados.</p>
              </div>
            )}

            <div className="px-1 mb-4">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Bloqueos
              </h4>
              {dayBloqueos.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-3">Sin bloqueos este día</p>
              ) : (
                <div className="space-y-1">
                  {dayBloqueos.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate flex items-center gap-1.5">
                          {b.tipo === 'cerrado' ? (
                            <>
                              <Ban className="h-3 w-3 text-[var(--color-danger)]" />
                              Cerrado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-[var(--color-warning)]" />
                              {b.hora_inicio?.slice(0, 5)} - {b.hora_fin?.slice(0, 5)}
                            </>
                          )}
                          {b.motivo && <span className="text-[var(--text-muted)]">· {b.motivo}</span>}
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
              )}
            </div>

            {conflictCount > 0 && !forceOverride && (
              <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning)]/5 px-3 py-2.5 space-y-2 mb-4">
                <p className="text-xs text-[var(--color-warning)] flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Hay {conflictCount} turno{conflictCount !== 1 ? 's' : ''} agendado{conflictCount !== 1 ? 's' : ''} en esta fecha.
                  Si bloqueas, esos turnos quedarán en conflicto.
                </p>
                <button
                  type="button"
                  onClick={() => setForceOverride(true)}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  Bloquear de todas formas
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-[var(--color-danger)] flex items-center gap-1 mb-4 px-1">
                <AlertCircle className="h-4 w-4" />{error}
              </p>
            )}

            {showCreateActions && !showForm && (
              <div className="space-y-2 px-1">
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseDay}
                    disabled={isPending || conflictCount > 0}
                    className="flex-1 rounded-full h-9 text-xs font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {isPending ? 'Guardando...' : 'Cerrar día'}
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    disabled={isPending}
                    className="flex-1 rounded-full h-9 text-xs font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Horario especial
                  </button>
                </div>
              </div>
            )}

            {showCreateActions && showForm && (
              <form onSubmit={handleSubmitForm} className="space-y-3 px-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Nuevo bloqueo
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('cerrado')}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs transition-colors',
                      tipo === 'cerrado'
                        ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]',
                    )}
                  >
                    Cerrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('horario_especial')}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs transition-colors',
                      tipo === 'horario_especial'
                        ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]',
                    )}
                  >
                    Horario especial
                  </button>
                </div>

                {tipo === 'horario_especial' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--text-secondary)]">Desde</label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={e => setHoraInicio(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-9 text-xs bg-[var(--bg-primary)] text-white focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--text-secondary)]">Hasta</label>
                      <input
                        type="time"
                        value={horaFin}
                        onChange={e => setHoraFin(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-9 text-xs bg-[var(--bg-primary)] text-white focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-secondary)]">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Ej: Mantenimiento, vacaciones..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-9 text-xs bg-[var(--bg-primary)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-full h-9 text-xs font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Selecciona un día para ver el detalle</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
