# MEMORY.md — Memoria entre sesiones

> Memoria acumulada entre sesiones. **Nunca se reemplaza entero** — solo se editan secciones.
> Se actualiza al final de cada sesión.
>
> Relación con CURRENT_SESSION_CONTEXT.md:
> - `docs/CURRENT_SESSION_CONTEXT.md` = contexto detallado de lo que se está haciendo AHORA. Se sobrescribe completo al empezar una nueva sesión.
> - `docs/harness/MEMORY.md` = resumen acumulado de lo que ha pasado. Se edita (no se reemplaza) al final de cada sesión.

## Ultima sesion
- **Fecha**: 2026-08-01
- **Objetivo**: B18 (fechas >7d) + F3.4 (migracion AI Agent a microservicio)
- **Estado**: B18 completado. F3.4 incrementos 1-2 completados, incremento 3 pendiente.

### B18 — Fechas >7 dias
- Root cause: `forceMostrarSlots` nunca existio en `restored.json`. El v6 intento en n8n (versionId 2e1b896a) tenia infraestructura pero deteccion no activaba.
- Fix: `extraerFechaLejana()` en Procesar Mensaje + short-circuit en AI Agent (sin LLM). Redirige con mensaje amable a ventana 7d.
- Archivos modificados: `restored.json` (3 edits en PM + AI Agent + Formatear Disponibilidad). INICIO.md, 05-BUGS.md, 01-BOT.md actualizados.

### F3.4 — Migracion AI Agent a bot-core
- `packages/bot-core/src/` (40 tests, 8 archivos TS): types, constants, date-parser, normalizer, validation, gap-message, prompt-builder (22 secciones, ~300 lineas), llm-chain (circuit breaker + httpRequest wrapper).
- `apps/bot-service/src/index.ts`: Express en puerto 3003 con POST /api/chat + GET /health + graceful shutdown. Desplegado en prod via Docker (red meyer_network). Conexion n8n→bot-service verificada. Gemini responde en produccion.
- 0 dependencias runtime en bot-core (fetch nativo Node 22). Solo `express` en bot-service.
- 11 fallos identificados y mitigados (G1-G11 en F3-MIGRACION.md). Spec completo en F3-MIGRACION.md (14 archivos, Docker, verificacion, 18 campos HTTP Request).
- Pendiente: Incremento 3 (cambiar Code node "AI Agent" por HTTP Request en n8n UI, ~10 min, pasos en F3-MIGRACION.md). Agregar `timezone` al return JSON de Procesar Mensaje (G3, 1 linea).

### F3.6 — Git Source Control
- Descartado: no disponible en n8n community 2.10.3. Solo Enterprise/Cloud.

### Servidor (178.104.27.180)
- ARM64 (aarch64). n8n v2.10.3 community en /root/n8n/docker-compose.yml (red meyer_network).
- bot-service desplegado como imagen docker `bot-service:latest` en puerto 3003 (3002 ocupado por uptime-kuma).
- n8n alcanza bot-service via `http://bot-service:3003` (misma red Docker).
- .env en /root/n8n/.env. LLM API keys configuradas.
- 40/40 tests pasan en el servidor.

### Dashboard bugs (B1, N2, N11, N24)
- B1: Boton "Configurar mi horario semanal" visible para profesionales (mi-horario-client.tsx). Antes: link 11px oculto. Ahora: boton prominente full-width.
- N2: sync-new y sync-reagend obtienen el nombre del profesional real de la DB via LEFT JOIN, no del body del webhook.
- N24: sync-new y sync-reagend ahora validan que la cita existe en DB antes de insertar en audit_log (404 si no).
- N11: Tabla webhook_dead_letter + los 3 webhooks guardan payloads fallidos. Migracion 024 ejecutada en VPS.
- Dashboard build y PM2 restart en VPS.

### llm-chain mejoras
- Retry inteligente: cada provider tiene 1 reintento automatico tras 2 segundos.
- Orden: Cerebras primero (el mas rapido), luego Gemini, Groq, DeepSeek, OpenRouter.
- Desplegado en prod (bot-service redeployed).

### Fix @lid — Dispositivos vinculados
- Cuando Evolution API recibe mensajes con `@lid` (multi-device), el Respuesta Normal ahora responde al JID completo en vez de extraer solo el numero.
- Documentado en F3-MIGRACION.md, 01-BOT.md.

