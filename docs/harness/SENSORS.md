# SENSORS.md — Verification checks

> Qué verificar antes de cada acción importante.
> Los hooks de Git (`.githooks/`) ejecutan `scripts/verify.sh` automáticamente en cada commit y push.
> Manual: `bash scripts/verify.sh`

## Pre-action checks (antes de escribir código)

### Seguridad
- [ ] El cambio expone API keys, tokens o secrets? Si sí → DETENER
- [ ] El cambio modifica `.env` o `secrets/`? Si sí → verificar que no se incluya en git
- [ ] El cambio afecta DB de producción? Si sí → requerir aprobación explícita

### Integridad
- [ ] Leíste `docs/harness/RULES.md` para este tipo de tarea?
- [ ] Revisaste `docs/KEY_LEARNINGS.md` para patrones ya conocidos?
- [ ] Entendiste la causa raíz (no solo el síntoma)?

### Scope
- [ ] El cambio afecta multi-tenant (todos los negocios)?
- [ ] El cambio requiere migración DB? Si sí → migración aditiva y backwards-compatible
- [ ] El cambio afecta bot + dashboard + DB simultáneamente?

## Post-action checks (después de escribir código)

### Quality gates
- [ ] `npm run lint` sin errores (en `dashboard/`)
- [ ] `npm run typecheck` sin errores (si existe)
- [ ] Código sigue patrones existentes (mismo estilo, mismas convenciones)

### Git
- [ ] `git status` no muestra archivos huérfanos (FIX_*.md, package.json raíz, etc.)
- [ ] `.env` y `secrets/` no están en staged changes
- [ ] `git diff --staged --name-only` revisado

### Verificación
- [ ] El cambio realmente arregla el bug o implementa la feature?
- [ ] Probaste en local antes de sugerir deploy?
- [ ] Documentaste en `docs/harness/RULES.md` si es un error nuevo?
- [ ] Actualizaste `docs/harness/MEMORY.md`?

## Production pre-deploy
- [ ] Migración DB ejecutada en VPS (si aplica)
- [ ] Rollback SQL listo
- [ ] Backups verificados
- [ ] Cambio probado en local
- [ ] Evaluator revisó el diff
- [ ] Usuario aprobó explícitamente

## Production post-deploy
- [ ] `pm2 logs` sin errores
- [ ] Funcionalidad crítica verificada (agendar, cancelar, reagendar)
- [ ] Si hay problema → `git revert` listo
