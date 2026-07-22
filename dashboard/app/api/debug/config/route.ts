import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pool } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const businessId = session.user.businessId
  const professionalId = session.user.professionalId
  const role = session.user.role

  // 1. Datos de sesión
  const sessionInfo = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    businessId,
    businessName: session.user.businessName,
    role,
    professionalId,
    professionalIdType: typeof professionalId,
    multiProfessional: session.user.multiProfessional,
  }

  // 2. Datos del negocio
  const bizResult = await pool.query(
    `SELECT id, name, slug, multi_professional, schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  )
  const businessData = bizResult.rows[0] || null

  // 3. Profesionales activos del negocio
  const profsResult = await pool.query(
    `SELECT p.id, p.name, p.active,
            ps.schedule_text IS NOT NULL AS has_custom_schedule
     FROM professionals p
     LEFT JOIN professional_schedule ps ON ps.business_id = p.business_id AND ps.professional_id = p.id
     WHERE p.business_id = $1 AND p.active = true
     ORDER BY p.name`,
    [businessId]
  )

  // 4. Simular getAllProfessionalSchedules (misma query)
  const allSchedulesResult = await pool.query(
    `SELECT p.id AS professional_id, p.name AS professional_name,
            ps.schedule_text, ps.updated_at
     FROM professionals p
     LEFT JOIN professional_schedule ps
       ON ps.business_id = p.business_id AND ps.professional_id = p.id
     WHERE p.business_id = $1 AND p.active = true
     ORDER BY p.name`,
    [businessId]
  )

  const mappedSchedules = allSchedulesResult.rows.map(r => ({
    professionalId: r.professional_id,
    professionalName: r.professional_name,
    professionalIdType: typeof r.professional_id,
    schedule: r.schedule_text
      ? (typeof r.schedule_text === 'string' ? JSON.parse(r.schedule_text) : r.schedule_text)
      : null,
    hasCustomSchedule: r.schedule_text != null,
  }))

  // 5. Simular el filter del componente ProfessionalScheduleList
  let filterResult
  if (role === 'owner' || role === 'admin' || professionalId == null) {
    filterResult = {
      mode: 'owner/admin - muestra todos',
      count: mappedSchedules.length,
    }
  } else {
    const filteredCount = mappedSchedules.filter(p => p.professionalId === Number(professionalId)).length
    const matchedProf = mappedSchedules.find(p => p.professionalId === Number(professionalId)) || null
    filterResult = {
      mode: 'profesional - filtrado por professionalId',
      professionalId,
      professionalIdNumber: Number(professionalId),
      filteredCount,
      matchedProfessional: matchedProf ? {
        professionalId: matchedProf.professionalId,
        professionalName: matchedProf.professionalName,
        strictMatch: matchedProf.professionalId === Number(professionalId),
        strictMatchTypes: `${typeof matchedProf.professionalId} === ${typeof Number(professionalId)}`,
      } : null,
    }
  }

  // 6. Usuario actual en tabla users (para verificar professional_id en DB)
  const userResult = await pool.query(
    `SELECT id, name, email, role, business_id, professional_id
     FROM users WHERE id = $1`,
    [parseInt(session.user.id)]
  )

  return NextResponse.json({
    session: sessionInfo,
    business: businessData,
    activeProfessionals: profsResult.rows,
    getAllProfessionalSchedulesResult: mappedSchedules,
    filterResult,
    dbUser: userResult.rows[0] || null,
  })
}
