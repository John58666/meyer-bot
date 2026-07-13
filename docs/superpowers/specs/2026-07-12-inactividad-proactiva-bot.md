# Inactividad Proactiva del Bot

> **Fecha:** 12 julio 2026
> **Proyecto:** meyer-bot
> **Estado:** Diseño aprobado

---

## 1. Resumen

El bot actual solo maneja inactividad de forma **reactiva**: cuando el cliente vuelve a escribir tras 10-60 min de silencio, el LLM recibe una nota en el system prompt para preguntar si continuar. No hay envío proactivo de "¿Sigues ahí?".

Este spec agrega un workflow cron en n8n que cada 5 minutos detecta conversaciones con 15+ min de inactividad, envía un "¿Sigues ahí?" por WhatsApp, y cierra el flujo activo si el cliente no responde — sin eliminar el historial.

---

## 2. Alcance

### Incluye
- Workflow cron en n8n (Schedule cada 5 min)
- Migración DB: columna `inactividad_estado` en `conversation_history`
- Envío proactivo de "¿Sigues ahí?" vía Evolution API
- Cierre automático de flujo si no hay respuesta
- Integración con el flujo existente (reseteo en Guardar Historial)

### NO incluye
- Eliminación de historial (el cliente puede volver)
- Cambios al gap reactivo existente (10-60 min, >60 min)
- Interfaz de usuario en dashboard
- Configuración por negocio del timeout (fijo 15 min)

---

## 3. Stack
- **n8n** — Schedule trigger + PostgreSQL + Code + Evolution Send
- **PostgreSQL 16** — columna nueva en `conversation_history`
- **Evolution API** — envío de mensajes WhatsApp

---

## 4. Modelo de datos

### Migración: `016_inactividad_estado.sql`

```sql
ALTER TABLE conversation_history
ADD COLUMN IF NOT EXISTS inactividad_estado TEXT DEFAULT NULL;
```

No requiere nueva tabla. Rollback:
```sql
ALTER TABLE conversation_history DROP COLUMN IF EXISTS inactividad_estado;
```

---

## 5. Arquitectura

### 5.1 Flujo del cron workflow

```
[Schedule] cada 5 min
    │
    ▼
[PostgreSQL] — Query candidatos
    │
    ▼
[Code: Filtrar] — Por cada fila: fuera de horario? cierre? → decidir acción
    │
    ├── necesita "¿Sigues ahí?" → marcar para enviar
    └── ya avisado sin respuesta → marcar como cerrado
    │
    ▼
[Loop sobre filas]
    │
    ├── [Evolution Send] — enviar "¿Sigues ahí?"
    │       │
    │       ▼
    │   [PostgreSQL] — UPDATE inactividad_estado = 'avisado'
    │
    └── [PostgreSQL] — UPDATE inactividad_estado = 'cerrado'
```

### 5.2 Integración con flujo existente

En el nodo **Guardar Historial** del workflow principal, agregar al UPSERT:

```sql
inactividad_estado = NULL
```

Esto resetea la bandera cada vez que el cliente envía un mensaje y se procesa. El gap reactivo existente (>10 min → nota en prompt, >60 min → `prior = []`) no se modifica.

---

## 6. Componentes

### 6.1 Nodo Schedule

```
Trigger: Schedule
Mode: Every X minutes
Value: 5
```

### 6.2 Nodo PostgreSQL — Query candidatos

```sql
SELECT
  ch.business_id,
  ch.numero,
  ch.updated_at,
  ch.inactividad_estado,
  ch.messages,
  b.instance,
  b.owner_number,
  b.schedule_text,
  b.timezone
FROM conversation_history ch
JOIN businesses b ON b.id = ch.business_id
WHERE ch.updated_at < NOW() - '15 minutes'::interval
  AND b.active = true
  AND (ch.inactividad_estado IS NULL OR ch.inactividad_estado = 'avisado')
ORDER BY ch.updated_at ASC;
```

