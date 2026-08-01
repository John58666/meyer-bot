# INICIO.md — Meyer Bot Harness

> **Leer SIEMPRE primero.** Este archivo te dice qué leer según tu tarea.

## 🟢🟡🔴 ESTADO AHORA (1 Ago 2026)

| Componente | Estado | Nota |
|------------|--------|------|
| Agendamiento | 🟢 | Funciona con DeepSeek, Gemini, Cerebras, Groq |
| Cancelar/Reagendar | 🟢 | Fix aplicado (Switch + neutralizador) |
| INSERT Cita | 🟢 | typeVersion 2.6, sin error RETURNING |
| Fechas >7 dias (B18) | 🟢 | Deteccion en Procesar Mensaje + short-circuit en AI Agent |
| Pipeline validacion | 🟢 | Valida CITA_CONFIRMADA/CANCELAR/REAGENDAR/GESTIONAR/MOSTRAR contra schema |
| Double-booking (N7) | 🟢 | UNIQUE INDEX en appointments |
| F3.4 Migracion bot-core | 🟢 | 40 tests. Bot-service desplegado en prod. Pendiente: cambiar Code node en n8n UI (Incremento 3). |
| Dashboard sync | 🔴 | Diferido. B1, N2, N11, N24 pendientes. |
| B1 profesional editor | 🔴 | Diferido. |
| F3.6 Git Source Control | ⚫ | Descartado — no disponible en n8n community 2.10.3. |

## ¿QUÉ NECESITAS HACER?

| Tarea | Leer |
|-------|------|
| Arreglar algo del bot (agendar, cancelar, prompt) | `01-BOT.md` + `04-REGLAS.md` |
| Ver qué bugs hay y planificar | `05-BUGS.md` + `02-ROADMAP.md` |
| Entender la arquitectura | `docs/ARCHITECTURE.md` |
| Saber qué investigamos | `03-INVESTIGACION.md` |
| Demo o venta | `02-ROADMAP.md` (sección Checklist) |
| Entender reglas y skills | `04-REGLAS.md` |
| Contexto general del proyecto | `docs/CONTEXT_UPDATED.md` |
| Workflow JSON del bot | `../WhatsApp Bot - Genérico restored.json` |

## 📚 QUICK START (si sos nuevo en el proyecto)

Leé en este orden:
1. `docs/CONTEXT_UPDATED.md` — contexto general
2. `docs/ARCHITECTURE.md` — schema DB, flujo del bot, principios
3. Este archivo (`INICIO.md`) — estado actual
4. `05-BUGS.md` — qué está roto y qué no
5. `01-BOT.md` — detalles del bot
6. `04-REGLAS.md` — cómo trabajar

## 🏆 5 REGLAS DE ORO

1. **"El LLM decide QUÉ, el código decide QUÉ HACER con eso"** — nunca al revés
2. **"Todo antes de guardar es no confiable"** — validación post-LLM SIEMPRE
3. **"Nunca agregues reglas al prompt para arreglar bugs"** — sacá la regla del prompt, ponela en código
4. **"Siempre aditivo, nunca destructivo"** — migraciones nullable, columnas nuevas, sin borrar
5. **"Testeá antes de deployar"** — smoke test E2E con mensaje real

## 🔗 Conexiones clave

```
WhatsApp → Evolution API (:8080) → n8n webhook → bot workflow
                                                 → PostgreSQL (meyer_postgres)
                                                 → HTTP webhooks → Dashboard Next.js (:3001)
```
