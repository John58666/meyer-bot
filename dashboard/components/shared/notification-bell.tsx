"use client"

import { useState, useEffect, useCallback } from "react"
import { getNotificationsV2, markNotificationReadV2 } from "@/features/dashboard-home/actionsV2"
import type { Notification } from "@/features/dashboard-home/actionsV2"
import { Bell, Loader2, Check } from "lucide-react"
import { ACCIONES_LABELS, ENTIDAD_LABELS } from "@/lib/audit-types"
import { cn } from "@/lib/utils"

const ACCION_ICON: Record<string, string> = {
  create_appointment: "text-emerald-500",
  cancel_appointment: "text-rose-500",
  complete_appointment: "text-sky-500",
  reschedule_appointment: "text-amber-500",
  create_bloqueo: "text-zinc-500",
  delete_bloqueo: "text-rose-500",
}

export function NotificationBell({ businessId }: { businessId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getNotificationsV2(businessId)
    if (res.notifications) setNotifications(res.notifications)
    setUnread(res.unread ?? 0)
    setLoading(false)
  }, [businessId])

  useEffect(() => { load() }, [load])

  const handleMarkRead = async (id: number) => {
    await markNotificationReadV2(id, businessId)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        title="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-zf-border/40 bg-zf-surface shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-zf-border/30 px-4 py-3">
              <p className="text-xs font-semibold text-zf-text">Notificaciones</p>
              {unread > 0 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                  {unread} sin leer
                </span>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-zf-text-muted" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Bell className="h-8 w-8 text-zf-border" />
                  <p className="text-xs text-zf-text-muted">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      !n.leida && "bg-zinc-50/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        !n.leida
                          ? ACCION_ICON[n.accion] ?? "bg-zinc-400"
                          : "bg-zinc-200"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold text-zf-text", !n.leida && "text-zinc-800")}>
                        {ACCIONES_LABELS[n.accion] ?? n.accion}
                      </p>
                      <p className="text-[11px] text-zf-text-muted truncate">
                        {ENTIDAD_LABELS[n.entidad] ?? n.entidad}{n.detalle ? ` — ${n.detalle}` : ""}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zf-text-muted">
                        {new Date(n.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                      </p>
                    </div>
                    {!n.leida && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-zinc-300 mt-0.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
