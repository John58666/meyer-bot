'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { DrawerData } from '@/lib/actions'

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  professionalId?: number | null
  rango: string
}

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

export function DrawerIngresos({ open, onClose, businessId, professionalId, rango }: Props) {
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/dashboard/metricas/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'ingresos', businessId, professionalId, rango }),
    })
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false))
  }, [open, businessId, professionalId, rango])

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Desglose de Ingresos</SheetTitle>
          <SheetDescription>
            Período: {rango === 'hoy' ? 'Hoy' : rango === 'semana' ? 'Esta semana' : 'Este mes'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-10 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
              ))}
            </div>
          ) : data?.tipo === 'ingresos' ? (
            <>
              <table className="w-full mt-4 text-sm">
                <thead>
                  <tr className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">
                    <th className="text-left py-2 pr-2">Profesional</th>
                    <th className="text-left py-2 pr-2">Servicio</th>
                    <th className="text-right py-2 pr-2">Cant</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filas.map((fila, i) => (
                    <tr key={i} className="border-t border-[var(--border-subtle,#2a2a2a)]">
                      <td className="py-2 pr-2 text-[var(--text-primary)]">{fila.profesional}</td>
                      <td className="py-2 pr-2 text-[var(--text-secondary)]">{fila.servicio}</td>
                      <td className="py-2 pr-2 text-right">{fila.cantidad}</td>
                      <td className="py-2 text-right font-medium">{formatPesos(fila.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border-subtle,#2a2a2a)]">
                    <td colSpan={3} className="py-3 text-right font-semibold">Total</td>
                    <td className="py-3 text-right font-semibold">{formatPesos(data.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-4">Sin datos</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
