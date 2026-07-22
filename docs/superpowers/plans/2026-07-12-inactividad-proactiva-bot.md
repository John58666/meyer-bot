# Inactividad Proactiva del Bot — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bot envía "¿Sigues ahí?" tras 15 min de inactividad y cierra flujo si no responde, sin borrar historial.

**Architecture:** Nuevo workflow cron en n8n (Schedule cada 5 min) que consulta `conversation_history`, filtra en Code node, envía mensaje vía Evolution API y actualiza estado. Se agrega columna `inactividad_estado` a `conversation_history`. El nodo Guardar Historial existente resetea la bandera cuando el cliente responde.

**Tech Stack:** n8n, PostgreSQL 16, Evolution API

## Global Constraints

- La columna nueva se agrega con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- El cron workflow debe seguir el mismo formato JSON que los workflows existentes
- El mensaje "¿Sigues ahí?" debe ir en español, tono amigable
- Las credenciales van en variables de entorno (EVOLUTION_API_URL, EVOLUTION_API_KEY)
- No se modifica el gap reactivo existente (>10 min nota prompt, >60 min reseteo prior)

---

### Task 1: Migración DB

**Files:**
- Create: `database/migrations/016_inactividad_estado.sql`

- [ ] **Step 1: Crear migration file**

```sql
-- 016_inactividad_estado.sql
-- Agrega columna para tracking de inactividad proactiva del bot

ALTER TABLE conversation_history
ADD COLUMN IF NOT EXISTS inactividad_estado TEXT DEFAULT NULL;

-- Rollback:
-- ALTER TABLE conversation_history DROP COLUMN IF EXISTS inactividad_estado;
```

- [ ] **Step 2: Aplicar migración a DB**

Run:
```bash
psql "$DATABASE_URL" -f database/migrations/016_inactividad_estado.sql
```

Verificar:
```bash
psql "$DATABASE_URL" -c "\d conversation_history" | grep inactividad
# Debe mostrar: inactividad_estado | text | default ''null::text''
```

- [ ] **Step 3: Commit**

```bash
git add database/migrations/016_inactividad_estado.sql
git commit -m "feat: add inactividad_estado column to conversation_history"
```

---

### Task 2: Modificar Guardar Historial en workflow principal

**Files:**
- Modify: `workflows/WhatsApp Bot - Genérico.json` (nodo Guardar Historial)

El nodo "Guardar Historial" actual hace un UPSERT a `conversation_history`. Hay que agregar `inactividad_estado = NULL` al `DO UPDATE SET` para que cada vez que el cliente responda se reseteé la bandera.

- [ ] **Step 1: Localizar y modificar el SQL del nodo Guardar Historial**

En el JSON del workflow, buscar el nodo con `name: "Guardar Historial"` y en `parameters.query` agregar `inactividad_estado = NULL` al `DO UPDATE SET`.

SQL actual:
```sql
INSERT INTO conversation_history (business_id, numero, messages, updated_at, expires_at)
VALUES (
  {{ $('AI Agent').item.json.businessId }},
  '{{ $('AI Agent').item.json.numeroLimpio }}',
  '{{ $('AI Agent').item.json.historyJSON }}'::jsonb,
  NOW(),
  NOW() + INTERVAL '2 hours'
)
ON CONFLICT (business_id, numero)
DO UPDATE SET
  messages   = EXCLUDED.messages,
  updated_at = EXCLUDED.updated_at,
  expires_at = EXCLUDED.expires_at;

DELETE FROM conversation_history WHERE expires_at < NOW();
```

SQL modificado:
```sql
INSERT INTO conversation_history (business_id, numero, messages, updated_at, expires_at)
VALUES (
  {{ $('AI Agent').item.json.businessId }},
  '{{ $('AI Agent').item.json.numeroLimpio }}',
  '{{ $('AI Agent').item.json.historyJSON }}'::jsonb,
  NOW(),
  NOW() + INTERVAL '2 hours'
)
ON CONFLICT (business_id, numero)
DO UPDATE SET
  messages          = EXCLUDED.messages,
  updated_at        = EXCLUDED.updated_at,
  expires_at        = EXCLUDED.expires_at,
  inactividad_estado = NULL;

DELETE FROM conversation_history WHERE expires_at < NOW();
```

