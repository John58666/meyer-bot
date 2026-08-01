import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RedirectClient } from '@/components/redirect-client'
import { PageShellV2 } from '@/components/shared/page-shellV2'
import { ConfiguracionClient } from '@/features/config-tabs/components/configuracion-client'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const role = session.user.role
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'
  if (!isOwnerOrAdmin) return <RedirectClient to="/dashboard" />

  const isOwner = role === 'owner'

  return (
    <PageShellV2 title="Configuración" subtitle="Administra los datos de tu negocio">
      <ConfiguracionClient businessId={businessId} isOwner={isOwner} />
    </PageShellV2>
  )
}
