import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'
import { ServiciosClient } from '@/components/configuracion/servicios-client'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId

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
          Ajustes de tu negocio
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Servicios</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Los servicios que ofrece tu negocio y sus precios
          </p>
        </div>
        <ServiciosClient
          businessId={businessId}
          initialServicesText={servicesText}
        />
      </div>
    </div>
  )
}
