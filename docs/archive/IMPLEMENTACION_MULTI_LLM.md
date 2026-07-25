# IMPLEMENTACIÓN — Migración a fallback chain multi-LLM (meyer-bot)

> **Objetivo:** Reemplazar `AI Agent (langchain) + Groq Chat Model + Simple Memory` por un único Code node **"AI Agent"** que implementa un fallback chain **Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b**, con historial persistido en PostgreSQL (`conversation_history`, TTL 2h) y normalización regex de la salida.
>
> **Entorno verificado:** n8n **2.10.3**, task runner **interno**, `this.helpers.httpRequest` = OK, `$env` = OK (`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` aplicado), `fetch` = NO existe.
>
> **Modelo de ejecución:**
> - **Claude Code** crea archivos en el repo: migración SQL (PASO 2), JSON importable de nodos (PASO 4), script de verificación (PASO 6), y commitea.
> - **Tú (manual en la UI de n8n)**: fix del nodo (PASO 3), importar nodos nuevos + eliminar viejos + reconectar (PASO 5), correr migración y verificación.
>
> **Reglas:** diseñar→aprobar antes de construir · tres horizontes (funciona hoy / sobrevive migración Node.js / no expone errores al cliente) · n8n case-sensitive en nombres · `.first()` no `.item` en lecturas dentro de Code · Always Output Data en Postgres que puede devolver 0 filas · campos HTTP en modo Expression · timezone `(NOW() AT TIME ZONE 'America/Bogota')::date`.

---

## PASO 1 — Variables de entorno en n8n ✅ COMPLETADO

Ya hecho y verificado por ti:
- `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `GROQ_API_KEY` en `/root/n8n/.env`
- las 3 añadidas a `NODE_FUNCTION_ALLOW_ENV`
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
- `docker compose down && up` (un `restart` no relee `.env`)
- `docker exec n8n-n8n-1 env | grep -E 'GEMINI|CEREBRAS|GROQ'` muestra las 3

**Nota crítica para el futuro:** en runner **interno** las keys del `.env` llegan al Code node porque el runner es proceso hijo del contenedor n8n. Si algún día migras a runner **externo** (sidecar `n8nio/runners`), `$env` dejará de ver estas keys salvo que las propagues vía `env-overrides`/`allowed-env` en `n8n-task-runners.json`. En ese escenario, la alternativa portable es mover las keys a **Credentials de n8n** y leerlas vía `httpRequestWithAuthentication`. Documentado por si escalas.

---

## PASO 2 — Tabla `conversation_history` en PostgreSQL

**Claude Code:** crear `database/migrations/004_conversation_history.sql` con este contenido exacto:

```sql
-- 004_conversation_history.sql
-- Memoria conversacional persistente. Reemplaza Simple Memory (volátil en RAM de n8n).
-- 1 fila por (business_id, numero) — se reutiliza vía UPSERT, NO crece por mensaje.

CREATE TABLE IF NOT EXISTS conversation_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id INTEGER     NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  numero      TEXT        NOT NULL,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb
                          CHECK (jsonb_typeof(messages) = 'array'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 hours',
  CONSTRAINT conversation_history_business_numero_key UNIQUE (business_id, numero)
) WITH (fillfactor = 90);

-- Índice para la limpieza de expirados (DELETE ... WHERE expires_at < now()).
CREATE INDEX IF NOT EXISTS conversation_history_expires_at_idx
  ON conversation_history (expires_at);
