'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBloqueo, deleteBloqueo } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function fechaNatural(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`
}

function toAmPm(hhmm: string) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

type Bloqueo = {
  id: number
  fecha: string
  tipo: 'cerrado' | 'horario_especial'
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
}

interface BloqueosClientProps {
  businessId: number
  initialBloqueos: Bloqueo[]
}

export function BloqueosClient({ businessId, initialBloqueos }: BloqueosClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<'cerrado' | 'horario_especial'>('cerrado')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [motivo, setMotivo] = useState('')

  function resetForm() {
    setFecha('')
    setTipo('cerrado')
    setHoraInicio('')
    setHoraFin('')
    setMotivo('')
    setError('')
  }

  function handleCreate() {
    setError('')
    if (!fecha) { setError('Selecciona una fecha'); return }
    if (tipo === 'horario_especial' && (!horaInicio || !horaFin)) {
      setError('Ingresa hora de inicio y fin'); return
    }
    if (tipo === 'horario_especial' && horaInicio >= horaFin) {
      setError('La hora de inicio debe ser menor que la de fin'); return
    }

    startTransition(async () => {
      const result = await createBloqueo({
        businessId,
        fecha,
        tipo,
        hora_inicio: horaInicio || undefined,
        hora_fin: horaFin || undefined,
        motivo: motivo || undefined,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        resetForm()
        router.refresh()
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteBloqueo(id, businessId)
      setConfirmDeleteId(null)
      router.refresh()
    })
  }

  const inputClass = cn(
    'w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10',
    'text-sm bg-[var(--bg-primary)] text-white',
    'focus:outline-none focus:border-[var(--color-accent)]'
  )

  return (
    <div className="space-y-8">
      {/* ── Formulario ── */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-5 space-y-4 border border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-white">Nuevo bloqueo</h2>

        {/* Fecha */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">Fecha</label>
          <input
            type="date"
            min={todayISO()}
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Tipo */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {(['cerrado', 'horario_especial'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  'rounded-lg border py-2 text-sm font-medium transition-colors',
                  tipo === t
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/50'
                )}
              >
                {t === 'cerrado' ? 'Día cerrado' : 'Horario especial'}
              </button>
            ))}
          </div>
        </div>

        {/* Horas (solo horario especial) */}
        {tipo === 'horario_especial' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Abre</label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Cierra</label>
              <input
                type="time"
                value={horaFin}
                onChange={e => setHoraFin(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Motivo */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">Motivo (opcional)</label>
          <input
            type="text"
            placeholder="Ej: Vacaciones, festivo, mantenimiento..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={isPending}
          className={cn(
            'w-full rounded-full h-10 text-sm font-semibold text-white transition-opacity',
            'bg-[var(--color-accent)] hover:opacity-90',
            isPending && 'opacity-50 pointer-events-none'
          )}
        >
          {isPending ? 'Guardando...' : 'Guardar bloqueo'}
        </button>
      </div>

      {/* ── Lista ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">
          Bloqueos activos ({initialBloqueos.length})
        </h2>

        {initialBloqueos.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            Sin bloqueos programados
          </p>
        ) : (
          initialBloqueos.map(b => (
            <div
              key={b.id}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white capitalize">
                  {fechaNatural(b.fecha)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {b.tipo === 'cerrado'
                    ? 'Día cerrado'
                    : `Horario especial: ${toAmPm(b.hora_inicio!.substring(0,5))} – ${toAmPm(b.hora_fin!.substring(0,5))}`}
                </p>
                {b.motivo && (
                  <p className="text-xs text-[var(--text-muted)]">{b.motivo}</p>
                )}
              </div>

              {confirmDeleteId === b.id ? (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={isPending}
                    className="rounded-lg bg-[var(--color-danger)] text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] px-3 py-1.5 hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(b.id)}
                  className="shrink-0 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
