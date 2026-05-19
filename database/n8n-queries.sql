-- ============================================================
-- meyer-bot — Queries PostgreSQL para nodos n8n
-- Reemplazos directos de los nodos de Google Sheets
-- ============================================================

-- ============================================================
-- NODO: "Leer Disponibilidad" (reemplaza Google Sheets getRows)
-- Contexto: Se ejecuta cuando If1 detecta CITA_CONFIRMADA
-- En n8n: nodo PostgreSQL → Execute Query
-- business_id fijo = 1 para Meyer (parametrizar cuando escale)
-- ============================================================
-- Query para verificar si un slot está disponible:
SELECT
  fecha::text,
  hora::text,
  estado
FROM appointments
WHERE business_id = 1
  AND fecha = TO_DATE('{{ $('AI Agent').item.json.output.split("|")[2] }}', 'DD/MM/YYYY')
  AND hora  = '{{ $('AI Agent').item.json.output.split("|")[3].split("\n")[0].trim() }}'::time
  AND estado != 'Cancelada';
-- Si retorna 0 filas → slot disponible
-- Si retorna 1+ filas → ocupado


-- ============================================================
-- NODO: "Verificar Slot" (reemplaza Code in JavaScript)
-- El nodo PostgreSQL retorna directamente si hay filas o no
-- Reemplazar toda la lógica JS por:
--   IF {{ $json.length }} === 0 → disponible
-- ============================================================
-- (Este Code node puede eliminarse. El nodo PostgreSQL de arriba
--  retorna los datos; el nodo If posterior lee $json.length)


-- ============================================================
-- NODO: "Append row in sheet" (reemplaza Google Sheets append)
-- Contexto: Se ejecuta cuando ¿Disponible? → TRUE
-- En n8n: nodo PostgreSQL → Execute Query
-- ============================================================
INSERT INTO appointments
  (business_id, fecha, hora, nombre, servicio, numero, estado)
VALUES (
  1,
  TO_DATE('{{ $('AI Agent').item.json.output.split("|")[2] }}', 'DD/MM/YYYY'),
  '{{ $('AI Agent').item.json.output.split("|")[3].split("\n")[0].trim() }}'::time,
  '{{ $('Webhook').item.json.body.data.pushName }}',
  '{{ $('AI Agent').item.json.output.split("|")[1] }}',
  '{{ $('Code in JavaScript').item.json.numero }}'.replace('@s.whatsapp.net',''),
  'Pendiente'
)
RETURNING id, fecha::text, hora::text, nombre, servicio, numero, estado;


-- ============================================================
-- NODO: "Leer Citas" en recordatorios-meyer (reemplaza getRows)
-- Contexto: Workflow de recordatorios — cron 3PM diario
-- En n8n: nodo PostgreSQL → Execute Query
-- Retorna citas de mañana con estado Pendiente
-- ============================================================
SELECT
  fecha::text                                    AS "Fecha",
  hora::text                                     AS "Hora",
  nombre                                         AS "Nombre",
  servicio                                       AS "Servicio",
  numero                                         AS "Número",
  estado                                         AS "Estado",
  b.whatsapp_instance,
  b.owner_number
FROM appointments a
JOIN businesses b ON b.id = a.business_id
WHERE a.fecha = CURRENT_DATE + INTERVAL '1 day'
  AND a.estado = 'Pendiente'
  AND b.active = TRUE;
-- El nodo "Filtrar Mañana" (Code JS) puede simplificarse enormemente:
-- ya no necesita calcular fechas ni filtrar por estado, el SQL lo hace.


-- ============================================================
-- QUERIES PARA EL DASHBOARD (Sprint 3)
-- ============================================================

-- Citas de hoy
SELECT
  id,
  hora::text,
  nombre,
  servicio,
  numero,
  estado
FROM appointments
WHERE business_id = 1
  AND fecha = CURRENT_DATE
ORDER BY hora;

-- Citas de la semana
SELECT
  fecha::text,
  hora::text,
  nombre,
  servicio,
  numero,
  estado
FROM appointments
WHERE business_id = 1
  AND fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND estado != 'Cancelada'
ORDER BY fecha, hora;

-- Cancelar cita
UPDATE appointments
SET estado = 'Cancelada'
WHERE id = $1 AND business_id = 1
RETURNING id, estado;

-- Reagendar cita
UPDATE appointments
SET fecha = TO_DATE($2, 'DD/MM/YYYY'),
    hora  = $3::time
WHERE id = $1 AND business_id = 1
RETURNING id, fecha::text, hora::text;

-- ============================================================
-- QUERY PARA DISPONIBILIDAD PROACTIVA (Sprint 2)
-- Slots del día siguiente aún libres (para pasar al system prompt)
-- ============================================================
WITH
  -- Horario completo del negocio (de 9AM a 7PM cada hora, Lunes-Sáb)
  -- Domingos: 10AM-5PM — ajustar según día de la semana del parámetro
  all_slots AS (
    SELECT generate_series(
      '2000-01-01 09:00:00'::timestamp,
      '2000-01-01 19:00:00'::timestamp,
      '1 hour'::interval
    )::time AS slot
  ),
  occupied AS (
    SELECT hora
    FROM appointments
    WHERE business_id = 1
      AND fecha = $1::date   -- fecha a consultar (ej: mañana)
      AND estado != 'Cancelada'
  )
SELECT
  to_char(slot, 'HH12:MI AM') AS slot_label,
  slot::text AS slot_time
FROM all_slots
WHERE slot NOT IN (SELECT hora FROM occupied)
ORDER BY slot;
-- Retorna algo como: ["09:00 AM", "10:00 AM", "02:00 PM"]
-- Inyectar en system prompt: "Horarios disponibles mañana: 9AM, 10AM, 2PM"
