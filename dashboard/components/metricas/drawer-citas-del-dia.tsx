'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { DrawerData } from '@/lib/actions'

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  professionalId?: number | null
  fecha?: string
}

const ESTADO_COLORS: Record<string, string> = {
  Completada: 'bg-green-500/20 text-green-400',
  Pendiente: 'bg-yellow-500/20 text-yellow-400',
  Cancelada: 'bg-red-500/20 text-red-400',
}

export function DrawerCitasDelDia({ open, onClose, businessId, professionalId, fecha }: Props) {
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/dashboard/metricas/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'citas-del-dia', businessId, professionalId, fecha }),
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar datos'); return r.json() })
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d.data) } })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, businessId, professionalId, fecha, retry])

  const tituloFecha = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Hoy'

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="max-md:!w-[90vw] max-md:!max-w-[90vw]">
        <SheetHeader>
          <SheetTitle>Citas del Día</SheetTitle>
          <SheetDescription>
            {tituloFecha} — {data?.tipo === 'citas-del-dia' ? `${data.filas.length} citas` : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button onClick={() => setRetry(r => r + 1)} className="text-xs text-[var(--color-accent,#6366f1)] underline">
                Reintentar
              </button>
            </div>
          ) : data?.tipo === 'citas-del-dia' ? (
            <div className="mt-4 space-y-2">
              {data.filas.map((fila, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--border-subtle,#2a2a2a)]/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        {fila.hora?.substring(0, 5)}
                      </span>
                      <span className="text-[13px] text-[var(--text-primary)] truncate">
                        {fila.nombre}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {fila.servicio} · {fila.profesional}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[fila.estado] || ''}`}>
                    {fila.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-4">Sin citas en este día</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