### 6.3 Nodo Code: Filter & Decide

JavaScript que procesa cada fila:

```
Entrada: array de filas de PostgreSQL
Salida: array de objetos con acción a tomar

Para cada fila:
1. Parsear schedule_text para determinar horario actual
2. Si hora actual NO está en horario laboral → SKIP (no molestar)
3. Leer conversation_history.messages (JSONB) → último mensaje del assistant
4. Revisar `messages` (JSONB array, último elemento con role='assistant'). Si el texto contiene CITA_CONFIRMADA, GESTIONAR_CITA, o patrones de cierre ("fuera de horario", "vuelve mañana", "gracias por escribir") → SKIP
5. Si inactividad_estado IS NULL → acción = 'avisar'
6. Si inactividad_estado = 'avisado' → acción = 'cerrar'
```

### 6.4 Nodo Evolution Send

Endpoint: `POST {{baseUrl}}/message/sendText/{{instance}}`

Body:
```json
{
  "number": "{{numero}}",
  "text": "¡Hola! ¿Sigues ahí? 😊 Hace rato no sé de ti. Si quieres retomamos donde íbamos o dime si prefieres empezar de nuevo."
}
```

### 6.5 Nodo PostgreSQL — Update estado

```sql
UPDATE conversation_history
SET inactividad_estado = $1
WHERE business_id = $2 AND numero = $3;
```

Con valores:
- Para 'avisar': `$1 = 'avisado', $2 = business_id, $3 = numero`
- Para 'cerrar': `$1 = 'cerrado', $2 = business_id, $3 = numero`

---

## 7. Mensajes

### "¿Sigues ahí?" (inactividad_estado → 'avisado')

```
¡Hola! ¿Sigues ahí? 😊 Hace rato no sé de ti.
Si quieres retomamos donde íbamos o dime si prefieres empezar de nuevo.
```

Tono: amigable, cálido, no presiona. Da dos opciones claras.

### Cierre (inactividad_estado → 'cerrado')

No se envía mensaje al cliente. Es solo un marcador interno para que el bot no insista. Si el cliente vuelve a escribir, el flujo se retoma normalmente.

---

## 8. Edge cases

| Caso | Comportamiento |
|------|---------------|
| **CITA_CONFIRMADA / GESTIONAR_CITA / cierre natural** | Code node revisa `messages` último assistant → SKIP |
| **Fuera de horario laboral** | Code node verifica schedule_text contra hora actual Bogotá → SKIP |
| **Cliente vuelve tras 'cerrado'** | Guardar Historial resetea `inactividad_estado = NULL` → conversación normal |
| **Gap >60 min** | El gap reactivo existente resetea `prior = []` (independiente de esto) |
| **Cliente escribe justo cuando corre el cron** | Se marca `'avisado'`, pero al procesar el mensaje Guardar Historial resetea a NULL → mensaje "¿Sigues ahí?" llega igual pero es inofensivo |
| **Múltiples negocios** | Query JOIN con `businesses`, funciona para todos los negocios |
| **Múltiples conversaciones** | El cron procesa todas las filas del query, cada una independiente |
| **Sin conversaciones inactivas** | Query devuelve 0 filas → workflow termina sin acciones |

---

## 9. Criterios de aceptación

1. [ ] Después de 15 min de inactividad, el bot envía "¿Sigues ahí?" automáticamente
2. [ ] Si el cliente no responde tras el aviso, la conversación se marca como 'cerrado'
3. [ ] Si el cliente vuelve a escribir, el historial está intacto y la conversación continúa
4. [ ] No se envía "¿Sigues ahí?" si la última conversación terminó con CITA_CONFIRMADA
5. [ ] No se envía "¿Sigues ahí?" fuera del horario laboral del negocio
6. [ ] El gap reactivo existente (10-60 min → nota en prompt, >60 min → reseteo) sigue funcionando
7. [ ] Funciona para todos los negocios multi-tenant
8. [ ] Migración DB aplica y rollback funciona
