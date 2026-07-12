'use client'

import { useState } from 'react'

interface GridCell {
  dia: string
  hora: string
  ocupados: number
  total: number
  ratio: number
}

interface Props {
  grid: GridCell[]
}

function colorPorRatio(ratio: number): string {
  if (ratio >= 0.8) return '#1A8A4A'
  if (ratio >= 0.5) return '#1A5A3A'
  if (ratio >= 0.2) return '#8A7010'
  return '#3A3A3A'
}

export function ChartOcupacion({ grid }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const dias = [...new Set(grid.map(g => g.dia))]
  const horas = [...new Set(grid.map(g => g.hora))].sort()

  // Detectar hora actual en Bogotá para marcar
  const ahoraBogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const horaActualStr = `${ahoraBogota.getHours()}:00`

  if (grid.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
        Sin datos de ocupación para este período
      </div>
    )
  }

  return (
    <div className="overflow-x-auto relative">
      <div className="grid gap-1" style={{
        gridTemplateColumns: `80px repeat(${dias.length}, 1fr)`,
        minWidth: dias.length * 70 + 80,
      }}>
        <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide py-1" />
        {dias.map(dia => (
          <div key={dia} className="text-[10px] text-[var(--text-secondary)] text-center font-medium py-1 truncate">
            {dia}
          </div>
        ))}
        {horas.map(hora => {
          const esHoraActual = hora === horaActualStr
          return (
            <>
              <div key={hora} className={`text-[10px] py-2 ${esHoraActual ? 'text-[var(--color-accent,#6366f1)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                {hora}{esHoraActual && ' ←'}
              </div>
              {dias.map(dia => {
                const cell = grid.find(g => g.dia === dia && g.hora === hora)
                return (
                  <div
                    key={`${dia}-${hora}`}
                    className="rounded-md h-8 flex items-center justify-center text-[10px] font-medium transition-colors relative"
                    style={{ backgroundColor: cell ? colorPorRatio(cell.ratio) : '#2A2A2A' }}
                    onMouseEnter={(e) => {
                      if (!cell) return
                      const rect = (e.target as HTMLElement).getBoundingClientRect()
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        text: `${dia} ${hora}: ${cell.ocupados}/${cell.total} ocupados (${Math.round(cell.ratio * 100)}%)`,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {cell && (
                      <span className="text-white/80">
                        {cell.ocupados}/{cell.total}
                      </span>
                    )}
                  </div>
                )
              })}
            </>
          )
        })}
      </div>

      {/* Tooltip flotante */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--bg-card,#1a1a1a)] border border-[var(--border-subtle,#2a2a2a)] rounded-lg px-3 py-2 text-[11px] shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Color ramp legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#1A8A4A' }} />
            80-100%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#1A5A3A' }} />
            50-80%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#8A7010' }} />
            20-50%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#3A3A3A' }} />
            0-20%
          </span>
      </div>
    </div>
  )
}
