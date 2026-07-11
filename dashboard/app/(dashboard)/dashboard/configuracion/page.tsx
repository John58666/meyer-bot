import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'
import { ServiciosClient } from '@/components/configuracion/servicios-client'
import { HorarioClient } from '@/components/configuracion/horario-client'
import type { ScheduleData } from '@/lib/actions'

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'profesional') redirect('/dashboard')

  const businessId = session.user.businessId

  const { rows } = await pool.query(
    `SELECT services_text, schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  )
  const servicesText: string = rows[0]?.services_text ?? ''
  const rawSchedule = rows[0]?.schedule_text
  const schedule: ScheduleData = typeof rawSchedule === 'string'
    ? JSON.parse(rawSchedule)
    : (rawSchedule as ScheduleData) ?? {}

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Ajustes de tu negocio
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Servicios</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Los servicios que ofrece tu negocio y sus precios
          </p>
          <ServiciosClient
            businessId={businessId}
            initialServicesText={servicesText}
          />
        </div>

        <hr className="border-[var(--border-subtle)]" />

        <div>
          <h2 className="text-base font-semibold text-white mb-1">Horarios</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Días y horas de atención
          </p>
          <HorarioClient
            businessId={businessId}
            initialSchedule={schedule}
          />
        </div>
      </div>
    </div>
  )
}
