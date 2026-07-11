import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getWeekAppointments } from '@/lib/appointments'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawProf = searchParams.get('professionalId')

  const professionalId = rawProf ? parseInt(rawProf, 10) : null

  const appointments = await getWeekAppointments(
    session.user.businessId,
    professionalId
  )

  return NextResponse.json({ appointments })
}
