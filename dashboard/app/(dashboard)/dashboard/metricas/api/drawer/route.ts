import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMetricasDrawer, type DrawerTipo, type RangoMetricas } from '@/lib/actions'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { tipo, professionalId, fecha, servicio, rango } = body as {
    tipo: DrawerTipo
    professionalId?: number | null
    fecha?: string
    servicio?: string
    rango?: RangoMetricas
  }

  const businessId = Number(session.user.businessId)
  // RBAC: profesional solo ve sus datos
  const effectiveProfId = session.user.role === 'profesional'
    ? session.user.professionalId
    : (professionalId ?? null)

  const result = await getMetricasDrawer(businessId, tipo, {
    fecha, servicio, professionalId: effectiveProfId ?? undefined, rango,
  })

  return NextResponse.json(result)
}
