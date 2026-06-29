import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getBloqueos } from '@/lib/actions'
import { BloqueosClient } from '@/components/bloqueos/bloqueos-client'

export default async function BloqueosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const bloqueos = await getBloqueos(businessId)

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

      <BloqueosClient businessId={businessId} initialBloqueos={bloqueos} />
    </div>
  )
}
