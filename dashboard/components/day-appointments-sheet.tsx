// components/day-appointments-sheet.tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, XCircle, CalendarRange, Clock3 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { updateAppointmentStatus, rescheduleAppointment } from '@/lib/actions'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: number
  fecha: string
  hora: string
  nombre: string
  servicio: string
  numero: string
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada'
}

// ─── Colores de badge por estado ─────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  Pendiente:  'bg-purple-100 text-purple-700 border-purple-200  dark:bg-purple-900/30 dark:text-purple-300',
  Confirmada: 'bg-blue-100   text-blue-700   border-blue-200    dark:bg-blue-900/30   dark:text-blue-300',
  Completada: 'bg-green-100  text-green-700  border-green-200   dark:bg-green-900/30  dark:text-green-300',
  Cancelada:  'bg-red-100    text-red-700    border-red-200     dark:bg-red-900/30    dark:text-red-300',
}

// Slots horarios disponibles para reagendar (9:00 → 18:00, cada hora)
const HOURLY_SLOTS = Array.from({ length: 10 }, (_, i) =>
  `${String(9 + i).padStart(2, '0')}:00`,
)

// ─── Props ────────────────────────────────────────────────────────────────────

interface DayAppointmentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  appointments: Appointment[]
  onActionComplete: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DayAppointmentsSheet({
  open,
  onOpenChange,
  date,
  appointments,
  onActionComplete,
}: DayAppointmentsSheetProps) {
  const [loadingId, setLoadingId]         = useState<number | null>(null)
  const [reagendarId, setReagendarId]     = useState<number | null>(null)
  const [newFecha, setNewFecha]           = useState('')
  const [newHora, setNewHora]             = useState('')
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null)

  if (!date) return null

  const canAct = (estado: string) =>
    estado !== 'Cancelada' && estado !== 'Completada'

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCompletar = async (id: number) => {
    setLoadingId(id)
    try {
      await updateAppointmentStatus(id, 'Completada')
      onActionComplete()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancelar = async (id: number) => {
    setLoadingId(id)
    setConfirmCancelId(null)
    try {
      await updateAppointmentStatus(id, 'Cancelada')
      onActionComplete()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleReagendar = async (id: number) => {
    if (!newFecha || !newHora) return
    setLoadingId(id)
    try {
      await rescheduleAppointment(id, newFecha, newHora)
      onActionComplete()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
      setReagendarId(null)
      setNewFecha('')
      setNewHora('')
    }
  }

  const openReagendar = (id: number) => {
    setReagendarId(prev => (prev === id ? null : id))
    setConfirmCancelId(null)
    setNewFecha('')
    setNewHora('')
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-8"
      >
        <SheetHeader className="mb-4 pt-2">
          <SheetTitle className="capitalize text-base">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
          </p>
        </SheetHeader>

        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">
              Sin citas para este día
            </p>
          ) : (
            appointments
              .slice()
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map(appt => {
                const isLoading      = loadingId === appt.id
                const isReagendaring = reagendarId === appt.id
                const isConfirmCancel = confirmCancelId === appt.id

                return (
                  <div
                    key={appt.id}
                    className="rounded-xl border border-border bg-card p-3 space-y-2"
                  >
                    {/* ── Cabecera de la cita ── */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold tabular-nums">
                            {appt.hora.substring(0, 5)}
                          </span>
                          <span className="text-sm font-medium">{appt.nombre}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-5">{appt.servicio}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] shrink-0', ESTADO_BADGE[appt.estado])}
                      >
                        {appt.estado}
                      </Badge>
                    </div>

                    {/* ── Acciones (solo si no es estado final) ── */}
                    {canAct(appt.estado) && !isReagendaring && (
                      <div className="flex gap-1.5 pt-0.5">
                        {/* Completar */}
                        <button
                          disabled={isLoading}
                          onClick={() => handleCompletar(appt.id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5',
                            'text-xs font-medium transition-colors',
                            'border-green-200 text-green-700 hover:bg-green-50',
                            'dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20',
                            isLoading && 'opacity-50 pointer-events-none',
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completar
                        </button>

                        {/* Cancelar — dos pasos */}
                        {!isConfirmCancel ? (
                          <button
                            disabled={isLoading}
                            onClick={() => {
                              setConfirmCancelId(appt.id)
                              setReagendarId(null)
                            }}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5',
                              'text-xs font-medium transition-colors',
                              'border-red-200 text-red-700 hover:bg-red-50',
                              'dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20',
                              isLoading && 'opacity-50 pointer-events-none',
                            )}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                        ) : (
                          <div className="flex-1 flex gap-1">
                            <button
                              onClick={() => handleCancelar(appt.id)}
                              className="flex-1 rounded-lg bg-red-600 text-white text-xs font-semibold py-1.5 hover:bg-red-700 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="px-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent transition-colors"
                            >
                              No
                            </button>
                          </div>
                        )}

                        {/* Reagendar */}
                        <button
                          disabled={isLoading}
                          onClick={() => openReagendar(appt.id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5',
                            'text-xs font-medium transition-colors border-border',
                            'hover:bg-accent',
                            isLoading && 'opacity-50 pointer-events-none',
                          )}
                        >
                          <CalendarRange className="h-3.5 w-3.5" />
                          Reagendar
                        </button>
                      </div>
                    )}

                    {/* ── Form inline de reagendar ── */}
                    {isReagendaring && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Selecciona nueva fecha y hora
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Fecha</label>
                            <input
                              type="date"
                              min={today}
                              value={newFecha}
                              onChange={e => setNewFecha(e.target.value)}
                              className={cn(
                                'w-full rounded-lg border border-border px-2.5 py-1.5',
                                'text-sm bg-background text-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-ring',
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Hora</label>
                            <select
                              value={newHora}
                              onChange={e => setNewHora(e.target.value)}
                              className={cn(
                                'w-full rounded-lg border border-border px-2.5 py-1.5',
                                'text-sm bg-background text-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-ring',
                              )}
                            >
                              <option value="">-- hora --</option>
                              {HOURLY_SLOTS.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            disabled={!newFecha || !newHora || isLoading}
                            onClick={() => handleReagendar(appt.id)}
                            className={cn(
                              'flex-1 rounded-lg bg-primary text-primary-foreground',
                              'text-sm font-medium py-2 transition-colors hover:opacity-90',
                              (!newFecha || !newHora || isLoading) && 'opacity-50 pointer-events-none',
                            )}
                          >
                            {isLoading ? 'Guardando…' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setReagendarId(null)}
                            className="px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
