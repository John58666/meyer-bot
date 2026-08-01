"use client"

import { useState } from "react"
import type { AppointmentRow } from "@/lib/appointments"
import { STATUS_BADGE } from "../../constants"
import { formatHora } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  MoreVertical,
  CheckCircle2,
  XCircle,
  MessageCircle,
  User,
  Scissors,
} from "lucide-react"

interface Props {
  appointment: AppointmentRow
  onClick: () => void
  onComplete?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
  onWhatsApp?: (numero: string) => void
}

export function AppointmentCardV2({
  appointment,
  onClick,
  onComplete,
  onCancel,
  onWhatsApp,
}: Props) {
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const isCancelled = appointment.estado === "Cancelada"
  const isCompleted = appointment.estado === "Completada"
  const style = STATUS_BADGE[appointment.estado] ?? STATUS_BADGE.Pendiente

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onComplete) return
    setCompleting(true)
    try { await onComplete(appointment.id) } finally { setCompleting(false) }
  }

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onCancel) return
    setCancelling(true)
    try { await onCancel(appointment.id) } finally { setCancelling(false) }
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onWhatsApp) return
    const clean = appointment.numero.replace(/[\s\-\+\(\)]/g, "")
    if (clean) onWhatsApp(clean)
  }

  const showActions = !isCancelled && !isCompleted

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm active:scale-[0.98]",
        isCancelled
          ? "opacity-40 grayscale bg-zf-bg/50 border-zf-border/20"
          : "bg-zf-surface border-zf-border/30 hover:bg-zinc-100/5",
        "md:flex md:flex-row md:items-center md:gap-4 md:p-3"
      )}
      aria-disabled={isCancelled}
    >
      <div className="flex flex-col space-y-2.5 md:flex-row md:items-center md:gap-4 md:space-y-0">
        <div className="flex items-center justify-between md:w-20 md:shrink-0">
          <span
            className={cn(
              "text-sm font-bold text-zinc-700 md:w-full",
              isCancelled && "line-through"
            )}
          >
            {formatHora(appointment.hora)}
          </span>
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase md:hidden"
            style={{
              backgroundColor: style.badge,
              color: style.badgeText,
            }}
          >
            {style.label}
          </span>
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p
            className={cn(
              "text-sm font-semibold text-zf-text truncate max-w-full",
              isCancelled && "line-through"
            )}
          >
            {appointment.nombre}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-zf-text-secondary truncate">
            <Scissors className="h-3 w-3 shrink-0 text-zf-text-muted" />
            <span className={cn(isCancelled && "line-through", "truncate")}>
              {appointment.servicio}
            </span>
          </div>
          {appointment.profesional && (
            <div className="flex items-center gap-1 text-[11px] text-zf-text-muted">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.profesional}</span>
            </div>
          )}
        </div>

        <span
          className="hidden md:inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase md:w-20 md:text-center md:shrink-0"
          style={{
            backgroundColor: style.badge,
            color: style.badgeText,
          }}
        >
          {style.label}
        </span>

        <div className="flex items-center justify-between md:w-28 md:shrink-0 md:justify-end">
          {showActions ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zinc-100 hover:text-emerald-600 active:scale-[0.97] disabled:opacity-50"
                title="Completar"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zinc-100 hover:text-red-500 active:scale-[0.97] disabled:opacity-50"
                title="Cancelar"
              >
                <XCircle className="h-4 w-4" />
              </button>
              {appointment.numero && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zinc-100 hover:text-[#25D366] active:scale-[0.97]"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="md:hidden" />
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zinc-100 hover:text-zf-text active:scale-[0.97]"
            title="Detalle"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
    </button>
  )
}