- [ ] **Step 2: Commit**

```bash
git add workflows/WhatsApp\ Bot\ -\ Genérico.json
git commit -m "feat: reset inactividad_estado on each client message"
```

---

### Task 3: Crear workflow cron de inactividad

**Files:**
- Create: `workflows/Inactividad Bot - Proactivo.json`

Este es el nuevo workflow de n8n. Estructura:
1. Schedule trigger (cada 5 min)
2. PostgreSQL — query candidatos
3. Code — filtrar y decidir acción
4. Loop — HTTP Request (Evolution Send) + PostgreSQL (update estado)

- [ ] **Step 1: Crear el archivo JSON del workflow**

```json
{
  "name": "Inactividad Bot - Proactivo",
  "nodes": [
    {
      "id": "schedule-trigger-001",
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 0],
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyXMinutes",
              "value": 5
            }
          ]
        }
      }
    },
    {
      "id": "postgres-query-001",
      "name": "Buscar Conversaciones Inactivas",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.6,
      "position": [300, 0],
      "credentials": {
        "postgres": {
          "id": "AkRs7Kx5gs6JnVMz",
          "name": "Postgres account"
        }
      },
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT\n  ch.business_id,\n  ch.numero,\n  ch.updated_at,\n  ch.inactividad_estado,\n  ch.messages,\n  b.instance,\n  b.owner_number,\n  b.schedule_text::text,\n  b.timezone\nFROM conversation_history ch\nJOIN businesses b ON b.id = ch.business_id\nWHERE ch.updated_at < NOW() - '15 minutes'::interval\n  AND b.active = true\n  AND (ch.inactividad_estado IS NULL OR ch.inactividad_estado = 'avisado')\nORDER BY ch.updated_at ASC",
        "options": {}
      }
    },
    {
      "id": "code-filter-001",
      "name": "Filtrar y Decidir",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [600, 0],
      "parameters": {
        "language": "javascript",
        "code": "// ─── FILTRAR Y DECIDIR ACCIÓN POR INACTIVIDAD ───\n// Entrada: items del nodo PostgreSQL\n// Salida: items con acción 'avisar' o 'cerrar'\n// Luego un IF node bifurca según accion === 'avisar'\n\nconst ITEMS = $input.all();\nconst RESULT = [];\n\nconst DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];\n\nfor (const item of ITEMS) {\n  const json = item.json;\n  \n  // 1. Parsear schedule_text\n  let scheduleText = {};\n  try {\n    scheduleText = typeof json.schedule_text === 'string'\n      ? JSON.parse(json.schedule_text)\n      : json.schedule_text;\n  } catch (e) {\n    scheduleText = {};\n  }\n  \n  // 2. Verificar horario laboral\n  const ahora = new Date();\n  const diaSemana = DIAS[ahora.getDay()];\n  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();\n  \n  const horarioHoy = scheduleText[diaSemana];\n  let dentroDeHorario = false;\n  \n  if (horarioHoy && horarioHoy.length > 0) {\n    for (const bloque of horarioHoy) {\n      if (bloque.desde && bloque.hasta) {\n        const [hDesde, mDesde] = bloque.desde.split(':').map(Number);\n        const [hHasta, mHasta] = bloque.hasta.split(':').map(Number);\n        const inicio = hDesde * 60 + mDesde;\n        const fin = hHasta * 60 + mHasta;\n        if (horaActual >= inicio && horaActual <= fin) {\n          dentroDeHorario = true;\n          break;\n        }\n      }\n    }\n  }\n  \n  if (!dentroDeHorario) continue;\n  \n  // 3. Revisar último mensaje del assistant\n  let ultimoMensaje = '';\n  try {\n    const messages = typeof json.messages === 'string'\n      ? JSON.parse(json.messages)\n      : json.messages;\n    if (Array.isArray(messages) && messages.length > 0) {\n      for (let i = messages.length - 1; i >= 0; i--) {\n        if (messages[i].role === 'assistant') {\n          ultimoMensaje = messages[i].content || messages[i].text || '';\n          break;\n        }\n      }\n    }\n  } catch (e) {}\n  \n  // 4. Detectar cierre de conversación\n  const patronesCierre = ['CITA_CONFIRMADA', 'GESTIONAR_CITA', 'fuera de horario', 'vuelve mañana', 'gracias por escribir'];\n  if (patronesCierre.some(p => ultimoMensaje.includes(p))) continue;\n  \n  // 5. Decidir acción\n  if (json.inactividad_estado === null || json.inactividad_estado === undefined || json.inactividad_estado === '') {\n    RESULT.push({ json: { accion: 'avisar', numero: json.numero, business_id: json.business_id, instance: json.instance } });\n  } else if (json.inactividad_estado === 'avisado') {\n    RESULT.push({ json: { accion: 'cerrar', numero: json.numero, business_id: json.business_id } });\n  }\n}\n\nreturn RESULT;"
      }
    },
    {
      "id": "http-send-001",
      "name": "Enviar ¿Sigues Ahí?",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [900, -150],
      "credentials": {
        "httpRequest": {
          "id": "evolution-api",
          "name": "Evolution API Account"
        }
      },
      "parameters": {
        "method": "POST",
        "url": "={{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $json.instance }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "={{ $env.EVOLUTION_API_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={\n  \"number\": \"{{ $json.numero }}\",\n  \"text\": \"¡Hola! ¿Sigues ahí? 😊 Hace rato no sé de ti. Si quieres retomamos donde íbamos o dime si prefieres empezar de nuevo.\"\n}",
        "options": {}
      }
    },
    {
      "id": "if-bifurcar-001",
      "name": "¿Es para avisar?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [900, 0],
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "if-condition-001",
              "leftValue": "={{ $json.accion }}",
              "rightValue": "avisar",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ]
        }
      }
    },
    {
      "id": "http-send-001",
      "name": "Enviar ¿Sigues Ahí?",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [1200, -200],
      "credentials": {
        "httpRequest": {
          "id": "evolution-api",
          "name": "Evolution API Account"
        }
      },
      "parameters": {
        "method": "POST",
        "url": "={{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $json.instance }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "={{ $env.EVOLUTION_API_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={\n  \"number\": \"{{ $json.numero }}\",\n  \"text\": \"¡Hola! ¿Sigues ahí? 😊 Hace rato no sé de ti. Si quieres retomamos donde íbamos o dime si prefieres empezar de nuevo.\"\n}",
        "options": {}
      }
    },
    {
      "id": "postgres-update-avisar-001",
      "name": "Marcar como Avisado",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.6,
      "position": [1200, -150],
      "credentials": {
        "postgres": {
          "id": "AkRs7Kx5gs6JnVMz",
          "name": "Postgres account"
        }
      },
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE conversation_history\nSET inactividad_estado = 'avisado'\nWHERE business_id = {{ $json.business_id }}\n  AND numero = '{{ $json.numero }}'\n  AND (inactividad_estado IS NULL OR inactividad_estado = '');",
        "options": {}
      }
    },
    {
      "id": "postgres-update-cerrar-001",
      "name": "Marcar como Cerrado",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.6,
      "position": [1200, 150],
      "credentials": {
        "postgres": {
          "id": "AkRs7Kx5gs6JnVMz",
          "name": "Postgres account"
        }
      },
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE conversation_history\nSET inactividad_estado = 'cerrado'\nWHERE business_id = {{ $json.business_id }}\n  AND numero = '{{ $json.numero }}'\n  AND inactividad_estado = 'avisado';",
        "options": {}
      }
    }
  ],
  "connections": {
    "Schedule": {
      "main": [
        [
          {
            "node": "Buscar Conversaciones Inactivas",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Conversaciones Inactivas": {
      "main": [
        [
          {
            "node": "Filtrar y Decidir",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar y Decidir": {
      "main": [
        [
          {
            "node": "¿Es para avisar?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "¿Es para avisar?": {
      "main": [
        [
          {
            "node": "Enviar ¿Sigues Ahí?",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Marcar como Cerrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enviar ¿Sigues Ahí?": {
      "main": [
        [
          {
            "node": "Marcar como Avisado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {},
  "staticData": null,
  "tags": [],
  "active": false
}
```

