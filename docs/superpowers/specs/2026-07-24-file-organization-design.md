# File Organization + Ownership System — Diseño

> **Propósito:** Definir estructura definitiva de archivos .md, sistema de ownership para evitar que IA modifique lo que no debe, y limpieza de archivos huérfanos.
> **Fecha:** 24 julio 2026
> **Basado en:** Estándar AGENTS.md (Linux Foundation), humanfile, .claude/rules/, y mejores prácticas de 2026.

---

## 1. Problema actual

Archivos .md dispersos en 3 zonas sin ownership claro:

```
RAÍZ (7 md, 3 deberían estar en docs/)
├── AGENTS.md ✅ — canonico, entry point
├── CLAUDE.md ✅ — canonico, reglas
├── README.md ✅ — canonico
├── FIX_RESPONSIVE.md ❌ — fixes ya aplicados, pendiente borrar
├── IMPLEMENTACION_MULTI_LLM.md → docs/
├── INSTRUCCIONES_CLAUDE_CODE.md → docs/
├── SPRINT4_SESSIONS_N8N.md → docs/

docs/ (11 md + 4 subdirs)
├── README.md ❌ — duplica root README
├── backlog/ — mezcla planificación + security + performance
├── fixes/ — B1-B6 individuales (transientes)
├── superpowers/ — specs + plans (transientes)

.superpowers/sdd/ — archivos de subagent-driven-development (transientes)
```

**Problemas:**
- Modelos no saben qué archivos son READONLY vs editables
- Archivos transientes mezclados con canónicos
- Sin sistema de guardas: cualquier modelo puede modificar cualquier archivo
- `docs/README.md` duplica root README

---

## 2. Estructura propuesta

```
📁 raíz/
├── AGENTS.md            → CANONICO | READONLY | Entry point universal
├── CLAUDE.md            → CANONICO | READONLY | Stub: "See @AGENTS.md"
├── README.md            → CANONICO | READONLY | Para humanos

📁 docs/
├── INDEX.md             → CANONICO | READONLY | Mapa de toda la documentación
├── ARCHITECTURE.md      → CANONICO | READONLY | Schema DB + decisiones
├── RUNBOOK.md           → CANONICO | READONLY | Operaciones y DR
├── KEY_LEARNINGS.md     → APPEND    | Modelo edita | Lecciones acumuladas
├── SPRINTS.md           → CANONICO | READONLY | Historial de sprints
├── BUG_BACKLOG.md       → CANONICO | Modelo edita bugs | Backlog activo
├── CONTEXT_UPDATED.md   → CANONICO | READONLY | Estado del producto
├── SECURITY_AUDIT.md    → CANONICO | READONLY | Auditoría de seguridad
│
├── sessions/
│   ├── HANDOFF.md       → SE REEMPLAZA cada sesión | Handoff para próxima
│   └── CURRENT.md       → SE REEMPLAZA cada sesión | Contexto de sesión activa
│
├── archive/             → READONLY | Lo que ya no aplica pero se guarda
│   ├── FIX_RESPONSIVE.md
│   ├── INSTRUCCIONES_CLAUDE_CODE.md
│   ├── IMPLEMENTACION_MULTI_LLM.md
│   ├── SPRINT4_SESSIONS_N8N.md
│   ├── fixes/           → B1-B6 individuales
│   └── backlog/         → ARCHITECTURE_FUTURE.md, performance-audit.md
│
├── harness/
│   ├── MEMORY.md        → APPEND | Modelo edita | Memoria entre sesiones
│   ├── RULES.md         → APPEND | Modelo agrega reglas | The Ratchet
│   ├── SENSORS.md       → CANONICO | READONLY | Verificaciones pre/post
│   └── TEMPLATES.md     → CANONICO | READONLY | Templates
│
└── superpowers/         → TRANSIENTE | Modelo escribe | Specs + plans
    ├── specs/
    └── plans/

📁 .claude/
├── settings.json        → CANONICO | Reglas ENFÓRZABLES
└── rules/
    ├── file-ownership.md → READONLY paths, CONFIRM paths, FREE paths
    ├── security.md       → Reglas de seguridad
    └── code-style.md     → Reglas de código
```

---

## 3. Sistema de ownership (guardas)

### Niveles de permiso

