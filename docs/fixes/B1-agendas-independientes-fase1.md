# B1 — Fase 1: Agendas independientes por profesional

> Arregla: disponibilidad per-profesional, colisión al insertar, formato agrupado.
> Aplica en: n8n workflow `WhatsApp Bot - Genérico`.

---

## Nodos a modificar (3 nodos)

| # | Nodo | Tipo | Cambio |
|---|------|------|--------|
| 1 | `Leer Slots Disponibles` | PostgreSQL | Query ahora filtra citas por profesional y agrupa output |
| 2 | `Formatear Disponibilidad` | Code | Agrupa por fecha → profesional, formato compacto con header |
| 3 | `Leer Disponibilidad` | PostgreSQL | Filtra colisión por profesional específico |

---

## 1. Leer Slots Disponibles — PostgreSQL

**Campo a modificar:** `Query`

### Query actual (a reemplazar):
```sql
WITH horario AS (
  SELECT
    key::int                              AS dia_semana,
    (value->>'open')::int                 AS hora_open,
    (value->>'close')::int * 60 - 30      AS hora_close_last_min
  FROM businesses,
       jsonb_each(schedule_text)
  WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}
),
excepciones AS (
  SELECT fecha, tipo, hora_inicio, hora_fin
  FROM schedule_exceptions
  WHERE business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND professional_id IS NULL
    AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
),
slots AS (
  SELECT
    d.fecha_slot,
    generate_series(
      d.fecha_slot + (h.hora_open || ' hours')::interval,
      d.fecha_slot + (h.hora_close_last_min || ' minutes')::interval,
      '30 minutes'::interval
    )::time AS hora
  FROM (
    SELECT (NOW() AT TIME ZONE 'America/Bogota')::date + n AS fecha_slot
    FROM generate_series(0, 7) AS n
  ) d
  JOIN horario h ON EXTRACT(DOW FROM d.fecha_slot) = h.dia_semana
  WHERE NOT EXISTS (
    SELECT 1 FROM excepciones e
    WHERE e.fecha = d.fecha_slot AND e.tipo = 'cerrado'
  )
)
SELECT
  s.fecha_slot::text            AS fecha,
  to_char(s.hora, 'HH12:MI AM') AS slot
FROM slots s
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND a.fecha = s.fecha_slot
    AND a.estado != 'Cancelada'
    AND s.hora >= a.hora
    AND s.hora < a.hora + (30 + COALESCE((SELECT buffer_minutes FROM businesses WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}), 0)) * interval '1 minute'
)
AND NOT EXISTS (
  SELECT 1 FROM excepciones e
  WHERE e.fecha = s.fecha_slot
    AND e.tipo = 'horario_especial'
    AND (s.hora < e.hora_inicio OR s.hora >= e.hora_fin)
)
AND (
  s.fecha_slot > (NOW() AT TIME ZONE 'America/Bogota')::date
  OR (
    s.fecha_slot = (NOW() AT TIME ZONE 'America/Bogota')::date
    AND s.hora > (NOW() AT TIME ZONE 'America/Bogota')::time
  )
)
ORDER BY s.fecha_slot, s.hora
```

