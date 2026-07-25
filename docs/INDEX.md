# INDEX.md — Mapa de Documentación

> **Propósito:** Índice canónico de toda la documentación del proyecto. Si buscas un doc, empieza aquí.
> **READONLY** — No editar sin autorización. Última actualización: 24 jul 2026.

---

## Entrada (raíz)

| Archivo | Descripción | Permiso |
|---------|-------------|---------|
| `AGENTS.md` | Entry point universal. Qué leer según la tarea. | READONLY |
| `CLAUDE.md` | Reglas del proyecto, seguridad, protocolo de bugs. | READONLY |
| `README.md` | Readme para humanos. | READONLY |

---

## docs/ — Documentación central

### Canónica (READONLY — fuente de verdad)
| Archivo | Descripción | Permiso |
|---------|-------------|---------|
| `docs/ARCHITECTURE.md` | Schema DB completo, principios, flujo del bot, decisiones. | READONLY |
| `docs/RUNBOOK.md` | Procedimientos de operación y disaster recovery. | READONLY |
| `docs/SPRINTS.md` | Historial de sprints y backlog. | READONLY |
| `docs/CONTEXT_UPDATED.md` | Estado actual del producto. | READONLY |
| `docs/KEY_LEARNINGS.md` | 173 lecciones técnicas acumuladas. | APPEND |
| `docs/reference/RESEARCH.md` | Conclusiones compactas de investigaciones (pagos, auth, anti-halucinación, etc.). ÚNICO archivo de research. | READONLY |
| `docs/BUG_BACKLOG.md` | Bugs activos, prioridad, estado. | CONFIRM |

### harness/ (sistema operativo del agente)
| Archivo | Descripción | Permiso |
|---------|-------------|---------|
| `docs/harness/MEMORY.md` | Memoria acumulada entre sesiones. Se EDITA, nunca se reemplaza. | APPEND |
| `docs/harness/RULES.md` | The Ratchet — reglas permanentes tras cada error corregido. | APPEND |
| `docs/harness/SENSORS.md` | Verificaciones pre/post acción. | READONLY |
| `docs/harness/TEMPLATES.md` | Templates para bugs, features, refactors, deploy, investigación. | READONLY |

### sessions/ (transitorio — se reemplaza cada sesión)
| Archivo | Descripción | Permiso |
|---------|-------------|---------|
| `docs/sessions/HANDOFF.md` | Handoff para la próxima sesión. Se actualiza al cerrar. | FREE |
| `docs/sessions/CURRENT.md` | Contexto de la sesión activa. Se sobrescribe al empezar. | FREE |

### superpowers/ (transitorio — specs y plans)
| Directorio | Descripción | Permiso |
|------------|-------------|---------|
| `docs/superpowers/specs/` | Specs de diseño. El modelo escribe libremente. | TRANSIENTE |
| `docs/superpowers/plans/` | Plans de implementación. El modelo escribe libremente. | TRANSIENTE |

---

## docs/archive/ — Solo lectura histórica

> Archivos que ya no aplican pero se guardan como referencia. **No editar.**

| Archivo | Origen | Razón de archivo |
|---------|--------|-------------------|
| `archive/FIX_RESPONSIVE.md` | raíz | Fix ya aplicado (commit `3c9c8eb`) |
| `archive/INSTRUCCIONES_CLAUDE_CODE.md` | raíz | Obsoleto — reemplazado por AGENTS.md |
| `archive/IMPLEMENTACION_MULTI_LLM.md` | raíz | Documentación de sprint ya completado |
| `archive/SPRINT4_SESSIONS_N8N.md` | raíz | Documentación de sprint ya completado |
| `archive/HANDOFF_NEXT_CHAT.md` | docs/ | Reemplazado por `docs/sessions/HANDOFF.md` |
| `archive/CURRENT_SESSION_CONTEXT.md` | docs/ | Reemplazado por `docs/sessions/CURRENT.md` |
| `archive/AUDITORIA_INGENIERO.md` | docs/ | Investigación puntual (41 gaps), conclusiones en RESEARCH.md |
| `archive/docs-README.md` | docs/ | Duplica root README.md |
| `archive/prompt-changelog.md` | docs/ | Changelog de prompt — histórico |
| `archive/fixes/` | docs/fixes/ | Bugs B1-B6 individuales (ya consolidados en BUG_BACKLOG.md) |
| `archive/backlog/` | docs/backlog/ | ARCHITECTURE_FUTURE.md, performance-audit.md, SECURITY_AUDIT.md, compliance-ley-1581.md |

---

## Reglas de ownership

Ver `.claude/rules/file-ownership.md` para el sistema completo de permisos.

**Resumen rápido:**
- **READONLY:** No modificar nunca. Source of truth.
- **APPEND:** Solo agregar al final (MEMORY.md, RULES.md, KEY_LEARNINGS.md).
- **CONFIRM:** Preguntar antes de editar (BUG_BACKLOG.md, código del dashboard).
- **FREE:** Editar libremente (sessions/, superpowers/).
- **TRANSIENTE:** Crear/eliminar libremente (superpowers/specs/, superpowers/plans/).
