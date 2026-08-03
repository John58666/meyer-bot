'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { ProfesionalConHorario, BloqueoRow, ScheduleData } from '@/lib/actions'
import { getBloqueos } from '@/lib/actions'
import { CalendarView } from './calendar-view'
import { DayDetailSheet } from './day-detail-sheet'
import { HorarioRecurrente } from './horario-recurrente'
import { ProfessionalAvatar } from './professional-avatar'
import { Ban, Clock, Trash2, X, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

function formatBloqueoDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    day: d.getDate(),
    dayName: DAY_ABBR[d.getDay()],
    fullDate: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

function ProfessionalSelector({
  profesionales,
  selectedProfId,
  onChange,
}: {
  profesionales: ProfesionalConHorario[]
  selectedProfId: number | null
  onChange: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const needsSearch = profesionales.length > 8

  const filtered = useMemo(() => {
    if (!search) return profesionales
    const q = search.toLowerCase()
    return profesionales.filter(p => p.name.toLowerCase().includes(q))
  }, [profesionales, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = selectedProfId ? profesionales.find(p => p.id === selectedProfId) : null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--color-accent)]"
      >
        {selected ? (
          <ProfessionalAvatar name={selected.name} id={selected.id} size="sm" showName />
        ) : (
          <span className="text-white/80">Todos</span>
        )}
        <ChevronDown className="ml-auto h-4 w-4 text-[var(--text-muted)] shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden">
          {needsSearch && (
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-primary)]">
                <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar profesional..."
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[var(--text-muted)]"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              onClick={() => { onChange(null); setOpen(false); setSearch('') }}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left',
                selectedProfId === null
                  ? 'bg-[var(--color-accent)]/10 text-white'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              )}
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">
                T
              </div>
              Todos
            </button>
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left',
                  selectedProfId === p.id
                    ? 'bg-[var(--color-accent)]/10 text-white'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                )}
              >
                <ProfessionalAvatar name={p.name} id={p.id} size="sm" />
                <span>{p.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-3">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BloqueoCard({
  b,
  onEdit,
  onDelete,
}: {
  b: BloqueoRow
  onEdit: () => void
  onDelete: () => void
}) {
  const { day, dayName, fullDate } = formatBloqueoDate(b.fecha)
  const isCerrado = b.tipo === 'cerrado'
  const colorVar = isCerrado ? 'var(--color-danger)' : 'var(--color-warning)'

  return (
    <div
      onClick={onEdit}
      className="flex items-stretch gap-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden hover:bg-white/[0.02] transition-colors cursor-pointer"
    >
      <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />
      <div className="flex items-center gap-2.5 py-2 pr-2.5 flex-1 min-w-0">
        <div
          className={cn(
            'w-9 h-9 md:w-10 md:h-10 rounded-lg flex flex-col items-center justify-center shrink-0',
            isCerrado ? 'bg-[var(--color-danger)]/10' : 'bg-[var(--color-warning)]/10'
          )}
        >
          <span className="text-sm font-bold leading-none" style={{ color: colorVar }}>
            {day}
          </span>
          <span className="text-[7px] uppercase font-semibold leading-none mt-0.5" style={{ color: colorVar }}>
            {dayName}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{fullDate}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                isCerrado ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]' : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
              )}
            >
              {isCerrado ? <Ban className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
              {isCerrado ? 'Cerrado' : `${b.hora_inicio?.slice(0, 5)}-${b.hora_fin?.slice(0, 5)}`}
            </span>
            {b.professional_name && (
              <ProfessionalAvatar name={b.professional_name} id={b.professional_id ?? 0} size="sm" />
            )}
          </div>
          {b.motivo && (
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{b.motivo}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
          aria-label="Eliminar bloqueo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function BloqueoGridCard({
  b,
  onEdit,
  onDelete,
}: {
  b: BloqueoRow
  onEdit: () => void
  onDelete: () => void
}) {
  const { day, dayName, fullDate } = formatBloqueoDate(b.fecha)
  const isCerrado = b.tipo === 'cerrado'
  const colorVar = isCerrado ? 'var(--color-danger)' : 'var(--color-warning)'

  return (
    <div
      onClick={onEdit}
      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden hover:bg-white/[0.02] transition-colors cursor-pointer"
    >
      <div style={{ height: 3, background: colorVar }} />
      <div className="p-2.5 md:p-3">
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'w-8 h-8 md:w-9 md:h-9 rounded-lg flex flex-col items-center justify-center shrink-0',
                isCerrado ? 'bg-[var(--color-danger)]/10' : 'bg-[var(--color-warning)]/10'
              )}
            >
              <span className="text-xs md:text-sm font-bold leading-none" style={{ color: colorVar }}>
                {day}
              </span>
              <span className="text-[6px] md:text-[7px] uppercase font-semibold leading-none mt-0.5" style={{ color: colorVar }}>
                {dayName}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate leading-tight">{fullDate}</p>
              {b.motivo && (
                <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight mt-0.5">{b.motivo}</p>
              )}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
            aria-label="Eliminar bloqueo"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium',
              isCerrado ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]' : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
            )}
          >
            {isCerrado ? <Ban className="h-2 w-2" /> : <Clock className="h-2 w-2" />}
            {isCerrado ? 'Cerrado' : `${b.hora_inicio?.slice(0, 5)}-${b.hora_fin?.slice(0, 5)}`}
          </span>
          {b.professional_name && (
            <ProfessionalAvatar name={b.professional_name} id={b.professional_id ?? 0} size="sm" />
          )}
        </div>
      </div>
    </div>
  )
}

