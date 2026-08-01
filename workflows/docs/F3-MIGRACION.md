# F3-MIGRACION.md — Migracion AI Agent a microservicio 🟡 EN PROGRESO

> Leer despues de INICIO.md. **Spec completo + 11 fallos identificados y mitigados.**
> Ultima actualizacion: 1 Ago 2026.

## Estado

| Incremento | Archivos | Estado |
|-----------|---------|--------|
| 1.1 | types.ts, constants.ts | ✅ hecho (6 tests) |
| 1.2 | date-parser.ts, normalizer.ts | ✅ hecho (13 tests) |
| 1.3 | validation.ts, gap-message.ts | ✅ hecho (10 tests) |
| 1.4 | prompt-builder.ts | ✅ hecho (7 tests) |
| 1.5 | llm-chain.ts | ✅ hecho (4 tests) |
| 2 | bot-service (Express + Docker) | ✅ hecho (typecheck + health OK) |
| 3 | n8n integration (HTTP Request node) | ⬜ pendiente (requiere acceso al servidor n8n) |

---

## Progreso

### INCREMENTO 1.1 — types.ts + constants.ts

- [x] Crear estructura de carpetas `packages/bot-core/src/`
- [x] `types.ts`: ChatRequest, ChatResponse, Provider, LLMResponse, ChatMessage, ActionType, ValidationResult
- [x] `constants.ts`: PROVIDERS[], CODIGO_PATRONES[], TIMEOUT_MS, MAX_TOKENS, TEMPERATURE, MAX_HISTORY_MESSAGES
- [x] Tests: constantes no vacias, providers bien formados
- [x] `npm test` pasa

### INCREMENTO 1.2 — date-parser.ts + normalizer.ts

- [x] `date-parser.ts`: extraerFechaLejana(), 7 tests
- [x] `normalizer.ts`: normalizar(), 6 tests
- [x] `npm test` pasa

### INCREMENTO 1.3 — validation.ts + gap-message.ts

- [x] `validation.ts`: neutralizador(), 5 tests
- [x] `gap-message.ts`: computeGapMessage(), 5 tests
- [x] `npm test` pasa

### INCREMENTO 1.4 — prompt-builder.ts

