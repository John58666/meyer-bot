import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'
import { ServiciosTable } from '@/components/configuracion/servicios-table'
import { RedirectClient } from '@/components/redirect-client'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const role = session.user.role
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  if (!isOwnerOrAdmin) return <RedirectClient to="/dashboard" />

  const { rows } = await pool.query(
    `SELECT services_text FROM businesses WHERE id = $1`,
    [businessId]
  )
  const servicesText: string = rows[0]?.services_text ?? ''

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Servicios de tu negocio
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Servicios</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Los servicios que ofreces, sus precios y duración
          </p>
          <ServiciosTable
            businessId={businessId}
            initialServicesText={servicesText}
          />
        </div>
      </div>
    </div>
  )
}
