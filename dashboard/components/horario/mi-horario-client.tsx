'use client'

import type { ProfesionalConHorario, BloqueoRow, ScheduleData } from '@/lib/actions'
import { HorarioRecurrente } from './horario-recurrente'
import { CalendarioBloqueos } from './calendario-bloqueos'
import { GridProfesionales } from './grid-profesionales'
import { SummaryCards } from './summary-cards'

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
  if (data.view === 'professional') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorarioRecurrente
          businessId={businessId}
          professionalId={professionalId!}
          initialSchedule={data.schedule ?? data.businessSchedule}
          businessSchedule={data.businessSchedule}
        />
        <CalendarioBloqueos
          businessId={businessId}
          professionalId={professionalId}
          initialBloqueos={data.bloqueos}
        />
      </div>
    )
  }

  const todayBloqueos = data.bloqueos.filter(b => b.fecha >= new Date().toISOString().slice(0, 10))
  const proximosBloqueos = todayBloqueos.slice(0, 5)
  const bloqueosActivos = todayBloqueos.length
  const totalProfesionales = data.profesionales.length

  return (
    <div className="space-y-6">
      <SummaryCards
        proximosBloqueos={proximosBloqueos.length}
        bloqueosActivos={bloqueosActivos}
        totalProfesionales={totalProfesionales}
      />
      <GridProfesionales
        businessId={businessId}
        profesionales={data.profesionales}
        businessSchedule={data.businessSchedule}
        bloqueos={data.bloqueos}
      />
    </div>
  )
}
