"use client"

import { useState } from "react"
import { DrawerV2 } from "@/components/shared/drawerV2"
import {
  updateAppointmentStatusV2,
  rescheduleAppointmentV2,
} from "../actionsV2"
import { DAYS_FULL, MONTHS_ES, STATUS_BADGE } from "../constants"
import { formatHora } from "@/lib/utils"
import {
  CheckCircle2,
  Ban,
  RotateCcw,
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface AppointmentView {
  id: number
  nombre: string
  estado: string
  fecha: string
  hora: string
  servicio: string
  numero: string
  profesional?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  appointment: AppointmentView
  onUpdated: () => void
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

export function AppointmentDetailDrawerV2({
  open,
  onClose,
  appointment,
  onUpdated,
}: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleFecha, setRescheduleFecha] = useState(appointment.fecha ?? "")
  const [rescheduleHora, setRescheduleHora] = useState(appointment.hora ?? "")

  const status = STATUS_BADGE[appointment.estado] ?? STATUS_BADGE.Pendiente
  const isCancelled = appointment.estado === "Cancelada"
  const isCompletada = appointment.estado === "Completada"

  const handleStatusChange = async (
    id: number,
    estado: "Completada" | "Cancelada" | "Pendiente"
  ) => {
    setActionLoading(estado)
    setActionError("")
    const result = await updateAppointmentStatusV2(id, estado)
    setActionLoading(null)
    if (result.error) {
      setActionError(result.error)
    } else {
      onUpdated()
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleFecha || !rescheduleHora) {
      setActionError("Fecha y hora son obligatorias")
      return
    }
    setActionLoading("reschedule")
    setActionError("")
    const result = await rescheduleAppointmentV2(
      appointment.id,
      rescheduleFecha,
      rescheduleHora
    )
    setActionLoading(null)
    if (result.error) {
      setActionError(result.error)
    } else {
      onUpdated()
    }
  }

  return (
    <DrawerV2
      open={open}
      onClose={onClose}
      title="Detalle de Cita"
      className="w-full max-w-sm"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-700">
            {appointment.nombre?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <h3
              className={`text-base font-bold text-zf-text ${isCancelled ? "line-through" : ""}`}
            >
              {appointment.nombre}
            </h3>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: status.badge, color: status.badgeText }}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-zf-bg/60 p-4">
          <div className="flex items-center gap-2.5 text-sm">
            <Scissors className="h-4 w-4 shrink-0 text-zf-text-muted" />
            <span className="text-zf-text-secondary">Servicio:</span>
            <span className="font-semibold text-zf-text">{appointment.servicio}</span>
          </div>

          {appointment.profesional && (
            <div className="flex items-center gap-2.5 text-sm">
              <User className="h-4 w-4 shrink-0 text-zf-text-muted" />
              <span className="text-zf-text-secondary">Profesional:</span>
              <span className="font-semibold text-zf-text">
                {appointment.profesional}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-zf-text-muted" />
            <span className="text-zf-text-secondary">Teléfono:</span>
            <span className="font-medium text-zf-text">{appointment.numero}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-zf-text-muted" />
            <span className="text-zf-text-secondary">Fecha:</span>
            <span className="font-medium text-zf-text">
              {formatDate(appointment.fecha ?? "")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-zf-text-muted" />
            <span className="text-zf-text-secondary">Hora:</span>
            <span className="font-medium text-zf-text">
              {formatHora(appointment.hora)}
            </span>
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        {!isCancelled && !isCompletada && (
          <div className="space-y-3">
            <div className="border-t border-zf-border/40 pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Acciones
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(appointment.id, "Completada")}
                  disabled={!!actionLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-zf-success-bg/50 px-4 py-3 text-sm font-semibold text-zf-success-text transition-all hover:bg-zf-success-bg active:scale-[0.97] disabled:opacity-50"
                >
                  {actionLoading === "Completada" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Completar
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(appointment.id, "Cancelada")}
                  disabled={!!actionLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-sm font-semibold text-zf-error-text transition-all hover:bg-zf-error-bg active:scale-[0.97] disabled:opacity-50"
                >
                  {actionLoading === "Cancelada" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Cancelar
                </button>
              </div>
            </div>

            <div className="border-t border-zf-border/40 pt-4">
              <button
                type="button"
                onClick={() => setShowReschedule(!showReschedule)}
                className="flex w-full items-center justify-between text-sm font-semibold text-zf-text-secondary hover:text-zf-text"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Reagendar
                </span>
                {showReschedule ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showReschedule && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={rescheduleFecha}
                      onChange={(e) => setRescheduleFecha(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="flex-1 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800/20"
                    />
                    <input
                      type="time"
                      value={rescheduleHora}
                      onChange={(e) => setRescheduleHora(e.target.value)}
                      className="w-28 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-center text-sm text-zf-text focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    disabled={!!actionLoading || !rescheduleFecha || !rescheduleHora}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
                  >
                    {actionLoading === "reschedule" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reagendando...
                      </>
                    ) : (
                      "Confirmar Reagendamiento"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="border-t border-zf-border/40 pt-4">
            <button
              type="button"
              onClick={() => handleStatusChange(appointment.id, "Pendiente")}
              disabled={!!actionLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-100/70 active:scale-[0.97] disabled:opacity-50"
            >
              {actionLoading === "Pendiente" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reactivar Cita
            </button>
          </div>
        )}
      </div>
    </DrawerV2>
  )
}