| Nivel | Significado | Para el modelo |
|-------|-------------|---------------|
| **READONLY** | No modificar nunca | "Este archivo es fuente de verdad. NO lo edites." |
| **APPEND** | Solo agregar al final | "Puedes agregar contenido nuevo. NO modifiques lo existente." |
| **CONFIRM** | Preguntar antes de editar | "Si necesitas cambiar esto, pregunta primero." |
| **FREE** | Editar libremente | "Puedes modificar esto sin permiso." |
| **TRANSIENTE** | Crear/eliminar libremente | "Puedes crear archivos aquí. Se limpian periódicamente." |

### Implementación

**Opción A — humanfile (npm)**
```bash
npx humanfile install    # genera reglas para Cursor, Copilot, Claude Code
```

Archivo `.human`:
```
docs/superpowers/        # free — specs y plans
docs/harness/MEMORY.md   # append — solo agregar al final
docs/archive/            # readonly — no tocar
docs/ARCHITECTURE.md     # readonly — fuente de verdad
CLAUDE.md                # readonly — entry point
AGENTS.md                # readonly — entry point
```

**Opción B — .claude/rules/ manual**
No requiere dependencias externas. Usa el sistema nativo de Claude Code con reglas por path.

---

## 4. Plan de migración (seguro, sin riesgo)

### Fase 1 — Mover archivos (sin borrar originales)
1. Crear `docs/archive/`
2. Mover a `docs/archive/`: `FIX_RESPONSIVE.md`, `INSTRUCCIONES_CLAUDE_CODE.md`, `IMPLEMENTACION_MULTI_LLM.md`, `SPRINT4_SESSIONS_N8N.md`
3. Mover a `docs/sessions/`: renombrar `HANDOFF_NEXT_CHAT.md` → `sessions/HANDOFF.md`
4. Crear `docs/INDEX.md` con el mapa
5. Crear `.claude/rules/file-ownership.md`

### Fase 2 — Sistema de guardas
1. Crear `.human` con reglas de ownership
2. `npx humanfile install` para escribir las reglas en cada herramienta
3. O crear `.claude/rules/` manual

### Fase 3 — Después de 1 semana sin issues
1. Borrar archivos originales de raíz (los movidos a archive/)
2. Borrar `docs/README.md`
3. Borrar `docs/fixes/` individuales (consolidados si hace falta)

---

## 5. Archivos canónicos vs transientes

| Archivo | Naturaleza | Quién lo edita |
|---------|-----------|----------------|
| `AGENTS.md` | Canónico | Solo humano |
| `CLAUDE.md` | Canónico | Solo humano |
| `README.md` | Canónico | Solo humano |
| `docs/ARCHITECTURE.md` | Canónico | Solo humano |
| `docs/RUNBOOK.md` | Canónico | Solo humano |
| `docs/SPRINTS.md` | Canónico | Solo humano |
| `docs/INDEX.md` | Canónico | Solo humano |
| `docs/harness/RULES.md` | Vivo | Modelo agrega reglas |
| `docs/harness/MEMORY.md` | Vivo | Modelo agrega resumen |
| `docs/BUG_BACKLOG.md` | Vivo | Modelo actualiza bugs |
| `docs/superpowers/specs/` | Transiente | Modelo escribe |
| `docs/superpowers/plans/` | Transiente | Modelo escribe |
| `docs/sessions/HANDOFF.md` | Sesión | Modelo escribe al cerrar |
| `docs/sessions/CURRENT.md` | Sesión | Modelo lee al empezar |

---

## 6. Regla para el modelo (para incluir en AGENTS.md)

```
## File Ownership
READONLY files — NO editar ni crear:
- AGENTS.md, CLAUDE.md, README.md
- docs/ARCHITECTURE.md, RUNBOOK.md, SPRINTS.md, INDEX.md, SECURITY_AUDIT.md, CONTEXT_UPDATED.md
- docs/harness/SENSORS.md, TEMPLATES.md
- docs/archive/*

APPEND only (solo agregar al final):
- docs/harness/MEMORY.md — agregar resumen al final
- docs/harness/RULES.md — agregar regla después de corregir un error

CONFIRM required (preguntar antes):
- docs/BUG_BACKLOG.md
- Cualquier archivo .ts/.tsx/.js/.jsx en dashboard/

FREE to edit:
- docs/superpowers/specs/
- docs/superpowers/plans/
```

---

## 7. Notas

- No mover nada a production sin pasar 1 semana de verificación
- `docs/README.md` puede borrarse inmediatamente (duplica root README)
- `FIX_RESPONSIVE.md` se puede borrar (fix ya aplicado, commit `3c9c8eb`)
- Los specs/plans de superpowers son inofensivos donde están — no urge moverlos