export function MiHorarioClient({ data, role: _role, businessId, professionalId }: MiHorarioClientProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const isAdmin = data.view === 'ownerAdmin'

  const [selectedProfId, setSelectedProfId] = useState<number | null>(
    isAdmin ? null : professionalId
  )

  const [bloqueos, setBloqueos] = useState(data.bloqueos)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showRecurrente, setShowRecurrente] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [editBloqueo, setEditBloqueo] = useState<BloqueoRow | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['null']))

  const selectedProf = isAdmin
    ? data.profesionales.find(p => p.id === selectedProfId) ?? null
    : null

  const effectiveSchedule: ScheduleData = isAdmin
    ? (selectedProf?.schedule ?? data.businessSchedule)
    : (data.schedule ?? data.businessSchedule)

  const filteredBloqueos = useMemo(() => {
    if (!isAdmin) return bloqueos
    if (selectedProfId === null) return bloqueos
    return bloqueos.filter(b => b.professional_id === selectedProfId || b.professional_id === null)
  }, [bloqueos, selectedProfId, isAdmin])

  const sortedBloqueos = useMemo(() => {
    return [...filteredBloqueos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [filteredBloqueos])

  const currentMonthBloqueos = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    return sortedBloqueos.filter(b => b.fecha.startsWith(prefix))
  }, [sortedBloqueos, currentMonth, currentYear])

  const groupedBloqueos = useMemo(() => {
    const groups = new Map<string, { label: string; bloqueos: BloqueoRow[] }>()
    for (const b of currentMonthBloqueos) {
      const key = String(b.professional_id ?? 'null')
      if (!groups.has(key)) {
        groups.set(key, {
          label: b.professional_id === null
            ? 'Todo el negocio'
            : (b.professional_name ?? 'Profesional'),
          bloqueos: [],
        })
      }
      groups.get(key)!.bloqueos.push(b)
    }
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'null') return -1
      if (b === 'null') return 1
      return groups.get(a)!.label.localeCompare(groups.get(b)!.label)
    })
    return sorted.map(([key, value]) => ({
      key,
      professionalId: key === 'null' ? null : Number(key),
      ...value,
    }))
  }, [currentMonthBloqueos])

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
    if (!open) {
      setEditBloqueo(null)
      if (selectedDate) {
        const prev = selectedDate
        setTimeout(() => {
          if (prev === selectedDate) setSelectedDate(null)
        }, 300)
      }
    }
  }

  const refetchBloqueos = useCallback(async () => {
    const profId = isAdmin ? null : professionalId
    const result = await getBloqueos(businessId, profId, isAdmin)
    if (Array.isArray(result)) setBloqueos(result)
  }, [businessId, isAdmin, professionalId])

  async function handleProfessionalChange(profId: number | null) {
    setSelectedProfId(profId)
    setSelectedDate(null)
    setSheetOpen(false)
    const result = await getBloqueos(businessId, null, true)
    if (Array.isArray(result)) setBloqueos(result)
  }

  async function handleDeleteBloqueo(id: number) {
    const { deleteBloqueo } = await import('@/lib/actions')
    const result = await deleteBloqueo(id, businessId)
    if (result?.ok) {
      setBloqueos(prev => prev.filter(b => b.id !== id))
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 items-start">
      <div className="w-full lg:max-w-[360px] xl:max-w-[400px] lg:min-w-[320px] space-y-3">
        {isAdmin && (
          <ProfessionalSelector
            profesionales={data.profesionales}
            selectedProfId={selectedProfId}
            onChange={handleProfessionalChange}
          />
        )}

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-3 md:p-4 space-y-0">
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

          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
              <span className="text-[11px] text-[var(--text-muted)]">Cerrado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
              <span className="text-[11px] text-[var(--text-muted)]">Horario esp.</span>
            </div>
          </div>

          <div className="text-center pt-3">
            <button
              onClick={() => setShowRecurrente(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity w-full"
            >
              Configurar mi horario semanal
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Bloqueos</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              {currentMonthBloqueos.length} este mes
            </p>
          </div>
          <div className="flex gap-0.5 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-subtle)] p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
            >
              Grid
            </button>
          </div>
        </div>

        {currentMonthBloqueos.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-6 md:p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">Sin bloqueos este mes 🎉</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {groupedBloqueos.map(group => (
              <div key={group.key} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <button
                  onClick={() => toggleSection(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {expandedSections.has(group.key) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  {group.professionalId ? (
                    <ProfessionalAvatar name={group.label} id={group.professionalId} size="sm" showName />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] font-bold text-purple-400 shrink-0">
                        T
                      </div>
                      <span className="text-xs text-white font-medium">{group.label}</span>
                    </div>
                  )}
                  <span className="ml-auto text-[10px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
                    {group.bloqueos.length}
                  </span>
                </button>
                {expandedSections.has(group.key) && (
                  <div className="px-2 pb-2 space-y-1">
                    {group.bloqueos.map(b => (
                      <BloqueoCard
                        key={b.id}
                        b={b}
                        onEdit={() => { setEditBloqueo(b); setSelectedDate(b.fecha); setSheetOpen(true) }}
                        onDelete={() => handleDeleteBloqueo(b.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {groupedBloqueos.map(group => (
              <div key={group.key} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <button
                  onClick={() => toggleSection(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {expandedSections.has(group.key) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  {group.professionalId ? (
                    <ProfessionalAvatar name={group.label} id={group.professionalId} size="sm" showName />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[8px] font-bold text-purple-400 shrink-0">
                        T
                      </div>
                      <span className="text-xs text-white font-medium">{group.label}</span>
                    </div>
                  )}
                  <span className="ml-auto text-[10px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
                    {group.bloqueos.length}
                  </span>
                </button>
                {expandedSections.has(group.key) && (
                  <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
                    {group.bloqueos.map(b => (
                      <BloqueoGridCard
                        key={b.id}
                        b={b}
                        onEdit={() => { setEditBloqueo(b); setSelectedDate(b.fecha); setSheetOpen(true) }}
                        onDelete={() => handleDeleteBloqueo(b.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DayDetailSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        businessId={businessId}
        professionalId={isAdmin ? selectedProfId : professionalId}
        selectedDate={selectedDate}
        businessSchedule={effectiveSchedule}
        profesionales={isAdmin ? data.profesionales : undefined}
        bloqueos={filteredBloqueos}
        onBloqueoChanged={refetchBloqueos}
        editBloqueo={editBloqueo}
      />

      {showRecurrente && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowRecurrente(false)} />
          <div className="relative bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] w-full max-w-lg h-full overflow-y-auto p-4 md:p-6 animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-white">
                {isAdmin ? (selectedProf?.name ?? 'Horario recurrente') : 'Horario recurrente'}
              </h3>
              <button
                onClick={() => setShowRecurrente(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isAdmin && selectedProfId ? (
              <HorarioRecurrente
                businessId={businessId}
                professionalId={selectedProfId}
                initialSchedule={selectedProf?.schedule ?? data.businessSchedule}
                businessSchedule={data.businessSchedule}
                hasCustomSchedule={selectedProf?.schedule != null}
              />
            ) : !isAdmin && professionalId ? (
              <HorarioRecurrente
                businessId={businessId}
                professionalId={professionalId}
                initialSchedule={data.schedule ?? data.businessSchedule}
                businessSchedule={data.businessSchedule}
                hasCustomSchedule={data.schedule != null}
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