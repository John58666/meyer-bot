# File Ownership Rules

> **Reglas de permisos sobre archivos.** Todo modelo/agent que opere en este repo DEBE respetar estos permisos.
> Última actualización: 24 jul 2026.

---

## Niveles de permiso

| Nivel | Significado | Para el modelo |
|-------|-------------|-----------------|
| **READONLY** | No modificar nunca | "Este archivo es fuente de verdad. NO lo edites." |
| **APPEND** | Solo agregar al final | "Puedes agregar contenido nuevo. NO modifiques lo existente." |
| **CONFIRM** | Preguntar antes de editar | "Si necesitas cambiar esto, pregunta primero." |
| **FREE** | Editar libremente | "Puedes modificar esto sin permiso." |
| **TRANSIENTE** | Crear/eliminar libremente | "Puedes crear archivos aquí. Se limpian periódicamente." |

---

## READONLY — NO editar ni crear nunca

```
AGENTS.md
CLAUDE.md
README.md
docs/ARCHITECTURE.md
docs/RUNBOOK.md
docs/SPRINTS.md
docs/INDEX.md
docs/CONTEXT_UPDATED.md
docs/reference/RESEARCH.md
docs/harness/SENSORS.md
docs/harness/TEMPLATES.md
docs/archive/*
```

## APPEND — Solo agregar al final

```
docs/harness/MEMORY.md     # agregar resumen al final de cada sesión
docs/harness/RULES.md      # agregar regla después de corregir un error
docs/KEY_LEARNINGS.md       # agregar lección nueva al final
```

## CONFIRM — Preguntar antes de editar

```
docs/BUG_BACKLOG.md
Cualquier archivo .ts/.tsx/.js/.jsx en dashboard/
Cualquier archivo de configuración (package.json, next.config.*, tsconfig.json, etc.)
```

## FREE — Editar libremente

```
docs/sessions/HANDOFF.md     # se actualiza al cerrar sesión
docs/sessions/CURRENT.md     # se sobrescribe al empezar sesión
```

## TRANSIENTE — Crear/eliminar libremente

```
docs/superpowers/specs/
docs/superpowers/plans/
.superpowers/sdd/
```

---

## Reglas adicionales

1. **Nunca borrar archivos sin backup.** Si hay que borrar, primero copiar a `docs/archive/`.
2. **No crear archivos .md en raíz.** Todo doc nuevo va en `docs/` o subdirectorio apropiado.
3. **No duplicar documentación.** Si existe un INDEX.md, referenciarlo, no recrear el mapa.
4. **Investigaciones van a `docs/reference/RESEARCH.md`** — archivo único de research. No crear archivos sueltos.
5. **Specs y plans van a `docs/superpowers/specs/` y `docs/superpowers/plans/`** respectivamente. Son transientes.
6. **Bugs activos van en `docs/BUG_BACKLOG.md`.** No crear archivos individuales por bug.
