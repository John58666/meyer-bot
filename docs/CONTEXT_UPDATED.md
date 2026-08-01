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

## Sesion 31 Jul-1 Ago 2026 — Diagnostico + Fase 1 completa + Fase 2 avanzada + Fase 3 iniciada

### Harness de documentacion
Se creo el harness en `workflows/docs/` con 6 archivos (519 lineas):
- `INICIO.md` — Router + estado actual. **Leer SIEMPRE primero.**
- `01-BOT.md` — Workflow del bot, proveedores, fixes activos.
- `02-ROADMAP.md` — 4 fases, dependencias, checklist de venta, demo script.
- `03-INVESTIGACION.md` — R1+R2+R3 de Perplexity resumidas (10 temas).
- `04-REGLAS.md` — Skills, The Ratchet, protocolo de investigacion, anti-sprawl.
- `05-BUGS.md` — Tabla maestra de 42 bugs + template para nuevos.
- `05-BUGS.md` — Tabla maestra de 42 bugs + template para nuevos.

### 5 Reglas de Oro
1. **"El LLM decide QUE, el codigo decide QUE HACER con eso"**
2. **"Todo antes de guardar es no confiable"** — validacion post-LLM SIEMPRE
3. **"Nunca agregues reglas al prompt para arreglar bugs"** — a codigo

### Estado actual del bot (1 Ago 2026 — cierre sesion)

**Proveedores:** Gemini → Cerebras → Groq → DeepSeek (OpenCode Go) → OpenRouter (x3)

**Flujo del workflow:**
Webhook → Normalizar Webhook → Alerta Conexion → Filtro Inicial → Lookup Negocio (COALESCE phone_number_id/whatsapp_instance) → Procesar Mensaje (wbKey, B18 detection, buttons/lists, image captions) → Leer Sesion activa → Leer Slots Disponibles → Formatear Disponibilidad → Leer Historial → AI Agent (validation pipeline, gapMessage) → Guardar Historial (validation logging) → Wait → Switch (6 reglas)

**Funcionalidades:**
🟢 Agendamiento, cancelar/reagendar, INSERT (2.6), pipeline validacion, reaction filter, buttons/lists, image captions, gapMessage mejorado, CONNECTION_UPDATE, limpieza DB, backups, webhook normalizer, phone_number_id COALESCE, SQL escaping, Guardar Sesion UPSERT+step, notificacion reagend, UNIQUE indexes (appointments + businesses.whatsapp_instance), HTTP timeout 15s
🟡 B18: v6 activo pero _fms siempre null (pendiente debug)
🔴 B15: API key leak (Manager UI no disponible)

**Infraestructura DB nueva:** validation_failures (log pipeline), sessions.step (state machine), businesses.phone_number_id (BSP prep), businesses.webhook_secret (HMAC prep), 3 UNIQUE constraints/indexes

**Monorepo (Fase 3):** packages/bot-core/ (validation, slots, prompt, llm), apps/bot-service/

### Bugs cerrados: 19 de 42
B2-B14, B17 (sesiones anteriores) + N1,N5,N6,N7,N8,N9,N12,N13,N14,N15,N17,N18,N19,N21,N22

### Fases — Progreso
- Fase 1 (Supervivencia): 7/8 (87%) — falta B15
- Fase 2 (Confiabilidad): 3/6 (50%) — B18 pendiente, dashboard items diferidos (refactor)
- Fase 3 (Arquitectura): 3/7 (43%) — state machine DB, validation logging, monorepo structure
- Fase 4 (Escala): Sin empezar

### Para la proxima sesion
1. Leer workflows/docs/INICIO.md (entry point)
2. Debuggear B18: _fms siempre null
3. Dashboard: B1, N2, N11, N24 (cuando termines refactor)
4. F3.4: Extraer logica del AI Agent a packages/bot-core/
5. F3.5: Dataset de evals + shadow mode
6. F3.6: Git Source Control en n8n UI
7. F3.7: HMAC por tenant
