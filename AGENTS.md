# AGENTS.md — meyer-bot

> Mapa del proyecto. Lee esto primero. Cada sección te dice qué docs cargar según la tarea.

## Stack
Next.js 16 + PostgreSQL 16 + n8n + Evolution API + LLMs (Gemini/Cerebras/Groq/gpt-oss). SaaS multi-tenant.

## Cómo empezar una sesión NUEVA (sesion-start)
1. Leer `docs/sessions/HANDOFF.md` primero (si existe)
2. Leer `docs/harness/MEMORY.md` — qué pasó en sesiones anteriores
3. Leer `docs/harness/RULES.md` — reglas activas
4. Preguntar al usuario: "¿Por dónde empezamos?"
5. Según la respuesta, cargar skills relevantes (ver sección Skills abajo)
6. Al cerrar: actualizar MEMORY.md + HANDOFF.md

## Skills MCP — Cargar antes de cada tarea
Skills relevantes para este proyecto. **Cargar la skill antes de trabajar en el área:**

| Tarea | Skill a cargar |
|-------|---------------|
| Bugs en general | `code-review` |
| Auth/seguridad | `Web Security` + `auth-architect` |
| DB/PostgreSQL | `db-sculptor` |
| Deploy/Docker | `docker` + `ci-cd` |
| Next.js dashboard | `component-forge` (componentes) |
| Landing/UI | `landing-craft` + `responsive-engine` |
| Stripe/pagos | `api-forge` + `error-handler` |
| Antes de deploy a prod | `verification-before-completion` |
| Investigación | `research` |

## Mapa de archivos
| Ruta | Contiene |
|------|----------|
| `CLAUDE.md` | Reglas del proyecto, seguridad, protocolo de bugs |
| `docs/ARCHITECTURE.md` | Schema DB completo, principios, flujo del bot, decisiones |
| `docs/KEY_LEARNINGS.md` | 173 lecciones técnicas (n8n, Next.js, LLMs, infra) |
| `docs/SPRINTS.md` | Estado de sprints y backlog |
| `docs/BUG_BACKLOG.md` | Bugs activos, prioridad, estado |
| `docs/RUNBOOK.md` | Procedimientos de operación y disaster recovery |
| `docs/reference/RESEARCH.md` | **ÚNICO** archivo con conclusiones de investigaciones |
| `docs/sessions/HANDOFF.md` | Handoff entre sesiones. **LEER primero al empezar.** |
| `docs/sessions/CURRENT.md` | Contexto de la sesión activa. **SE REEMPLAZA cada sesión.** |
| `docs/harness/RULES.md` | Reglas permanentes (The Ratchet) — cada error evita repetirse |
| `docs/harness/SENSORS.md` | Qué verificar antes/después de cada acción |
| `docs/harness/MEMORY.md` | Memoria acumulada entre sesiones. **SE EDITA, nunca se reemplaza.** |
| `docs/harness/TEMPLATES.md` | Templates para bugs, features, refactors, deploy, investigación |

## Qué leer según tu tarea
- **Bug**: `CLAUDE.md` → `docs/BUG_BACKLOG.md` → skills: code-review
- **Feature nueva**: `CLAUDE.md` → `docs/ARCHITECTURE.md` → `docs/SPRINTS.md` → skill según área
- **Dashboard/Next.js**: `docs/ARCHITECTURE.md` (Dashboard) → skill: component-forge
- **n8n**: `docs/ARCHITECTURE.md` (flujo del bot) → `docs/KEY_LEARNINGS.md` (n8n)
- **Deploy**: `docs/RUNBOOK.md` → skills: docker + ci-cd
- **Auth/seguridad**: skills: Web Security + auth-architect → `docs/ARCHITECTURE.md`
- **Pagos/Stripe**: skills: api-forge + error-handler → `docs/reference/RESEARCH.md`
- **Investigación**: skill: research → `docs/TEMPLATES.md`
- **Solo contexto**: `CLAUDE.md` + `docs/sessions/HANDOFF.md` + `docs/harness/MEMORY.md`

## MEMORY.md vs HANDOFF.md vs CURRENT.md
- **HANDOFF.md**: lo lee el agente al empezar una sesión. Contiene el estado actual y qué hacer. **Se actualiza al cerrar sesión.**
- **MEMORY.md**: lo edita el agente al final de cada sesión. Mantiene el resumen acumulado de todo lo que pasó. **Nunca se reemplaza entero.**
- **CURRENT.md**: contexto detallado de lo que se está haciendo AHORA. **Se sobrescribe completo cada sesión.**

## The Ratchet
Cada error que se corrige → regla permanente en `docs/harness/RULES.md`. Nunca el mismo error dos veces. Si no existe una regla para algo que acaba de pasar, escríbela.

## Auto-verificación
Antes de cada commit corre `scripts/verify.sh` automáticamente (via `.githooks/pre-commit`). Verifica: secrets en staging, lint, archivos huérfanos, harness files. Si falla, el commit se cancela.

## Security (de CLAUDE.md, mandatorio)
- NUNCA leer/imprimir `.env` en outputs
- NUNCA hardcodear API keys, tokens o contraseñas
- Credenciales Google Cloud en `secrets/`, nunca en Git
- Verificar `.env` y `secrets/` antes de cada commit

## Generator-Evaluator
Antes de aplicar cambios de escritura (especialmente en producción), un subagente debe revisar el diff. Si no hay un evaluador disponible, pídele al usuario que revise.

## Commits
Solo cuando el usuario lo indique. Formato: `tipo: descripción` (tipo: feat, fix, chore, docs).