### Query nueva:
```sql
WITH horario AS (
  SELECT
    key::int                        AS dia_semana,
    (value->>'open')::int           AS hora_open,
    (value->>'close')::int * 60 - 30 AS hora_close_last_min
  FROM businesses,
       jsonb_each(schedule_text)
  WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}
),
excepciones_globales AS (
  SELECT fecha, tipo, hora_inicio, hora_fin
  FROM schedule_exceptions
  WHERE business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND professional_id IS NULL
    AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
),
dias AS (
  SELECT (NOW() AT TIME ZONE 'America/Bogota')::date + n AS fecha_slot
  FROM generate_series(0, 7) AS n
),
profesionales AS (
  SELECT id, name FROM professionals
  WHERE business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND active = true
)
SELECT
  p.name        AS professional_name,
  p.id          AS professional_id,
  d.fecha_slot::text            AS fecha,
  to_char(s.hora, 'HH12:MI AM') AS slot
FROM dias d
JOIN horario h ON EXTRACT(DOW FROM d.fecha_slot) = h.dia_semana
CROSS JOIN profesionales p
CROSS JOIN LATERAL (
  SELECT generate_series(
    d.fecha_slot + (h.hora_open || ' hours')::interval,
    d.fecha_slot + (h.hora_close_last_min || ' minutes')::interval,
    '30 minutes'::interval
  )::time AS hora
) s
WHERE NOT EXISTS (
  SELECT 1 FROM excepciones_globales e
  WHERE e.fecha = d.fecha_slot AND e.tipo = 'cerrado'
)
AND NOT EXISTS (
  SELECT 1 FROM schedule_exceptions e
  WHERE e.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND e.fecha = d.fecha_slot
    AND e.professional_id = p.id
    AND e.tipo = 'cerrado'
)
AND NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND a.fecha = d.fecha_slot
    AND a.estado != 'Cancelada'
    AND a.professional_id = p.id
    AND s.hora >= a.hora
    AND s.hora < a.hora + (30 + COALESCE((SELECT buffer_minutes FROM businesses WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}), 0)) * interval '1 minute'
)
AND NOT EXISTS (
  SELECT 1 FROM excepciones_globales e
  WHERE e.fecha = d.fecha_slot
    AND e.tipo = 'horario_especial'
    AND (s.hora < e.hora_inicio OR s.hora >= e.hora_fin)
)
AND NOT EXISTS (
  SELECT 1 FROM schedule_exceptions e
  WHERE e.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
    AND e.fecha = d.fecha_slot
    AND e.professional_id = p.id
    AND e.tipo = 'horario_especial'
    AND (s.hora < e.hora_inicio OR s.hora >= e.hora_fin)
)
AND (
  d.fecha_slot > (NOW() AT TIME ZONE 'America/Bogota')::date
  OR (
    d.fecha_slot = (NOW() AT TIME ZONE 'America/Bogota')::date
    AND s.hora > (NOW() AT TIME ZONE 'America/Bogota')::time
  )
)
ORDER BY d.fecha_slot, p.name, s.hora
```

### Cambios:
- ✅ Cruza cada profesional contra cada slot del horario
- ✅ Filtra citas por el profesional específico (no mezcla)
- ✅ Considera `schedule_exceptions` tanto globales como por profesional
- Output: `professional_name`, `professional_id`, `fecha`, `slot`

---

## 2. Formatear Disponibilidad — Code

**Campo a modificar:** `jsCode`

### Código actual (solo la sección de disponibilidad, de `const slots` a `disponibilidad +=`):
```javascript
const slots = $input.all();
const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const porFecha = {};
for (const item of slots) {
  const fecha = item.json.fecha;
  const slot  = item.json.slot;
  if (!porFecha[fecha]) porFecha[fecha] = [];
  porFecha[fecha].push(slot);
}

let disponibilidad = '';
for (const [fecha, horas] of Object.entries(porFecha)) {
  const d = new Date(fecha + 'T00:00:00');
  const nombreDia = diasSemana[d.getUTCDay()];
  const dia = d.getUTCDate();
  const mes = meses[d.getUTCMonth()];
  disponibilidad += `${nombreDia} ${dia} de ${mes}:\n${horas.map(h => h.replace(/\b0(\d)/g, '$1').replace(/AM/g, 'a.m.').replace(/PM/g, 'p.m.')).join('\n')}\n`;
}
```

### Código nuevo (reemplazar solo este bloque, mantener TODO lo demás del nodo):
```javascript
const slots = $input.all();
const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const hoy = new Date();

const porFecha = {};
for (const item of slots) {
  const f = item.json.fecha;
  const prof = item.json.professional_name || 'Disponible';
  const slot = item.json.slot;
  if (!porFecha[f]) porFecha[f] = {};
  if (!porFecha[f][prof]) porFecha[f][prof] = [];
  porFecha[f][prof].push(slot);
}

let disponibilidad = '';
for (const [fecha, profesionales] of Object.entries(porFecha)) {
  const d = new Date(fecha + 'T00:00:00');
  const nombreDia = diasSemana[d.getUTCDay()];
  const dia = d.getUTCDate();
  const mes = meses[d.getUTCMonth()];
  const anyo = d.getUTCFullYear();
  const fechaLabel = `${nombreDia} ${dia} de ${mes}${anyo !== hoy.getUTCFullYear() ? ` de ${anyo}` : ''}`;

  disponibilidad += `📅 ${fechaLabel}:\n`;

  for (const [prof, horas] of Object.entries(profesionales)) {
    const horasFormateadas = horas.map(h =>
      h.replace(/\b0(\d)/g, '$1').replace(/AM/g, 'a.m.').replace(/PM/g, 'p.m.')
    );
    const maxSlots = 8;
    const mostradas = horasFormateadas.slice(0, maxSlots);
    const restantes = horasFormateadas.length - maxSlots;
    let linea = mostradas.join(', ');
    if (restantes > 0) linea += ` y ${restantes} más`;
    disponibilidad += `👤 ${prof}: 🟢 ${linea}\n`;
  }
}
```

