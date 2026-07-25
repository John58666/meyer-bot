# HANDOFF_NEXT_CHAT.md — Instrucciones para el próximo chat

> **Propósito:** Este documento es el punto de entrada para la PRÓXIMA sesión de trabajo.
> B1 Fase 2 está IMPLEMENTADO Y DEPLOYADO (dashboard + DB + n8n queries). Hay un bug UX post-deploy.

---

## Estado actual del proyecto

**Última sesión (2026-07-22):** B1 Fase 2 implementado completamente:
- ✅ Migración DB 017 (`professional_schedule` table)
- ✅ 4 server actions (CRUD horarios por profesional)
- ✅ `ProfessionalScheduleList` con dos vistas (owner/admin multi-profesional, profesional auto-editor)
- ✅ Config page split por role (owner/admin ven config completa, profesional ve solo "Mi horario")
- ✅ `HorarioClient` extendido con `onSave` prop
- ✅ `getAvailableSlots` usa COALESCE(ps.schedule_text, b.schedule_text)
- ✅ Queries n8n actualizadas con COALESCE per-profesional
- ✅ Deployado a producción (build Jul 22 04:29 UTC)
- ❌ **BUG post-deploy:** El `authorized` callback en `auth.config.ts` redirige profesionales fuera de `/dashboard/configuracion`. Se eliminó el redirect en commit `f4b4fb3` pero el bug persiste — el profesional ve solo el título "Mi horario" sin el editor de horario debajo.

**Causa raíz del bug:** La redirección en `auth.config.ts` (`path.startsWith("/dashboard/configuracion") && role === "profesional"`) bloquea a profesionales de la página de configuración. Se eliminó en el último commit pero tras deploy el profesional sigue viendo solo el título sin contenido.

**Posible causa adicional:** El `ProfessionalScheduleList` tiene `displayed = professionals.filter(p => p.professionalId === Number(professionalId))` que puede dar 0 resultados si `professionalId` no matchea tipo o valor. Investigación en curso.

## Documentación obligatoria para el próximo chat

Leer estos docs ANTES de hacer cualquier cosa:

1. `docs/BUG_BACKLOG.md` — estado de bugs (B1 F2 tiene bug post-deploy)
2. `docs/CONTEXT_UPDATED.md` — estado del proyecto y reglas operativas
3. `docs/SPRINTS.md` — sección PENDIENTE para roadmap de producto
4. `docs/ARCHITECTURE.md` — schema DB y principios
5. `docs/backlog/ARCHITECTURE_FUTURE.md` — plan de escalabilidad
6. `CLAUDE.md` (raíz) — reglas del proyecto
7. `docs/README.md` — mapa de documentación
8. `docs/fixes/B1-agendas-independientes-fase1.md` — contexto de la feature completa
9. `docs/superpowers/plans/2026-07-21-b1-fase2-professional-schedules.md` — plan de implementación
10. `docs/superpowers/specs/2026-07-21-b1-fase2-professional-schedules.md` — spec detallada

---

## 🚨 BUG PRIORITARIO: B1 Fase 2 — Profesional no ve editor de horario

**Síntoma:** Profesional inicia sesión → navega a configuración → ve título "Mi horario" → NO ve el editor de horario debajo.

**Lo que ya se intentó:**
1. Commit `f58247e` — RBAC: profesionales ven su propio schedule
2. Commit `d26ca95` — fix: profesional guarda horario correctamente
3. Commit `674c82f` — fix: type mismatch professionalId (JWT string vs DB int)
4. Commit `f4b4fb3` — fix: remove middleware redirect que bloqueaba a profesionales de config page

**Lo que NO se ha probado aún:**
- El `ProfessionalScheduleList` recibe `professionalId` de la sesión (tipo `number | null`), filtra `professionals.filter(p => p.professionalId === Number(professionalId))`. Si `professionalId` es `null` (no llega del JWT), el filtro da 0 resultados → componente retorna `null`.
- Verificar que `session.user.professionalId` llegue correctamente en el JWT para usuarios profesionales.
- Verificar que `getAllProfessionalSchedules(businessId)` retorne los profesionales correctos.

**Contacto:** Johnander — usuario profesional de prueba "John" (user_id=13, professional_id=11, business_id=1)

---

## Tareas priorizadas para el próximo chat

### 🚨 Prioridad 0: Debuggear B1 Fase 2 — profesional no ve editor

