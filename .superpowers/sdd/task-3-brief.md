### Task 3: Corregir fetchOcupacion para incluir schedule_exceptions

**Files:**
- Modify: `dashboard/lib/actions.ts:438-481`

**Interfaces:**
- Consumes: `schedule_exceptions` table
- Produces: `fetchOcupacion` returns correct `{ ocupados, total }`

- [ ] **Step 1: Modificar fetchOcupacion**

```typescript
async function fetchOcupacion(
  businessId: number,
  fechaDesde: string,
  fechaHasta: string,
  professionalId?: number | null
): Promise<{ ocupados: number; total: number }> {
  const scheduleQuery = await pool.query<{ schedule_text: unknown }>(
    `SELECT schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (!scheduleQuery.rows[0]?.schedule_text) return { ocupados: 0, total: 0 };

  const schedule: Record<string, { open: number; close: number }> =
    typeof scheduleQuery.rows[0].schedule_text === 'string'
      ? JSON.parse(scheduleQuery.rows[0].schedule_text)
      : scheduleQuery.rows[0].schedule_text;

  const start = new Date(fechaDesde + 'T12:00:00');
  const end = new Date(fechaHasta + 'T12:00:00');
  let totalSlots = 0;

  const params: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const profFilter = professionalId != null
    ? ` AND a.professional_id = $${params.push(professionalId)}`
    : '';

  const { rows: aptRows } = await pool.query<{ fecha: string }>(
    `SELECT a.fecha::text
     FROM appointments a
     WHERE a.business_id = $1 AND a.fecha BETWEEN $2 AND $3 AND a.estado != 'Cancelada'
     ${profFilter}`,
    params
  );

  // Obtener excepciones del período
  const exParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const exProfCondition = professionalId != null
    ? `AND (professional_id = $${exParams.push(professionalId)} OR professional_id IS NULL)`
    : 'AND professional_id IS NULL';

  const { rows: excepciones } = await pool.query<{ fecha: string; tipo: string; hora_inicio: string | null; hora_fin: string | null }>(
    `SELECT fecha::text, tipo, hora_inicio::text, hora_fin::text
     FROM schedule_exceptions
     WHERE business_id = $1 AND fecha BETWEEN $2 AND $3 ${exProfCondition}`,
    exParams
  );

  const exMap = new Map<string, { tipo: string; hora_inicio?: string; hora_fin?: string }>();
  for (const ex of excepciones) {
    exMap.set(ex.fecha, {
      tipo: ex.tipo,
      hora_inicio: ex.hora_inicio ?? undefined,
      hora_fin: ex.hora_fin ?? undefined,
    });
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const fechaStr = d.toISOString().slice(0, 10);
    const ex = exMap.get(fechaStr);

    if (ex?.tipo === 'cerrado') continue; // día completamente cerrado

    const dayOfWeek = d.getDay();
    const daySchedule = schedule[String(dayOfWeek)];
    if (!daySchedule) continue;

    if (ex?.tipo === 'horario_especial') {
      const open = parseInt((ex.hora_inicio ?? '').split(':')[0]);
      const close = parseInt((ex.hora_fin ?? '').split(':')[0]);
      totalSlots += (close - open) * 2;
    } else {
      totalSlots += (daySchedule.close - daySchedule.open) * 2;
    }
  }

  return { ocupados: aptRows.length, total: totalSlots };
}
```

---

