import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { PageShellV2 } from '@/components/shared/page-shellV2'
import { ConfiguracionClient } from '@/features/config-tabs/components/configuracion-client'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const role = session.user.role
  const professionalId = session.user.professionalId ?? null
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'
  const isOwner = role === 'owner'
  const isProfessional = role === 'profesional'

  return (
    <PageShellV2 title="Configuración" subtitle={isProfessional ? "Tu horario y servicios" : "Administra los datos de tu negocio"}>
      <ConfiguracionClient
        businessId={businessId}
        isOwner={isOwner}
        isProfessional={isProfessional}
        professionalId={professionalId}
      />
    </PageShellV2>
  )
}
