'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, Legend } from 'recharts'

interface ChartDataPoint {
  fecha: string
  citas: number
  ingresos: number
}

interface Props {
  data: ChartDataPoint[]
  dataAnterior: ChartDataPoint[]
  modo: 'ingresos' | 'citas'
  onClickDia?: (fecha: string) => void
}

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card,#1a1a1a)] border border-[var(--border-subtle,#2a2a2a)] rounded-lg px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-[var(--text-secondary)] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[var(--text-primary,#fff)] font-medium" style={{ color: p.color }}>
          {p.name === 'ingresos' || p.name === 'Ingresos' || p.name === 'Período anterior'
            ? formatPesos(p.value)
            : `${p.value} citas`}
        </p>
      ))}
    </div>
  )
}

export function ChartIngresos({ data, dataAnterior, modo, onClickDia }: Props) {
  const mergedData = data.map((d, i) => ({
    ...d,
    anterior: dataAnterior[i]?.[modo === 'ingresos' ? 'ingresos' : 'citas'] ?? null,
  }))

  const handleClick = (entry: any) => {
    if (onClickDia && entry?.fecha) onClickDia(entry.fecha)
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={mergedData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={12}>
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
          axisLine={false} tickLine={false}
          tickFormatter={modo === 'ingresos' ? (v: number) => `$${(v/1000).toFixed(0)}k` : undefined}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
          iconSize={8}
        />
        <Bar
          dataKey={modo}
          name={modo === 'ingresos' ? 'Ingresos' : 'Citas'}
          fill={CHART_COLORS[0]}
          radius={[3, 3, 0, 0]}
          onClick={handleClick}
          style={{ cursor: onClickDia ? 'pointer' : undefined }}
        />
        {dataAnterior.length > 0 && (
          <Line
            dataKey="anterior"
            name="Período anterior"
            stroke="#888"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
