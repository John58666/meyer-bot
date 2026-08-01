"use client"

import { useState } from 'react'
import { BusinessProfileFormV2 } from '@/features/config-business/components/business-profile-formV2'
import { ServicesListV2 } from '@/features/config-services/components/services-listV2'
import { PaymentMethodsListV2 } from '@/features/config-payments/components/payment-methods-listV2'
import { TeamListV2 } from '@/features/config-team/components/team-listV2'
import { BusinessScheduleEditorV2 } from '@/features/config-schedule/components/business-schedule-editorV2'
import { ScheduleBlocksV2 } from '@/features/config-schedule/components/schedule-blocksV2'
import { AuditListV2 } from '@/features/config-audit/components/audit-listV2'
import { Scissors, Wallet, Building2, Users, Clock, ShieldAlert } from 'lucide-react'

type TabSection = 'perfil' | 'servicios' | 'pagos' | 'equipo' | 'horarios' | 'auditoria'
type HorarioTab = 'horario' | 'bloqueos'

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
}

export function ConfiguracionClient({ businessId, isOwner }: Props) {
  const [activeTab, setActiveTab] = useState<TabSection>('perfil')
  const [horarioTab, setHorarioTab] = useState<HorarioTab>('horario')

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-zf-surface p-1 border border-zf-border/50">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-3 text-xs font-semibold transition-all",
                isActive ? "bg-zf-primary text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
              ].join(" ")}
            >
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
            <button
              type="button"
              onClick={() => setHorarioTab('horario')}
              className={[
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                horarioTab === 'horario' ? "bg-zf-primary text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text",
              ].join(" ")}
            >
              Horario del Negocio
            </button>
            <button
              type="button"
              onClick={() => setHorarioTab('bloqueos')}
              className={[
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                horarioTab === 'bloqueos' ? "bg-zf-primary text-white" : "bg-zf-bg text-zf-text-secondary hover:text-zf-text",
              ].join(" ")}
            >
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
