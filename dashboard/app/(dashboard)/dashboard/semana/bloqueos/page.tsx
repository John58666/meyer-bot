import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getBloqueos, getActiveProfessionals } from '@/lib/actions'
import { BloqueosClient } from '@/components/bloqueos/bloqueos-client'

export default async function BloqueosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const professionalId = session.user.professionalId
  const multiProfessional = session.user.multiProfessional
  // owner/admin (professionalId null) en negocio multi-profesional: pueden
  // elegir bloquear a un profesional específico o todo el negocio.
  const isOwnerOrAdmin = professionalId == null
  const showProfessionalPicker = isOwnerOrAdmin && multiProfessional

  const [bloqueos, professionals] = await Promise.all([
    getBloqueos(businessId, professionalId, showProfessionalPicker),
    showProfessionalPicker ? getActiveProfessionals(businessId) : Promise.resolve([]),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/semana"
          className="text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Bloqueos de agenda</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Días cerrados y horarios especiales
          </p>
        </div>
      </div>

      <BloqueosClient
        businessId={businessId}
        professionalId={professionalId}
        initialBloqueos={bloqueos}
        professionals={professionals}
        showProfessionalPicker={showProfessionalPicker}
      />
    </div>
  )
}
