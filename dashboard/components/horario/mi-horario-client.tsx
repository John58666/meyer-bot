'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ProfesionalConHorario, BloqueoRow, ScheduleData } from '@/lib/actions'
import { getBloqueos } from '@/lib/actions'
import { CalendarView } from './calendar-view'
import { DayDetailSheet } from './day-detail-sheet'
import { HorarioRecurrente } from './horario-recurrente'
import { Settings, Check, ChevronDown } from 'lucide-react'

type ProfessionalData = {
  success: true
  view: 'professional'
  businessSchedule: ScheduleData
  schedule: ScheduleData | null
  bloqueos: BloqueoRow[]
}

type OwnerAdminData = {
  success: true
  view: 'ownerAdmin'
  businessSchedule: ScheduleData
  profesionales: ProfesionalConHorario[]
  bloqueos: BloqueoRow[]
}

interface MiHorarioClientProps {
  data: ProfessionalData | OwnerAdminData
  role: string
  businessId: number
  professionalId: number | null
}

export function MiHorarioClient({ data, role: _role, businessId, professionalId }: MiHorarioClientProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const isAdmin = data.view === 'ownerAdmin'

  const [selectedProfId, setSelectedProfId] = useState<number | null>(
    isAdmin ? (data.profesionales[0]?.id ?? null) : professionalId
  )

  const [bloqueos, setBloqueos] = useState(data.bloqueos)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [showRecurrente, setShowRecurrente] = useState(false)

  const selectedProf = isAdmin
    ? data.profesionales.find(p => p.id === selectedProfId) ?? null
    : null

  const effectiveSchedule: ScheduleData = isAdmin
    ? (selectedProf?.schedule ?? data.businessSchedule)
    : (data.schedule ?? data.businessSchedule)

  const filteredBloqueos = useMemo(() => {
    if (!isAdmin) return bloqueos
    return bloqueos.filter(b =>
      b.professional_id === selectedProfId || b.professional_id === null
    )
  }, [bloqueos, selectedProfId, isAdmin])

  function goPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function goNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date)
    setSheetOpen(true)
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open && selectedDate) {
      const prev = selectedDate
      setTimeout(() => {
        if (prev === selectedDate) setSelectedDate(null)
      }, 300)
    }
  }

  const refetchBloqueos = useCallback(async () => {
    const profId = isAdmin ? null : professionalId
    const result = await getBloqueos(businessId, profId, isAdmin)
    if (Array.isArray(result)) setBloqueos(result)
  }, [businessId, isAdmin, professionalId])

  async function handleProfessionalChange(profId: number) {
    setSelectedProfId(profId)
    setSelectedDate(null)
    setSheetOpen(false)
    const result = await getBloqueos(businessId, null, true)
    if (Array.isArray(result)) setBloqueos(result)
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1.5">Profesional</label>
          <div className="relative inline-block">
            <select
              value={selectedProfId ?? ''}
              onChange={e => handleProfessionalChange(Number(e.target.value))}
              className="appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:border-[var(--color-accent)]"
            >
              {data.profesionales.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4">
        <CalendarView
          businessSchedule={effectiveSchedule}
          bloqueos={filteredBloqueos}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
        />

        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-danger)]/30" />
              <span className="text-[10px] text-[var(--text-muted)]">Cerrado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-warning)]/30" />
              <span className="text-[10px] text-[var(--text-muted)]">Horario esp.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-[var(--border-subtle)]" />
              <span className="text-[10px] text-[var(--text-muted)]">Sin horario</span>
            </div>
          </div>
          <button
            onClick={() => setShowRecurrente(true)}
            className="flex items-center gap-1 text-[10px] text-[var(--text-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Settings className="h-3 w-3" />
            Horario recurrente
          </button>
        </div>
      </div>

      <DayDetailSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        businessId={businessId}
        professionalId={isAdmin ? selectedProfId : professionalId}
        selectedDate={selectedDate}
        businessSchedule={effectiveSchedule}
        bloqueos={filteredBloqueos}
        onBloqueoChanged={refetchBloqueos}
      />

      {showRecurrente && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowRecurrente(false)} />
          <div className="relative bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] w-full max-w-lg h-full overflow-y-auto p-6 animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {isAdmin ? (selectedProf?.name ?? 'Horario recurrente') : 'Horario recurrente'}
              </h3>
              <button
                onClick={() => setShowRecurrente(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
            {isAdmin && selectedProfId ? (
              <HorarioRecurrente
                businessId={businessId}
                professionalId={selectedProfId}
                initialSchedule={selectedProf?.schedule ?? data.businessSchedule}
                businessSchedule={data.businessSchedule}
              />
            ) : !isAdmin && professionalId ? (
              <HorarioRecurrente
                businessId={businessId}
                professionalId={professionalId}
                initialSchedule={data.schedule ?? data.businessSchedule}
                businessSchedule={data.businessSchedule}
              />
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">Selecciona un profesional</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
