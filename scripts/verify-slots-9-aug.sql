-- Ejecuta la query de Leer Slots Disponibles contra la DB real, filtrando solo 9 de agosto
WITH horario AS (
  SELECT
    p.id                          AS professional_id,
    p.name                        AS professional_name,
    key::int                      AS dia_semana,
    (value->>'open')::int         AS hora_open,
    (value->>'close')::int * 60 - 30 AS hora_close_last_min
  FROM businesses b
  JOIN professionals p ON p.business_id = b.id AND p.active = true
  LEFT JOIN professional_schedule ps ON ps.business_id = b.id AND ps.professional_id = p.id
  CROSS JOIN LATERAL jsonb_each(COALESCE(ps.schedule_text, b.schedule_text)) AS j(key, value)
  WHERE b.id = 1
),
excepciones_globales AS (
  SELECT fecha, tipo, hora_inicio, hora_fin
  FROM schedule_exceptions
  WHERE business_id = 1
    AND professional_id IS NULL
    AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
),
dias AS (
  SELECT (NOW() AT TIME ZONE 'America/Bogota')::date + n AS fecha_slot
  FROM generate_series(0, 89) AS n
)
SELECT
  h.professional_name,
  d.fecha_slot::text            AS fecha,
  to_char(s.hora, 'HH12:MI AM') AS slot
FROM dias d
JOIN horario h ON EXTRACT(DOW FROM d.fecha_slot) = h.dia_semana
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
  WHERE e.business_id = 1
    AND e.fecha = d.fecha_slot
    AND e.professional_id = h.professional_id
    AND e.tipo = 'cerrado'
)
AND NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.business_id = 1
    AND a.fecha = d.fecha_slot
    AND a.estado != 'Cancelada'
    AND a.professional_id = h.professional_id
    AND s.hora >= a.hora
    AND s.hora < COALESCE(a.hora_fin, a.hora + interval '30 minutes')
)
AND NOT EXISTS (
  SELECT 1 FROM excepciones_globales e
  WHERE e.fecha = d.fecha_slot
    AND e.tipo = 'horario_especial'
    AND (s.hora < e.hora_inicio OR s.hora >= e.hora_fin)
)
AND NOT EXISTS (
  SELECT 1 FROM schedule_exceptions e
  WHERE e.business_id = 1
    AND e.fecha = d.fecha_slot
    AND e.professional_id = h.professional_id
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
AND d.fecha_slot = '2026-08-09'::date   -- FILTRO SOLO PARA VERIFIcACIÓN
ORDER BY d.fecha_slot, h.professional_name, s.hora;
