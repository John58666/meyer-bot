'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ServicioData {
  nombre: string
  ingresos: number
  citas: number
}

interface Props {
  data: ServicioData[]
  onClickServicio?: (nombre: string) => void
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316']

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--bg-card,#1a1a1a)] border border-[var(--border-subtle,#2a2a2a)] rounded-lg px-3 py-2 text-[12px] shadow-lg">
      <p className="text-[var(--text-primary,#fff)] font-medium mb-1">{label}</p>
      <p className="text-[var(--text-secondary)]">{formatPesos(d.ingresos)} · {d.citas} citas</p>
    </div>
  )
}

export function ChartServicios({ data, onClickServicio }: Props) {
  const sorted = [...data].sort((a, b) => b.ingresos - a.ingresos)

  const handleClick = (entry: any) => {
    if (onClickServicio && entry?.nombre) onClickServicio(entry.nombre)
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        barSize={20}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
          axisLine={false} tickLine={false}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          radius={[0, 4, 4, 0]}
          onClick={handleClick}
          style={{ cursor: onClickServicio ? 'pointer' : undefined }}
        >
          {sorted.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
