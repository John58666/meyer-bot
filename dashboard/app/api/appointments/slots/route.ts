import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAvailableSlots } from '@/lib/actions'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get('fecha')
  const rawProf = searchParams.get('professionalId')

  if (!fecha) {
    return NextResponse.json({ error: 'fecha requerida' }, { status: 400 })
  }

  const professionalId = rawProf ? parseInt(rawProf, 10) : null

  const slots = await getAvailableSlots(
    session.user.businessId,
    fecha,
    professionalId
  )

  return NextResponse.json({ slots })
}
