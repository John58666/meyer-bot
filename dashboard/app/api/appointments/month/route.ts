// app/api/appointments/month/route.ts

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAppointmentsByMonth } from '@/lib/appointments'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const rawProf = searchParams.get('professionalId')

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2020) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const businessId = session.user.businessId
  const professionalId = rawProf ? parseInt(rawProf, 10) : session.user.professionalId

  const appointments = await getAppointmentsByMonth(businessId, year, month, professionalId)
  return NextResponse.json({ appointments })
}
