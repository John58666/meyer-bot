'use client'

import { useState, useTransition } from 'react'
import { createBloqueo, checkConflictosBloqueo } from '@/lib/actions'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetBloqueoProps {
  businessId: number
  professionalId?: number | null
  preselectProfessionalId?: number | null
  preselectFecha?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: () => void
}

export function BottomSheetBloqueo({
  businessId,
  professionalId,
  preselectProfessionalId,
  preselectFecha,
  trigger,
  open: externalOpen,
  onOpenChange,
  onCreated,
}: BottomSheetBloqueoProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen ?? internalOpen
  function setOpen(v: boolean) {
    setInternalOpen(v)
    onOpenChange?.(v)
  }
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [conflictCount, setConflictCount] = useState(0)
  const [forceOverride, setForceOverride] = useState(false)

  const [fecha, setFecha] = useState(preselectFecha ?? '')
  const [tipo, setTipo] = useState<'cerrado' | 'horario_especial'>('cerrado')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('18:00')
  const [motivo, setMotivo] = useState('')

  function resetForm() {
    setFecha(preselectFecha ?? '')
    setTipo('cerrado')
    setHoraInicio('09:00')
    setHoraFin('18:00')
    setMotivo('')
    setError('')
    setConflictCount(0)
    setForceOverride(false)
  }

  function handleOpenChange(open: boolean) {
    setOpen(open)
    if (open) resetForm()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fecha) {
      setError('Selecciona una fecha')
      return
    }

    startTransition(async () => {
      const targetProf = preselectProfessionalId ?? professionalId ?? null

      if (targetProf != null) {
        if (!forceOverride) {
          const count = await checkConflictosBloqueo(businessId, fecha, targetProf)
          setConflictCount(count)
          if (count > 0) return
        }
        setConflictCount(0)
      }

      const result = await createBloqueo({
        businessId,
        fecha,
        tipo,
        hora_inicio: tipo === 'horario_especial' ? horaInicio : undefined,
        hora_fin: tipo === 'horario_especial' ? horaFin : undefined,
        motivo: motivo || undefined,
        professionalId: targetProf,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        resetForm()
        onCreated?.()
      }
    })
  }

  const defaultTrigger = (
    <Button size="sm" className="rounded-full">
      <Plus className="h-4 w-4 mr-1" />
      Agregar bloqueo
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger>
        {trigger ?? defaultTrigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo bloqueo</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 px-1">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => { setFecha(e.target.value); setConflictCount(0) }}
              className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white focus:outline-none focus:border-[var(--color-accent)]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('cerrado')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
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
                  'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                  tipo === 'horario_especial'
                    ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)]',
                )}
              >
                Horario especial
              </button>
            </div>
          </div>

          {tipo === 'horario_especial' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)]">Desde</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)]">Hasta</label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={e => setHoraFin(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">Motivo (opcional)</label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Mantenimiento, vacaciones..."
              className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {conflictCount > 0 && !forceOverride && (
            <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning)]/5 px-3 py-2.5 space-y-2">
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
            <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />{error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full h-10 text-sm font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-full h-10 text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