### Cambios:
- ✅ Header `📅 Jueves 23 de julio:` arriba de cada día
- ✅ Agrupa slots por profesional: `👤 Cristian: 🟢 9am, 10am, ...`
- ✅ Máximo 8 slots por línea, si hay más: "y X más"
- ✅ Slots separados por coma (compacto, no un renglón por slot)

> **⚠️ IMPORTANTE:** Mantener intacto el resto del código del nodo (sesionContexto, debugSesion, el return final con `...prev`).

---

## 3. Leer Disponibilidad — PostgreSQL

**Campo a modificar:** `Query`

### Query actual:
```sql
SELECT COUNT(*) as total FROM appointments a WHERE a.business_id = {{ $('Procesar Mensaje').item.json.businessId }} AND a.fecha = TO_DATE('{{ $('AI Agent').item.json.output.split('|')[2] }}', 'DD/MM/YYYY') AND a.estado != 'Cancelada' AND '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time >= a.hora AND '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time < a.hora + (30 + COALESCE((SELECT buffer_minutes FROM businesses WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}), 0)) * interval '1 minute'
```

### Query nueva:
```sql
SELECT COUNT(*) as total FROM appointments a
WHERE a.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND a.fecha = TO_DATE('{{ $('AI Agent').item.json.output.split('|')[2] }}', 'DD/MM/YYYY')
  AND a.estado != 'Cancelada'
  AND '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time >= a.hora
  AND '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time < a.hora + (30 + COALESCE((SELECT buffer_minutes FROM businesses WHERE id = {{ $('Procesar Mensaje').item.json.businessId }}), 0)) * interval '1 minute'
  AND (
    '{{ $('AI Agent').item.json.output.split('|')[4] || '' }}' = ''
    OR a.professional_id IS NULL
    OR a.professional_id = (
      SELECT id FROM professionals
      WHERE name = '{{ $('AI Agent').item.json.output.split('|')[4].trim() }}'
        AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
      LIMIT 1
    )
  )
```

### Cambios:
- ❌ Antes: contaba TODAS las citas → bloqueaba el slot para todos los profesionales
- ✅ Ahora: si el output trae un profesional (5to campo), solo cuenta citas de ESE profesional
- ✅ Si no trae profesional (negocio sin multi_professional), no filtra (backward compatible)

---

## Nodos que NO cambian (ya correctos)

| Nodo | Motivo |
|------|--------|
| `Verificar Slot` | Ya extrae `professionalName` de `partes[4]` y lo pasa al output |
| `Insertar Cita` | Ya usa `professional_id` con COALESCE para asignar por nombre |
| `Lookup Negocio` | Ya retorna `professionals` como JSON con id y name |
| `AI Agent` | Ya soporta `CITA_CONFIRMADA|...|...|...|...|profesional` |

---

## Cómo aplicar en n8n UI

1. Ir a n8n → Workflow `WhatsApp Bot - Genérico`
2. Editar nodo **Leer Slots Disponibles** → pegar nueva query en campo `Query`
3. Editar nodo **Formatear Disponibilidad** → reemplazar `jsCode` (solo bloque de disponibilidad, mantener sesionContexto)
4. Editar nodo **Leer Disponibilidad** → pegar nueva query en campo `Query`
5. Guardar workflow
6. Probar con: "Quiero agendar un corte con Juliana para mañana"

---

## Cómo revertir

Las queries anteriores están documentadas como "Query actual". Pegarlas de vuelta en cada nodo.

---

## Dashboard — Pendiente

Esta fase solo toca n8n. El dashboard (`getAvailableSlots`) sigue usando `schedule_text` global compartido. Se actualizará en **Fase 2** cuando agreguemos `schedule_text` por profesional en la DB.