**Qué investigar:**
1. ¿El middleware redirect estaba realmente funcionando? Si no, el bug está en el componente.
2. Verificar `session.user.professionalId` en runtime — agregar console.log o endpoint de debug.
3. Verificar que `getAllProfessionalSchedules` retorna datos correctos para el business del profesional.
4. Verificar el filter en ProfessionalScheduleList — ¿`professionalId` matchea con `p.professionalId`?

**Si el redirect era el problema:** verificar que el commit `f4b4fb3` sí se deployó (build + pm2 restart).

**Si no es el redirect:** agregar diagnóstico para tracing del data flow.

---

### 🥇 Prioridad 1: Quitar branding Meyer del producto (#13)

**Por qué:** La plataforma es multi-tenant pero el producto se llama "Meyer-bot". Cada negocio nuevo debe ver su propia marca.

**Qué investigar:**
- Buscar referencias a "Meyer", "meyer", "Peluquería Meyer", "Meyer-bot" en el código
- Revisar `app/(dashboard)/dashboard/layout.tsx` para título/topbar
- Revisar prompts del bot en `workflows/WhatsApp Bot - Genérico.json` (Node [33]) para referencias hardcodeadas
- Revisar mensajes de recordatorios, confirmaciones, etc.
- Revisar `services_text` y `schedule_text` si tienen datos de Meyer
- Revisar DB: `businesses.name` para business_id=1

**Alcance:**
- [ ] Buscar TODAS las referencias a "Meyer" en el repo (código, prompts, DB seeds)
- [ ] Hardcode: cambiar `prompt_name` en `businesses` para que use el nombre del negocio dinámicamente
- [ ] Dashboard: cambiar título por defecto a usar `businessName` de la sesión
- [ ] Confirmar que no hay texto Meyer en los prompts del bot (Node [33])
- [ ] NO cambiar el nombre del repo ni de la carpeta aún

---

### 🥇 Prioridad 2: Panel admin Johnander (#14)

**Por qué:** Johnander necesita una vista global de todos los negocios para administrar la plataforma.

**Qué investigar:**
- Si ya existe un usuario Johnander con role especial
- Cómo está estructurado el layout del dashboard (rutas, sidebar, auth)
- Si hay algún endpoint que necesite cruzar businesses

**Requerimientos iniciales:**
- [ ] Ruta `/admin` o similar con lista de todos los negocios
- [ ] Cada negocio muestra: nombre, instancia WhatsApp (activa/status), citas hoy, última actividad
- [ ] Acceso solo para Johnander (hardcodear por email o crear role `superadmin`)
- [ ] No necesita modificar nada — solo lectura

---

### 🥈 Prioridad 3: Onboarding negocio nuevo (#21)

**Por qué:** Hoy agregar un negocio nuevo requiere múltiples pasos manuales (SQL INSERT + Evolution API + crear usuario). Esto no escala.

**Qué investigar:**
- Proceso actual documentado en `ARCHITECTURE.md` sección "Onboarding de nuevo negocio"
- Cómo se crean instancias en Evolution API (API calls, endpoints)
- Estructura del `businesses` INSERT
- Cómo se crean usuarios via `create-user.js`

**Alcance:**
- [ ] Revisar `database/seeds/create-user.js` para entender el proceso actual
- [ ] Investigar si Evolution API tiene endpoints para crear instancias programáticamente
- [ ] Diseñar un script/flujo de onboarding automatizado
- [ ] Documentar el proceso completo

---

### 🥉 Prioridad 4: Servicios nuevos no reflejados en bot (#12)

**Por qué:** Cuando un negocio actualiza `services_text` desde el dashboard, el bot puede tardar en reflejar los cambios o no hacerlo.

**Investigar causa raíz:**
- Cómo el workflow lee `services_text` (qué nodo, cada cuánto)
- Si hay caching en n8n
- Orden de variables en el system prompt (servicios al fondo → LLM los ignora)

---

## Cómo trabajar

1. **Un item a la vez** — completar uno antes de empezar el siguiente
2. **Brainstorming primero** — antes de tocar código, usar la skill brainstorming para explorar y planificar
3. **Investigación profunda** — leer docs locales + web search con información actualizada
4. **Preguntar antes de actuar** — presentar diagnóstico + propuesta, esperar aprobación
5. **Backups antes de cambios** — siempre respaldar antes de modificar

## Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `workflows/WhatsApp Bot - Genérico.json` | Workflow n8n — NO necesita cambios de prompt |
| `dashboard/` | Código del dashboard Next.js |
| `database/` | Migraciones SQL y seeds |
| `docs/` | Toda la documentación |