### N10/N16 — Rate limit thread-safe + memory leak
- Migration 025: tabla `rate_limits` (UNIQUE business_id + numero).
- Nuevo nodo PostgreSQL "Rate Limit Check" entre ¿Negocio Existe? y Procesar Mensaje con UPSERT atomico.
- DELETE automatico de ventanas expiradas (>1 hora) en la misma query del nodo.
- Procesar Mensaje: `$getWorkflowStaticData` reemplazado por `$('Rate Limit Check').first().json.request_count`.<｜end▁of▁thinking｜>

### Servidor
- Evolution API restaurada a v2.3.7 limpia (se intento parchear sin exito).
- Conectividad Evolution API ↔ n8n arreglada via red Docker compartida + EVOLUTION_API_URL cambiado a `host.docker.internal:8080`.

### Archivos modificados/creados
- `workflows/WhatsApp Bot - Generico restored.json` — B18 fix (3 edits) + G3 timezone
- `packages/bot-core/src/*.ts` — 8 archivos nuevos + 7 tests
- `apps/bot-service/src/index.ts` — servidor Express + safeDateInTimezone
- `apps/bot-service/Dockerfile` — node:22-alpine, non-root
- `apps/bot-service/tsconfig.json` — config TS
- `dashboard/components/horario/mi-horario-client.tsx` — B1 boton visible
- `dashboard/app/api/webhooks/sync-new/route.ts` — N2 + N24 + N11 fixes
- `dashboard/app/api/webhooks/sync-cancel/route.ts` — N11 fix
- `dashboard/app/api/webhooks/sync-reagend/route.ts` — N2 + N24 + N11 fixes
- `database/migrations/024_webhook_dead_letter.sql` — nueva migracion
- `workflows/docs/F3-MIGRACION.md` — spec completo + fix @lid
- `workflows/docs/INICIO.md` — Estados actualizados
- `workflows/docs/05-BUGS.md` — 5 bugs marcados FIX
- `workflows/docs/01-BOT.md` — llm-chain retry + fix @lid
- `docs/harness/MEMORY.md` — este entry
- `docs/sessions/HANDOFF.md` — actualizado

### Proxima sesion
1. B15: rotar Evolution API key leakada.
2. B16: `==` en bodyParameter de HTTP Request.
3. N4: race condition mensajes concurrentes.
4. N10/N16: rate limit static data.
5. Roadmap fase 2: state machines + function calling.

## Ultima sesion (prev)
- **Fecha**: 2026-07-31
- **Objetivo**: Refactor V2 — COMPLETADO (12/12 módulos, 100%)
- **Estado**: Completados. TS 0 errores, lint clean.

### Módulo 10 (Caja/POS)
- Demo visual para inversionista: layout 60/40, catálogo servicios+productos, carrito con IVA, métodos de pago, success screen
- Sin persistencia de transacciones (requeriría migration 023 + `createTransactionV2`)
- 4 archivos + ruta `/dashboard/caja`

### Verificación
- `tsc --noEmit` → 0 errores, `eslint` → 0 problemas

### Archivos creados
- `features/caja/actionsV2.ts`, `pos-catalogV2.tsx`, `pos-cartV2.tsx`, `pos-layoutV2.tsx`
- `app/(dashboard)/dashboard/caja/page.tsx`

### Archivos modificados
- `docs/refactoring-v2/INDEX.md` — Módulo 10 ✅ Fase 9 (100%)
- `docs/harness/MEMORY.md` (este entry)
- `docs/sessions/HANDOFF.md` (reemplazado)

### Pendientes
- Ejecutar migrations 019-022 en VPS
- `price_at_booking` y `duration_at_booking` (ALTER TABLE appointments)
- `channel` en appointments (canales de reserva)
- Rotar Evolution API key leakada

## Última sesión (prev)
- **Fecha**: 2026-07-31
- **Objetivo**: Refactor V2 Fase 3 — Módulo 6 (Config: Horarios)
- **Estado**: Completado. TS 0 errores, lint clean en archivos V2.

