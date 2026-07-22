# B1 Fase 2 — Agendas independientes por profesional

**Fecha:** 2026-07-21
**Estado:** Design document
**Sprint:** 19

---

## 1. Problema

`schedule_text` vive en `businesses` (un solo horario para todo el negocio). Todos los profesionales comparten el mismo horario. Si un profesional trabaja horario distinto a otro, no hay dónde almacenarlo. El bot (n8n) y el dashboard usan el mismo schedule para todos los profesionales.

## 2. Solución

Nueva tabla `professional_schedule` con mismo formato JSONB que `businesses.schedule_text`. Fallback: si un profesional no tiene horario personalizado, se usa el del negocio.

## 3. DB — Migración

### 3.1 Nueva tabla

```sql
CREATE TABLE professional_schedule (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  schedule_text   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, professional_id)
);

CREATE TRIGGER professional_schedule_updated_at
  BEFORE UPDATE ON professional_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_prof_schedule_business ON professional_schedule(business_id);
CREATE INDEX idx_prof_schedule_professional ON professional_schedule(professional_id);
```

### 3.2 Mismo formato que `businesses.schedule_text`

```json
{"0":{"open":10,"close":17},"1":{"open":9,"close":19}}
```

Clave = día semana 0-6 (domingo=0). Día sin clave = cerrado.

### 3.3 Regla de resolución

1. Si existe fila en `professional_schedule` para el profesional → usar ese schedule
2. Si no existe → usar `businesses.schedule_text`

## 4. Server Actions

### 4.1 `getProfessionalSchedule(businessId, professionalId)`

```typescript
SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
FROM businesses b
LEFT JOIN professional_schedule ps
  ON ps.business_id = b.id AND ps.professional_id = $2
WHERE b.id = $1
```

### 4.2 `updateProfessionalSchedule(businessId, professionalId, schedule)`

- RBAC: solo owner/admin
- UPSERT en `professional_schedule`
- Audit log

### 4.3 `deleteProfessionalSchedule(businessId, professionalId)`

- DELETE en `professional_schedule`
- A partir de ahí el profesional vuelve al horario del negocio

### 4.4 `getAllProfessionalSchedules(businessId)`

- LEFT JOIN `professionals` con `professional_schedule`
- Retorna todos los profesionales con su schedule (o null si usan el del negocio)

## 5. Dashboard UI

### 5.1 Ubicación

En `/dashboard/configuracion`, debajo de la sección "Horarios" existente.

Solo visible si `multi_professional = true` (mismo flag que controla la columna profesional en el dashboard).

### 5.2 Componentes

**`ProfessionalScheduleList`** — lista de profesionales con:
- Nombre del profesional
- Badge: "Usa horario del negocio" | "Horario personalizado"
- Botón "Editar horario" → abre `HorarioClient` con el schedule de ese profesional
- Botón "Restaurar horario del negocio" → elimina el `professional_schedule`

Reutiliza el componente `HorarioClient` existente (misma UI de toggle día por día con selects de hora).

### 5.3 Flujo

1. Owner/admin va a Configuración
2. Ve "Horarios del negocio" (existente) y "Horarios por profesional" (nuevo)
3. En "Horarios por profesional" ve la lista de profesionales activos
4. Click "Editar horario" en un profesional → se abre el editor
5. Guarda → UPSERT en `professional_schedule`
6. "Restaurar horario del negocio" → DELETE en `professional_schedule`

## 6. getAvailableSlots — Actualización

### 6.1 Lógica nueva

```typescript
// Si hay professionalId, buscar en professional_schedule con fallback
let schedule: ScheduleData;
if (professionalId != null) {
  const { rows } = await pool.query(`
    SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
    FROM businesses b
    LEFT JOIN professional_schedule ps
      ON ps.business_id = b.id AND ps.professional_id = $2
    WHERE b.id = $1
  `, [businessId, professionalId]);
  if (rows.length === 0) return [];
  schedule = parseSchedule(rows[0].schedule_text);
} else {
  const { rows } = await pool.query(
    `SELECT schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (rows.length === 0) return [];
  schedule = parseSchedule(rows[0].schedule_text);
}
```

### 6.2 Sin cambios en la firma

La función ya acepta `professionalId?: number | null` — la firma no cambia.

## 7. n8n — Actualización de queries

### 7.1 Nodo "Leer Slots Disponibles" (Node [7])

Query actual usa `FROM businesses, jsonb_each(schedule_text)`. Cambia a:

```sql
WITH prof_schedule AS (
  SELECT COALESCE(ps.schedule_text, b.schedule_text) AS effective_schedule
  FROM businesses b
  LEFT JOIN professional_schedule ps
    ON ps.business_id = b.id AND ps.professional_id = p.id
  WHERE b.id = {{ businessId }}
)
SELECT ... FROM businesses b
CROSS JOIN professionals p
CROSS JOIN LATERAL jsonb_each(
  COALESCE(
    (SELECT schedule_text FROM professional_schedule WHERE business_id = b.id AND professional_id = p.id),
    b.schedule_text
  )
) AS ...
```

### 7.2 Nodo "Leer Disponibilidad" (Node [14]) — post-LLM validation

Ya usa `schedule_text` del `businesses` para check #2 (día sin horario). Cambia a COALESCE contra `professional_schedule` cuando el profesional está definido.

## 8. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `database/migrations/017_professional_schedule.sql` | Nueva migración |
| `dashboard/lib/actions.ts` | Nuevas server actions + update getAvailableSlots |
| `dashboard/components/configuracion/horario-client.tsx` | Reutilizado (sin cambios) |
| `dashboard/components/configuracion/professional-schedule-list.tsx` | Nuevo componente |
| `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` | Agregar sección horarios por profesional |
| `workflows/WhatsApp Bot - Genérico.json` | Actualizar queries en Node [7] y Node [14] |
| `docs/BUG_BACKLOG.md` | Marcar B1 como completado |
| `docs/KEY_LEARNINGS.md` | Agregar lecciones |

## 9. Backwards Compatibility

- `professional_schedule` es una tabla nueva (no afecta nada existente)
- Si no hay filas en `professional_schedule`, el comportamiento es idéntico al actual
- `businesses.schedule_text` sigue siendo el default
- Migración aditiva y zero-downtime
