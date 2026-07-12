'use client'

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
  if (ratio >= 0.8) return 'rgba(34,197,94,0.8)'
  if (ratio >= 0.5) return 'rgba(34,197,94,0.4)'
  if (ratio >= 0.2) return 'rgba(250,204,21,0.5)'
  return 'rgba(107,114,128,0.2)'
}

export function ChartOcupacion({ grid }: Props) {
  const dias = [...new Set(grid.map(g => g.dia))]
  const horas = [...new Set(grid.map(g => g.hora))].sort()

  if (grid.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
        Sin datos de ocupación para este período
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
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
        {horas.map(hora => (
          <>
            <div key={hora} className="text-[10px] text-[var(--text-secondary)] py-2">
              {hora}
            </div>
            {dias.map(dia => {
              const cell = grid.find(g => g.dia === dia && g.hora === hora)
              return (
                <div
                  key={`${dia}-${hora}`}
                  className="rounded-md h-8 flex items-center justify-center text-[10px] font-medium transition-colors"
                  style={{ backgroundColor: cell ? colorPorRatio(cell.ratio) : 'rgba(107,114,128,0.1)' }}
                  title={cell ? `${cell.ocupados}/${cell.total} ocupados` : 'Sin datos'}
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
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[10px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.8)' }} />
          80-100%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.4)' }} />
          50-80%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(250,204,21,0.5)' }} />
          20-50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(107,114,128,0.2)' }} />
          0-20%
        </span>
      </div>
    </div>
  )
}
