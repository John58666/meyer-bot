'use client'

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
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/dashboard/metricas/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'ocupacion', businessId, professionalId, rango }),
    })
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false))
  }, [open, businessId, professionalId, rango])

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Mapa de Ocupación</SheetTitle>
          <SheetDescription>
            {rango === 'hoy' ? 'Hoy' : rango === 'semana' ? 'Esta semana' : 'Este mes'} — Cuanto más verde, más ocupado
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-8 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
              ))}
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
