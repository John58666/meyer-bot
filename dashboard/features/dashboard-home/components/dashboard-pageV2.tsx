"use client"

import { useState, useEffect, useCallback } from "react"
import { getMetricasV2, getOcupacionHeatmapV2 } from "../actionsV2"
import type { MetricasData, RangoMetricas } from "@/lib/actions"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Percent,
  UserPlus,
  Star,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  businessId: number
  isOwnerOrAdmin: boolean
  userProfessionalId: number | null
}

const RANGOS: { value: RangoMetricas; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
]

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const HORAS_HEATMAP = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

function getHeatColor(ratio: number): string {
  if (ratio === 0) return "bg-zf-border/20"
  if (ratio < 0.3) return "bg-orange-100"
  if (ratio < 0.5) return "bg-orange-200"
  if (ratio < 0.7) return "bg-orange-300"
  if (ratio < 0.9) return "bg-orange-400"
  return "bg-zf-primary"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(value)
}

function TrendBadge({ variacion }: { variacion: number | null }) {
  if (variacion == null) return null
  const isPositive = variacion > 0
  if (variacion === 0) return <span className="flex items-center gap-1 text-xs text-zf-text-muted"><Minus className="h-3 w-3" />0%</span>
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-zf-success-text" : "text-zf-error-text"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {variacion > 0 ? "+" : ""}{variacion}%
    </span>
  )
}

function SparklineSvg({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 56
  const h = 20
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} opacity={0.4} />
    </svg>
  )
}