El Code node tiene una sola salida. Para bifurcar se agrega un IF node después:

```
Schedule → PostgreSQL → Code: Decidir → IF (accion === 'avisar')
  ├─ true  → Evolution Send → PostgreSQL (avisado)
  └─ false → PostgreSQL (cerrado)
```

- [ ] **Step 2: Commit**

```bash
git add workflows/Inactividad\ Bot\ -\ Proactivo.json
git commit -m "feat: add inactivity cron workflow"
```

---

### Task 4: Actualizar documentación

**Files:**
- Modify: `docs/SPRINTS.md`
- Modify: `docs/superpowers/specs/2026-07-12-inactividad-proactiva-bot.md`

- [ ] **Step 1: Actualizar SPRINTS.md**

Agregar entrada para el Sprint 16 o sección de inactividad proactiva después de Sprint 15.

- [ ] **Step 2: Actualizar estado del spec a "Implementado"**

- [ ] **Step 3: Commit**

```bash
git add docs/SPRINTS.md docs/superpowers/specs/2026-07-12-inactividad-proactiva-bot.md
git commit -m "docs: update sprints and spec with inactivity implementation"
```

---

### Task 5: Importar workflows a n8n (manual)

**Nota:** n8n API devuelve 401 (Sprint 12 lección). La importación es manual vía UI de n8n.

