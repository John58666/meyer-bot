# B1 Fase 2 — Professional Schedules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Implement per-professional schedules with fallback to business schedule.

**Architecture:** New `professional_schedule` table (same JSONB format as `businesses.schedule_text`), server actions for CRUD, reusable HorarioClient for per-professional editing, COALESCE-based fallback in getAvailableSlots and n8n queries.

**Tech Stack:** PostgreSQL 16, Next.js 16, n8n 2.10.3

## Global Constraints

- Migrations must be additive and backwards-compatible
- `businesses.schedule_text` remains the default fallback
- Same JSONB format: `{"0":{"open":9,"close":19}...}`
- RBAC: solo owner/admin pueden editar horarios por profesional
- Horario por profesional solo visible si `multi_professional = true`

---

### Task 1: DB Migration

**Files:**
- Create: `database/migrations/017_professional_schedule.sql`

- [ ] Create migration file with `professional_schedule` table, trigger, and indexes

```sql
-- Migration 017: professional_schedule
-- Per-professional schedule override. Si no hay fila, usa businesses.schedule_text.
-- Mismo formato JSONB: {"0":{"open":9,"close":19}}

CREATE TABLE IF NOT EXISTS professional_schedule (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  schedule_text   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_schedule_business
  ON professional_schedule(business_id);

CREATE INDEX IF NOT EXISTS idx_prof_schedule_professional
  ON professional_schedule(professional_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER professional_schedule_updated_at
  BEFORE UPDATE ON professional_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### Task 2: Server Actions

**Files:**
- Modify: `dashboard/lib/actions.ts` — add after `updateScheduleText`

- [ ] Add `getProfessionalSchedule` server action

```typescript
export async function getProfessionalSchedule(businessId: number, professionalId: number): Promise<ScheduleData | null> {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
       FROM businesses b
       LEFT JOIN professional_schedule ps
         ON ps.business_id = b.id AND ps.professional_id = $2
       WHERE b.id = $1`,
      [businessId, professionalId]
    );
    if (rows.length === 0) return null;
    const raw = rows[0].schedule_text;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error('[getProfessionalSchedule]', e);
    return null;
  }
}
```

- [ ] Add `updateProfessionalSchedule` server action

```typescript
export async function updateProfessionalSchedule(
  businessId: number,
  professionalId: number,
  schedule: ScheduleData
) {
  const session = await auth();
  if (!session) return { error: 'No autenticado' };
  if (session.user.role !== 'owner' && session.user.role !== 'admin')
    return { error: 'No autorizado' };

  // Validación same as updateScheduleText
  for (const [day, hs] of Object.entries(schedule)) {
    const d = parseInt(day);
    if (isNaN(d) || d < 0 || d > 6)
      return { error: `Día inválido: ${day}` };
    if (!Number.isInteger(hs.open) || hs.open < 0 || hs.open > 23)
      return { error: `Hora de apertura inválida en día ${d}` };
    if (!Number.isInteger(hs.close) || hs.close < 1 || hs.close > 24)
      return { error: `Hora de cierre inválida en día ${d}` };
    if (hs.close <= hs.open)
      return { error: `El cierre debe ser después de la apertura (día ${d})` };
  }

  try {
    await pool.query(
      `INSERT INTO professional_schedule (business_id, professional_id, schedule_text)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (business_id, professional_id)
       DO UPDATE SET schedule_text = $3::jsonb, updated_at = NOW()`,
      [businessId, professionalId, JSON.stringify(schedule)]
    );

    auditar(businessId, parseInt(session.user.id), "update_professional_schedule", "professional_schedule", professionalId, {
      schedule_days: Object.keys(schedule).length,
    });

    revalidatePath('/dashboard/configuracion');
    return { ok: true };
  } catch (e) {
    console.error('[updateProfessionalSchedule]', e);
    return { error: 'Error guardando el horario' };
  }
}
```

- [ ] Add `deleteProfessionalSchedule` server action

```typescript
export async function deleteProfessionalSchedule(businessId: number, professionalId: number) {
  const session = await auth();
  if (!session) return { error: 'No autenticado' };
  if (session.user.role !== 'owner' && session.user.role !== 'admin')
    return { error: 'No autorizado' };

  try {
    await pool.query(
      `DELETE FROM professional_schedule WHERE business_id = $1 AND professional_id = $2`,
      [businessId, professionalId]
    );

    auditar(businessId, parseInt(session.user.id), "delete_professional_schedule", "professional_schedule", professionalId, {});

    revalidatePath('/dashboard/configuracion');
    return { ok: true };
  } catch (e) {
    console.error('[deleteProfessionalSchedule]', e);
    return { error: 'Error eliminando el horario' };
  }
}
```

- [ ] Add `getAllProfessionalSchedules` server action

```typescript
export async function getAllProfessionalSchedules(businessId: number) {
  try {
    const { rows } = await pool.query(
      `SELECT p.id AS professional_id, p.name AS professional_name,
              ps.schedule_text, ps.updated_at
       FROM professionals p
       LEFT JOIN professional_schedule ps
         ON ps.business_id = p.business_id AND ps.professional_id = p.id
       WHERE p.business_id = $1 AND p.active = true
       ORDER BY p.name`,
      [businessId]
    );
    return rows.map(r => ({
      professionalId: r.professional_id,
      professionalName: r.professional_name,
      schedule: r.schedule_text
        ? (typeof r.schedule_text === 'string' ? JSON.parse(r.schedule_text) : r.schedule_text)
        : null,
      hasCustomSchedule: r.schedule_text != null,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    console.error('[getAllProfessionalSchedules]', e);
    return [];
  }
}
```

---

### Task 3: ProfessionalScheduleList Component

**Files:**
- Create: `dashboard/components/configuracion/professional-schedule-list.tsx`

Component that lists all active professionals and allows editing their schedules using the existing HorarioClient.

---

### Task 4: Configuración Page Update

**Files:**
- Modify: `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx`

Add the "Horarios por profesional" section below the existing schedule editor, gated by `multi_professional`.

---

### Task 5: getAvailableSlots Update

**Files:**
- Modify: `dashboard/lib/actions.ts` — lines 1564-1622

Update `getAvailableSlots` to use COALESCE pattern when professionalId is provided.

---

### Task 6: n8n Queries Update

**Files:**
- Modify: `workflows/WhatsApp Bot - Genérico.json` — Node [7] "Leer Slots Disponibles" query

Update the query to use COALESCE for per-professional schedule.

---

### Task 7: Documentation

**Files:**
- Modify: `docs/BUG_BACKLOG.md` — Mark B1 completo
- Modify: `docs/KEY_LEARNINGS.md` — Add lessons
- Modify: `docs/ARCHITECTURE.md` — Add professional_schedule to schema
