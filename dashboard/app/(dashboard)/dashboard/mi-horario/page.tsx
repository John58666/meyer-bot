import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getMiHorarioData } from '@/lib/actions'
import { MiHorarioClient } from '@/components/horario/mi-horario-client'

export default async function MiHorarioPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const role = session.user.role
  const professionalId = session.user.professionalId ?? null

  const result = await getMiHorarioData(businessId, role, professionalId)

  if (!result.success) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Mi horario</h1>
        </div>
        <p className="text-[var(--color-danger)] text-sm">{result.error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mi horario</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {role === 'profesional' ? 'Gestiona tu disponibilidad laboral' : 'Controla la disponibilidad de tu equipo'}
        </p>
      </div>
      <MiHorarioClient data={result} role={role} businessId={businessId} professionalId={professionalId} />
    </div>
  )
}
