# Nodos: Gestión de Citas (Cancelación y Reagendamiento)

Flujo completo de cancelación y reagendamiento dentro del workflow `WhatsApp Bot - Genérico.json`.

---

## Diagrama de flujo completo

```
AI Agent (Code — LLM Orquestador)
  └─ Switch (lee $json.output)
        ├─ CITA_CONFIRMADA  → Verificar Slot → Insertar Cita → Construir Mensajes → Notificar Dueño → Confirmar Cliente
        ├─ GESTIONAR_CITA   → Leer Citas Cliente → Formatear Citas → Enviar Lista de Citas → Guardar Sesión
        ├─ CANCELAR_CITA    → Ejecutar Cancelación (paralelo: Sync Cancel Dashboard, Notificar Dueño Cancelación, Construir Confirmación Cancelación → Confirmar Cancelación)
        ├─ REAGENDAR_CITA   → Ejecutar Reagendamiento (paralelo: Construir Mensaje Reagendamiento → Confirmar Reagendamiento, Sync Reagend Dashboard, Construir Notificación Reagend → Notificar Dueño Reagend)
        └─ (texto normal)   → ¿Confirmar o Responder? → (vacio → Wait) | (Respuesta Normal)
```

## Estructura de conexiones

```
AI Agent
  └─ Switch (por output)
        ├─ CITA_CONFIRMADA → Verificar Slot → (disponible?) Insertar Cita → Construir Mensajes → Notificar Dueño → Confirmar Cliente
        ├─ GESTIONAR_CITA  → Leer Citas Cliente → Formatear Citas → Enviar Lista de Citas → Guardar Sesión → Leer Sesión activa → Formatear Disponibilidad
        ├─ CANCELAR_CITA   → [A] Ejecutar Cancelación
        ├─ REAGENDAR_CITA  → [B] Ejecutar Reagendamiento
        └─ default         → [C] ¿Confirmar o Responder?

[A] Ejecutar Cancelación
    ├─ Sync Cancel Dashboard
    ├─ Notificar Dueño Cancelación
    └─ Construir Confirmación Cancelación → Confirmar Cancelación → Limpiar Sesión Cancelación

[B] Ejecutar Reagendamiento
    ├─ Construir Mensaje Reagendamiento → Confirmar Reagendamiento → Limpiar Sesión Reagendamiento
    ├─ Sync Reagend Dashboard
    └─ Construir Notificación Reagend → Notificar Dueño Reagend

[C] ¿Confirmar o Responder?
    ├─ (vacío, no output) → Wait (reenvía al AI Agent)
    └─ Respuesta Normal → Guardar Historial → Leer Disponibilidad
```

---

## Nodos existentes (sin cambios de esta sesión)

### B2 — Leer Citas del Cliente (Postgres)
```sql
SELECT a.id, a.fecha::text, a.hora::text, a.servicio, a.estado, a.professional_id, a.nombre, p.name AS profesionalNombre
FROM appointments a LEFT JOIN professionals p ON a.professional_id = p.id
WHERE a.numero = '{{ $('Procesar Mensaje').item.json.numero.replace('@s.whatsapp.net','') }}'
  AND a.business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
  AND estado IN ('Pendiente', 'Confirmada')
ORDER BY a.fecha ASC, hora ASC
```

### B3 — Formatear Citas (Code JS)
Formatea las citas para respuesta al cliente y guarda en sesión con:
- `id`, `servicio`, `fecha`, `hora`, `professionalId`, `profesionalNombre` (desde `p.name`)

### Guardar Sesión (Postgres)
```sql
INSERT INTO sessions (business_id, numero, accion, citas, expires_at)
VALUES (...)
RETURNING id
```

### Leer Sesión activa (Postgres)
```sql
SELECT id, accion, citas
FROM sessions
WHERE business_id = {{ $json.businessId }}
  AND numero = '{{ $json.numeroLimpio }}'
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1
```

---

## Nodos de cancelación

### Ejecutar Cancelación (Postgres)
```sql
UPDATE appointments
SET estado = 'Cancelada', updated_at = NOW()
WHERE id = {{ $('AI Agent').item.json.output.split('|')[1] }}
  AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND estado IN ('Pendiente', 'Confirmada')
RETURNING id, fecha::text, hora::text, servicio, estado, professional_id, nombre,
  (SELECT name FROM professionals WHERE id = appointments.professional_id) AS professional_name
```

### Notificar Dueño Cancelación (HTTP)
Envía WhatsApp al dueño con: ❌ Cita cancelada — Cliente, Profesional, Servicio, Fecha, Hora.

### Construir Confirmación Cancelación (Code JS)
Construye mensaje de confirmación para el cliente: "✅ Tu cita de [servicio] del [fecha] a las [hora] ha sido cancelada."

### Confirmar Cancelación (HTTP)
Envía el mensaje de confirmación al cliente vía Evolution API.

### Sync Cancel Dashboard (HTTP)
Envía `{ appointmentId, businessId }` al dashboard para actualizar estado.

---

## Nodos de reagendamiento

### Ejecutar Reagendamiento (Postgres)
```sql
UPDATE appointments
SET fecha = TO_DATE('{{ $('AI Agent').item.json.output.split('|')[2] }}', 'DD/MM/YYYY'),
    hora  = '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time,
    estado = 'Pendiente',
    updated_at = NOW(),
    professional_id = COALESCE(
      (SELECT id FROM professionals WHERE name = '{{ ($('AI Agent').item.json.output.split('|')[4]||'').split('\n')[0].trim() }}' AND business_id = {{ $('Procesar Mensaje').item.json.businessId }} LIMIT 1),
      professional_id
    )
WHERE id = {{ $('AI Agent').item.json.output.split('|')[1] }}
  AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND estado IN ('Pendiente', 'Confirmada')
RETURNING id, fecha::text, hora::text, servicio, estado, professional_id, nombre,
  (SELECT name FROM professionals WHERE id = appointments.professional_id) AS professional_name
```

### Construir Mensaje Reagendamiento (Code JS)
Mensaje al cliente: "✅ ¡Listo! Tu cita de [servicio] con [profesional] quedó reagendada para el [fecha] a las [hora]."

### Confirmar Reagendamiento (HTTP)
Envía el mensaje de confirmación al cliente.

### Sync Reagend Dashboard (HTTP)
Envía `{ appointmentId, businessId }` al dashboard para sincronizar el reagendamiento.

### Construir Notificación Reagend (Code JS)
Construye mensaje para el dueño: "🔄 Cita reagendada — Cliente, Profesional, Servicio, Fecha, Hora."

### Notificar Dueño Reagend (HTTP)
Envía la notificación al dueño vía Evolution API.

---

## Notas importantes

- La sesión permite al AI saber qué citas tiene el cliente y la acción (cancelar/reagendar)
- El `professional_name` se obtiene vía subquery en el RETURNING para evitar que el UPDATE falle si la cita no tiene profesional asignado
- El 5to campo del código `REAGENDAR_CITA|ID|DD/MM/YYYY|HH:MM|Profesional` es opcional
- `Construir Confirmación Cancelación` y `Confirmar Cancelación` son del flujo de cancelación existente
- Esta sesión corrigió: saludo, CITA_CONFIRMADA, profesional en cancelación, reagendamiento sin notificación al dueño, profesionalNombre incorrecto, y manejo de AM/PM
