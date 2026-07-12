'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  valor: string | number
  variacion?: { valor: number; positiva: boolean } | null
  sub?: string
  onClick?: () => void
  loading?: boolean
}

export function KpiCard({ label, valor, variacion, sub, onClick, loading }: KpiCardProps) {
  const content = (
    <div
      className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 flex flex-col gap-1.5 border border-[var(--border-subtle,#2a2a2a)] transition-all duration-200"
      style={onClick ? { cursor: 'pointer' } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-20 bg-[var(--border-subtle,#2a2a2a)] rounded animate-pulse" />
      ) : (
        <span className="text-2xl font-bold text-[var(--text-primary,#fff)]">
          {valor}
        </span>
      )}
      {sub && !loading && (
        <span className="text-[11px] text-[var(--text-secondary)]">{sub}</span>
      )}
      {variacion && !loading && (
        <div className={`flex items-center gap-1 text-[11px] font-medium mt-0.5 ${
          variacion.positiva ? 'text-green-400' : 'text-red-400'
        }`}>
          {variacion.valor === 0 ? (
            <Minus className="w-3 h-3" />
          ) : variacion.positiva ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          <span>
            {variacion.valor > 0 ? '+' : ''}{variacion.valor}%
          </span>
        </div>
      )}
    </div>
  )

  if (onClick) {
    return <div onClick={onClick}>{content}</div>
  }
  return content
}
