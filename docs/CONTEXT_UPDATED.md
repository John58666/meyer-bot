# CONTEXT_UPDATED.md — Estado de sesión

> Leer PRIMERO antes de cualquier tarea. Contiene el estado actual del proyecto y las reglas operativas.

## Reglas operativas críticas

### B1 Fase 2 — implementado completo (dashboard + DB + n8n)
Todos los cambios de B1 Fase 2 están deployados en producción:
- Migración 017 aplicada en DB de producción
- Server actions CRUD para `professional_schedule` en `lib/actions.ts`
- `ProfessionalScheduleList` componente con vista owner/admin y profesional
- Config page dividida por role (owner/admin vs profesional)
- `getAvailableSlots` actualizado con COALESCE
- Queries n8n actualizadas con COALESCE
- **BUG post-deploy:** Profesional ve solo título "Mi horario" sin editor

## Estado actual (2026-07-22) — B1 Fase 2 deployada con bug UX

### Completado
- B1 Fase 2 (dashboard + DB + n8n queries) — implementado y deployado ✅
- Sprint 18 (B7, B9, B10) — completado en sesiones anteriores ✅
- B11 (post-LLM validation) — completado en sesiones anteriores ✅

### Bug activo
- **B1 F2 post-deploy:** Profesional ve solo título "Mi horario" sin editor de horario debajo
- Causa probable 1: Middleware redirect bloqueando acceso (se eliminó en commit `f4b4fb3`)
- Causa probable 2: `professionalId` no matchea en el filter del componente
- **No se ha resuelto aún** — pasar a debug en el próximo chat

## Hallazgos de investigación

### Post-LLM validation gap (B11)
El flujo del bot tiene 2 verificaciones de disponibilidad. La primera (`Leer Slots Disponibles`) es correcta. La segunda (`Leer Disponibilidad`, post-LLM) SOLO chequea colisiones de appointments — NO valida contra `schedule_exceptions` (cerrado, horario_especial) ni `schedule_text`. Si el LLM inventa un día/hora que no está en `disponibilidad`, el bug pasa desapercibido. ✅ Aplicado en sesión anterior.

### Inconsistencia dashboard vs bot
- Bot usa overlap check para colisiones (30 min + buffer)
- Dashboard usa exact match (`s.filter(s => !booked.has(s))`)
- El dashboard muestra más slots disponibles de los reales
- Pendiente de corregir.

## Sesión cerrada (2026-07-22)

Esta sesión implementó B1 Fase 2 completo:
- **Migración 017**: `professional_schedule` table ✅
- **Server actions**: CRUD horarios por profesional ✅
- **ProfessionalScheduleList**: dos vistas según role ✅
- **Config page**: split owner/admin vs profesional ✅
- **HorarioClient**: `onSave` prop pattern ✅
- **getAvailableSlots**: COALESCE per-profesional ✅
- **n8n queries**: COALESCE en slot check ✅
- **Deploy**: build + push + pm2 restart ✅
- **BUG**: profesional no ve editor de horario ❌

**Próximo chat**: Debuggear B1 F2 post-deploy primero. Luego continuar con tareas de HANDOFF_NEXT_CHAT.md.
