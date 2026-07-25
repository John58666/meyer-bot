import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pool } from '@/lib/db'

function toMinutes(t: string): number {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + (parts[1] ?? 0)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const businessId = session.user.businessId

  try {
    const { fecha, hora, professionalId } = await request.json()

    if (!fecha || !hora) {
      return NextResponse.json({ error: 'fecha y hora requeridos' }, { status: 400 })
    }

    if (!/^\d{1,2}:\d{2}$/.test(hora)) {
      return NextResponse.json({ error: 'hora debe tener formato HH:MM' }, { status: 400 })
    }

    const exParams: (string | number)[] = [businessId, fecha]
    const exProfCondition = professionalId
      ? `AND (professional_id = $${exParams.push(professionalId)} OR professional_id IS NULL)`
      : 'AND professional_id IS NULL'

    const { rows: excepciones } = await pool.query(
      `SELECT tipo, hora_inicio, hora_fin FROM schedule_exceptions
       WHERE business_id = $1 AND fecha = $2 ${exProfCondition}`,
      exParams
    )

    for (const ex of excepciones) {
      if (ex.tipo === 'cerrado') {
        return NextResponse.json({ available: false, reason: 'closed' })
      }
      if (ex.tipo === 'horario_especial') {
        const horaMin = toMinutes(hora)
        const inicioMin = toMinutes(ex.hora_inicio ?? '00:00')
        const finMin = toMinutes(ex.hora_fin ?? '00:00')
        if (horaMin < inicioMin || horaMin >= finMin) {
          return NextResponse.json({ available: false, reason: 'special_hours' })
        }
      }
    }

    let scheduleText: string
    if (professionalId) {
      const { rows } = await pool.query(
        `SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
         FROM businesses b
         LEFT JOIN professional_schedule ps ON ps.business_id = b.id AND ps.professional_id = $2
         WHERE b.id = $1`,
        [businessId, professionalId]
      )
      if (rows.length === 0) return NextResponse.json({ available: false, reason: 'no_schedule' })
      scheduleText = rows[0].schedule_text
    } else {
      const { rows } = await pool.query(
        `SELECT schedule_text FROM businesses WHERE id = $1`,
        [businessId]
      )
      if (rows.length === 0) return NextResponse.json({ available: false, reason: 'no_schedule' })
      scheduleText = rows[0].schedule_text
    }

    let schedule: any
    try {
      schedule = typeof scheduleText === 'string' ? JSON.parse(scheduleText) : scheduleText
    } catch {
      return NextResponse.json({ error: 'Error al procesar el horario del negocio' }, { status: 500 })
    }
    const dateObj = new Date(fecha + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    const daySchedule = schedule[String(dayOfWeek)]
    if (!daySchedule) {
      return NextResponse.json({ available: false, reason: 'closed_day' })
    }

    const horaMin = toMinutes(hora)
    if (horaMin < daySchedule.open * 60 || horaMin >= daySchedule.close * 60) {
      return NextResponse.json({ available: false, reason: 'outside_hours' })
    }

    const aptParams: (string | number)[] = [businessId, fecha, hora]
    const aptProfCondition = professionalId
      ? `AND professional_id = $${aptParams.push(professionalId)}`
      : ''

    const { rows: conflicts } = await pool.query(
      `SELECT id FROM appointments
       WHERE business_id = $1 AND fecha = $2 AND hora = $3::time AND estado != 'Cancelada' ${aptProfCondition}`,
      aptParams
    )

    if (conflicts.length > 0) {
      return NextResponse.json({ available: false, reason: 'conflict' })
    }

    return NextResponse.json({ available: true })
  } catch (e) {
    console.error('[availability/check]', e)
    return NextResponse.json({ error: 'Error checking availability' }, { status: 500 })
  }
}