export function DashboardPageV2({ businessId, isOwnerOrAdmin, userProfessionalId }: Props) {
  const [rango, setRango] = useState<RangoMetricas>("semana")
  const [data, setData] = useState<MetricasData | null>(null)
  const [heatmapGrid, setHeatmapGrid] = useState<Array<{ dia: string; hora: string; ratio: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const [metRes, heatRes] = await Promise.all([
        getMetricasV2(businessId, rango, isOwnerOrAdmin ? null : userProfessionalId),
        rango === "semana" ? getOcupacionHeatmapV2(businessId, isOwnerOrAdmin ? null : userProfessionalId) : Promise.resolve({ grid: [] }),
      ])
      if (metRes.data) setData(metRes.data)
      if (metRes.error) setError(metRes.error)
      if (heatRes.grid) setHeatmapGrid(heatRes.grid)
    } catch {
      setError("Error al cargar métricas")
    } finally {
      setLoading(false)
    }
  }, [businessId, rango, isOwnerOrAdmin, userProfessionalId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    const interval = setInterval(() => loadData(), 15000)
    const onVisible = () => { if (document.visibilityState === "visible") loadData() }
    const onFocus = () => loadData()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadData])

  const chartData = (data?.historialPorDia ?? []).map((d) => ({
    dia: DIAS_CORTOS[new Date(d.fecha + "T00:00:00").getDay()],
    ingresos: d.ingresos,
  }))

  const profesionales = (data?.profesionales ?? []).sort((a, b) => b.ingresos - a.ingresos).slice(0, 6)
  const newPct = data && data.clientesNuevos + data.clientesRecurrentes > 0
    ? Math.round((data.clientesNuevos / (data.clientesNuevos + data.clientesRecurrentes)) * 100)
    : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {RANGOS.map((r) => <div key={r.value} className="h-9 w-20 animate-pulse rounded-lg bg-zf-border/20" />)}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-zf-border/20" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-zf-border/20" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-zf-border/20" />
          <div className="h-48 animate-pulse rounded-xl bg-zf-border/20" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-error-bg">
          <AlertCircle className="h-7 w-7 text-zf-error-text" />
        </div>
        <p className="text-sm font-semibold text-zf-error-text">{error}</p>
        <button type="button" onClick={loadData} className="rounded-xl bg-zf-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90">
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
          <BarChart3 className="h-7 w-7 text-zf-text-muted" />
        </div>
        <p className="text-sm font-medium text-zf-text-secondary">Sin datos disponibles</p>
        <p className="text-xs text-zf-text-muted">No hay métricas para el período seleccionado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl bg-zf-surface border border-zf-border/50 p-1">
        {RANGOS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRango(r.value)}
            className={[
              "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              rango === r.value ? "bg-zf-primary text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
            ].join(" ")}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Ingresos" value={formatCurrency(data?.ingresos ?? 0)} variacion={data?.ingresosVariacion ?? null} sparkline={data?.sparklines?.ingresos} />
        <KpiCard icon={<Calendar className="h-4 w-4" />} label="Citas" value={data?.totalCitas ?? 0} variacion={data?.totalCitasVariacion ?? null} sparkline={data?.sparklines?.citas} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Ocupación" value={`${data?.ocupacion ?? 0}%`} variacion={data?.ocupacionVariacion ?? null} sparkline={data?.sparklines?.ocupacion} />
        <KpiCard icon={<UserPlus className="h-4 w-4" />} label="Nuevos clientes" value={data?.clientesNuevos ?? 0} variacion={null} />
      </div>

      <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zf-accent-text" />
          <h3 className="text-sm font-semibold text-zf-text">Ingresos por día</h3>
        </div>
        {chartData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0c0b1" strokeOpacity={0.3} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#8c7164" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8c7164" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} labelStyle={{ color: "#251913" }} />
                <Bar dataKey="ingresos" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-zf-text-muted">Sin datos de ingresos para este período</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-zf-accent-text" />
            <h3 className="text-sm font-semibold text-zf-text">Top profesionales</h3>
          </div>
          {profesionales.length > 0 ? (
            <div className="space-y-2">
              {profesionales.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-zf-border/20 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zf-accent-bg text-xs font-bold text-zf-accent-text">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zf-text">{p.name}</p>
                    <p className="text-xs text-zf-text-secondary">{p.citas} citas</p>
                  </div>
                  <span className="text-sm font-bold text-zf-accent-text">{formatCurrency(p.ingresos)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-zf-text-muted">Sin profesionales registrados</p>
          )}
        </div>

        <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-zf-accent-text" />
            <h3 className="text-sm font-semibold text-zf-text">Clientes</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-zf-text-secondary">Recurrentes vs Nuevos</span>
                <span className="font-semibold text-zf-text">{100 - newPct}% / {newPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zf-bg">
                <div className="h-full bg-zf-primary transition-all" style={{ width: `${100 - newPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-zf-bg/60 p-3 text-center">
              <div>
                <p className="text-lg font-bold text-zf-text">{data?.clientesRecurrentes ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Recurrentes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zf-text">{data?.clientesNuevos ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Nuevos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {rango === "semana" && heatmapGrid.length > 0 && (
        <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Percent className="h-4 w-4 text-zf-accent-text" />
            <h3 className="text-sm font-semibold text-zf-text">Ocupación horaria</h3>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="mb-2 grid grid-cols-[50px_repeat(7,1fr)] gap-1">
                <div className="h-6" />
                {DIAS_CORTOS.map((d) => (
                  <div key={d} className="flex h-6 items-center justify-center text-[10px] font-bold uppercase text-zf-text-secondary">{d}</div>
                ))}
              </div>
              {HORAS_HEATMAP.map((h) => {
                const hourLabel = `${String(h).padStart(2, "0")}:00`
                return (
                  <div key={h} className="mb-1 grid grid-cols-[50px_repeat(7,1fr)] gap-1">
                    <div className="flex items-center justify-end pr-2 text-[10px] text-zf-text-muted">{hourLabel}</div>
                    {DIAS_CORTOS.map((_, dayIdx) => {
                      const cell = heatmapGrid.find((c) => c.hora === hourLabel && new Date(c.dia + "T00:00:00").getDay() === dayIdx)
                      const ratio = cell?.ratio ?? 0
                      return (
                        <div key={dayIdx} className={`flex h-8 items-center justify-center rounded text-[10px] font-bold ${getHeatColor(ratio)} ${ratio > 0.5 ? "text-white" : "text-zf-text-muted"}`}>
                          {ratio > 0 ? `${Math.round(ratio * 100)}%` : ""}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, variacion, sparkline }: {
  icon: React.ReactNode
  label: string
  value: string | number
  variacion: number | null
  sparkline?: number[]
}) {
  return (
    <div className="rounded-xl border border-zf-border/50 bg-zf-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">{label}</span>
        <span className="text-zf-text-muted">{icon}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-zf-text">{value}</span>
        {sparkline && sparkline.length >= 2 && (
          <span className="text-zf-accent-text"><SparklineSvg data={sparkline} /></span>
        )}
      </div>
      <div className="mt-1">
        <TrendBadge variacion={variacion} />
      </div>
    </div>
  )
}
