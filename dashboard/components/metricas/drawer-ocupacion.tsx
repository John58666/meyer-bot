'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ChartOcupacion } from '@/components/metricas/metricas-chart-ocupacion'
import type { DrawerData } from '@/lib/actions'

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  professionalId?: number | null
  rango: string
}

export function DrawerOcupacion({ open, onClose, businessId, professionalId, rango }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/dashboard/metricas/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'ocupacion', businessId, professionalId, rango }),
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar datos'); return r.json() })
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d.data) } })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, businessId, professionalId, rango, retry])

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Mapa de Ocupación</SheetTitle>
          <SheetDescription>
            {rango === 'hoy' ? 'Hoy' : rango === 'semana' ? 'Esta semana' : rango === 'mes' ? 'Este mes' : rango === 'trimestre' ? 'Este trimestre' : 'Personalizado'} — Cuanto más verde, más ocupado
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-8 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button onClick={() => setRetry(r => r + 1)} className="text-xs text-[var(--color-accent,#6366f1)] underline">
                Reintentar
              </button>
            </div>
          ) : data?.tipo === 'ocupacion' ? (
            <div className="mt-4">
              <ChartOcupacion grid={data.grid} />
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-4">Sin datos de ocupación</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
