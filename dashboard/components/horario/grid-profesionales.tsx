'use client'

import { useState } from 'react'
import { Calendar, X, Ban, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HorarioRecurrente } from './horario-recurrente'
import { CalendarioBloqueos } from './calendario-bloqueos'
import { BottomSheetBloqueo } from './bottom-sheet-bloqueo'
import type { ProfesionalConHorario, ScheduleData, BloqueoRow } from '@/lib/actions'

const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

interface GridProfesionalesProps {
  businessId: number
  profesionales: ProfesionalConHorario[]
  businessSchedule: ScheduleData
  bloqueos: BloqueoRow[]
}

interface DrawerState {
  open: boolean
  professional: ProfesionalConHorario | null
}

export function GridProfesionales({ businessId, profesionales, businessSchedule, bloqueos }: GridProfesionalesProps) {
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, professional: null })
  const [cellMenu, setCellMenu] = useState<{ profId: number; day: number } | null>(null)
  const [bloqueoPreselect, setBloqueoPreselect] = useState<{ professionalId?: number; fecha?: string } | null>(null)

  function getScheduleForProf(prof: ProfesionalConHorario): ScheduleData {
    return prof.schedule ?? businessSchedule
  }

  function getCellColor(prof: ProfesionalConHorario, day: number): string {
    const schedule = getScheduleForProf(prof)
    const hs = schedule[String(day)]
    if (!hs) return 'bg-[var(--bg-primary)] opacity-40'
    return 'bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 cursor-pointer'
  }

  function getCellLabel(prof: ProfesionalConHorario, day: number): string {
    const schedule = getScheduleForProf(prof)
    const hs = schedule[String(day)]
    if (!hs) return '—'
    return `${String(hs.open).padStart(2, '0')}:00-${String(hs.close).padStart(2, '0')}:00`
  }

  function handleCellClick(profId: number, day: number) {
    setCellMenu(prev => (prev?.profId === profId && prev?.day === day) ? null : { profId, day })
  }

  function handleCloseDay(profId: number, day: number) {
    const date = new Date()
    const dayDiff = (day + 7 - date.getDay()) % 7
    date.setDate(date.getDate() + dayDiff)
    const fechaStr = date.toISOString().slice(0, 10)
    setBloqueoPreselect({ professionalId: profId, fecha: fechaStr })
    setCellMenu(null)
  }

  function handleAddBlock(profId: number, day: number) {
    const date = new Date()
    const dayDiff = (day + 7 - date.getDay()) % 7
    date.setDate(date.getDate() + dayDiff)
    const fechaStr = date.toISOString().slice(0, 10)
    setBloqueoPreselect({ professionalId: profId, fecha: fechaStr })
    setCellMenu(null)
  }

  return (
    <>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-48">
                  Profesional
                </th>
                {DAYS_SHORT.map((d, i) => (
                  <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profesionales.map(prof => {
                return (
                  <tr key={prof.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDrawer({ open: true, professional: prof })}
                        className="flex items-center gap-2 text-white font-medium hover:text-[var(--color-accent)] transition-colors text-left"
                      >
                        {prof.name}
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      </button>
                    </td>
                    {Array.from({ length: 7 }, (_, day) => (
                      <td key={day} className="px-1 py-1.5 relative">
                        <div
                          onClick={() => handleCellClick(prof.id, day)}
                          className={cn(
                            'rounded-lg px-2 py-1.5 text-center text-[11px] font-medium transition-colors',
                            getCellColor(prof, day),
                          )}
                        >
                          {getCellLabel(prof, day)}
                        </div>

                        {cellMenu?.profId === prof.id && cellMenu?.day === day && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg py-1 min-w-[140px]">
                            <button
                              onClick={() => handleCloseDay(prof.id, day)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cerrar día
                            </button>
                            <button
                              onClick={() => handleAddBlock(prof.id, day)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Agregar bloqueo
                            </button>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {profesionales.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No hay profesionales activos</p>
          </div>
        )}
      </div>

      {drawer.open && drawer.professional && (() => {
        const prof = drawer.professional
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawer({ open: false, professional: null })} />
            <div className="relative bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] w-full max-w-lg h-full overflow-y-auto p-6 animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{prof.name}</h3>
                <button
                  onClick={() => setDrawer({ open: false, professional: null })}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                <HorarioRecurrente
                  businessId={businessId}
                  professionalId={prof.id}
                  initialSchedule={prof.schedule ?? businessSchedule}
                  businessSchedule={businessSchedule}
                />

                <CalendarioBloqueos
                  businessId={businessId}
                  professionalId={prof.id}
                  initialBloqueos={bloqueos.filter(b =>
                    b.professional_id === prof.id || b.professional_id === null
                  )}
                />
              </div>
            </div>
          </div>
        )
      })()}

      <BottomSheetBloqueo
        businessId={businessId}
        open={bloqueoPreselect != null}
        preselectProfessionalId={bloqueoPreselect?.professionalId}
        preselectFecha={bloqueoPreselect?.fecha}
        onOpenChange={o => { if (!o) setBloqueoPreselect(null) }}
        onCreated={() => setBloqueoPreselect(null)}
      />
    </>
  )
}
