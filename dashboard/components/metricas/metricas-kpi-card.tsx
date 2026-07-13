'use client'

import { memo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  valor: string | number
  variacion?: { valor: number; positiva: boolean } | null
  direccionBuena?: 'subir' | 'bajar'
  sub?: string
  onClick?: () => void
  loading?: boolean
  sparklineData?: number[]
  valorActual?: number
  valorAnterior?: number
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 60
  const h = 20
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.5}
      />
    </svg>
  )
}

export const KpiCard = memo(function KpiCard({ label, valor, variacion, direccionBuena, sub, onClick, loading, sparklineData, valorActual, valorAnterior }: KpiCardProps) {
  const isGood = variacion
    ? (direccionBuena === 'bajar' ? !variacion.positiva : variacion.positiva)
    : true

  function formatTooltipVal(v: number): string {
    if (label.toLowerCase().includes('ingreso') || label.toLowerCase().includes('$')) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(v)
    }
    return String(v)
  }

  const content = (
    <div
      className={`bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 flex flex-col gap-1.5 border transition-colors duration-200 group relative ${
        onClick
          ? 'border-[var(--border-subtle,#2a2a2a)] hover:border-[var(--color-accent,#6366f1)]/40 cursor-pointer'
          : 'border-[var(--border-subtle,#2a2a2a)]'
      }`}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide truncate">
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-20 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--text-primary,#fff)]">
            {valor}
          </span>
          {sparklineData && sparklineData.length >= 2 && (
            <span className="text-[var(--text-secondary)]">
              <Sparkline data={sparklineData} />
            </span>
          )}
        </div>
      )}
      {sub && !loading && (
        <span className="text-[11px] text-[var(--text-secondary)]">{sub}</span>
      )}
      {variacion && !loading && (
        <div
          className={`flex items-center gap-1 text-[11px] font-medium mt-0.5 ${
            isGood ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {variacion.valor === 0 ? (
            <Minus className="w-3 h-3" />
          ) : isGood ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {variacion.valor > 0 ? '+' : ''}{variacion.valor}%
          </span>
          <span className="sr-only">
            {isGood ? 'Mejoró' : 'Empeoró'} {variacion.valor}% respecto al período anterior
          </span>
        </div>
      )}
      {(valorActual != null && valorAnterior != null && onClick) && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-[var(--bg-card,#1a1a1a)] border border-[var(--border-subtle,#2a2a2a)] rounded-lg px-3 py-2 text-[11px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <p className="text-[var(--text-secondary)]">vs período anterior</p>
          <p className="text-[var(--text-primary)]">Actual: {formatTooltipVal(valorActual)}</p>
          <p className="text-[var(--text-primary)]">Anterior: {formatTooltipVal(valorAnterior)}</p>
        </div>
      )}
    </div>
  )

  if (onClick) {
    return <div onClick={onClick}>{content}</div>
  }
  return content
})