### Qué se hizo
- **Server actions V2** (`features/config-schedule/actionsV2.ts`):
  - `getBusinessScheduleV2()` — wrapper con auth para obtener schedule_text del negocio
  - `saveBusinessScheduleV2()` — wrapper de `updateScheduleText`
  - `getBloqueosV2()` — wrapper de `getBloqueos` con viewAll
  - `createBloqueoV2()` — wrapper de `createBloqueo`
  - `deleteBloqueoV2()` — wrapper de `deleteBloqueo`
  - `updateBloqueoV2()` — wrapper de `updateBloqueo`
  - `getProfessionalsV2()` — lista profesionales activos para filtros
  - `checkBloqueoConflictosV2()` — wrapper de `checkConflictosBloqueo`
  - `cancelAppsAndNotifyV2()` — wrapper de `cancelAppointmentsAndNotify`
  - `getBusinessRawScheduleV2()` — acceso directo al schedule sin formateo
- **2 componentes V2**:
  - `features/config-schedule/components/business-schedule-editorV2.tsx` — editor horario semanal del negocio (toggle per day, selectores hora, save con feedback, skeleton/empty/error states)
  - `features/config-schedule/components/schedule-blocksV2.tsx` — tabla de bloqueos con filtros (search, tipo, profesional), modal crear bloqueo (cierre total/horario especial), delete, skeleton, empty state
- **Montaje en page.tsx**: `BusinessScheduleEditorV2` + `ScheduleBlocksV2` en `/dashboard/configuracion`
- **Verificación**: `tsc --noEmit` → 0 errores. `npm run lint` → 0 warnings en archivos V2 (39 preexisting issues in lib/actions.ts, lib/db.ts)

### Archivos creados
- `dashboard/features/config-schedule/actionsV2.ts`
- `dashboard/features/config-schedule/components/business-schedule-editorV2.tsx`
- `dashboard/features/config-schedule/components/schedule-blocksV2.tsx`

### Archivos modificados
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — Horario del Negocio + Bloqueos montados
- `docs/refactoring-v2/INDEX.md` — Módulo 6 marcado ✅
- `docs/frontend-reference.md` — sección 5.3 actualizada
- `docs/harness/MEMORY.md` (este entry)
- `docs/sessions/HANDOFF.md` (reemplazado)

### Qué quedó pendiente
- Módulos restantes V2: Agenda (7), Clientes (8), Inventario (9), Caja (10), Dashboard Home (11), Equipo Roles (12)
- Probar componentes E2E en navegador
- Ejecutar migration 019 en VPS
- Bugs backlog: servicios no reflejados en bot
- Rotar Evolution API key leakada

