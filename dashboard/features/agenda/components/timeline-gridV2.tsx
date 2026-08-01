"use client"

import { AppointmentBlockV2 } from "./parts/appointment-blockV2"

interface GridColumn {
  id: number
  name: string
}

interface GridAppointment {
  id: number
  columnId: number
  startMinute: number
  durationMin: number
  hora: string
  nombre: string
  servicio: string
  estado: string
  isBlock?: boolean
  motivo?: string
}

interface Props {
  columns: GridColumn[]
  appointments: GridAppointment[]
  startHour: number
  endHour: number
  hourHeight: number
  onSlotClick: (columnId: number, hour: string) => void
  onAppointmentClick: (id: number) => void
  isToday: boolean
}

function formatHora(hour: number): string {
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const suffix = hour >= 12 ? "PM" : "AM"
  return `${display}:00 ${suffix}`
}

function getCurrentTimeTop(hourHeight: number): number {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  return (minutes / 60) * hourHeight
}

export function TimelineGridV2({
  columns,
  appointments,
  startHour,
  endHour,
  hourHeight,
  onSlotClick,
  onAppointmentClick,
  isToday,
}: Props) {
  const totalHours = endHour - startHour
  const totalHeight = totalHours * hourHeight

  return (
    <div className="relative overflow-hidden rounded-xl border border-zf-border/30 bg-zf-surface">
      <div
        className="grid"
        style={{ gridTemplateColumns: `60px repeat(${columns.length}, 1fr)` }}
      >
        <div className="border-b border-zf-border/40 bg-zf-bg/60 py-2">
          <span className="block text-center text-[10px] font-bold uppercase tracking-wider text-zf-text-muted">
            Hora
          </span>
        </div>
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex items-center justify-center gap-1.5 border-b border-zf-border/40 bg-zf-bg/60 py-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600">
              {col.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] font-semibold text-zf-text truncate">
              {col.name}
            </span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: `${totalHeight}px` }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: `60px repeat(${columns.length}, 1fr)` }}
        >
          {Array.from({ length: totalHours }, (_, i) => {
            const hour = startHour + i
            return (
              <div
                key={hour}
                className="contents"
                style={{ height: `${hourHeight}px` }}
              >
                <div
                  className="relative flex items-start justify-center border-r border-dashed border-zinc-200 pt-1 text-[10px] font-medium text-zf-text-muted"
                  style={{ height: `${hourHeight}px` }}
                >
                  {formatHora(hour)}
                </div>
                {columns.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => {
                      const hh = String(hour).padStart(2, "0")
                      onSlotClick(col.id, `${hh}:00`)
                    }}
                    className="cursor-pointer border-r border-dashed border-zinc-200 transition-colors hover:bg-zinc-50/50"
                    style={{ height: `${hourHeight}px` }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {appointments.map((apt) => {
          const colIndex = columns.findIndex((c) => c.id === apt.columnId)
          if (colIndex === -1) return null
          const colWidth = 100 / columns.length
          const left = `${60 / (60 + columns.length * (100 / columns.length)) * 100}%` // simplified below

          return (
            <AppointmentBlockV2
              key={apt.id}
              top={(apt.startMinute - startHour * 60) / 60 * hourHeight}
              left={`calc(60px + ${colIndex} * (100% - 60px) / ${columns.length})`}
              width={`calc((100% - 60px) / ${columns.length} - 2px)`}
              height={(apt.durationMin / 60) * hourHeight}
              hora={apt.hora}
              nombre={apt.nombre}
              servicio={apt.servicio}
              estado={apt.estado}
              isBlock={apt.isBlock}
              motivo={apt.motivo}
              onClick={() => onAppointmentClick(apt.id)}
            />
          )
        })}

        {isToday && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
            style={{ top: `${getCurrentTimeTop(hourHeight) - startHour * hourHeight}px` }}
          >
            <div className="h-3 w-3 rounded-full bg-rose-500 -ml-1.5" />
            <div className="flex-1 border-t border-rose-400" />
          </div>
        )}
      </div>
    </div>
  )
}
