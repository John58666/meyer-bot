'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useCallback } from 'react'
import type { MetricasData, RangoMetricas } from '@/lib/actions'
import { KpiCard } from './metricas-kpi-card'
import { TabSelector, type VistaMetricas } from './metricas-tab-selector'
import { ChartIngresos } from './metricas-chart-ingresos'
import { ChartServicios } from './metricas-chart-servicios'
import { DrawerIngresos } from './drawer-ingresos'
import { DrawerCitasDelDia } from './drawer-citas-del-dia'
import { DrawerOcupacion } from './drawer-ocupacion'
import { DrawerServicioDetalle } from './drawer-servicio-detalle'

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

function formatHora(hora: number): string {
  if (hora === 0) return '12:00 AM'
  if (hora < 12) return `${hora}:00 AM`
  if (hora === 12) return '12:00 PM'
  return `${hora - 12}:00 PM`
}

function formatFechaCorta(fechaISO: string): string {
  const d = new Date(fechaISO + 'T00:00:00')
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()}`
}

interface Props {
  data: MetricasData | null
  error: string | null
  rangoActivo: RangoMetricas
  businessId: number
  role?: string
}

const RANGOS: { key: RangoMetricas; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
]

export default function MetricasClient({ data, error, rangoActivo, businessId, role }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [vistaActiva, setVistaActiva] = useState<VistaMetricas>('general')
  const [profFilter, setProfFilter] = useState<number | null>(null)
  const [drawerState, setDrawerState] = useState<{
    tipo: 'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle'
    fecha?: string
    servicio?: string
  } | null>(null)

  function cambiarRango(rango: RangoMetricas) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('rango', rango)
    startTransition(() => {
      router.push(`/dashboard/metricas?${params.toString()}`)
    })
  }

  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
        Sin datos
      </div>
    )
  }

  const chartData = data.historialPorDia.map(d => ({
    fecha: formatFechaCorta(d.fecha),
    citas: d.total,
    ingresos: d.ingresos,
  }))

  const chartDataAnterior = data.historialAnteriorPorDia.map(d => ({
    fecha: formatFechaCorta(d.fecha),
    citas: d.total,
    ingresos: d.ingresos,
  }))

  const hayIngresos = data.ingresos > 0
  const modoChart = vistaActiva === 'servicios' ? 'ingresos' : (hayIngresos ? 'ingresos' : 'citas')

  return (
    <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary,#fff)]">Métricas</h1>
        <div className="flex gap-2">
          {RANGOS.map(r => (
            <button
              key={r.key}
              onClick={() => cambiarRango(r.key)}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                rangoActivo === r.key
                  ? 'bg-[var(--color-accent,#6366f1)] text-white'
                  : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <TabSelector activa={vistaActiva} onChange={setVistaActiva} role={role} />

      {/* Filtro de profesional (solo owner/admin en vista profesional) */}
      {vistaActiva === 'profesional' && isOwnerOrAdmin && data.profesionalesActivos.length > 1 && (
        <div className="mb-4">
          <select
            value={profFilter ?? ''}
            onChange={(e) => setProfFilter(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-64 px-3 py-2 rounded-lg text-sm bg-[var(--bg-card,#1a1a1a)] text-[var(--text-primary)] border border-[var(--border-subtle,#2a2a2a)]"
          >
            <option value="">Todos los profesionales</option>
            {data.profesionalesActivos.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPIs - cambian según vista activa */}
      {vistaActiva === 'general' && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Ingresos"
              valor={formatPesos(data.ingresos)}
              variacion={data.ingresosVariacion != null ? {
                valor: Math.abs(data.ingresosVariacion),
                positiva: data.ingresosVariacion >= 0,
              } : null}
              onClick={() => setDrawerState({ tipo: 'ingresos' })}
            />
          </div>
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Total citas"
              valor={String(data.totalCitas)}
              variacion={data.totalCitasVariacion != null ? {
                valor: Math.abs(data.totalCitasVariacion),
                positiva: data.totalCitasVariacion >= 0,
              } : null}
            />
          </div>
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Cancelaciones"
              valor={`${data.tasaCancelacion}%`}
              variacion={data.tasaCancelacionVariacion != null ? {
                valor: Math.abs(data.tasaCancelacionVariacion),
                positiva: data.tasaCancelacionVariacion <= 0,
              } : null}
            />
          </div>
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Ocupación"
              valor={data.ocupacion != null ? `${data.ocupacion}%` : '—'}
              variacion={data.ocupacionVariacion != null ? {
                valor: Math.abs(data.ocupacionVariacion),
                positiva: data.ocupacionVariacion >= 0,
              } : null}
              onClick={() => setDrawerState({ tipo: 'ocupacion' })}
            />
          </div>
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Retención"
              valor={data.retencion != null ? `${data.retencion}%` : '—'}
              variacion={data.retencionVariacion != null ? {
                valor: Math.abs(data.retencionVariacion),
                positiva: data.retencionVariacion >= 0,
              } : null}
            />
          </div>
          <div className="snap-start min-w-[150px] flex-shrink-0 sm:min-w-0 sm:flex-1">
            <KpiCard
              label="Clientes Nuevos"
              valor={String(data.clientesNuevos)}
              sub={`${data.clientesRecurrentes} recurrentes`}
            />
          </div>
        </div>
      )}

      {vistaActiva === 'profesional' && (
        <div className="mb-6">
          <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl border border-[var(--border-subtle,#2a2a2a)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide border-b border-[var(--border-subtle,#2a2a2a)]">
                    <th className="text-left py-3 px-4">Profesional</th>
                    <th className="text-right py-3 px-4">Citas</th>
                    <th className="text-right py-3 px-4">Cancelaciones</th>
                    <th className="text-right py-3 px-4">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.profesionales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[var(--text-secondary)]">
                        Sin datos de profesionales
                      </td>
                    </tr>
                  ) : (
                    data.profesionales.map((p, i) => (
                      <tr key={p.id} className="border-t border-[var(--border-subtle,#2a2a2a)]">
                        <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{p.name}</td>
                        <td className="py-3 px-4 text-right">{p.citas}</td>
                        <td className="py-3 px-4 text-right text-red-400">{p.cancelaciones}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatPesos(p.ingresos)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {vistaActiva === 'servicios' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <KpiCard
              label="Servicio top (ingresos)"
              valor={data.servicios[0]?.nombre ?? '—'}
            />
            <KpiCard
              label="Servicio top (cantidad)"
              valor={data.servicios.sort((a, b) => b.citas - a.citas)[0]?.nombre ?? '—'}
            />
            <KpiCard
              label="Ingreso promedio"
              valor={data.servicios.length > 0
                ? formatPesos(Math.round(data.ingresos / data.servicios.length))
                : '$0'
              }
            />
          </div>

          {data.servicios.length > 0 ? (
            <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 border border-[var(--border-subtle,#2a2a2a)] mb-6">
              <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-4">
                Ranking de servicios por ingresos
              </p>
              <ChartServicios
                data={data.servicios}
                onClickServicio={(nombre) => setDrawerState({ tipo: 'servicio-detalle', servicio: nombre })}
              />
            </div>
          ) : (
            <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-6 border border-[var(--border-subtle,#2a2a2a)] text-center mb-6">
              <p className="text-[var(--text-secondary)] text-sm">Sin servicios en este período</p>
            </div>
          )}
        </>
      )}

      {/* Chart de ingresos (General/Profesional) */}
      {(vistaActiva === 'general' || vistaActiva === 'profesional') && chartData.length > 0 && (
        <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 border border-[var(--border-subtle,#2a2a2a)]">
          <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            {modoChart === 'ingresos' ? 'Ingresos por día' : 'Citas por día'}
            <span className="ml-2 text-[10px] font-normal normal-case">
              (línea punteada = período anterior)
            </span>
          </p>
          <ChartIngresos
            data={chartData}
            dataAnterior={chartDataAnterior}
            modo={modoChart}
            onClickDia={(fecha) => {
              const fechaReal = data.historialPorDia.find(d => formatFechaCorta(d.fecha) === fecha)
              if (fechaReal) setDrawerState({ tipo: 'citas-del-dia', fecha: fechaReal.fecha })
            }}
          />
        </div>
      )}

      {(vistaActiva === 'general' || vistaActiva === 'profesional') && chartData.length === 0 && (
        <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-6 border border-[var(--border-subtle,#2a2a2a)] text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Sin citas en este período
          </p>
        </div>
      )}

      {/* Drawers */}
      <DrawerIngresos
        open={drawerState?.tipo === 'ingresos'}
        onClose={() => setDrawerState(null)}
        businessId={businessId}
        professionalId={role === 'profesional' ? undefined : undefined}
        rango={rangoActivo}
      />

      <DrawerCitasDelDia
        open={drawerState?.tipo === 'citas-del-dia'}
        onClose={() => setDrawerState(null)}
        businessId={businessId}
        fecha={drawerState?.fecha}
      />

      <DrawerOcupacion
        open={drawerState?.tipo === 'ocupacion'}
        onClose={() => setDrawerState(null)}
        businessId={businessId}
        rango={rangoActivo}
      />

      <DrawerServicioDetalle
        open={drawerState?.tipo === 'servicio-detalle'}
        onClose={() => setDrawerState(null)}
        businessId={businessId}
        servicio={drawerState?.servicio}
      />
    </div>
  )
}
