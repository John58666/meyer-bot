# MEMORY.md — Memoria entre sesiones

> Memoria acumulada entre sesiones. **Nunca se reemplaza entero** — solo se editan secciones.
> Se actualiza al final de cada sesión.
>
> Relación con CURRENT_SESSION_CONTEXT.md:
> - `docs/CURRENT_SESSION_CONTEXT.md` = contexto detallado de lo que se está haciendo AHORA. Se sobrescribe completo al empezar una nueva sesión.
> - `docs/harness/MEMORY.md` = resumen acumulado de lo que ha pasado. Se edita (no se reemplaza) al final de cada sesión.

## Última sesión
- **Fecha**: 2026-07-25
- **Objetivo**: Dashboard refinements + diseño final bloqueos multi-profesional
- **Estado**: 4 bugs/UX issues corregidos y deployados. Diseño final aprobado y archivado en `docs/superpowers/specs/03-diseno-final-bloqueos-multiprofesional.md`.

## Bugs activos
| # | Bug | Prioridad | Estado |
|---|-----|-----------|--------|
| 1 | createAppointment no valida schedule_exceptions | 🔴 Crítico | Pendiente |
| 2 | fetchOcupacion ignora schedule_exceptions | 🔴 Alto | Pendiente |
| 3 | Clientes sin detección de duplicados | 🟡 Medio | Pendiente |
| 4 | Editor de servicios confuso (textarea vs filas) | 🟡 Medio | Pendiente |
| 5 | Gateo de configuración funciona | ✅ Corregido | Verificado |
| 6 | Citas del día sin resumen | 🟡 Medio | Pendiente |

## Archivos tocados recientemente
- `dashboard/components/horario/` — 6 componentes de mi-horario
- `dashboard/components/topbar.tsx` — BottomNav breakpoints
- `dashboard/app/(dashboard)/layout.tsx` — layout breakpoints
- `dashboard/lib/actions.ts` — updateBloqueo, SQL fix
- `dashboard/lib/audit-types.ts` — update_bloqueo
- `docs/superpowers/specs/03-diseno-final-bloqueos-multiprofesional.md` — diseño final

## Próximo paso sugerido
Implementar spec completo en `docs/superpowers/specs/03-diseno-final-bloqueos-multiprofesional.md` (7 items sección 11)

## 2026-07-24 — Investigación de gaps + organización + backup + compliance

### Qué se hizo
- Investigación completa de mejores prácticas de file organization para proyectos con IA (AGENTS.md standard, humanfile, .claude/rules/, ownership system)
- Investigación de backup/DR para PostgreSQL en VPS (pg_dump + WAL + pgBackRest tiers)
- Investigación de email transaccional vs WhatsApp
- Investigación de compliance Ley 1581 Colombia
- Creación de `docs/AUDITORIA_INGENIERO.md` — 41 gaps identificados en 7 áreas
- Creación de `docs/superpowers/specs/2026-07-24-file-organization-design.md`
- Creación de `docs/superpowers/specs/2026-07-24-vps-backup-dr-plan.md`
- Creación de `docs/backlog/compliance-ley-1581.md`
- Actualización de sistema de handoff: `docs/sessions/HANDOFF.md` + `CURRENT.md`
- Discusión sobre estrategia multi-agente (pendiente de decisión)

### Archivos creados
- `docs/AUDITORIA_INGENIERO.md`
- `docs/superpowers/specs/2026-07-24-file-organization-design.md`
- `docs/superpowers/specs/2026-07-24-vps-backup-dr-plan.md`
- `docs/backlog/compliance-ley-1581.md`
- `docs/sessions/HANDOFF.md`
- `docs/sessions/CURRENT.md`

### Qué quedó pendiente
- Implementar file organization (mover archivos a archive/)
- Implementar backup automático en VPS
- Decidir estrategia multi-agente
- Bugs anteriores siguen abiertos (B1 Fase 2, branding, etc.)

## 2026-07-25 — Implementación file organization + backup VPS

