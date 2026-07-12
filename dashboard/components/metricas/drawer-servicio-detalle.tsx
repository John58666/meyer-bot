'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import type { DrawerData } from '@/lib/actions'

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  servicio?: string | null
}

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

export function DrawerServicioDetalle({ open, onClose, businessId, servicio }: Props) {
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!open || !servicio) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/dashboard/metricas/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'servicio-detalle', businessId, servicio }),
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar datos'); return r.json() })
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d.data) } })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, businessId, servicio, retry])

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="max-md:!w-[90vw] max-md:!max-w-[90vw] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{servicio || 'Detalle del Servicio'}</SheetTitle>
          <SheetDescription>
            Desglose por profesional y tendencia mensual
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button onClick={() => setRetry(r => r + 1)} className="text-xs text-[var(--color-accent,#6366f1)] underline">
                Reintentar
              </button>
            </div>
          ) : data?.tipo === 'servicio-detalle' ? (
            <div className="mt-4 space-y-6">
              <div>
                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Por profesional
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-[var(--text-secondary)] uppercase">
                      <th className="text-left py-2">Profesional</th>
                      <th className="text-right py-2">Citas</th>
                      <th className="text-right py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profesionales.map((p, i) => (
                      <tr key={i} className="border-t border-[var(--border-subtle,#2a2a2a)]">
                        <td className="py-2 text-[var(--text-primary)]">{p.name}</td>
                        <td className="py-2 text-right">{p.citas}</td>
                        <td className="py-2 text-right font-medium">{formatPesos(p.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.tendenciaMensual.length > 0 && (
                <div>
                  <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Tendencia mensual
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={data.tendenciaMensual} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
                        axisLine={false} tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card,#1a1a1a)',
                          border: '1px solid var(--border-subtle,#2a2a2a)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="citas"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm mt-4">Sin datos</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
