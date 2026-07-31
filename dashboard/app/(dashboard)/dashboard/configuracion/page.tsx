import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RedirectClient } from '@/components/redirect-client'
import { PageShellV2 } from '@/components/shared/page-shellV2'
import { BusinessProfileFormV2 } from '@/features/config-business/components/business-profile-formV2'
import { ServicesListV2 } from '@/features/config-services/components/services-listV2'
import { PaymentMethodsListV2 } from '@/features/config-payments/components/payment-methods-listV2'
import { TeamListV2 } from '@/features/config-team/components/team-listV2'
import { BusinessScheduleEditorV2 } from '@/features/config-schedule/components/business-schedule-editorV2'
import { ScheduleBlocksV2 } from '@/features/config-schedule/components/schedule-blocksV2'
import { AuditListV2 } from '@/features/config-audit/components/audit-listV2'
import { Scissors, Wallet, Building2, Users, Clock, Ban, ShieldAlert } from 'lucide-react'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const role = session.user.role
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  if (!isOwnerOrAdmin) return <RedirectClient to="/dashboard" />

  const isOwner = role === 'owner'

  return (
    <PageShellV2
      title="Configuración"
      subtitle="Administra los datos de tu negocio, servicios y métodos de pago."
    >
      <div className="space-y-10">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Building2 className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Perfil del Negocio</h2>
          </div>
          <BusinessProfileFormV2 businessId={businessId} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Scissors className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Servicios & Precios</h2>
          </div>
          <ServicesListV2 businessId={businessId} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Wallet className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Métodos de Pago</h2>
          </div>
          <PaymentMethodsListV2 businessId={businessId} />
        </section>

        {isOwner && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
                <Users className="h-4 w-4 text-zf-accent-text" />
              </div>
              <h2 className="text-lg font-semibold text-zf-text">Equipo & Roles</h2>
            </div>
            <TeamListV2 businessId={businessId} />
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Clock className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Horario del Negocio</h2>
          </div>
          <BusinessScheduleEditorV2 businessId={businessId} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <Ban className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Bloqueos & Vacaciones</h2>
          </div>
          <ScheduleBlocksV2 businessId={businessId} />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zf-accent-bg">
              <ShieldAlert className="h-4 w-4 text-zf-accent-text" />
            </div>
            <h2 className="text-lg font-semibold text-zf-text">Auditoría & Historial</h2>
          </div>
          <AuditListV2 businessId={businessId} />
        </section>
      </div>
    </PageShellV2>
  )
}