### Qué se hizo
- File organization Fase 1: creado `docs/archive/` (20 archivos copiados sin borrar originales), `docs/INDEX.md`, `.claude/rules/file-ownership.md`
- Backup VPS: script `infrastructure/scripts/backup-meyer.sh` creado y desplegado en `/usr/local/bin/`
- Script probado manualmente en VPS: PG dump (51K), n8n tar.gz (18M), .env backup — todo verificado
- Cron diario configurado: `0 3 * * * /usr/local/bin/backup-meyer.sh`
- Cron viejo `backup-n8n.sh` comentado (no borrado), crontab respaldado
- `docs/RUNBOOK.md` actualizado con sección de backup automático
- Validación post-deploy: 11 puntos (originales intactos, archivos coincide, dump legible, sin secrets expuestos)

### Qué quedó pendiente
- Offsite backup: rclone + Backblaze B2 (rclone no instalado en VPS)
- File organization Fase 2: guardas humanfile/.claude nativas
- File organization Fase 3: borrar originales tras 1 semana + backup
- Bugs: B1 post-deploy (horario profesional), servicios no reflejados, quitar branding Meyer
- Estrategia multi-agente (1 sesión vs local+cloud)

### Regla nueva (si aplica)
- Antes de instalar scripts en VPS: verificar siempre paths reales de .env, contenedores Docker existentes, y crons existentes para evitar duplicación
- Nunca borrar scripts/crons viejos al reemplazar — comentar/deshabilitar + respaldar crontab primero

### Archivos creados/modificados
- `docs/archive/` (nuevo — 20 archivos copiados)
- `docs/INDEX.md` (nuevo)
- `.claude/rules/file-ownership.md` (nuevo)
- `infrastructure/scripts/backup-meyer.sh` (nuevo)
- `docs/RUNBOOK.md` (actualizado)
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (actualizado)
- `docs/harness/MEMORY.md` (actualizado — este entry)

## 2026-07-25 — Diseño arquitectura 20-50 clientes + spec completo

