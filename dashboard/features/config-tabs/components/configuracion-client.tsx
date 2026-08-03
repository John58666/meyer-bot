"use client"

import { useState, useEffect } from 'react'
import { BusinessProfileFormV2 } from '@/features/config-business/components/business-profile-formV2'
import { ServicesListV2 } from '@/features/config-services/components/services-listV2'
import { PaymentMethodsListV2 } from '@/features/config-payments/components/payment-methods-listV2'
import { TeamListV2 } from '@/features/config-team/components/team-listV2'
import { BusinessScheduleEditorV2 } from '@/features/config-schedule/components/business-schedule-editorV2'
import { ScheduleBlocksV2 } from '@/features/config-schedule/components/schedule-blocksV2'
import { AuditListV2 } from '@/features/config-audit/components/audit-listV2'
import { Clock, Scissors, Wallet, Building2, Users, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabSection = 'perfil' | 'servicios' | 'pagos' | 'equipo' | 'horarios' | 'auditoria'
type HorarioTab = 'horario' | 'bloqueos'
type ProfTab = 'horario' | 'servicios'

const TABS: { key: TabSection; label: string; icon: React.ElementType }[] = [
  { key: 'perfil', label: 'Perfil', icon: Building2 },
  { key: 'servicios', label: 'Servicios', icon: Scissors },
  { key: 'pagos', label: 'Pagos', icon: Wallet },
  { key: 'equipo', label: 'Equipo', icon: Users },
  { key: 'horarios', label: 'Horarios', icon: Clock },
  { key: 'auditoria', label: 'Auditoría', icon: ShieldAlert },
]

interface Props {
  businessId: number
  isOwner: boolean
  isProfessional: boolean
  professionalId: number | null
}

export function ConfiguracionClient({ businessId, isOwner, isProfessional, professionalId }: Props) {
  const [activeTab, setActiveTab] = useState<TabSection>('perfil')
  const [horarioTab, setHorarioTab] = useState<HorarioTab>('horario')
  const [profTab, setProfTab] = useState<ProfTab>('horario')

  if (isProfessional) {
    return (
      <div>
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-zf-surface p-1 border border-zf-border/50">
          <button type="button" onClick={() => setProfTab('horario')}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-3 text-xs font-semibold transition-all",
              profTab === 'horario' ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text")}>
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mi Horario</span>
          </button>
          <button type="button" onClick={() => setProfTab('servicios')}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-3 text-xs font-semibold transition-all",
              profTab === 'servicios' ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text")}>
            <Scissors className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mis Servicios</span>
          </button>
        </div>

        {profTab === 'horario' && (
          <div>
            <div className="mb-4 flex gap-2">
              <button type="button" onClick={() => setHorarioTab('horario')}
                className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                  horarioTab === 'horario' ? "bg-zinc-800 text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text")}>
                Mi Horario
              </button>
              <button type="button" onClick={() => setHorarioTab('bloqueos')}
                className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                  horarioTab === 'bloqueos' ? "bg-zinc-800 text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text")}>
                Mis Bloqueos
              </button>
            </div>
            {horarioTab === 'horario' && professionalId != null && (
              <BusinessScheduleEditorV2 businessId={businessId} />
            )}
            {horarioTab === 'bloqueos' && professionalId != null && (
              <ScheduleBlocksV2 businessId={businessId} />
            )}
          </div>
        )}

        {profTab === 'servicios' && professionalId != null && (
          <MisServiciosProfesional businessId={businessId} professionalId={professionalId} />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-zf-surface p-1 border border-zf-border/50">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-3 text-xs font-semibold transition-all",
                isActive ? "bg-zinc-800 text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text")}>
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'perfil' && <BusinessProfileFormV2 businessId={businessId} />}
      {activeTab === 'servicios' && <ServicesListV2 businessId={businessId} />}
      {activeTab === 'pagos' && <PaymentMethodsListV2 businessId={businessId} />}
      {activeTab === 'equipo' && isOwner && <TeamListV2 businessId={businessId} />}
      {activeTab === 'equipo' && !isOwner && (
        <p className="text-sm text-zf-text-secondary py-8 text-center">Solo el dueño puede gestionar el equipo.</p>
      )}

      {activeTab === 'horarios' && (
        <div>
          <div className="mb-4 flex gap-2">
            <button type="button" onClick={() => setHorarioTab('horario')}
              className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                horarioTab === 'horario' ? "bg-zinc-800 text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text")}>
              Horario del Negocio
            </button>
            <button type="button" onClick={() => setHorarioTab('bloqueos')}
              className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                horarioTab === 'bloqueos' ? "bg-zinc-800 text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text")}>
              Bloqueos y Vacaciones
            </button>
          </div>
          {horarioTab === 'horario' && <BusinessScheduleEditorV2 businessId={businessId} />}
          {horarioTab === 'bloqueos' && <ScheduleBlocksV2 businessId={businessId} />}
        </div>
      )}

      {activeTab === 'auditoria' && <AuditListV2 businessId={businessId} />}
    </div>
  )
}

function MisServiciosProfesional({ businessId, professionalId }: { businessId: number; professionalId: number }) {
  const [services, setServices] = useState<{ id: number; name: string; price: number; duration_minutes: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/professional-services?businessId=${businessId}&professionalId=${professionalId}`)
        if (res.ok) {
          const data = await res.json()
          setServices(data.services ?? [])
        }
      } finally { setLoading(false) }
    }
    load()
  }, [businessId, professionalId])

  if (loading) {
    return <div className="animate-pulse space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-zf-border/20" />)}</div>
  }

  if (services.length === 0) {
    return <p className="text-sm text-zf-text-secondary py-8 text-center">No tienes servicios asignados.</p>
  }

  return (
    <div className="rounded-xl border border-zf-border/30 bg-zf-surface overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zf-border/30 bg-zf-bg/50 text-[10px] font-bold uppercase text-zf-text-secondary">
            <th className="px-5 py-3">Servicio</th>
            <th className="px-5 py-3">Duración</th>
            <th className="px-5 py-3">Precio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zf-border/10">
          {services.map(s => (
            <tr key={s.id}>
              <td className="px-5 py-3 text-sm font-semibold text-zf-text">{s.name}</td>
              <td className="px-5 py-3 text-sm text-zf-text-secondary">{s.duration_minutes} min</td>
              <td className="px-5 py-3 text-sm font-medium text-zf-text-secondary">${s.price.toLocaleString("es-CO")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
