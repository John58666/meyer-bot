'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { DrawerData } from '@/lib/actions'

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  professionalId?: number | null
}

export function DrawerCancelaciones({ open, onClose, businessId, professionalId }: Props) {
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
      body: JSON.stringify({ tipo: 'cancelaciones', businessId, professionalId }),
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar datos'); return r.json() })
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d.data) } })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, businessId, professionalId, retry])

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="max-md:!w-[90vw] max-md:!max-w-[90vw]">
        <SheetHeader>
          <SheetTitle>Cancelaciones</SheetTitle>
          <SheetDescription>
            {data?.tipo === 'cancelaciones' ? `${data.filas.length} citas canceladas` : ''}
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
          ) : data?.tipo === 'cancelaciones' ? (
            <div className="mt-4 space-y-2">
              {data.filas.map((fila, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--border-subtle,#2a2a2a)]/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        {fila.fecha}
                      </span>
                      <span className="text-[13px] text-[var(--text-primary)] truncate">
                        {fila.nombre}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {fila.hora?.substring(0, 5)} · {fila.servicio} · {fila.profesional}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-4">Sin cancelaciones</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
