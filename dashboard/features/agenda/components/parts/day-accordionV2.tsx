"use client"

import { useMemo } from "react"
import type { AppointmentRow } from "@/lib/appointments"
import { DAYS_FULL, MONTHS_ES } from "../../constants"
import { ChevronDown, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppointmentCardV2 } from "./appointment-cardV2"

interface BloqueoRow {
  id: number
  fecha: string
  tipo: string
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
  professional_id: number | null
  professional_name?: string | null
}

interface Props {
  dateStr: string
  appointments: AppointmentRow[]
  bloqueos: BloqueoRow[]
  isExpanded: boolean
  onToggle: () => void
  onAppointmentClick: (apt: AppointmentRow) => void
  onComplete: (id: number) => Promise<void>
  onCancel: (id: number) => Promise<void>
  onWhatsApp: (numero: string) => void
  onUnlock: (bloqueoId: number) => Promise<void>
}

function getDayInfo(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  return {
    dayOfWeek: d.getDay(),
    dayNum: d.getDate(),
    month: d.getMonth(),
    isToday: dateStr === today,
  }
}

export function DayAccordionV2({
  dateStr,
  appointments,
  bloqueos,
  isExpanded,
  onToggle,
  onAppointmentClick,
  onComplete,
  onCancel,
  onWhatsApp,
  onUnlock,
}: Props) {
  const { dayOfWeek, dayNum, month, isToday } = getDayInfo(dateStr)

  const { activos, bloqsOrdenados, canceladas, merged } = useMemo(() => {
    const activos = [...appointments]
      .filter((a) => a.estado !== "Cancelada")
      .sort((a, b) => a.hora.localeCompare(b.hora))

    const bloqs = [...bloqueos]
      .filter((b) => !b.hora_inicio || b.hora_inicio >= "00:00")
      .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""))

    const canceladas = [...appointments]
      .filter((a) => a.estado === "Cancelada")
      .sort((a, b) => a.hora.localeCompare(b.hora))

    const merged: ("cita" | "bloqueo")[] = []
    let ai = 0
    let bi = 0
    while (ai < activos.length || bi < bloqs.length) {
      const aHora = activos[ai]?.hora ?? "99:99"
      const bHora = bloqs[bi]?.hora_inicio ?? "99:99"
      if (aHora <= bHora) {
        merged.push("cita")
        ai++
      } else {
        merged.push("bloqueo")
        bi++
      }
    }

    return { activos, bloqsOrdenados: bloqs, canceladas, merged }
  }, [appointments, bloqueos])

  const totalItems = activos.length + bloqueos.length + canceladas.length
  const totalSlots = totalItems + 4
  const pct = totalSlots > 0 ? Math.min(100, Math.round((activos.length / totalSlots) * 100)) : 0
  const completadas = appointments.filter((a) => a.estado === "Completada").length
  const pendientes = appointments.filter((a) => a.estado === "Pendiente").length

  let ai = 0
  let bi = 0

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-all",
        isExpanded ? "border-zf-border/40 bg-zf-surface shadow-sm" : "border-zf-border/20 bg-zf-surface"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
          isExpanded && !isToday
            ? "bg-zf-accent-bg/20"
            : isToday
              ? "bg-zf-accent-bg/10 hover:bg-zf-accent-bg/20"
              : "bg-zf-surface hover:bg-zf-accent-bg/5"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-zf-text truncate">
            {DAYS_FULL[dayOfWeek]} {dayNum} de {MONTHS_ES[month]}
            {isToday && (
              <span className="ml-2 text-xs font-bold text-zf-primary">Hoy</span>
            )}
          </span>
          {totalItems > 0 && (
            <span className="shrink-0 rounded-full bg-zf-accent-bg px-2 py-0.5 text-[10px] font-bold uppercase text-zf-accent-text">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalItems > 0 && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zf-bg">
                <div
                  className="h-full rounded-full bg-zf-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-zf-text-secondary">{pct}%</span>
            </div>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zf-text-muted transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3 border-t border-zf-border/20 pt-3">
          {merged.map((type) => {
            if (type === "cita") {
              const apt = activos[ai++]
              if (!apt) return null
              return (
                <AppointmentCardV2
                  key={`cita-${apt.id}`}
                  appointment={apt}
                  onClick={() => onAppointmentClick(apt)}
                  onComplete={onComplete}
                  onCancel={onCancel}
                  onWhatsApp={onWhatsApp}
                />
              )
            }
            const bloq = bloqsOrdenados[bi++]
            if (!bloq) return null
            return (
              <div
                key={`bloq-${bloq.id}`}
                className="flex items-center gap-3 rounded-lg border border-dashed border-zf-border/40 bg-zf-bg/50 px-4 py-2.5"
              >
                <Lock className="h-4 w-4 shrink-0 text-zf-text-muted" />
                <span className="flex-1 text-sm italic text-zf-text-secondary truncate">
                  {bloq.tipo === "cerrado" ? "Cierre" : "Bloqueo"}
                  {bloq.motivo ? `: ${bloq.motivo}` : ""}
                  {bloq.professional_name ? ` — ${bloq.professional_name}` : ""}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnlock(bloq.id)
                  }}
                  className="shrink-0 text-xs font-semibold text-zf-text-muted transition-colors hover:text-zf-error-text active:scale-[0.97]"
                >
                  LIBERAR
                </button>
              </div>
            )
          })}

          {canceladas.length > 0 && (
            <div className="space-y-2">
              <div className="border-t border-zf-border/20 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zf-text-muted">
                  Canceladas
                </span>
              </div>
              {canceladas.map((apt) => (
                <AppointmentCardV2
                  key={`cancel-${apt.id}`}
                  appointment={apt}
                  onClick={() => onAppointmentClick(apt)}
                />
              ))}
            </div>
          )}

          {totalItems > 0 && (
            <div className="border-t border-zf-border/20 pt-2 text-[11px] text-zf-text-muted flex flex-wrap gap-x-4 gap-y-1">
              <span>Total: {totalItems}</span>
              <span>Completadas: {completadas}</span>
              <span>Pendientes: {pendientes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
