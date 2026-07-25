### Task 2: Endpoint API /api/availability/check para el bot n8n

**Files:**
- Create: `dashboard/app/api/availability/check/route.ts`
- Modify: `database/n8n-queries.sql`

**Interfaces:**
- Consumes: `schedule_exceptions`, `schedule_text`, `appointments` tables
- Produces: `POST /api/availability/check` → `{ available: boolean, reason?: string }`

- [ ] **Step 1: Crear endpoint POST /api/availability/check**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fecha, hora, professionalId } = await request.json()
  const businessId = session.user.businessId

  if (!fecha || !hora) {
    return NextResponse.json({ error: 'fecha y hora requeridos' }, { status: 400 })
  }

  try {
    // 1. Verificar schedule_exceptions
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
        const horaStr = hora.length === 5 ? hora + ':00' : hora
        if (horaStr < (ex.hora_inicio?.substring(0, 5) ?? '') + ':00' ||
            horaStr >= (ex.hora_fin?.substring(0, 5) ?? '') + ':00') {
          return NextResponse.json({ available: false, reason: 'special_hours' })
        }
      }
    }

    // 2. Verificar schedule_text del negocio o profesional
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

    const schedule = typeof scheduleText === 'string' ? JSON.parse(scheduleText) : scheduleText
    const dateObj = new Date(fecha + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    const daySchedule = schedule[String(dayOfWeek)]
    if (!daySchedule) {
      return NextResponse.json({ available: false, reason: 'closed_day' })
    }

    const horaNum = parseInt(hora.split(':')[0]) + parseInt(hora.split(':')[1]) / 60
    if (horaNum < daySchedule.open || horaNum >= daySchedule.close) {
      return NextResponse.json({ available: false, reason: 'outside_hours' })
    }

    // 3. Verificar colisiones de appointments
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
```

- [ ] **Step 2: Actualizar n8n-queries.sql con documentación de deprecación**

```sql
-- ============================================================
-- ⚠️ QUERIES DEPRECADAS — usar API del dashboard en su lugar
-- ============================================================
-- En lugar de estas queries SQL, los workflows de n8n deben llamar:
--
--   POST /api/availability/check
--     Body: { fecha: "2026-08-15", hora: "14:00", professionalId: 2 }
--     Response: { available: true/false, reason: "conflict"|"closed"|... }
--
--   GET /api/appointments/slots?fecha=2026-08-15&professionalId=2
--     Response: { slots: ["09:00", "09:30", ...] }
--
-- Los endpoints ya incluyen toda la lógica: schedule_text,
-- schedule_exceptions (cerrado + horario_especial), y colisiones.
-- ============================================================
```

---