### Qué se hizo
- Diseñada arquitectura completa para escalar de 2 a 20-50 clientes
- Investigación técnica: n8n queue mode, Redis config crítica (noeviction, AOF), overhead sub-workflows (~300ms + stall validación para workflows grandes), Evolution API RAM por instancia (~150-200 MB), bug reportado de memory leak en Evolution API (issue #1419)
- Investigación competidores: Achiya (50+ clients, mismo stack, queue mode, gateway pattern)
- Decisiones de arquitectura tomadas:
  - WhatsApp: Evolution API (hoy) → Meta BSP (futuro)
  - Abstraction layer: Dashboard API /api/whatsapp/* para que n8n no dependa del provider
  - Single VPS: Hetzner AX102 (32 GB, ~€40/mes) para n8n + Redis + PostgreSQL + Dashboard
  - Evolution API puede ir en mismo VPS o separado según crezca
  - n8n queue mode + Redis + 2-3 workers
  - Gateway pattern para multi-cliente
  - Prompts fuera de n8n: YAML versionados + API endpoint
  - Sub-workflows <20 nodos (crítico para evitar stall de validación en queue mode)
- Verificada infra actual del VPS: 2 vCPU, 3.7 GB RAM, 38 GB SSD — NO escala a 20 clientes
- Creado spec completo: 12 secciones, 5 fases de migración independientes

### Archivos creados/modificados
- `docs/superpowers/specs/2026-07-25-escalabilidad-20-50-clientes.md` (nuevo — spec completo)
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (actualizado — este entry)

### Qué quedó pendiente
- Ejecutar Fase 1: Redis + queue mode
- Ejecutar Fase 2: WhatsApp abstraction layer (dashboard API routes)
- Ejecutar Fase 3: Gateway + sub-workflows
- Ejecutar Fase 4: Prompts fuera de n8n
- Ejecutar Fase 5: Onboarding + monitoreo
- Bugs anteriores siguen abiertos

### Reglas nuevas
- Specs de arquitectura deben tratar diseño como preliminar hasta que el siguiente agente verifique cada afirmación técnica contra docs oficiales
- Para 20-50 clientes: Redis maxmemory-policy = noeviction (no allkeys-lru), AOF persistence obligatorio

## 2026-07-25 — Post-Fase 1: actualización de documentación

### Qué se hizo
- Actualizados todos los documentos que referenciaban SQLite como estado actual:
  - `docs/RUNBOOK.md`: backup n8n ahora apunta a PostgreSQL (pg_dump), no SQLite
  - `docs/ARCHITECTURE.md`: ya no dice "n8n SQLite"
  - `docs/AUDITORIA_INGENIERO.md`: SQLite single-process y backups marcados como **RESUELTO**
  - `.env.example`: agregados N8N_ENCRYPTION_KEY, PG_HOST/PORT/DB/USER/PASSWORD
  - `docs/superpowers/specs/2026-07-24-vps-backup-dr-plan.md`: backup script actualizado (n8n DB vía pg_dump compartido, no tar.gz separado)
- Archivos históricos (SPRINTS.md, KEY_LEARNINGS.md, specs viejos) mantienen referencias a SQLite — son registros históricos, no documentación activa

### Archivos modificados
- `docs/RUNBOOK.md`
- `docs/ARCHITECTURE.md`
- `docs/AUDITORIA_INGENIERO.md`
- `.env.example`
- `docs/superpowers/specs/2026-07-24-vps-backup-dr-plan.md`
- `docs/sessions/HANDOFF.md`
- `docs/harness/MEMORY.md`

### Qué quedó pendiente
- Fase 2: PgBouncer
- Fase 3-6 del spec de escalabilidad
- Offsite backup (rclone + Backblaze B2)
- Bugs: B1 post-deploy, servicios no reflejados, branding Meyer

---

## 2026-07-25 — Fase 1 escalabilidad: Redis + queue mode + migración PostgreSQL

### Qué se hizo
- Migración n8n de SQLite → PostgreSQL exitosa (7 workflows, 11 credenciales)
- Queue mode activado con Redis + 1 worker (concurrency=5)
- 5 workflows activos (WhatsApp Bot 42 nodos, Recordatorios 24h/2h, Inactividad, No-Shows)
- Evolution API webhook reconfigurado a nuevo path `whatsapp-bot`
- Verificación post-migración 10/10 checks:
  - Containers: 10/10 UP
  - PostgreSQL: 62 tablas n8n
  - Queue: Redis PONG, worker procesando jobs
  - 5/5 workflows activos, webhook registrado
  - 11/11 credenciales importadas
  - Evolution: connectionStatus open
  - Webhook: HTTP 200 en 0.06s
  - 162 citas intactas en meyer_db
  - Recursos: Mem 1.5/3.7 GB (40%), Disk 19/38 GB (50%), Load 0.36
  - 7/7 ejecuciones success post-migración

### Archivos modificados
- `docker-compose.yml` (local — Redis + worker + queue mode)
- `/root/n8n/docker-compose.yml` (VPS — actualizado con PostgreSQL, Redis, worker)
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (actualizado — este entry)
- `docs/sessions/CURRENT.md` (reemplazado)

### Qué quedó pendiente
- Fase 2: PgBouncer (reducir conexiones DB, liberar memoria)
- Fase 3: WhatsApp abstraction layer
- Fase 4: Gateway + sub-workflows
- Fase 5: Prompts fuera de n8n
- Fase 6: Onboarding + monitoreo
- Offsite backup (rclone + Backblaze B2)
- Bugs: B1 post-deploy, servicios no reflejados, branding Meyer

### Regla nueva
- Al migrar n8n entre DBs: exportar workflows + credentials a archivos separando stderr (2>/dev/null), verificar JSON válido antes de importar, preservar N8N_ENCRYPTION_KEY
- Para activar workflows en n8n v2: usar API endpoint POST /rest/workflows/:id/activate con versionId, no DB directa (no registra webhooks)

## 2026-07-25 — Offsite backup: rclone + Backblaze B2

### Qué se hizo
- Investigación de precios y alternativas: B2 $6/TB/mes (10GB gratis) vs Wasabi, R2, Rollin Host
- rclone v1.60.1 instalado en VPS
- Cuenta Backblaze B2 creada, bucket `meyer-bot-backups`, app key scoped
- rclone configurado no-interactivo con `hard_delete = false`
- Backup completo probado (PG dump + n8n tar.gz + .env) → sync a B2 verificado
- 12 archivos (~53MB) en B2, costo: **$0/mes**
- RUNBOOK.md actualizado

### Qué quedó pendiente
- Bugs post-deploy: B1 (horario profesional sin editor), servicios no reflejados, branding Meyer
- Fase 2-6 del spec de escalabilidad

### Regla nueva
- Verificar backups en B2 al menos 1x/semana

### Archivos modificados
- `docs/RUNBOOK.md`
- `docs/sessions/HANDOFF.md`
- `docs/harness/MEMORY.md`

## 2026-07-25 — Refinamiento diseño Mi Horario + Configuración

### Qué se hizo
- Investigación de benchmarking contra sistemas reales (Setora, Ensar, Acuity, BellaBooking, Mangomint, shadcn Leave Tracker, HR dashboards) para validar/corregir el plan original
- Se identificaron 5 gaps del plan original (responsive, navegación meses, summary cards, owner bloqueos por profesional, config con schedules)
- Discusión y refinamiento del diseño de `/dashboard/mi-horario` (grid owner, horario profesional, calendario bloqueos, bottom sheet) y `/dashboard/configuracion` (solo servicios CRUD, sin horarios)
- Se documentaron las CONCLUSIONES REFINADAS que cambian el spec anterior (2026-07-22):
  - Owner/admin: grid filas=profesional, columnas=días (no lista plana)
  - Bottom Sheet en mobile (no modal centrado)
  - Calendario con navegación next/prev
  - Owner puede agregar bloqueos desde el grid para cualquier profesional
  - Summary cards arriba del grid
  - Conflict warnings al crear bloqueo si hay turnos
  - Bulk "Cerrar día" para todos los profesionales
  - Configuración simplificado: solo Servicios + info del negocio
  - Servicios: Data Table + Sheet drawer + Duración como campo nuevo

### Archivos creados
- `docs/superpowers/specs/2026-07-25-dashboard-mi-horario-config-design.md` — spec con diseño refinado

### Archivos modificados
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)
- `docs/sessions/HANDOFF.md` (actualizado)

### Regla nueva
- Documentar cada conversación de diseño APENAS se llega a una conclusión, no al final. Si el agente y el usuario discuten un diseño por más de 5 intercambios y llegan a una conclusión, escribir el spec en ese momento.

### Qué quedó pendiente
- Implementar spec completo: mi-horario page, grid owner, bottom sheet bloqueos, refactor configuración, sidebar

## 2026-07-25 — Implementación Mi Horario + Configuración

### Qué se hizo
- Implementación completa del spec de mi-horario + configuración (8 archivos creados, 3 modificados)
- Sidebar: "Mi horario" (Clock) agregado para todos los roles entre Métricas y Clientes
- `/dashboard/mi-horario` page con 6 nuevos componentes:
  - `mi-horario-client.tsx` — orquestador que switchea vista profesional vs owner/admin
  - `horario-recurrente.tsx` — editor semanal con toggle días + select horas
  - `calendario-bloqueos.tsx` — calendario mensual navegable con colores + lista bloqueos + delete
  - `bottom-sheet-bloqueo.tsx` — bottom sheet crear bloqueo con conflict warnings
  - `summary-cards.tsx` — 3 cards resumen (próximos, activos, profesionales)
  - `grid-profesionales.tsx` — grid owner/admin con drawer por prof + menú inline en celdas
- Refactor `/dashboard/configuracion`: eliminados HorarioClient + ProfessionalScheduleList
- Servicios: Data Table + Sheet drawer con duración (reemplaza textarea de servicios-client.tsx)
- 3 nuevas server actions: `getMiHorarioData`, `checkConflictosBloqueo`, `updateServices`
- Build verificado: 26 rutas, 0 errores TS, 0 errores de compilación

### Regla nueva
- Al crear server actions con múltiples return paths, usar `success: true/false` como discriminante (no checkear `'error' in result`) para que TypeScript nille correctamente

### Qué quedó pendiente
- Desplegar a VPS y probar funcionalidad
- Bugs: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion), servicios no reflejados, branding Meyer
- Fase 2-6 del spec de escalabilidad

### Archivos creados
- `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx`
- `dashboard/components/horario/mi-horario-client.tsx`
- `dashboard/components/horario/horario-recurrente.tsx`
- `dashboard/components/horario/calendario-bloqueos.tsx`
- `dashboard/components/horario/bottom-sheet-bloqueo.tsx`
- `dashboard/components/horario/summary-cards.tsx`
- `dashboard/components/horario/grid-profesionales.tsx`
- `dashboard/components/configuracion/servicios-table.tsx`

### Archivos modificados
- `dashboard/components/sidebar.tsx` — agregado "Mi horario" con Clock
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — solo servicios
- `dashboard/lib/actions.ts` — 3 nuevas server actions
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)

## 2026-07-25 — Deploy + UX feedback + Research

### Qué se hizo
- Code review + fixes: P1 (duration data loss en parseServices/updateServices), P2 (drawer empty, no refresh, preselectFecha), P3 (unused imports)
- Deploy a VPS: main → git push → VPS pull/build/restart. Build: 0 TS errors, 26 routes
- Post-deploy UX feedback recibido del usuario: 6 problemas en mi-horario (info dispersa, redundancia drawer/calendario, +Agregar bloqueo roto, no responsive, doble camino cerrar día/bloquear, días sin resumen visual)
- Web research: patrones UX de Calendly, Acuity, Square, Interlinked, shadcn Schedule
- Investigación UX documentada en `docs/ux/mi-horario-ux-redesign-research.md`
- RESEARCH.md actualizado con sección "Scheduling / Booking UX — Patrones de diseño"
- HANDOFF.md + CURRENT.md actualizados

### Qué quedó pendiente
- **P1 (prioridad):** Rediseño calendar-centric de mi-horario
- **P2:** Sync servicios vs horario (updateServices, getAvailableSlots, createAppointment vs exceptions)
- **P3:** Responsive (375px, 768px, 1440px)
- **P4:** Bug "+ Agregar bloqueo" (SheetTrigger)
- **P5:** Investigación adicional
- Bugs backlog: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion ignora exceptions)

### Archivos modificados
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)
- `docs/reference/RESEARCH.md` (sección UX agregada)
- `docs/ux/mi-horario-ux-redesign-research.md` (nuevo)

## 2026-07-25 — n8n audit + VPS diagnóstico + fix `==` Respuesta Normal

### Qué se hizo
- Investigación de buenas prácticas n8n producción: queue mode, sub-workflows, error triggers, gateway multi-tenant, credential management
- Análisis completo de archivos workflow en `/workflows` (13 archivos identificados)
- Fix `==` en Respuesta Normal (bodyParameter `number` — tenía `=={{ }}` en vez de `={{ }}`) — aplicado en `WhatsApp Bot - Genérico.json` y `WhatsApp Bot - Genérico IMPORTABLE.json`
- Confirmado que `Content-Type ` trailing space NO existe en JSONs locales (ya corregido)
- Confirmado que Evolution API key ya usa `$env.EVOLUTION_API_KEY` en todos los nodos HTTP (no hardcodeada)
- Conexión SSH al VPS (178.104.27.180): todos los contenedores activos (n8n queue mode + worker, PostgreSQL, Redis, Evolution API, dashboard PM2, nginx SSL)
- Encontrado: Evolution API key actual en VPS = misma del leak en git history (pendiente rotación)
- Identificadas 13 queries SQL en el workflow n8n, todas candidatas a reemplazo por HTTP calls
- Leídos/analizados: BUG_BACKLOG.md, HANDOFF.md, MEMORY.md, ARCHITECTURE.md, KEY_LEARNINGS.md, SPRINTS.md, CURRENT.md, CONTEXT_UPDATED.md, SECURITY_AUDIT.md, ARCHITECTURE_FUTURE.md, prompt-changelog.md, README.md, CLAUDE.md

### Qué quedó pendiente
- Rotar Evolution API key en VPS (generar nueva, actualizar .env, reiniciar containers)
- Importar workflow fixeado en n8n UI (subir JSON)
- B1 Fase 2 bug post-deploy (profesional no ve editor horario)
- Reemplazar SQL queries → HTTP calls (3 prioritarias: availability/check, appointments GET, appointments POST)
- Inconsistencia colisión dashboard vs bot (match exacto vs rango)
- Servicios nuevos no reflejados en bot (orden variables system prompt)

### Archivos modificados
- `workflows/WhatsApp Bot - Genérico.json` (fix `==`)
- `workflows/WhatsApp Bot - Genérico IMPORTABLE.json` (fix `==`)
- `docs/harness/MEMORY.md` (este entry)
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)

## 2026-07-25 — Dashboard refinements: responsive, SQL, edit bloqueo, deploy

### Qué se hizo
- **BottomNav landscape fix**: Cambiados breakpoints de `sm` (640px) a `lg` (1024px) en BottomNav (topbar.tsx), Sidebar (sidebar.tsx), y layout margins (layout.tsx). iPhone landscape (812-932px) ahora muestra BottomNav correctamente.
- **Dropdown en todos los dispositivos**: Reemplazadas pills + dropdown con un solo `<select>` nativo en todos los breakpoints (mi-horario-client.tsx).
- **SQL fix getMiHorarioData**: Agregado `INNER JOIN users u ON u.professional_id = p.id AND u.role = 'profesional'` para filtrar filas huérfanas de admin/owner en la tabla professionals (actions.ts:1878-1881).
- **Editar bloqueo desde tarjeta**: Click en tarjeta (vista lista o grid) abre DayDetailSheet con campos pre-poblados. Agregado estado `editBloqueo` en mi-horario-client.tsx. Botón de eliminar tiene `stopPropagation()`.
- **updateBloqueo server action**: Nueva server action con audit (actions.ts:1116-1142). Usa UPDATE directo en lugar de DELETE+INSERT.
- **Audit types**: Agregado `update_bloqueo` a `AuditAccion` con label y descripción (audit-types.ts).
- **Copy mejorado**: Subtítulos de page.tsx actualizados.
- **Sin comentarios**: Se agregó regla de no comentarios en DayDetailSheet (edit mode).
- **Build + Deploy**: Todos los cambios construidos y desplegados a producción via rsync → npm run build → pm2 reload.

### Investigación sync (sin cambios de código)
- Semana view NO muestra visualmente días bloqueados, pero `getAvailableSlots` y `createAppointment` AMBOS respetan `schedule_exceptions` con filtro `professional_id`.
- n8n lee misma tabla con mismo filtro — no hay gap de sync.

### Qué quedó pendiente
- Multi-day blocking: discutido pero no implementado (usuario no ha decidido approach)
- Bugs backlog: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion ignora exceptions), servicios nuevos no reflejados en bot
- Rotar Evolution API key leakada (P3 de sesión anterior)

### Regla nueva (si aplica)
- BottomNav/Sidebar breakpoints para landscape mobile: usar `lg` (1024px) como mínimo, no `sm` (640px), porque iPhone landscape mide 812-932px de ancho.
- Al agregar `onClick` a una tarjeta que también tiene botón de delete: aplicar `stopPropagation()` en el botón.

### Archivos modificados
- `dashboard/components/topbar.tsx`
- `dashboard/components/sidebar.tsx`
- `dashboard/app/(dashboard)/layout.tsx`
- `dashboard/components/horario/mi-horario-client.tsx`
- `dashboard/components/horario/day-detail-sheet.tsx`
- `dashboard/lib/actions.ts`
- `dashboard/lib/audit-types.ts`
- `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx`
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (este entry)
- `docs/sessions/CURRENT.md` (reemplazado)

## 2026-07-25 — Validación spec + Item 1 implementación identificación rediseñada

### Qué se hizo
- Cargado HANDOFF.md, MEMORY.md, RULES.md y spec `03-diseno-final-bloqueos-multiprofesional.md`
- Validación completa del spec contra código local (schema DB 10 tablas, componentes, server actions, n8n workflows)
- Validación en VPS via SSH (`root@178.104.27.180`): confirmadas 10 tablas, 9 profesionales activos, `professional_schedule` (2 overrides), `schedule_exceptions` (bloqueos mixtos), Evolution API `peluqueria-beta` instancia OPEN
- **Item 1 del spec implementado — Identificación rediseñada:**
  - `dashboard/lib/utils.ts` — helpers `getAvatarColor(id)` (12 colores determinísticos) y `getInitials(name)`
  - `dashboard/components/horario/professional-avatar.tsx` — componente avatar con iniciales + color + tamaños sm/md/lg + showName opcional
  - `mi-horario-client.tsx` refactorizado:
    - Nuevo `ProfessionalSelector` con avatar+nombre + búsqueda (<8 profs oculta búsqueda)
    - Nuevas tarjetas `BloqueoCard` (lista) y `BloqueoGridCard` (grid) con avatar
    - Agrupación de bloqueos por profesional con secciones colapsables + contador
  - `day-detail-sheet.tsx` actualizado — muestra `ProfessionalAvatar` en items de bloqueo
- **Item 2 verificado**: permisos por rol ya implementados correctamente en server actions y UI
- **Build verificado**: `npm run build` → 26 rutas, 0 errores
- Documentos de handoff actualizados para próxima sesión

### Archivos creados
- `dashboard/lib/utils.ts`
- `dashboard/components/horario/professional-avatar.tsx`

### Archivos modificados
- `dashboard/components/horario/mi-horario-client.tsx`
- `dashboard/components/horario/day-detail-sheet.tsx`
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)

### Qué quedó pendiente
- Item 3 finalizar: toggle "Usar horario propio" en `HorarioRecurrente` + badges "Personalizado" por día
- Item 4: Flujo de advertencia + cancelación + notificación al chocar con citas
- Item 5: Query de selección de profesional en bot sin caché
- Item 6: Separar "desactivar profesional" de "gestionar citas futuras"
- Item 7: Función server-side `notificarCancelacionPorNegocio`
- Bugs backlog: B1, B2, servicios no reflejados en bot
- Rotar Evolution API key leakada

### Regla nueva
- Al crear componentes de avatar: colores determinísticos vía hash del id (getAvatarColor), no aleatorios. Paleta de 12 colores visibles sobre fondo oscuro.

## 2026-07-25 — Item 3 spec: toggle horario propio + badges personalizados

### Qué se hizo
- Item 3 del spec implementado completo en `HorarioRecurrente`:
  - Nuevo prop `hasCustomSchedule` para detectar si el profesional tiene override o hereda
  - Toggle "Usar horario propio": OFF = read-only (muestra horario heredado, selects deshabilitados), ON = editable (copia business schedule como punto de partida)
  - Al desactivar: confirmación si hay cambios → llama `deleteProfessionalSchedule` y restaura herencia
  - Badge "Personalizado" por día individual que difiere del horario del negocio
  - Botón Guardar solo visible en modo personalizado
- `mi-horario-client.tsx` actualizado para pasar `hasCustomSchedule` al componente
- Build verificado: 26 rutas, 0 errores
- Sin cambios DB — `professional_schedule` ya existía con estructura correcta

### Qué quedó pendiente
- Item 4: Flujo advertencia + cancelación + notificación al chocar con citas
- Item 5: Query de selección de profesional en bot sin caché
- Item 6: Separar "desactivar profesional" de "gestionar citas futuras"
- Item 7: Función server-side `notificarCancelacionPorNegocio`
- Bugs backlog: B1, B2, servicios no reflejados en bot
- Rotar Evolution API key leakada

### Archivos modificados
- `dashboard/components/horario/horario-recurrente.tsx` (reescrito)
- `dashboard/components/horario/mi-horario-client.tsx`
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)

## 2026-07-26 — Items 4 y 7 del spec: flujo conflicto + cancelación + notificación WhatsApp

### Qué se hizo
- Item 4 del spec implementado: flujo de advertencia + cancelación + notificación al chocar con citas existentes
- Item 7 del spec implementado (como prerequisito): `notificarCancelacionPorNegocio` en `dashboard/lib/whatsapp.ts`
- `checkConflictosBloqueo` mejorado: ahora retorna `CitaConflicto[]` con detalles (id, hora, servicio, nombre, numero, professional_name)
- Nueva server action `cancelAppointmentsAndNotify`: marca Cancelada + audita + notifica WhatsApp a cada cliente + notifica al owner
- `DayDetailSheet` actualizado: reemplazado el viejo `conflictCount`/`forceOverride` por modal con lista de citas afectadas y botones "Cancelar acción" / "Confirmar y cancelar citas"
- `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` agregados a `dashboard/.env.local` y `dashboard/.env.example`
- Build verificado: 26 rutas, 0 errores

### Archivos creados
- `dashboard/lib/whatsapp.ts` — notificarCancelacionPorNegocio

### Archivos modificados
- `dashboard/lib/actions.ts` — checkConflictosBloqueo mejorado + cancelAppointmentsAndNotify
- `dashboard/components/horario/day-detail-sheet.tsx` — modal de conflictos
- `dashboard/.env.local` — EVOLUTION_API_URL, EVOLUTION_API_KEY
- `dashboard/.env.example` — EVOLUTION_API_URL, EVOLUTION_API_KEY (ejemplo)
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (este entry)

### Qué quedó pendiente
- Item 5: Query de selección de profesional en bot sin caché
- Item 6: Separar "desactivar profesional" de "gestionar citas futuras"
- Bugs backlog: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion ignora exceptions), servicios no reflejados en bot
- Rotar Evolution API key leakada

## 2026-07-26 — Items 5 y 6 spec bloqueos: query bot sin caché + separar desactivar de citas futuras

### Qué se hizo
- **Item 5 verificado**: n8n "Lookup Negocio" ya consulta `professionals` con `p.active = true` en cada webhook. Sin caché ni hardcode. No requirió cambios.
- **Item 6 implementado**:
  - Nueva server action `getFutureAppointmentsForProfessional` en `dashboard/lib/actions.ts` — retorna citas Pendiente/Confirmada >= hoy para un profesional
  - `dashboard/components/equipo/equipo-client.tsx` actualizado: al desactivar un profesional, si tiene citas futuras aparece modal con opción "Cancelar citas y notificar" (reusa `cancelAppointmentsAndNotify`) o "Dejarlas como están"
  - `toggleMiembroActivo` sigue siendo soft-toggle — no toca citas existentes
- **Spec completo de bloqueos multi-profesional finalizado** (7/7 items de sección 11)
- **Build verificado**: 26 rutas, 0 errores TS
- **Deploy a VPS**: git push → pull → build → pm2 reload

### Archivos modificados
- `dashboard/lib/actions.ts` — nueva `getFutureAppointmentsForProfessional`
- `dashboard/components/equipo/equipo-client.tsx` — modal post-desactivación
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (este entry)

### Qué quedó pendiente
- B1: `createAppointment` no valida `schedule_exceptions` — puede agendar en bloqueos
- B2: `fetchOcupacion` ignora `schedule_exceptions` — ocupación incorrecta
- Servicios nuevos no reflejados en bot (orden system prompt n8n)
- Rotar Evolution API key leakada
- Fase 2-6 spec escalabilidad: PgBouncer, WhatsApp abstraction layer, gateway, prompts fuera de n8n, onboarding

## Template para nueva sesión
```
## [Fecha] — [Objetivo]

### Qué se hizo
- 

### Qué quedó pendiente
- 

### Regla nueva (si aplica)
- 

### Archivos modificados
- 
```
