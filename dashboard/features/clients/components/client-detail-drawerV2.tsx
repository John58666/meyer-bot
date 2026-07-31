"use client"

import { useState, useEffect, useCallback } from "react"
import { DrawerV2 } from "@/components/shared/drawerV2"
import { getClienteHistorialV2 } from "../actionsV2"
import type { Cliente } from "../actionsV2"
import { formatHora, getInitials, formatDate } from "@/lib/utils"
import { STATUS_BADGE } from "../constants"
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Scissors,
  Phone,
  MessageCircle,
  Pencil,
  History,
} from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  cliente: Cliente
  businessId: number
  onEdit: () => void
}

interface HistorialItem {
  id: number
  fecha: string
  hora: string
  servicio: string
  estado: string
}

export function ClientDetailDrawerV2({ open, onClose, cliente, businessId, onEdit }: Props) {
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialError, setHistorialError] = useState("")

  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true)
    setHistorialError("")
    try {
      const res = await getClienteHistorialV2(businessId, cliente.id)
      if ("historial" in res && res.historial) setHistorial(res.historial as HistorialItem[])
      if ("error" in res && res.error) setHistorialError(res.error)
    } catch {
      setHistorialError("Error al cargar historial")
    } finally {
      setLoadingHistorial(false)
    }
  }, [businessId, cliente.id])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadHistorial()
    }
  }, [open, loadHistorial])

  return (
    <DrawerV2 open={open} onClose={onClose} title={cliente.nombre} className="w-full max-w-sm">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-accent-bg text-lg font-bold text-zf-accent-text">
            {getInitials(cliente.nombre)}
          </div>
          <div>
            <h3 className="text-base font-bold text-zf-text">{cliente.nombre}</h3>
            <div className="flex items-center gap-1 text-sm text-zf-text-secondary">
              <Phone className="h-3 w-3" />
              {cliente.numero}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-zf-bg/60 p-4 text-center">
          <div>
            <p className="text-lg font-bold text-zf-text">{cliente.total_visitas}</p>
            <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Visitas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zf-text">
              {cliente.ultima_visita ? formatDate(cliente.ultima_visita).split(",")[0] : "—"}
            </p>
            <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Última</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zf-text">
              {cliente.primera_visita ? formatDate(cliente.primera_visita).split(",")[0] : "—"}
            </p>
            <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Primera</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/${cliente.numero.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-success-bg/50 px-4 py-2.5 text-sm font-semibold text-zf-success-text transition-all hover:bg-zf-success-bg active:scale-[0.97]"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => { onClose(); onEdit() }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zf-border bg-white px-4 py-2.5 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg active:scale-[0.97]"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        </div>

        <div className="border-t border-zf-border/40 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-zf-text-muted" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
              Historial de citas
            </h4>
          </div>

          {loadingHistorial ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zf-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando historial...
            </div>
          ) : historialError ? (
            <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {historialError}
            </div>
          ) : historial.length === 0 ? (
            <p className="py-4 text-center text-xs text-zf-text-muted">
              Sin historial de visitas
            </p>
          ) : (
            <div className="space-y-2">
              {historial.map((h) => {
                const style = STATUS_BADGE[h.estado] ?? STATUS_BADGE.Pendiente
                const isCancelled = h.estado === "Cancelada"
                return (
                  <div
                    key={h.id}
                    className={[
                      "rounded-xl border border-zf-border/30 bg-white p-3 transition-colors",
                      isCancelled ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-zf-text-muted" />
                          <span className={[
                            "text-xs font-semibold text-zf-text",
                            isCancelled ? "line-through" : "",
                          ].join(" ")}>
                            {formatDate(h.fecha)}
                          </span>
                          <Clock className="ml-1 h-3 w-3 text-zf-text-muted" />
                          <span className="text-xs text-zf-text-secondary">
                            {formatHora(h.hora)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Scissors className="h-3 w-3 text-zf-text-muted" />
                          <span className={[
                            "text-sm font-medium text-zf-text",
                            isCancelled ? "line-through" : "",
                          ].join(" ")}>
                            {h.servicio}
                          </span>
                        </div>
                      </div>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shrink-0"
                        style={{ backgroundColor: style.badge, color: style.badgeText }}
                      >
                        {h.estado}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DrawerV2>
  )
}