- [ ] **Step 1: Importar workflow principal modificado**
  1. Abrir n8n en el browser
  2. Ir al workflow "WhatsApp Bot - Genérico"
  3. Buscar el nodo "Guardar Historial"
  4. Reemplazar el SQL con la versión que incluye `inactividad_estado = NULL`
  5. Guardar y activar

- [ ] **Step 2: Importar nuevo workflow**
  1. En n8n, click "Import from File"
  2. Seleccionar `workflows/Inactividad Bot - Proactivo.json`
  3. Verificar nodos: Schedule, PostgreSQL, Code, HTTP Request, PostgreSQL
  4. Conectar credenciales de Evolution API si es necesario
  5. Guardar y activar

- [ ] **Step 3: Verificar funcionamiento**
  1. Esperar 15 min sin actividad en una conversación
  2. Verificar que el bot envía "¿Sigues ahí?"
  3. No responder → esperar otro ciclo → verificar que marca como cerrado
  4. Escribir de nuevo → verificar que la conversación continúa

---

## Sprint 17 Fixes (Julio 14-15, 2026)

La implementación original tuvo problemas de dataflow y DB corruption que se solucionaron en Sprint 17.

### Fix 1: Code node output vacío

**Problema:** `$input.all()` en n8n 2.10.3 Code node v2 devuelve `[]` después de nodo PostgreSQL.
**Solución en DB:** Reemplazar `$input.all()` por `$("Buscar Conversaciones Inactivas").all()`.

### Fix 2: Postgres UPDATE dataflow

**Problema:** HTTP Request "Enviar ¿Sigues Ahí?" sobreescribe `$json`. Los UPDATE Postgres reciben `undefined`.
**Solución en DB:**
- Queries: `$json.business_id` → `$("Filtrar y Decidir").item.json.business_id`
- Mode: agregar `"mode": "runOnceForEachItem"` en parámetros del Postgres node

### Fix 3: DB corruption

**Problema:** Copiar SQLite mientras n8n corre en WAL mode corrompe la DB.
**Solución:** Recovery vía `.recover` + detener contenedor antes de cada modificación.

### Fix 4: Integración quoted messages

**Archivos modificados (WhatsApp Bot):**
- Leer Historial: SELECT agrega `inactividad_estado`
- Procesar Mensaje: filtros reaction/protocol, botones/listas, quoted context, flag `esRetomoPorInactividad`
- AI Agent: gapMessage usa `d.esRetomoPorInactividad` para auto-continuación

**Importante:** Estos cambios se hicieron exclusivamente vía SQLite directo (Python scripts en `/tmp/` del VPS). No hay export JSON actualizado de los workflows — ver el spec para el estado actual.