## Sesión anterior
- **Fecha**: 2026-07-30 (sesión 1)
- **Objetivo**: Refactor Fase 0: colores hardcodeados → CSS variables `--zf-*` con `@theme inline`
- **Estado**: Completado. Build verificado.
- **Target diseño**: Zero-Friction (pastel, primary #F97316).
- **Hallazgos**: Se refactorizaron 8 componentes + globals.css. Ahora cambiar el tema completo se hace editando 16 variables en globals.css.

## Sesión anterior
- **Fecha**: 2026-07-29
- **Objetivo**: Plan refactor UI V2 completo — 13 plan docs, diseño Zero-Friction, auditoría de código, stitch exports
- **Estado**: Docs completos, commiteados (6c81fb7) y pusheados a GitHub. Handoff listo para otro agente/chat. No se implementó nada aún.
- **Target diseño**: Zero-Friction (pastel, primary #F97316). Confirmado por usuario.
- **Hallazgos**: Dark-only actual, backend gaps (Inventario, Caja, Pagos), server actions reales mapeadas, n8n workflow "WhatsApp Bot - Genérico restored" documentado.

## Sesión anterior
- **Fecha**: 2026-07-28
- **Objetivo**: Backend v2 — servicios normalizados, duración variable, colisión por rango
- **Estado**: Implementado y deployado. Migración DB 018 ejecutada + seed. Dashboard build exitoso, PM2 restart. n8n workflow actualizado pendiente de importar.

## Bugs activos
| # | Bug | Prioridad | Estado |
|---|-----|-----------|--------|
| B1 | createAppointment no valida schedule_exceptions | — | ✅ Resuelto Jul 25 (commit 4847091) |
| B2 | fetchOcupacion ignora schedule_exceptions | — | ✅ Resuelto Jul 25 (commit ad404c3) |
| — | Servicios nuevos no reflejados en bot (orden system prompt) | 🟡 Medio | Pendiente |
| — | Rotar Evolution API key leakada | 🔴 Seguridad | Pendiente |

## Archivos tocados recientemente
- `dashboard/features/agenda/` — 6 archivos V2 (Módulo 7 Agenda completo)
- `dashboard/lib/utils.ts` — +`formatHora()` compartida
- `dashboard/app/(dashboard)/dashboard/semana/page.tsx` — V2
- `docs/refactoring-v2/INDEX.md` — +Patrones V2, Módulo 7 ✅
- `docs/refactoring-v2/02-clientes.md` — reescrito (plan completo)
- `docs/harness/RULES.md` — +reglas canónicas V2
- `docs/frontend-reference.md` — §2 Agenda actualizado, §3 Clientes en progreso
- `docs/harness/MEMORY.md` — consolidado (pre-V2 archivado)

## Próximo paso sugerido
**Módulo 8: Clientes** — plan completo en `docs/refactoring-v2/02-clientes.md`. Ver `docs/refactoring-v2/INDEX.md#patrones-v2` para patrones canónicos.

## Historial pre-V2 (archivado — Jul 24-28, 2026)

> Entradas consolidadas de sesiones pre-refactor V2. Detalle completo en `docs/harness/MEMORY-archive.md`.

| Fecha | Hito | Resultado |
|-------|------|-----------|
| Jul 24 | Investigación gaps + file organization + backup + compliance | `docs/AUDITORIA_INGENIERO.md`, `docs/archive/`, backup VPS |
| Jul 25 | File organization Fase 1 + backup VPS (cron diario) | Script `backup-meyer.sh` en VPS |
| Jul 25 | Diseño escalabilidad 20-50 clientes | Spec 12 secciones, Redis+queue mode+gateway |
| Jul 25 | Post-Fase 1: actualizar docs (SQLite→PostgreSQL) | RUNBOOK.md, ARCHITECTURE.md actualizados |
| Jul 25 | Fase 1 escalabilidad: Redis + queue mode + migración n8n SQLite→PostgreSQL | 7/7 workflows activos, webhook 200 OK |
| Jul 25 | Offsite backup: rclone + Backblaze B2 | 12 archivos (~53MB), costo $0/mes |
| Jul 25 | Refinamiento diseño Mi Horario + Configuración | Spec `03-diseno-final-bloqueos-multiprofesional.md` |
| Jul 25 | Implementación Mi Horario + Configuración | 8 componentes nuevos, 3 server actions, build 0 errores |
| Jul 25 | Deploy + UX feedback + research | 6 problemas UX identificados, `docs/ux/mi-horario-ux-redesign-research.md` |
| Jul 25 | n8n audit + VPS diagnóstico + fix `==` Respuesta Normal | Fix aplicado en JSON workflows |
| Jul 25 | Dashboard refinements: responsive, SQL fix, edit bloqueo, deploy | BottomNav breakpoints lg, `updateBloqueo`, deploy |
| Jul 25 | Validación spec + Item 1 (identificación rediseñada) | `ProfessionalAvatar`, `getAvatarColor`, `getInitials` |
| Jul 25 | Item 3 spec: toggle horario propio + badges personalizados | `HorarioRecurrente` actualizado, build OK |
| Jul 26 | Items 4 y 7 spec: conflicto + cancelación + notificación WhatsApp | `cancelAppointmentsAndNotify`, `lib/whatsapp.ts` |
| Jul 26 | Items 5 y 6 spec: query bot sin caché + separar desactivar | `getFutureAppointmentsForProfessional`, build OK |
| Jul 28 | Backend v2: Servicios + Duración Variable + Colisión por Rango | Migration 018, `services_v2`, `hora_fin`, 169 citas migradas |
| Jul 28 | Auditoría Arquitectónica + Estructura Destino | `01-ARCHITECTURAL_AUDIT.md`, `02-ESTRUCTURA_DESTINO.md` |

## 2026-07-29 — Refactor V2: Plan Docs + Stitch Analysis

## 2026-07-29 — Refactor V2: Plan Docs + Stitch Analysis

### Qué se hizo
- Leídos y analizados docs/frontend-reference.md (1073 líneas), HANDOFF.md, MEMORY.md, RULES.md
- Descargado y extraído stitch_agenda_weekly_calendar_view.zip a stitch_export/
- Analizados 20 diseños HTML de Stitch mapeados a 7 módulos del dashboard
- Identificados 2 sistemas de diseño: Zero-Friction (pastel, #F97316) y Grooming Pro (corporate, #ff6b00)
- Decidido: target = **Zero-Friction** (pastel), paleta `#9d4300` / `#f97316`
- Descubierto: dashboard actual dark theme (#0A0A0A), Stitch diseños light/warm (#fff8f6)
- Descubierto: Stitch usa Material Symbols, proyecto usa lucide-react (icon mapping creado)
- Auditado el código real: `lib/actions.ts` (2138 líneas), `components/` (15 componentes), rutas, tipos
- Descubiertos **backend gaps**: Inventario, Caja/POS, Pagos no tienen server actions
- Descubierta **duplicación WeekView**: components/week-view.tsx + SemanaClient.tsx
- Descubierto: dark theme forzado en layout (`className="dark"`), no hay ThemeProvider
- Escritos **13 plan docs** en docs/refactoring-v2/

### Archivos creados
- `docs/refactoring-v2/INDEX.md` — Master plan con reglas, design system, icon mapping, estructura carpetas
- `docs/refactoring-v2/01-agenda.md` a `12-equipo-roles.md` — 12 plan docs de módulos
- `docs/sessions/HANDOFF.md` — Actualizado con estado y próxima acción

### Qué quedó pendiente
- Implementar Fase 0: Shared Components (page-shellV2, stat-cardV2, empty-stateV2, etc.)
- Implementar módulos en orden de dependencia (ver INDEX.md)
- Crear backend faltante: Inventario, Caja/POS, Pagos (requiere acceso VPS para crear tablas y server actions)

### Regla nueva
- Plan docs antes de implementar: INDEX.md + un doc por módulo. Cada doc debe ser autocontenido para que otro chat/agente lo ejecute sin contexto previo.
- Diseños Stitch y código real pueden divergir en theme (dark vs light). Documentar la diferencia antes de implementar.
- **Antes de escribir V2**: verificar server actions reales en `lib/actions.ts` y `lib/*.ts`. No asumir nombres.
- **Backend gaps**: Si un módulo necesita server actions que no existen, documentar en el plan del módulo con ⚠️ y crear `features/[modulo]/actionsV2.ts`

### Archivos modificados
- `docs/harness/MEMORY.md` (este entry)

## 2026-07-29 — Refactor V2: Fase 0 Shared Components

### Qué se hizo
- Implementados 8 shared components Zero-Friction en `dashboard/components/shared/`:
  - `badgeV2.tsx` — 5 variantes (success/warning/error/info/neutral), pill shape, colores pastel
  - `search-inputV2.tsx` — input con Search icon, focus ring naranja (#f97316/20)
  - `stat-cardV2.tsx` — card métrica con icono, label, value, trend up/down/neutral
  - `empty-stateV2.tsx` — icono circular + title + description + action opcional
  - `modalV2.tsx` — modal centrado vía @base-ui/react, overlay blur, focus trap
  - `drawerV2.tsx` — drawer lateral derecho vía @base-ui/react, max-w-sm
  - `sheetV2.tsx` — bottom sheet mobile-first vía @base-ui/react, 85dvh max
  - `page-shellV2.tsx` — shell página con title + subtitle + actions + children
- Todos los componentes usan colores Zero-Friction hardcodeados (no CSS vars del tema dark)
- Typecheck: 0 errores
- Diseño validado contra stitch_export DESIGN.md (Zero-Friction tokens)

### Archivos creados
- `dashboard/components/shared/badgeV2.tsx`
- `dashboard/components/shared/search-inputV2.tsx`
- `dashboard/components/shared/stat-cardV2.tsx`
- `dashboard/components/shared/empty-stateV2.tsx`
- `dashboard/components/shared/modalV2.tsx`
- `dashboard/components/shared/drawerV2.tsx`
- `dashboard/components/shared/sheetV2.tsx`
- `dashboard/components/shared/page-shellV2.tsx`

### Archivos modificados
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)
- `docs/harness/RULES.md` (nueva regla V2 colors)

---

## 2026-07-30 — Fase 0: colores hardcodeados → CSS variables `--zf-*` + `@theme inline`

### Qué se hizo
- Auditado el estándar de la industria: CSS Custom Properties + Tailwind `@theme inline` (shadcn/ui, GitHub, Adobe, Material UI todos usan este patrón)
- 16 variables `--zf-*` definidas en `:root` de `globals.css` (bg, surface, primary, text, text-secondary, text-muted, border, accent-bg, accent-text, success/warning/error/neutral)
- 16 mapeos `--color-zf-*` en bloque `@theme inline` → permite usar `bg-zf-surface`, `text-zf-text`, etc.
- Refactorizados 8 shared components para usar clases `zf-*` en vez de colores hardcodeados
- Build verificado: 26 rutas, 0 errores

### Archivos modificados
- `dashboard/app/globals.css` — variables + @theme inline
- `dashboard/components/shared/badgeV2.tsx`
- `dashboard/components/shared/search-inputV2.tsx`
- `dashboard/components/shared/stat-cardV2.tsx`
- `dashboard/components/shared/empty-stateV2.tsx`
- `dashboard/components/shared/modalV2.tsx`
- `dashboard/components/shared/drawerV2.tsx`
- `dashboard/components/shared/sheetV2.tsx`
- `dashboard/components/shared/page-shellV2.tsx`
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)
- `docs/harness/RULES.md` (regla actualizada: hardcodeados → CSS vars)

### Qué quedó pendiente
- Empezar Fase 1: Perfil Negocio, Servicios, Métodos Pago
- Esperar decisión del usuario sobre por dónde empezar

---

## 2026-07-30 — Fase 1: Config V2 — Perfil Negocio, Servicios, Métodos Pago

### Qué se hizo
- **Migration 019**: 9 columnas nuevas en `businesses` (address, phone, email, description, tax_id, currency, allow_flexible_staff_hours, min_booking_notice_hours, logo_url) + tabla `payment_methods` (id, business_id, name, tipo, instructions, is_active) + seed data (5 métodos por negocio). **Pendiente ejecutar en VPS.**
- **Server actions**:
  - `features/config-business/actionsV2.ts`: `getBusinessProfile()`, `updateBusinessProfile()` con validación, auth check y auditoría
  - `features/config-payments/actionsV2.ts`: `getPaymentMethods()`, `togglePaymentMethod()` con role check
  - `features/config-services/actionsV2.ts`: wrapper `getServicesV2()` con auth (P1 security fix — `getAllServices` de `lib/services.ts` no tenía auth)
  - Re-export de `createService`, `updateService`, `toggleServiceActive`, `deleteService` desde `lib/services.ts`
- **3 V2 components (feature-first)**:
  - `features/config-business/components/business-profile-formV2.tsx` — formulario completo con skeleton, error/success states, campos de negocio + reglas operativas (flexible hours toggle, min booking notice, currency selector)
  - `features/config-services/components/services-listV2.tsx` — tabla con CRUD completo + ModalV2 para crear/editar, skeleton, empty state. Validación client-side alineada a server (15-480 min)
  - `features/config-payments/components/payment-methods-listV2.tsx` — grid de cards con iconos por tipo (cash/card/transfer/digital), color badges, toggle switches, skeleton, empty state
- **Config page actualizada**: `page.tsx` renderiza las 3 secciones V2 con PageShellV2, icons por sección, role check owner/admin
- **Audit types**: `update_business_profile` agregado a `AuditAccion` + label en `audit-types.ts`
- **Code review findings corregidos**:
  - P1: `getAllServices` envuelto en `getServicesV2` con auth + businessId ownership check
  - P1: Duración mínima alineada (client/server = 15 min)
  - P1: `.catch()` añadido a useEffect fetches en los 3 componentes
  - P2: `handleToggle` ahora captura errores; `handleDelete` limpia error state
- **Build verificado**: 27 rutas, 0 errores TS, 0 errores compilación

### Archivos creados
- `database/migrations/019_business_profile_payment_methods.sql`
- `dashboard/features/config-business/actionsV2.ts`
- `dashboard/features/config-business/components/business-profile-formV2.tsx`
- `dashboard/features/config-payments/actionsV2.ts`
- `dashboard/features/config-payments/components/payment-methods-listV2.tsx`
- `dashboard/features/config-services/actionsV2.ts`
- `dashboard/features/config-services/components/services-listV2.tsx`

### Archivos modificados
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — 3 secciones V2
- `dashboard/lib/audit-types.ts` — update_business_profile
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/sessions/CURRENT.md` (reemplazado)
- `docs/harness/MEMORY.md` (este entry)

### Qué quedó pendiente
- Ejecutar migration 019 en VPS
- Próximas fases V2: dashboard módulos restantes (ver docs/refactoring-v2/INDEX.md)
- Bugs backlog: servicios no reflejados en bot
- Rotar Evolution API key leakada

## 2026-07-30 — Fase 2: Config V2 — Módulo 4 (Equipo) y Módulo 5 (Auditoría)

### Qué se hizo
- **Server actions V2 para Módulo 4** (`features/config-team/actionsV2.ts`):
  - `getTeamV2()`: wrapper con auth, formatea miembros con `{id, name, role, active, email, phone, professional_id, services, schedule}`
  - `createTeamMemberV2()`: crea professional + user + audita. Roles: admin/profesional. Owner no puede crearse por API.
  - `deleteTeamMemberV2()`: wrapper de `deleteTeamMember()` en `lib/actions.ts`
  - `toggleTeamMemberActiveV2()`, `setTeamMemberRoleV2()`, `setTeamMemberServicesV2()`, `getTeamMemberServicesV2()`
  - `getTeamMemberScheduleV2()`, `saveTeamMemberScheduleV2()`, `resetTeamMemberScheduleV2()`
  - `getTeamServicesV2()`, `getFutureAppointmentsV2()`, `cancelFutureAppointmentsV2()`
- **Server actions V2 para Módulo 5** (`features/config-audit/actionsV2.ts`):
  - `getAuditLogsV2()`: filtros por acción, userId, fechas, paginación server-side
  - `getAuditUsersV2()`: lista usuarios con actividad de auditoría
  - `getAuditProfessionalsV2()`: lista profesionales para filtros
- **Nueva server action en `lib/actions.ts`**: `deleteTeamMember()` — soft-delete (users.active=false + professionals.active=false) con auditoría y cancelación de citas futuras
- **5 componentes V2**:
  - `features/config-team/components/team-listV2.tsx`: tabla de miembros + menú 3-puntos (Editar Permisos, Configurar Turno, Eliminar). Detalle expandible con schedule editor inline. Modal de confirmación de eliminación con cancelación de citas futuras. Skeleton, empty state, error state.
  - `features/config-team/components/team-member-modalV2.tsx`: modal crear miembro con ModalV2, form validación client-side
  - `features/config-team/components/team-permissions-modalV2.tsx`: modal editar permisos (role radio + checkboxes servicios asignados)
  - `features/config-team/components/team-schedule-editorV2.tsx`: editor horario inline con toggle heredar/custom + grid semanal open/close
  - `features/config-audit/components/audit-listV2.tsx`: filtros avanzados (acción, usuario, fechas), vista expandible inline por fila, colores semánticos por tipo de acción, paginación server-side con URL params
- **Montaje en page.tsx**: `TeamListV2` (solo owner) + `AuditListV2` en `/dashboard/configuracion`

### Reglas aplicadas
- Feature-first: componentes en `features/{modulo}/components/`, uno por archivo
- Thin components + fat server actions: lógica en `actionsV2.ts`, componentes solo UI
- V2 naming: todos los archivos llevan sufijo `V2` para no tocar originales
- Colores Zero-Friction via CSS variables `--zf-*`
- Soft-delete para miembros (no DELETE físico)
- Role + Servicios asignados para permisos (no permisos granulares)

### Decisiones de usuario confirmadas
- "Eliminar miembro" → soft-delete (desactivar)
- "Editar Permisos" → Role + Servicios asignados
- "Configurar Turno" → inline en detalle expandible (no drawer aparte)

### Archivos creados
- `dashboard/features/config-team/actionsV2.ts`
- `dashboard/features/config-audit/actionsV2.ts`
- `dashboard/features/config-team/components/team-listV2.tsx`
- `dashboard/features/config-team/components/team-member-modalV2.tsx`
- `dashboard/features/config-team/components/team-permissions-modalV2.tsx`
- `dashboard/features/config-team/components/team-schedule-editorV2.tsx`
- `dashboard/features/config-audit/components/audit-listV2.tsx`

### Archivos modificados
- `dashboard/lib/actions.ts` — `deleteTeamMember()` añadida
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — TeamListV2 + AuditListV2 montados
- `docs/harness/MEMORY.md` (este entry)

### Qué quedó pendiente
- Ejecutar migration 019 en VPS (ya escrita)
- Probar componentes E2E en navegador (no verificado visualmente)
- `audit-listV2.tsx` perdió sync de filtros con URL params (quitado para lint) — browser back/forward no restaura filtros
- Módulos restantes V2: dashboard, agenda, clientes, métricas, caja, inventario
- Bugs backlog: servicios no reflejados en bot
- Rotar Evolution API key leakada
