'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import type { MetricasData, RangoMetricas, CompararCon } from '@/lib/actions'
import { getMetricas } from '@/lib/actions'
import { KpiCard } from './metricas-kpi-card'
import { TabSelector, type VistaMetricas } from './metricas-tab-selector'
import { ChartIngresos } from './metricas-chart-ingresos'
import { ChartServicios } from './metricas-chart-servicios'
import { DrawerIngresos } from './drawer-ingresos'
import { DrawerCitasDelDia } from './drawer-citas-del-dia'
import { DrawerOcupacion } from './drawer-ocupacion'
import { DrawerServicioDetalle } from './drawer-servicio-detalle'
import { CalendarIcon } from 'lucide-react'

type DireccionBuena = 'subir' | 'bajar'
const METRICA_SEMANTICA: Record<string, DireccionBuena> = {
  Ingresos: 'subir',
  'Total citas': 'subir',
  Cancelaciones: 'bajar',
  Ocupación: 'subir',
  Retención: 'subir',
  'Clientes Nuevos': 'subir',
}

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
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
  professionalId?: number | null
  fechaDesde?: string
  fechaHasta?: string
}

const RANGOS: { key: RangoMetricas; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
]

function MetricasContent({
  data, isOwnerOrAdmin, vistaActiva, setDrawerState, modoChart, chartData, chartDataAnterior, onToggleModo
}: {
  data: MetricasData
  isOwnerOrAdmin: boolean
  vistaActiva: VistaMetricas
  setDrawerState: (state: { tipo: 'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle'; fecha?: string; servicio?: string } | null) => void
  modoChart: 'ingresos' | 'citas'
  chartData: { fecha: string; citas: number; ingresos: number }[]
  chartDataAnterior: { fecha: string; citas: number; ingresos: number }[]
  onToggleModo?: (modo: 'ingresos' | 'citas') => void
}) {
  const kpiScrollRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)

  useEffect(() => {
    const el = kpiScrollRef.current
    if (!el) return
    const update = () => {
      setScrollPos(el.scrollLeft)
      setMaxScroll(el.scrollWidth - el.clientWidth)
    }
    update()
    el.addEventListener('scroll', update)
    return () => el.removeEventListener('scroll', update)
  }, [])

  const kpiDots = vistaActiva === 'general' ? 6 : 0
  const scrollFraction = maxScroll > 0 ? scrollPos / maxScroll : 0
  const dotIndex = kpiDots > 0 ? Math.round(scrollFraction * (kpiDots - 1)) : 0

  return (
    <>
          {/* KPIs - cambian según vista activa */}
          {vistaActiva === 'general' && (
            <div className="mb-6">
              {/* Mobile scroll */}
              <div
                ref={kpiScrollRef}
                className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x scrollbar-none"
              >
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Ingresos"
                    valor={formatPesos(data.ingresos)}
                    variacion={data.ingresosVariacion != null ? {
                      valor: Math.abs(data.ingresosVariacion),
                      positiva: data.ingresosVariacion >= 0,
                    } : null}
                    direccionBuena={METRICA_SEMANTICA['Ingresos']}
                    sparklineData={data.sparklines.ingresos}
                    onClick={() => setDrawerState({ tipo: 'ingresos' })}
                  />
                </div>
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Total citas"
                    valor={String(data.totalCitas)}
                    variacion={data.totalCitasVariacion != null ? {
                      valor: Math.abs(data.totalCitasVariacion),
                      positiva: data.totalCitasVariacion >= 0,
                    } : null}
                    direccionBuena={METRICA_SEMANTICA['Total citas']}
                    sparklineData={data.sparklines.citas}
                  />
                </div>
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Cancelaciones"
                    valor={`${data.tasaCancelacion}%`}
                    variacion={data.tasaCancelacionVariacion != null ? {
                      valor: Math.abs(data.tasaCancelacionVariacion),
                      positiva: data.tasaCancelacionVariacion <= 0,
                    } : null}
                    direccionBuena={METRICA_SEMANTICA['Cancelaciones']}
                    sparklineData={data.sparklines.cancelaciones}
                  />
                </div>
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Ocupación"
                    valor={data.ocupacion != null ? `${data.ocupacion}%` : '—'}
                    variacion={data.ocupacionVariacion != null ? {
                      valor: Math.abs(data.ocupacionVariacion),
                      positiva: data.ocupacionVariacion >= 0,
                    } : null}
                    direccionBuena={METRICA_SEMANTICA['Ocupación']}
                    sparklineData={data.sparklines.ocupacion}
                    onClick={() => setDrawerState({ tipo: 'ocupacion' })}
                  />
                </div>
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Retención"
                    valor={data.retencion != null ? `${data.retencion}%` : '—'}
                    variacion={data.retencionVariacion != null ? {
                      valor: Math.abs(data.retencionVariacion),
                      positiva: data.retencionVariacion >= 0,
                    } : null}
                    direccionBuena={METRICA_SEMANTICA['Retención']}
                  />
                </div>
                <div className="snap-start min-w-[150px] flex-shrink-0">
                  <KpiCard
                    label="Clientes Nuevos"
                    valor={String(data.clientesNuevos)}
                    sub={`${data.clientesRecurrentes} recurrentes`}
                    direccionBuena={METRICA_SEMANTICA['Clientes Nuevos']}
                  />
                </div>
              </div>
              {/* Desktop grid */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-3">
                <KpiCard
                  label="Ingresos"
                  valor={formatPesos(data.ingresos)}
                  variacion={data.ingresosVariacion != null ? {
                    valor: Math.abs(data.ingresosVariacion),
                    positiva: data.ingresosVariacion >= 0,
                  } : null}
                  direccionBuena={METRICA_SEMANTICA['Ingresos']}
                  sparklineData={data.sparklines.ingresos}
                  onClick={() => setDrawerState({ tipo: 'ingresos' })}
                />
                <KpiCard
                  label="Total citas"
                  valor={String(data.totalCitas)}
                  variacion={data.totalCitasVariacion != null ? {
                    valor: Math.abs(data.totalCitasVariacion),
                    positiva: data.totalCitasVariacion >= 0,
                  } : null}
                  direccionBuena={METRICA_SEMANTICA['Total citas']}
                  sparklineData={data.sparklines.citas}
                />
                <KpiCard
                  label="Cancelaciones"
                  valor={`${data.tasaCancelacion}%`}
                  variacion={data.tasaCancelacionVariacion != null ? {
                    valor: Math.abs(data.tasaCancelacionVariacion),
                    positiva: data.tasaCancelacionVariacion <= 0,
                  } : null}
                  direccionBuena={METRICA_SEMANTICA['Cancelaciones']}
                  sparklineData={data.sparklines.cancelaciones}
                />
                <KpiCard
                  label="Ocupación"
                  valor={data.ocupacion != null ? `${data.ocupacion}%` : '—'}
                  variacion={data.ocupacionVariacion != null ? {
                    valor: Math.abs(data.ocupacionVariacion),
                    positiva: data.ocupacionVariacion >= 0,
                  } : null}
                  direccionBuena={METRICA_SEMANTICA['Ocupación']}
                  sparklineData={data.sparklines.ocupacion}
                  onClick={() => setDrawerState({ tipo: 'ocupacion' })}
                />
                <KpiCard
                  label="Retención"
                  valor={data.retencion != null ? `${data.retencion}%` : '—'}
                  variacion={data.retencionVariacion != null ? {
                    valor: Math.abs(data.retencionVariacion),
                    positiva: data.retencionVariacion >= 0,
                  } : null}
                  direccionBuena={METRICA_SEMANTICA['Retención']}
                />
                <KpiCard
                  label="Clientes Nuevos"
                  valor={String(data.clientesNuevos)}
                  sub={`${data.clientesRecurrentes} recurrentes`}
                  direccionBuena={METRICA_SEMANTICA['Clientes Nuevos']}
                />
              </div>
              {/* Pagination dots (mobile only) */}
              {kpiDots > 1 && (
                <div className="flex justify-center gap-1 mt-2 sm:hidden">
                  {Array.from({ length: kpiDots }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === dotIndex ? 'bg-[var(--color-accent,#6366f1)]' : 'bg-[var(--border-subtle,#2a2a2a)]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

      {vistaActiva === 'profesional' && (
        <div className="mb-6" role="tabpanel" id="panel-profesional" aria-labelledby="tab-profesional">
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
                    data.profesionales.map((p) => (
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
        <div role="tabpanel" id="panel-servicios" aria-labelledby="tab-servicios">
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
              <div role="img" aria-label="Gráfico de barras horizontal con ranking de servicios por ingresos">
                <ChartServicios
                  data={data.servicios}
                  onClickServicio={(nombre) => setDrawerState({ tipo: 'servicio-detalle', servicio: nombre })}
                />
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-6 border border-[var(--border-subtle,#2a2a2a)] text-center mb-6">
              <p className="text-[var(--text-secondary)] text-sm">Sin servicios en este período</p>
            </div>
          )}
        </div>
      )}

      {/* Chart de ingresos (General/Profesional) */}
      {(vistaActiva === 'general' || vistaActiva === 'profesional') && (
        <>
          {chartData.length > 0 ? (
            <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 border border-[var(--border-subtle,#2a2a2a)]" role="tabpanel" id="panel-general" aria-labelledby="tab-general">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">
                  {modoChart === 'ingresos' ? 'Ingresos por día' : 'Citas por día'}
                  <span className="ml-2 text-[10px] font-normal normal-case">
                    (línea punteada = período anterior)
                  </span>
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => onToggleModo?.('ingresos')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      modoChart === 'ingresos'
                        ? 'bg-[var(--color-accent,#6366f1)] text-white'
                        : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
                    }`}
                  >
                    Ingresos
                  </button>
                  <button
                    onClick={() => onToggleModo?.('citas')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      modoChart === 'citas'
                        ? 'bg-[var(--color-accent,#6366f1)] text-white'
                        : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
                    }`}
                  >
                    Citas
                  </button>
                </div>
              </div>
              <div role="img" aria-label={`Gráfico de barras de ${modoChart === 'ingresos' ? 'ingresos' : 'citas'} por día con comparación del período anterior`}>
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
            </div>
          ) : (
            <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-6 border border-[var(--border-subtle,#2a2a2a)] text-center">
              <p className="text-[var(--text-secondary)] text-sm">
                Sin citas en este período
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function MetricasClient({ data: initialData, error: initialError, rangoActivo: initialRango, businessId, role, professionalId, fechaDesde: initialDesde, fechaHasta: initialHasta }: Props) {
  const searchParams = useSearchParams()
  const reqRef = useRef(0)

  const [clientData, setClientData] = useState<MetricasData | null>(initialData)
  const [clientError, setClientError] = useState<string | null>(initialError)
  const [loadingData, setLoadingData] = useState(false)
  const [activeRango, setActiveRango] = useState<RangoMetricas>(initialRango)
  const [activeDesde, setActiveDesde] = useState<string | undefined>(initialDesde)
  const [activeHasta, setActiveHasta] = useState<string | undefined>(initialHasta)

  const [vistaActiva, setVistaActiva] = useState<VistaMetricas>('general')
  const [profFilter, setProfFilter] = useState<number | null>(null)
  const [drawerState, setDrawerState] = useState<{
    tipo: 'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle'
    fecha?: string
    servicio?: string
  } | null>(null)
  const [showCustomDate, setShowCustomDate] = useState(initialRango === 'custom')
  const [compararCon, setCompararCon] = useState<CompararCon>('periodo-anterior')
  const [modoChartManual, setModoChartManual] = useState<'ingresos' | 'citas'>('ingresos')

  const COMPARAR_OPTS: { key: CompararCon; label: string }[] = [
    { key: 'periodo-anterior', label: 'Período anterior' },
    { key: 'semana-anterior', label: 'Semana anterior' },
    { key: 'mes-anterior', label: 'Mes anterior' },
    { key: 'ano-anterior', label: 'Año anterior' },
  ]

  async function cambiarRango(rango: RangoMetricas, compararOverride?: CompararCon) {
    const cc = compararOverride ?? compararCon
    setCompararCon(cc)
    const params = new URLSearchParams(searchParams.toString())
    params.set('rango', rango)
    params.delete('desde')
    params.delete('hasta')
    if (rango === 'custom') {
      setShowCustomDate(true)
      return
    }
    setShowCustomDate(false)
    window.history.replaceState(null, '', `/dashboard/metricas?${params.toString()}`)

    const id = ++reqRef.current
    setLoadingData(true)
    try {
      const result = await getMetricas(businessId, rango, professionalId, undefined, undefined, cc)
      if (id !== reqRef.current) return
      if (result.data) setClientData(result.data)
      if (result.error) setClientError(result.error)
      setActiveRango(rango)
      setActiveDesde(undefined)
      setActiveHasta(undefined)
    } catch {
      if (id === reqRef.current) setClientError('Error cargando métricas')
    } finally {
      if (id === reqRef.current) setLoadingData(false)
    }
  }

  function aplicarCustomDate() {
    const desdeInput = document.getElementById('custom-desde') as HTMLInputElement
    const hastaInput = document.getElementById('custom-hasta') as HTMLInputElement
    if (!desdeInput?.value || !hastaInput?.value) return
    const desde = desdeInput.value
    const hasta = hastaInput.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('rango', 'custom')
    params.set('desde', desde)
    params.set('hasta', hasta)
    window.history.replaceState(null, '', `/dashboard/metricas?${params.toString()}`)

    const id = ++reqRef.current
    setLoadingData(true)
    getMetricas(businessId, 'custom', professionalId, desde, hasta, compararCon)
      .then(result => {
        if (id !== reqRef.current) return
        if (result.data) setClientData(result.data)
        if (result.error) setClientError(result.error)
        setActiveRango('custom')
        setActiveDesde(desde)
        setActiveHasta(hasta)
        setShowCustomDate(false)
      })
      .catch(() => {
        if (id === reqRef.current) setClientError('Error cargando métricas')
      })
      .finally(() => {
        if (id === reqRef.current) setLoadingData(false)
      })
  }

  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  if (clientError && !clientData) {
    return (
      <div className="flex items-center justify-center min-h-48 text-[var(--text-secondary)] text-sm">
        {clientError}
      </div>
    )
  }

  if (!clientData) {
    if (loadingData) {
      return (
        <div className="mb-6">
          <div className="hidden sm:grid sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiCard key={i} label="" valor="" loading />
            ))}
          </div>
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[150px] flex-shrink-0">
                <KpiCard label="" valor="" loading />
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center min-h-48 text-[var(--text-secondary)] text-sm">
        Sin datos
      </div>
    )
  }

  const chartData = clientData.historialPorDia.map(d => ({
    fecha: formatFechaCorta(d.fecha),
    citas: d.total,
    ingresos: d.ingresos,
  }))

  const chartDataAnterior = clientData.historialAnteriorPorDia.map(d => ({
    fecha: formatFechaCorta(d.fecha),
    citas: d.total,
    ingresos: d.ingresos,
  }))

  const hayIngresos = clientData.ingresos > 0
  const modoChart = vistaActiva === 'servicios' ? 'ingresos' : modoChartManual

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary,#fff)]">Métricas</h1>
        <div className="flex gap-2 flex-wrap">
          {RANGOS.map(r => (
            <button
              key={r.key}
              onClick={() => cambiarRango(r.key)}
              disabled={loadingData}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeRango === r.key
                  ? 'bg-[var(--color-accent,#6366f1)] text-white'
                  : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => cambiarRango('custom')}
            disabled={loadingData}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              activeRango === 'custom'
                ? 'bg-[var(--color-accent,#6366f1)] text-white'
                : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Custom date picker */}
      {showCustomDate && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-[var(--bg-card,#1a1a1a)] rounded-xl border border-[var(--border-subtle,#2a2a2a)]">
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="custom-desde" className="text-[11px] text-[var(--text-secondary)] shrink-0">Desde</label>
            <input
              id="custom-desde"
              type="date"
              defaultValue={activeDesde || ''}
              className="w-full px-2 py-1.5 rounded-lg text-sm bg-[var(--bg-card,#1a1a1a)] text-[var(--text-primary)] border border-[var(--border-subtle,#2a2a2a)]"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="custom-hasta" className="text-[11px] text-[var(--text-secondary)] shrink-0">Hasta</label>
            <input
              id="custom-hasta"
              type="date"
              defaultValue={activeHasta || ''}
              className="w-full px-2 py-1.5 rounded-lg text-sm bg-[var(--bg-card,#1a1a1a)] text-[var(--text-primary)] border border-[var(--border-subtle,#2a2a2a)]"
            />
          </div>
          <button
            onClick={aplicarCustomDate}
            disabled={loadingData}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-accent,#6366f1)] text-white"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Comparar con selector */}
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="comparar-select" className="text-[11px] text-[var(--text-secondary)] shrink-0">Comparar con:</label>
        <select
          id="comparar-select"
          value={compararCon}
          onChange={(e) => cambiarRango(activeRango, e.target.value as CompararCon)}
          disabled={loadingData}
          className="px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-card,#1a1a1a)] text-[var(--text-primary)] border border-[var(--border-subtle,#2a2a2a)]"
        >
          {COMPARAR_OPTS.map(op => (
            <option key={op.key} value={op.key}>{op.label}</option>
          ))}
        </select>
      </div>

      <TabSelector activa={vistaActiva} onChange={setVistaActiva} role={role} />

      {/* Filtro de profesional (solo owner/admin en vista profesional) */}
      {vistaActiva === 'profesional' && isOwnerOrAdmin && clientData.profesionalesActivos.length > 1 && (
        <div className="mb-4">
          <select
            value={profFilter ?? ''}
            onChange={(e) => setProfFilter(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-64 px-3 py-2 rounded-lg text-sm bg-[var(--bg-card,#1a1a1a)] text-[var(--text-primary)] border border-[var(--border-subtle,#2a2a2a)]"
            aria-label="Filtrar por profesional"
          >
            <option value="">Todos los profesionales</option>
            {clientData.profesionalesActivos.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <MetricasContent
        data={clientData}
        isOwnerOrAdmin={isOwnerOrAdmin}
        vistaActiva={vistaActiva}
        setDrawerState={setDrawerState}
        modoChart={modoChart}
        chartData={chartData}
        chartDataAnterior={chartDataAnterior}
        onToggleModo={setModoChartManual}
      />

      {/* Drawers */}
      <DrawerIngresos
        open={drawerState?.tipo === 'ingresos'}
        onClose={() => setDrawerState(null)}
        businessId={businessId}
        professionalId={role === 'profesional' ? undefined : undefined}
        rango={activeRango}
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
        rango={activeRango}
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
