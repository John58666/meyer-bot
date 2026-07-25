# Refactor: Prompts fuera de n8n

> **Motivación:** Hoy el prompt del AI Agent está embebido en n8n como jsCode (22 variables ensambladas). No hay versionado, no hay staging, no hay rollback. Cualquier cambio va directo a producción.

## Problema actual
- Prompt dentro de jsCode en n8n → imposible hacer code review
- No hay historial de cambios (solo el changelog manual en `docs/prompt-changelog.md`)
- No se puede revertir un cambio sin reimportar el JSON entero
- No hay tests automatizados para prompts

## Solución propuesta
```
antes (hoy):        n8n jsCode → prompt inline
después:            dashboard/ API → n8n HTTP Request → prompt
                              ↑
                   prompts/*.yaml (versionados en git)
```

### Cómo funciona
1. Los prompts viven en `prompts/` como YAML versionados en git
2. El dashboard tiene un endpoint `/api/prompts` que los sirve
3. n8n ya no tiene el prompt hardcodeado — lo pide vía HTTP Request al dashboard
4. Cambiar un prompt = editar YAML → commit → deploy dashboard → n8n recoge el cambio

### Ventajas
- Code review en cada cambio de prompt (PR en GitHub)
- Rollback con `git revert`
- Se puede tener múltiples versiones (v1, v2) y comparar
- Preparado para A/B testing a futuro
- Las 22 variables actuales se mantienen — solo cambia de dónde viene el texto

### No requiere
- ❌ Migrar de n8n
- ❌ Cambiar la arquitectura del bot
- ❌ Tocar los 50 nodos del workflow

Solo el nodo AI Agent deja de tener el prompt hardcodeado y lo pide por HTTP.