```

**Decisiones de diseño (criterio aplicado, no asunciones):**
- **`UNIQUE (business_id, numero)`** sirve como (1) target del `ON CONFLICT` del upsert y (2) índice de lectura — la query filtra `business_id = ? AND numero = ?` y `business_id` es el prefijo izquierdo del índice compuesto, así que cubre el acceso sin un índice FK adicional.
- **`fillfactor = 90`**: tabla update-heavy (un UPSERT por turno). Deja espacio para HOT updates y reduce bloat.
- **Sin índice GIN sobre `messages`**: nunca consultamos *dentro* del JSONB, solo leemos/escribimos el array completo. Omitirlo mantiene los writes rápidos.
- **`ON DELETE CASCADE`**: si se borra un negocio, su historial se va con él.
- **Crecimiento acotado:** como hay UPSERT sobre `(business_id, numero)`, existe **una sola fila por cliente**. Cuando una conversación expira, la siguiente lectura la ignora (`expires_at > now()`) y el siguiente UPSERT la reescribe. La tabla nunca crece por mensaje, solo por cliente distinto.
- **TTL/limpieza:** la corrección del TTL la garantiza el filtro `expires_at > now()` en la lectura (historial viejo nunca se usa). La limpieza física de filas abandonadas va **dentro** del nodo `Guardar Historial` (PASO 4) como `DELETE ... WHERE expires_at < now()` — trivial a esta escala (<100 filas, seq scan submilisegundo) y sin dependencias externas (`pg_cron` no está en `postgres:16-alpine`). En la migración a Node.js esto lo reemplaza el TTL nativo de Redis (portable).

**Tú (correr la migración en el VPS):**
```bash
docker exec -i meyer_postgres psql -U meyer_user -d meyer_db < database/migrations/004_conversation_history.sql
# verificar:
docker exec -i meyer_postgres psql -U meyer_user -d meyer_db -c "\d conversation_history"
```

---

## PASO 3 — Fix bug nodo "Confirmar Cancelación" (manual, UI n8n)

Abre el workflow `WhatsApp Bot - Genérico` → nodo **`Confirmar Cancelación`**.

**3.1 — Campo URL.** Hoy empieza con `==` (doble igual), lo que antepone un `=` literal a la URL renderizada y rompe la petición. Está así:
```
=={{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $('Procesar Mensaje').item.json.whatsappInstance }}
```
Déjalo con **un solo** `=`:
```
={{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $('Procesar Mensaje').item.json.whatsappInstance }}
```

**3.2 — Header `apikey`.** Hoy tiene la key **hardcodeada** en modo Fixed:
```
***REMOVED-EVOLUTION-API-KEY***
```
Cámbiala a modo **Expression** (ícono `fx` activo) con valor:
```
={{ $env.EVOLUTION_API_KEY }}
```

**3.3 — Campo `text`.** También empieza con `==`. Déjalo con un solo `=` (de `=={{ (function()...` a `={{ (function()...`).

> El bug del system prompt que empezaba con `==` (mencionado en tu doc) **se resuelve solo** en el PASO 4: al eliminar el AI Agent langchain, el prompt pasa a construirse como string JS plano, sin el prefijo `=` de expresión.

> ⚠️ **Seguridad (acción aparte, no parte de este fix):** esa key `8CB6F53ED141-...` está en texto plano en este nodo **y** en `CONTEXT_UPDATED.md`. Si el workflow/repo se comparte o commitea, considérala comprometida y **rótala** en Evolution API + `.env`. No la incluyas en commits.

---

## PASO 4 — Nodos nuevos: `Leer Historial` → `AI Agent` → `Guardar Historial`

**Claude Code:** crear `workflows/llm-orquestador-nodes.json` con el bloque importable del final de este paso. Tú lo importas en n8n (PASO 5).

### 4.1 — Nodo `AI Agent` (Code, "Run Once for All Items")

Código completo del nodo. **El system prompt está transcrito verbatim del AI Agent original** (mismo wording tuneado), reemplazando las expresiones n8n por referencias JS a `d = $('Formatear Disponibilidad').first().json`.

```javascript
// ============================================================
// AI Agent — LLM Orquestador
// Fallback chain: Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
// Reemplaza: AI Agent (langchain) + Groq Chat Model + Simple Memory
// Modo: Run Once for All Items
// El nodo se llama "AI Agent" a propósito: ~13 nodos downstream leen
// $('AI Agent').item.json.output — renombrarlo evita tocar el Switch y las ramas.
// ============================================================

const d = $('Formatear Disponibilidad').first().json;

// Historial previo (de Leer Historial; Postgres JSONB ya viene parseado a array JS)
let prior = [];
try {
  const raw = $('Leer Historial').first().json.messages;
  prior = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
} catch (e) { prior = []; }
const priorEsc = JSON.stringify(prior).replace(/'/g, "''"); // safe para embeber en '...'::jsonb

// ── 0. SHORT-CIRCUIT FUERA DE HORARIO ───────────────────────
// [DECISIÓN DE INGENIERÍA AÑADIDA — NO estaba en el diseño aprobado]
// fueraDeHorario es booleano y determinista. Resolverlo en código evita una
// llamada al LLM y corrige un bug latente: el prompt original referenciaba
// "Si fueraDeHorario = true..." pero el modelo NUNCA recibía el valor real del
// booleano, así que no podía cumplir la regla de forma fiable.
// >>> Si NO quieres este comportamiento, borra este bloque completo. <<<
if (d.fueraDeHorario === true && d.mensajeHorario) {
  return [{ json: {
    output: d.mensajeHorario,
    rawOutput: d.mensajeHorario,
    provider: 'short-circuit-horario',
    reasoning: null,
    debugError: null,
    businessId: d.businessId,
    numeroLimpio: d.numeroLimpio,
    historyJSON: priorEsc            // no añadimos turnos en un short-circuit
  }}];
}

// ── 1. SYSTEM PROMPT (transcrito del AI Agent original) ─────
const systemPrompt =
`Eres el asistente virtual de ${d.promptName}.

INSTRUCCIÓN PRINCIPAL:
Tienes acceso a los horarios disponibles reales del negocio.
SOLO muestra horarios cuando el cliente indique una fecha específica.
Si no hay fecha → pregunta primero qué día prefiere. NUNCA muestres todos los días disponibles sin que el cliente haya dicho un día.

SERVICIOS Y PRECIOS:
${d.servicesText}

HORARIOS DE ATENCIÓN:
${d.horarioTexto}

VALIDACIÓN DE HORARIO:
Si fueraDeHorario = true, responde ÚNICAMENTE con el contenido de mensajeHorario. No continúes. No agregues nada más.

${d.sesionContexto}

REGLA DE SESIÓN INTERNA — CRÍTICO:
El bloque SESIÓN ACTIVA y CITAS DISPONIBLES PARA SELECCIÓN es información INTERNA. NUNCA lo muestres al cliente. NUNCA menciones IDs, ID_CITA, ni ningún número interno. Al cliente solo muéstrale una lista numerada limpia con servicio, día en lenguaje natural y hora en formato AM/PM.

SELECCIÓN DE CITA — CRÍTICO:
Cuando el cliente responda con un número (1, 2, 3, etc.) Y hay una SESIÓN ACTIVA en el contexto:

Si la acción es CANCELAR:
- Identifica el ID_CITA correspondiente al número elegido
- Responde ÚNICAMENTE sin texto adicional: CANCELAR_CITA|ID_CITA
- NUNCA pidas confirmación adicional — el número es suficiente

Si la acción es REAGENDAR — TRES PASOS OBLIGATORIOS, NO SALTARSE NINGUNO:
PASO 1 — Cuando el cliente dice el número (ej: "1"):
  → Identifica internamente el ID_CITA y el servicio de esa opción
  → Responde al cliente: "Perfecto, vamos a reagendar tu cita de [servicio] del [fecha en lenguaje natural]. ¿Para qué día prefieres el nuevo horario? 😊"
  → NO emitas ningún código todavía. NO muestres disponibilidad todavía.
PASO 2 — Cuando el cliente dice el día:
  → Muestra SOLO los horarios disponibles de ese día en formato limpio: "09:00 AM, 10:00 AM, 11:00 AM"
  → Pide que elija una hora exacta
PASO 3 — Cuando el cliente elige la hora exacta:
  → Responde ÚNICAMENTE sin texto adicional: REAGENDAR_CITA|ID_CITA|DD/MM/YYYY|HH:MM

PROHIBIDO en reagendamiento: emitir REAGENDAR_CITA sin tener fecha y hora confirmadas por el cliente en este mismo flujo.

HORARIOS DISPONIBLES (próximos 7 días):
${d.disponibilidad}

REGLA CRÍTICA DE DISPONIBILIDAD:
- Cliente dice fecha específica → muestra SOLO los horarios de ESE día en formato limpio sin numeración: "09:00 AM, 10:00 AM, 11:00 AM"
- Cliente NO dice fecha → pregunta qué día prefiere. PROHIBIDO mostrar horarios sin fecha confirmada.
- PROHIBIDO mostrar más de un día a la vez
- PROHIBIDO decir que no tienes información de disponibilidad

AGENDAMIENTO:
ORDEN OBLIGATORIO — NUNCA saltes pasos:
1. Si no tienes el SERVICIO → pregunta el servicio primero. NADA MÁS.
2. Si no tienes la FECHA → pregunta qué día prefiere. Espera respuesta.
3. Cuando diga el día → muestra SOLO los horarios disponibles de ese día en formato limpio: "09:00 AM, 10:00 AM, 11:00 AM"
4. Si no tienes la HORA EXACTA → pide que elija del listado.
5. Solo cuando tengas los 3 datos confirmados → muestra el resumen.

La fecha de hoy es ${d.fechaHoy}.
CALENDARIO DE ESTA SEMANA:
${d.calendario}

Para agendar necesitas 3 datos EXPLÍCITOS:
1. Servicio
2. Fecha
3. Hora EXACTA en formato HH:MM

Cuando tengas los 3 datos muestra el resumen y pide confirmación:
"Perfecto, te confirmo los datos:
✂️ Servicio: [servicio]
📅 Fecha: [fecha en lenguaje natural]
⏰ Hora: [hora en formato AM/PM]
¿Confirmamos la cita? 😊"

CONFIRMACIÓN DE AGENDAMIENTO:
Cuando el cliente confirme con "sí", "si", "confirmo", "listo", "dale", "va", "ok", "claro", "obvio", "listo pues", "hagale", "le doy", o cualquier expresión afirmativa en español incluyendo jerga colombiana, responde ÚNICAMENTE:
CITA_CONFIRMADA|servicio|DD/MM/YYYY|HH:MM

REGLA DE CONFIRMACIÓN PARCIAL — CRÍTICO:
Si el cliente confirma Y en el mismo mensaje pregunta algo adicional o pide un cambio:
PRIMERO emite CITA_CONFIRMADA con los datos ya acordados.
El tema adicional lo atiendes en el siguiente mensaje.
NUNCA ignores una confirmación por culpa de texto adicional.

CRÍTICO — HORA EXACTA: "en la tarde", "en la mañana", "más tarde" NO son horas válidas. Muestra el listado y pide que elija una hora exacta.
NUNCA confirmes una hora sin saber si es AM o PM.

CANCELACIONES Y REAGENDAMIENTO:
Detecta intención aunque el cliente use palabras variadas o jerga:
cancelar, anular, borrar, no puedo ir, no voy, quitar la cita, cancelar el turno,
reagendar, cambiar, mover, postergar, no puedo asistir, necesito cambiar la hora.

Cuando detectes cancelación → responde ÚNICAMENTE sin texto adicional:
GESTIONAR_CITA|cancelar

Cuando detectes reagendamiento → responde ÚNICAMENTE sin texto adicional:
GESTIONAR_CITA|reagendar

NUNCA respondas que el equipo lo contactará. Siempre emite el código.

TONO Y LENGUAJE:
- Responde SIEMPRE en español
- Acepta y entiende jerga colombiana: parce, loca, marica, mi amor, papi, mami, listo pues, hagale, le doy, chévere, bacano, pilas, entre otros. Nunca te ofendas ni corrijas al cliente.
- Responde con calidez y naturalidad, como si fuera una persona real del negocio
- Máximo 5 líneas por respuesta
- En conversaciones normales termina con una pregunta
- NUNCA termines con pregunta al confirmar una cita o al emitir un código de acción
- FORMATO DE FECHA: Usa lenguaje natural. CORRECTO: "el miércoles 8 de abril". INCORRECTO: "08/04/2026"
- ASESORÍA: Si el cliente pide recomendación, respóndela brevemente antes de continuar.
- SERVICIOS: NUNCA menciones servicios fuera de tu lista. Si no existe: "Lo sentimos, ese servicio no está disponible. Nuestros servicios son: ${d.servicesText}. ¿Puedo ayudarte con alguno? 😊"`;

// ── 2. CONSTRUIR MESSAGES (system + historial limpio + user nuevo) ──
const priorClean = prior
  .filter(m => m && m.role && m.content)
  .map(m => ({ role: m.role, content: String(m.content) })); // strip reasoning/provider antes de reenviar

const messages = [
  { role: 'system', content: systemPrompt },
  ...priorClean,
  { role: 'user', content: String(d.textoOriginal || '') }
];

// ── 3. FALLBACK CHAIN ───────────────────────────────────────
// Criterio de fallo (→ siguiente proveedor): non-200, timeout >10s,
// response sin choices, content vacío/null. Patrón "multiple fallbacks +
// graceful degradation".
const providers = [
  { name: 'gemini',   url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: $env.GEMINI_API_KEY,   model: 'gemini-2.5-flash-lite' },
  { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions',                                key: $env.CEREBRAS_API_KEY, model: 'gpt-oss-120b' },
  { name: 'groq',     url: 'https://api.groq.com/openai/v1/chat/completions',                            key: $env.GROQ_API_KEY,     model: 'openai/gpt-oss-120b' } // prefijo "openai/" obligatorio en Groq
];

let result = null, usedProvider = 'none', lastError = '';

for (const p of providers) {
  if (!p.key) { lastError += `[${p.name}: sin API key] `; continue; }
  try {
    const resp = await this.helpers.httpRequest({
      method: 'POST',
      url: p.url,
      headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' },
      body: { model: p.model, messages, temperature: 0.4, max_tokens: 2048 },
      json: true,
      timeout: 10000,            // timeout >10s lanza → cae al catch → siguiente proveedor
      returnFullResponse: true
    });
    if (resp.statusCode !== 200) throw new Error(`status ${resp.statusCode}`);
    const choice = resp.body && resp.body.choices && resp.body.choices[0];
    if (!choice || !choice.message) throw new Error('sin choices');
    const content = choice.message.content;
    if (content == null || String(content).trim() === '') throw new Error('content vacio');
    result = { content: String(content), reasoning: choice.message.reasoning || null };
    usedProvider = p.name;
    break;
  } catch (e) {
    lastError += `[${p.name}: ${e.message}] `;
    continue;
  }
}

// ── 4. DEGRADACIÓN GRÁCIL (ningún proveedor respondió) ──────
// Tres horizontes: NO exponer el error al cliente. Mensaje amable + reintento.
// No envenenamos el historial: lo dejamos igual (sin turnos nuevos).
if (!result) {
  return [{ json: {
    output: 'Disculpa, estoy teniendo un problemita técnico en este momento 🙏 ¿Puedes escribirme de nuevo en un minutico?',
    rawOutput: '',
    provider: 'none',
    reasoning: null,
    debugError: lastError,
    businessId: d.businessId,
    numeroLimpio: d.numeroLimpio,
    historyJSON: priorEsc
  }}];
}

// ── 5. NORMALIZACIÓN DE SALIDA (regex → código limpio) ──────
// Gemini/gpt-oss pueden anteponer texto o envolver en backticks. Extraemos el
// código EXACTO con segmentos acotados (no greedy hasta EOL) para que los
// split('|') downstream caigan perfecto. Si no hay código → texto conversacional.
function normalizar(raw) {
  let t = String(raw).trim().replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
  const horaSeg = '\\d{1,2}:\\d{2}(?:\\s?[AaPp]\\.?[Mm]\\.?)?';
  const patrones = [
    new RegExp(`CITA_CONFIRMADA\\|[^|\\n]+\\|\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\|${horaSeg}`),
    new RegExp(`REAGENDAR_CITA\\|\\d+\\|\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\|${horaSeg}`),
    /CANCELAR_CITA\|\s*\d+/,
    /GESTIONAR_CITA\|\s*(?:cancelar|reagendar)/i
  ];
  for (const p of patrones) {
    const m = t.match(p);
    if (m) return m[0].trim();
  }
  return t;
}
const cleaned = normalizar(result.content);

// ── 6. ACTUALIZAR HISTORIAL (máx 20 mensajes = 10 turnos) ───
// Guardamos reasoning + provider en el turno assistant para debug; se strip-ean
// al reenviar (paso 2). El system prompt NO se guarda (se reconstruye cada turno).
const updated = [
  ...prior,
  { role: 'user',      content: String(d.textoOriginal || '') },
  { role: 'assistant', content: result.content, reasoning: result.reasoning, provider: usedProvider }
].slice(-20);

return [{ json: {
  output: cleaned,                 // ← lo que leen Switch y las ramas
  rawOutput: result.content,       // debug
  provider: usedProvider,          // debug
  reasoning: result.reasoning,     // debug
  debugError: lastError || null,
  businessId: d.businessId,
  numeroLimpio: d.numeroLimpio,
  historyJSON: JSON.stringify(updated).replace(/'/g, "''")
}}];
```

**Tweaks parametrizables (decisiones de ingeniería — cámbialos si no te cuadran):**
- `temperature: 0.4` — más determinista que el default para emisión fiable de códigos estructurados. Súbelo si notas respuestas robóticas.
- `max_tokens: 2048` — holgado para que gpt-oss (modelos con `reasoning`) no trunquen el `content`.
- Short-circuit `fueraDeHorario` — bloque marcado, borrable en 5 segundos.
- Escape de comillas: `JSON.stringify(...).replace(/'/g,"''")` blinda el embed `'...'::jsonb` contra apóstrofes en el texto del cliente. En la migración a Node.js esto se reemplaza por **query parametrizada** (`$1`), más limpio.

### 4.2 — Nodo `Leer Historial` (Postgres, Always Output Data ON)

Query:
```sql
SELECT messages
FROM conversation_history
WHERE business_id = {{ $json.businessId }}
  AND numero = '{{ $json.numeroLimpio }}'
  AND expires_at > NOW()
LIMIT 1
```
> Lee del item que llega de `Formatear Disponibilidad` (`$json` ya trae `businessId` y `numeroLimpio`). **Always Output Data ON** porque 0 filas = conversación nueva es comportamiento normal.

### 4.3 — Nodo `Guardar Historial` (Postgres)

Query (UPSERT + limpieza de expirados):
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

### 4.4 — JSON importable (`workflows/llm-orquestador-nodes.json`)

**Claude Code** crea este archivo. **Tú** lo importas en n8n (Canvas → menú → *Import from File*… o pega el contenido). Incluye los 3 nodos y las 2 conexiones internas (`Leer Historial → AI Agent → Guardar Historial`). Las 2 conexiones de borde se cablean a mano en el PASO 5.

> El código JS del nodo `AI Agent` dentro de este JSON va con saltos de línea escapados (`\n`). **No edites el JSON a mano**; si necesitas tocar el código, hazlo en la UI de n8n tras importar. El bloque legible es el de la sección 4.1.

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT messages\nFROM conversation_history\nWHERE business_id = {{ $json.businessId }}\n  AND numero = '{{ $json.numeroLimpio }}'\n  AND expires_at > NOW()\nLIMIT 1",
        "options": {}
      },
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.6,
      "position": [1400, 1520],
      "id": "a1b2c3d4-0001-4000-8000-000000000001",
      "name": "Leer Historial",
      "alwaysOutputData": true,
      "credentials": {
        "postgres": { "id": "AkRs7Kx5gs6JnVMz", "name": "Postgres account" }
      }
    },
    {
      "parameters": {
        "jsCode": "REEMPLAZAR_CON_EL_CODIGO_DE_LA_SECCION_4.1"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1500, 1328],
      "id": "a1b2c3d4-0002-4000-8000-000000000002",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO conversation_history (business_id, numero, messages, updated_at, expires_at)\nVALUES (\n  {{ $('AI Agent').item.json.businessId }},\n  '{{ $('AI Agent').item.json.numeroLimpio }}',\n  '{{ $('AI Agent').item.json.historyJSON }}'::jsonb,\n  NOW(),\n  NOW() + INTERVAL '2 hours'\n)\nON CONFLICT (business_id, numero)\nDO UPDATE SET\n  messages   = EXCLUDED.messages,\n  updated_at = EXCLUDED.updated_at,\n  expires_at = EXCLUDED.expires_at;\n\nDELETE FROM conversation_history WHERE expires_at < NOW();",
        "options": {}
      },
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.6,
      "position": [1640, 1520],
      "id": "a1b2c3d4-0003-4000-8000-000000000003",
      "name": "Guardar Historial",
      "credentials": {
        "postgres": { "id": "AkRs7Kx5gs6JnVMz", "name": "Postgres account" }
      }
    }
  ],
  "connections": {
    "Leer Historial": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "AI Agent": {
      "main": [[{ "node": "Guardar Historial", "type": "main", "index": 0 }]]
    }
  }
}
```

> **Importante sobre el `jsCode`:** el campo `jsCode` arriba lleva el placeholder `REEMPLAZAR_CON_EL_CODIGO_DE_LA_SECCION_4.1`. Claude Code debe insertar el código completo de la sección 4.1 **JSON-escaped** (todos los `\n`, `\"`, `\\`). Si te resulta más simple: importa el JSON con el placeholder, y luego **pega el código de 4.1 directamente en el nodo `AI Agent`** desde la UI (más seguro que escapar a mano). Recomiendo esta segunda vía.

---

## PASO 5 — Reconexión en n8n (manual, UI)

Orden exacto para no romper referencias:

1. **Importa** `workflows/llm-orquestador-nodes.json` (aparecen `Leer Historial`, `AI Agent` nuevo, `Guardar Historial` ya conectados entre sí).
   - Si importaste con placeholder, **pega ahora** el código de la sección 4.1 en el nodo `AI Agent`.
   - Verifica que `Leer Historial` y `Guardar Historial` tengan la credencial **"Postgres account"** asignada (re-asígnala si n8n la pide).
2. **Elimina** los 3 nodos viejos: `AI Agent` (el langchain, type `@n8n/...agent`), `Groq Chat Model`, `Simple Memory`.
   - ⚠️ Al borrar el langchain `AI Agent` desaparece la conexión `Formatear Disponibilidad → AI Agent`. Es esperado.
   - Confirma que el nodo Code nuevo se llama **exactamente** `AI Agent` (case-sensitive). Si quedó con otro nombre, renómbralo a `AI Agent`.
3. **Cablea las 2 conexiones de borde:**
   - `Formatear Disponibilidad` → `Leer Historial`
   - `Guardar Historial` → `Wait`
4. **Resultado esperado del tramo:**
   `Formatear Disponibilidad → Leer Historial → AI Agent → Guardar Historial → Wait → Switch`
5. **(Recomendado)** Añade un **Sticky Note** sobre el nodo `AI Agent`:
   > *"Code node = orquestador LLM (Gemini→Cerebras→Groq). Se llama 'AI Agent' a propósito: ~13 nodos downstream leen $('AI Agent').item.json.output. NO renombrar."*
6. **Por qué no se tocan los ~13 downstream:** todos referencian `$('AI Agent').item.json.output` por **nombre de nodo**, no por tipo. El Code node emite `{ output: ... }` igual que el langchain. `Guardar Historial` en medio del flujo no rompe nada porque esas referencias son explícitas a `$('AI Agent')`, no a `$json`.
7. **Publica** el workflow (en n8n 2.x guardar es autosave en borrador; **Publish** es la acción que lo pone en producción).

**Checklist de referencias a `$('AI Agent')` que deben seguir resolviendo** (verifícalas tras publicar): `Switch` (5 reglas), `Leer Disponibilidad`, `Verificar Slot`, `Insertar Cita`, `Construir Mensajes`, `Ejecutar Cancelación`, `Ejecutar Reagendamiento`, `¿Confirmar o Responder?`, `Respuesta Normal`.

---

## PASO 6 — Verificación end-to-end

### 6.1 — Script automático (`scripts/verify-llm-orquestador.mjs`)

**Claude Code** crea este archivo. **Tú** lo corres en el VPS (donde están las env vars): `node scripts/verify-llm-orquestador.mjs`.

```javascript
// scripts/verify-llm-orquestador.mjs
// Verifica: (1) los 3 proveedores responden 200 con el modelo configurado,
// (2) cuáles devuelven `reasoning`, (3) la tabla conversation_history existe.
// Correr en el VPS:  node scripts/verify-llm-orquestador.mjs
import pg from 'pg';

const providers = [
  { name: 'gemini',   url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: process.env.GEMINI_API_KEY,   model: 'gemini-2.5-flash-lite' },
  { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions',                                key: process.env.CEREBRAS_API_KEY, model: 'gpt-oss-120b' },
  { name: 'groq',     url: 'https://api.groq.com/openai/v1/chat/completions',                            key: process.env.GROQ_API_KEY,     model: 'openai/gpt-oss-120b' }
];

const ping = [{ role: 'user', content: 'Responde solo con la palabra: OK' }];

console.log('── Proveedores ─────────────────────────────');
for (const p of providers) {
  if (!p.key) { console.log(`❌ ${p.name}: falta API key en env`); continue; }
  const t0 = Date.now();
  try {
    const r = await fetch(p.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: p.model, messages: ping, max_tokens: 32 }),
      signal: AbortSignal.timeout(10000)
    });
    const ms = Date.now() - t0;
    const body = await r.json();
    const choice = body?.choices?.[0];
    const content = choice?.message?.content?.trim();
    const hasReasoning = choice?.message?.reasoning != null;
    console.log(`${r.status === 200 && content ? '✅' : '❌'} ${p.name}: status=${r.status} ${ms}ms content="${(content||'').slice(0,40)}" reasoning=${hasReasoning}`);
  } catch (e) {
    console.log(`❌ ${p.name}: ${e.message}`);
  }
}

console.log('\n── conversation_history ────────────────────');
const client = new pg.Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: +(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'meyer_db',
  user: process.env.POSTGRES_USER || 'meyer_user',
  password: process.env.POSTGRES_PASSWORD
});
try {
  await client.connect();
  const t = await client.query(`SELECT to_regclass('public.conversation_history') AS tbl`);
  console.log(t.rows[0].tbl ? '✅ tabla existe' : '❌ tabla NO existe — corre la migración 004');
  const rows = await client.query(
    `SELECT business_id, numero, jsonb_array_length(messages) AS turnos, updated_at, expires_at
     FROM conversation_history ORDER BY updated_at DESC LIMIT 5`
  );
  console.log(`Filas recientes (${rows.rowCount}):`);
  for (const r of rows.rows) {
    console.log(`  biz=${r.business_id} num=${r.numero} msgs=${r.turnos} exp=${r.expires_at.toISOString()}`);
  }
} catch (e) {
  console.log(`❌ PG: ${e.message}`);
} finally {
  await client.end().catch(() => {});
}
```

> Notas: usa `fetch` nativo (es Node ≥18 fuera de n8n, ahí sí existe — el problema de `fetch` es solo dentro del sandbox del Code node). Lee `pg` de las env vars; si las de Postgres no están exportadas en tu shell, antepón:
> `set -a; source /root/n8n/.env; source /root/meyer-bot/dashboard/.env.local; set +a; node scripts/verify-llm-orquestador.mjs`
> `pg` ya es dependencia del dashboard; si lo corres fuera de ahí: `npm i pg`.

### 6.2 — Verificación manual E2E (un script no puede validar el ruteo del Switch sin disparar todo el flujo)

Desde un WhatsApp de prueba al bot de **Peluquería Meyer**, valida cada rama y la persistencia:

| # | Mensaje de prueba | Esperado |
|---|---|---|
| 1 | "Hola, ¿qué servicios tienen?" | Responde servicios; **rama Fallback / Respuesta Normal** |
| 2 | "Quiero corte mañana" → elige día → elige hora → "sí confirmo" | `CITA_CONFIRMADA` → cita insertada + notif dueño + confirmación cliente |
| 3 | "Quiero cancelar mi cita" → elige número | `GESTIONAR_CITA\|cancelar` → lista → `CANCELAR_CITA` → confirmación |
| 4 | "Necesito reagendar" → número → día → hora | 3 turnos → `REAGENDAR_CITA` → confirmación |
| 5 | Manda algo fuera de horario (ej "a las 11 de la noche") | Responde `mensajeHorario` (short-circuit, sin llamar LLM) |
| 6 | Tras el #1, manda "¿y precios?" | Mantiene contexto (historial funcionando) |

Después de las pruebas, corre el script 6.1 de nuevo: deben aparecer filas en `conversation_history` con `msgs > 0` y `provider` correcto. Para inspeccionar qué proveedor respondió y el reasoning:
```sql
SELECT business_id, numero,
       messages -> -1 ->> 'provider' AS ultimo_proveedor,
       LENGTH(messages -> -1 ->> 'reasoning') AS reasoning_len
FROM conversation_history ORDER BY updated_at DESC LIMIT 10;
```

---

## Hallazgos extra (FLAGEADOS — NO aplicados, fuera del alcance de PASO 3)

Mismo tipo de bug `==` y otros que vi en el JSON. **No los toqué.** ¿Quieres que los incluya en una pasada de limpieza?

1. **`Filtro Inicial`** — ambos `leftValue` empiezan con `=={{...}}`. Hoy "funciona" porque son checks de substring (`notContains @g.us` / `notEmpty`) y el `=` literal antepuesto no altera el resultado, pero es frágil.
2. **`Respuesta Normal`** — campo `number` con `=={{ ... }}`. Antepone `=` al número que se manda a Evolution API; puede estar enviando un número malformado silenciosamente.
3. **`Confirmar Reagendamiento`** — header con nombre `"Content-Type "` (espacio al final). Muchos servidores lo toleran, pero es incorrecto.
4. **Key Evolution API hardcodeada** en `Confirmar Cancelación` (ya cubierto en PASO 3) y en `CONTEXT_UPDATED.md` → rotar.

---

## Resumen de archivos que crea Claude Code

| Archivo | Contenido |
|---|---|
| `database/migrations/004_conversation_history.sql` | Tabla + índice (PASO 2) |
| `workflows/llm-orquestador-nodes.json` | 3 nodos importables (PASO 4) |
| `scripts/verify-llm-orquestador.mjs` | Verificación automática (PASO 6) |

**Deploy/commit:** `git add` los 3 archivos → `git commit -m "feat: multi-LLM fallback chain + conversation_history persistente"` → push desde local. Los cambios de n8n (PASO 3 y 5) son manuales en la UI, no van por git (viven en la DB de n8n).
```
