"use client"

import { useState, useEffect, useCallback } from "react"
import { getNotificationsV2, markNotificationReadV2 } from "@/features/dashboard-home/actionsV2"
import type { Notification } from "@/features/dashboard-home/actionsV2"
import { Bell, Loader2 } from "lucide-react"
import { ACCIONES_LABELS, ENTIDAD_LABELS } from "@/lib/audit-types"

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
      <button type="button" onClick={() => setOpen(!open)} className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zf-accent-bg hover:text-zf-accent-text" title="Notificaciones">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zf-primary text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-zf-border/50 bg-zf-surface shadow-lg">
            <div className="border-b border-zf-border/30 px-4 py-3">
              <p className="text-xs font-semibold text-zf-text">Notificaciones</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zf-text-muted" /></div>
              ) : notifications.length === 0 ? (
                <p className="py-6 text-center text-xs text-zf-text-muted">Sin notificaciones</p>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} type="button" onClick={() => handleMarkRead(n.id)}
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-zf-accent-bg/20 ${!n.leida ? "bg-zf-accent-bg/10" : ""}`}>
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.leida ? "bg-zf-primary" : "bg-zf-border"}`} />
                    <div>
                      <p className="font-medium text-zf-text">{ACCIONES_LABELS[n.accion] ?? n.accion}</p>
                      <p className="text-zf-text-muted">{ENTIDAD_LABELS[n.entidad] ?? n.entidad}{n.detalle ? ` — ${n.detalle}` : ""}</p>
                      <p className="mt-0.5 text-[10px] text-zf-text-muted">{new Date(n.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
                    </div>
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