- [x] buildSystemPrompt() con 22 secciones, 7 tests
- [x] Verifica que contiene CITA_CONFIRMADA, GESTIONAR_CITA, CANCELAR_CITA, REAGENDAR_CITA
- [x] Verifica que NO contiene referencias a n8n ($env, $('', {{ }})
- [x] `npm test` pasa

### INCREMENTO 1.5 — llm-chain.ts

- [x] callWithFallback() + httpRequest() wrapper
- [x] Circuit breaker: 5 fallos en 30s → skip 30s
- [x] 4 tests (providers, degraded message, no throw, skip without key)
- [x] `npm test` pasa

### INCREMENTO 2 — bot-service

- [x] `apps/bot-service/src/index.ts`: Express POST /api/chat + GET /health + graceful shutdown
- [x] `apps/bot-service/Dockerfile`: node:22-alpine, non-root, NODE_ENV=production
- [x] Typecheck limpio
- [x] Smoke test: `curl localhost:3002/health` → `{"status":"ok"}`

### INCREMENTO 3 — n8n integration

- [ ] Exportar backup del workflow actual con la API de n8n
- [ ] Reemplazar Code node "AI Agent" por HTTP Request node llamado "AI Agent"
- [ ] Body: 18 campos (ver seccion abajo)
- [ ] Never Error ON, Include Response Headers OFF
- [ ] Smoke test E2E con mensaje de WhatsApp
- [ ] Guardar Historial: verificar que historyJSON inserta correctamente

---

## Arquitectura final

```
n8n workflow                  apps/bot-service/         packages/bot-core/
────────────────              ──────────────────        ──────────────────
Formatear Disponibilidad ──▶  POST /api/chat     ──▶   buildSystemPrompt()
Leer Historial ──────────▶    (Express :3002)          callWithFallback()
                              │                        normalizar()
                              │ GET /health             neutralizador()
Guardar Historial ◀─────────  │                        computeGapMessage()
Wait → Switch ◀─────────────  graceful shutdown        extraerFechaLejana()

⚠️ HTTP Request node SE LLAMA "AI Agent" (mismo nombre que el Code node actual)
   → ~13 referencias downstream intactas: $('AI Agent').item.json.output, etc.
```

## Archivos (14 en total)

```
packages/bot-core/
├── package.json              ← "type": "module"
├── tsconfig.json             ← target ESNext, module NodeNext, strict
├── src/
│   ├── index.ts              ← barrel export
│   ├── types.ts              ← ChatRequest, ChatResponse, Provider, etc.
│   ├── constants.ts          ← PROVIDERS[], CODIGO_PATRONES[], TIMEOUT_MS
│   ├── date-parser.ts        ← extraerFechaLejana() (B18 detection)
│   ├── normalizer.ts         ← normalizar() (regex extraction)
│   ├── validation.ts         ← neutralizador() (B17 guard)
│   ├── gap-message.ts        ← computeGapMessage()
│   ├── prompt-builder.ts     ← buildSystemPrompt() (22 secciones)
│   ├── llm-chain.ts          ← callWithFallback() + httpRequest() wrapper
│   └── __tests__/            ← 3-5 tests por modulo (node --test nativo)
│       ├── date-parser.test.ts
│       ├── normalizer.test.ts
│       ├── validation.test.ts
│       ├── prompt-builder.test.ts
│       └── llm-chain.test.ts

apps/bot-service/
├── package.json              ← @meyer/bot-core + express
├── tsconfig.json
├── Dockerfile                ← node:22-alpine, non-root, NODE_ENV=production
└── src/
    └── index.ts              ← Express POST /api/chat + GET /health
```

## Dependencias

```
bot-core (0 dependencias runtime):
  devDependencies: typescript, @types/node, tsx

bot-service:
  dependencies: @meyer/bot-core (workspace:*), express@^4
  devDependencies: @types/express

NO: axios, node-fetch, undici, jest, pino, winston, zod, dotenv
```

Fetch nativo de Node 22. Tests con node --test nativo. Sin librerias externas en bot-core.

## API Contract — POST /api/chat

### Request body

```json
{
  "promptName": "Peluquería Meyer",
  "servicesTextFormateado": "1. Corte caballero - $25.000\n2. Tinte completo - $80.000",
  "professionalsText": "Cristian, Diego",
  "horarioTexto": "Lunes: 9:00 AM - 7:00 PM\nMartes: 9:00 AM - 7:00 PM",
  "fechaHoy": "01/08/2026",
  "calendario": "Hoy: 01/08/2026\nMañana: 02/08/2026\n...",
  "sesionContexto": "",
  "disponibilidad": "📅 Domingo 2 de agosto:\n👤 Cristian: 🟢 9:00 AM, 9:30 AM...",
  "disponibilidadCompleta": "📅 Domingo 2 de agosto:\n👤 Cristian: 🟢 9:00 AM, 9:30 AM, 10:00 AM...",
  "textoOriginal": "Quiero agendar un corte para mañana a las 2pm",
  "priorMessages": [{"role":"user","content":"Hola"},{"role":"assistant","content":"..."}],
  "businessId": 1,
  "numeroLimpio": "573142556322",
  "fueraDeHorario": false,
  "mensajeHorario": null,
  "forceMostrarSlots": null,
  "timezone": "America/Bogota",
  "politicaPrivacidadUrl": "https://peluqueriameyer.com/privacidad",
  "inactividadEstado": null,
  "histUpdatedAt": "2026-08-01T14:30:00.000Z"
}
```

### Response (SIEMPRE 200 — nunca 5xx por errores operacionales)

```json
{
  "output": "¡Hola! Bienvenido a Peluquería Meyer. 😊 ¿Te gustaría agendar una cita?",
  "rawOutput": "¡Hola! Bienvenido a Peluquería Meyer. 😊 ¿Te gustaría agendar una cita?",
  "provider": "gemini",
  "reasoning": null,
  "debugError": null,
  "businessId": 1,
  "numeroLimpio": "573142556322",
  "historyJSON": "[{\"role\":\"user\",\"content\":\"Hola\"},{\"role\":\"assistant\",\"content\":\"...\"}]"
}
```

⚠️ `historyJSON` viene con apostrofes escapados (`replace(/'/g, "''")`) para embeber seguro en SQL del nodo Guardar Historial.

## 11 Fallos identificados y mitigados

| # | Sev | Fallo | Mitigacion |
|---|:---:|-------|-----------|
| G1 | 🔴 | `historyJSON` sin escape SQL → INSERT falla con apostrofes | bot-service aplica `replace(/'/g, "''")` identico al Code node |
| G2 | 🔴 | "Include Response Headers" ON → `$json.body.output` en vez de `$json.output` | **OFF** en el HTTP Request node. `$json.output` directo. |
| G3 | 🔴 | `timezone` ausente en body → B18 calcula fechas en zona incorrecta | Agregado al return de Procesar Mensaje + body del HTTP Request |
| G4 | 🔴 | `politicaPrivacidadUrl` ausente → LLM responde texto placeholder literal | Agregado al body desde Lookup Negocio |
| G5 | 🟡 | `priorMessages` serializa `[object Object]` con "Using Fields Below" | `JSON.stringify()` en la expresion n8n |
| G6 | 🟡 | Renombrar nodo HTTP Request → ~13 referencias rotas | Nombrarlo **"AI Agent"** (mismo nombre que el Code node) |
| G7 | 🟡 | Guardar Historial query depende del nombre del nodo | Sin cambios si el HTTP Request se llama "AI Agent" |
| G8 | 🟢 | Sin graceful shutdown → requests en vuelo se cortan | Handler SIGTERM: `server.close()` + timeout 5s |
| G9 | 🟢 | Sin healthcheck → n8n llama antes de que bot-service este listo | `wget localhost:3002/health` en Docker |
| G10 | 🟢 | Sin `NODE_ENV=production` → Express 3x mas lento | `ENV NODE_ENV=production` en Dockerfile |
| G11 | 🟢 | `AbortSignal.timeout()` no existe en Node 18 | `FROM node:22-alpine` documentado como req. minimo |

## Cuerpo del HTTP Request en n8n (18 campos)

Usar "Send Body" → "JSON" → "Using Fields Below":

| Name | Value |
|------|-------|
| `promptName` | `={{ $('Formatear Disponibilidad').first().json.promptName }}` |
| `servicesTextFormateado` | `={{ $('Formatear Disponibilidad').first().json.servicesTextFormateado }}` |
| `professionalsText` | `={{ $('Formatear Disponibilidad').first().json.professionalsText }}` |
| `horarioTexto` | `={{ $('Formatear Disponibilidad').first().json.horarioTexto }}` |
| `fechaHoy` | `={{ $('Formatear Disponibilidad').first().json.fechaHoy }}` |
| `calendario` | `={{ $('Formatear Disponibilidad').first().json.calendario }}` |
| `sesionContexto` | `={{ $('Formatear Disponibilidad').first().json.sesionContexto }}` |
| `disponibilidad` | `={{ $('Formatear Disponibilidad').first().json.disponibilidad }}` |
| `disponibilidadCompleta` | `={{ $('Formatear Disponibilidad').first().json.disponibilidadCompleta }}` |
| `textoOriginal` | `={{ $('Formatear Disponibilidad').first().json.textoOriginal }}` |
| `businessId` | `={{ $('Formatear Disponibilidad').first().json.businessId }}` |
| `numeroLimpio` | `={{ $('Formatear Disponibilidad').first().json.numeroLimpio }}` |
| `fueraDeHorario` | `={{ $('Formatear Disponibilidad').first().json.fueraDeHorario }}` |
| `mensajeHorario` | `={{ $('Formatear Disponibilidad').first().json.mensajeHorario }}` |
| `forceMostrarSlots` | `={{ $('Formatear Disponibilidad').first().json.forceMostrarSlots }}` |
| `timezone` | `={{ $('Formatear Disponibilidad').first().json.timezone }}` |
| `politicaPrivacidadUrl` | `={{ $('Lookup Negocio').item.json.politica_privacidad_url }}` |
| `priorMessages` | `={{ JSON.stringify($('Leer Historial').first().json.messages) }}` |
| `inactividadEstado` | `={{ $('Leer Historial').first().json.inactividad_estado }}` |
| `histUpdatedAt` | `={{ $('Leer Historial').first().json.updated_at }}` |

## Docker

### Dockerfile

```dockerfile
FROM node:22-alpine
RUN addgroup -S bot && adduser -S bot -G bot
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm ci --omit=dev
USER bot
ENV NODE_ENV=production
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["npx", "tsx", "src/index.ts"]
```

### docker-compose.yml (fragmento)

```yaml
bot-service:
  build: ./apps/bot-service
  ports:
    - "3002:3002"
  env_file:
    - .env
  restart: unless-stopped
  depends_on:
    meyer_postgres:
      condition: service_healthy
```

## Decisiones de diseno

| Decision | Eleccion | Por que |
|----------|---------|---------|
| Runtime | tsx (no compila TS) | Sin build step. node:22-alpine. |
| HTTP client | fetch nativo Node 22 | Sin dependencias. Suficiente para APIs OpenAI-compatibles. |
| Tests | node --test nativo | Sin Jest/Mocha. 3-5 tests por modulo. |
| Mensajes de sistema | Texto plano en prompt-builder.ts | El prompt actual es texto JS. Migrar literal, no abstraer. |
| Error handling LLM | Degradacion gracil, NUNCA 5xx | Todos fallan → 200 con mensaje amable. Identico al Code node. |
| Circuit breaker | 5 fallos en 30s → skip 30s | Evita gastar tiempo en providers permanentemente caidos. |
| historyJSON escaping | bot-service hace `replace(/'/g, "''")` | Previene SQL injection. Bug N8 ya paso por esto. |

## Verificacion

| # | Que | Como | Esperado |
|---|-----|------|---------|
| V1 | Tests bot-core | `cd packages/bot-core && npm test` | ~25 tests pasan |
| V2 | Tipos compilan | `npx tsc --noEmit` | Sin errores |
| V3 | bot-service levanta | `curl localhost:3002/health` | `{"status":"ok"}` |
| V4 | Smoke test chat | `curl -X POST localhost:3002/api/chat -d '{...}'` | 200, output no vacio, provider != "none" |
| V5 | Todos fallan | Quitar API keys, smoke test | 200, mensaje amable, provider = "none" |
| V6 | B18 fecha lejana | `forceMostrarSlots: "15/08/2026"` en body | output contiene "fuera de mi ventana" |
| V7 | Fuera de horario | `fueraDeHorario: true, mensajeHorario: "..."` | output = mensajeHorario, provider = "short-circuit-horario" |
| V8 | n8n integration | Ejecutar workflow desde n8n UI | Flujo completo sin errores |
| V9 | Rollback | Restaurar Code node del backup | Flujo identico al pre-migracion |
| V10 | Apostrofes en nombres | pushName con `'` en el webhook | Guardar Historial no falla |

## Riesgos post-deploy

| Riesgo | Prob | Mitigacion |
|--------|:---:|-----------|
| bot-service crashea por bug | Baja | Docker restart: unless-stopped. n8n Never Error ON. |
| Latencia HTTP extra | Baja | Misma red Docker (~3ms). LLM tarda 500-3000ms. |
| fetch() timeout mas corto que n8n | Media | Wrapper httpRequest() replica timeouts. Test V5 verifica. |
| prompt-builder typo cambia comportamiento | Media | Snapshot test. Deploy staging primero. |
