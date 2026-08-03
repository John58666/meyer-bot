# Sesión Actual — Agenda V2 + Roles RBAC + Auditoría

## Fecha
Ago 1-3, 2026 — diagnóstico, refactor, y auditoría de seguridad

## Objetivo
Refactorizar módulo Agenda V2 y secciones del dashboard con diseño premium, responsive, roles RBAC completos, sincronización con bot WhatsApp, y corrección de bugs de Server Actions. Auditoría de seguridad post-refactor.

## Stack
Next.js 16 + PostgreSQL 16 + Tailwind v4 + shadcn/ui + PM2
VPS: root@178.104.27.180, puerto 3001, dashboard.zyvenshop.com

---

## Progreso

### ✅ Completado — Agenda V2

**CalendarV2** (`week-viewV2.tsx`, ~370 líneas):
- Calendar/Lista toggle, DayStripV2, TimelineGridV2, agenda-modalV2
- `TimelineGridV2`: columnas flex, bloques `position:absolute`, z-index dinámico por hora, current time indicator
- Líneas dashed + bloques con bordes (no gaps entre cards, se tocan como Google Calendar)
- `AppointmentBlockV2`: card atómica con `STATUS_STYLE` (amber/emerald/sky/zinc), compact mode, dashed border
- Cards padding responsive: `p-1.5 sm:p-2.5`

**ListView V2** (`agenda-list-containerV2.tsx`):
- DayAccordionV2: acordeón diario con bloqueos intercalados por hora, barra ocupación, canceladas al final
- DayStripV2: tira 7 días + month picker popover, touch targets 44px+
- `AppointmentCardV2`: mobile/desktop con WhatsApp/Completar/Cancelar
- Fetch via `GET /api/appointments/month` y `GET /api/bloqueos` (Route Handlers, no Server Actions)
- Anti-flicker `lastLenRef` para evitar parpadeos en refresh

**ModalV2** (`agenda-modalV2.tsx`): 2 tabs, `isOwnerOrAdmin` oculta selector profesional para profesionales.

**Responsive**: touch targets 44px+, safe-area iPhone, overflow-x fixes, mobile single-column grid.

### ✅ Completado — Roles RBAC V2

- `isOwnerOrAdmin`: `session.user.role === "owner" || session.user.role === "admin"` (ya no por `professionalId == null`)
- **SidebarV2**: Profesional NO ve Caja/Inventario. Configuración muestra solo "Mi Horario" (TeamScheduleEditorV2) + "Mis Servicios" (read-only). Dashboard/Config ocultos.
- **Configuración**: `ConfiguracionClient` tabs dinámicos por rol — profesional ve 2 tabs, owner/admin ve 6 tabs.
- **Middleware**: profesional permitido en `/dashboard/configuracion`, bloqueado en `/dashboard/auditoria` y `/dashboard/equipo`
- **ScheduleBlocksV2**: acepta `filterProfessionalId`, oculta columna/selector/modal profesional cuando está fijado
- **ClientTableV2**: toggle "Todos/Mis clientes" visible solo para profesionales, `professionalId` dinámico en `loadData`
- **`getClientesV2`**: acepta `professionalId` param para filtrar clientes atendidos por el profesional

### ✅ Completado — Build & Sync

- Server Actions → Route Handlers: `GET /api/appointments/month` y `GET /api/bloqueos` reemplazan `getAppointmentsByMonthV2` y `getBloqueosV2` (evita "Failed to find Server Action")
- `GET /api/professional-services` — Route Handler para servicios asignados al profesional
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fijada en `.env` del VPS
- `deploymentId` en `next.config.ts` + `Cache-Control: no-cache` headers
- `getWeekAppointments` ahora acepta `referenceDate` con offset UTC-5 (Bogotá). Citas futuras visibles en grid.
- Landing page eliminada (14 archivos), `app/page.tsx` restaurado a redirect
- `globals.css` revertido a pre-landing (145 líneas borradas)
- Auto-refresh 15s + focus/visibility listeners en Agenda, Dashboard, Clientes

### ✅ Completado — Notificaciones

- `auditar()` inserta en `notifications` + `audit_log` (antes solo audit_log)
- Webhooks `sync-*` también insertan en `notifications`
- `NotificationBell`: rediseño completo, colores por acción, badge sin leer, dropdown 320px

### ✅ Completado — Mi Horario y Configuración

- Mi Horario V1 eliminado, reemplazado por `ScheduleBlocksV2` + `TeamScheduleEditorV2`
- Profesional ve solo su horario, no el del negocio ni el de otros profesionales
- Servicios asignados visibles en modo read-only para profesionales

### ✅ Completado — Documentación

- `docs/frontend-reference.md` eliminado (1126 líneas obsoletas)
- Caja spec extraída a `docs/reference/caja-spec.md`
- Reglas Perfil Negocio mergeadas a `ARCHITECTURE.md`
- `docs/refactoring-v2/` archivado (13 archivos de plan ya ejecutados)
- Membresías/Planes futuro anotado en `SPRINTS.md`

---

## Auditoría de Seguridad — Hallazgos Validados

### P0 — Críticos

| # | Hallazgo | Validación |
|---|----------|-----------|
| 1 | PM2 crash loop (72 reinicios) | **FALSO**. Los "restarts" son nuestros deploys. Server dice `✓ Ready in 180ms`. Logs solo muestran `CredentialsSignin` (normal). |
| 2 | Cross-business auth bypass en 7 server actions | **REAL pero sin riesgo hoy** (single-tenant). Si agregamos más negocios, es brecha. |
| 3 | `getServiceById` (`lib/services.ts:45`) expuesto sin auth | **REAL**. `"use server"` en archivo compartido lo expone. |

### P1 — Altos

| # | Hallazgo | Validación |
|---|----------|-----------|
| 4 | Dead tuples DB: 9 tablas, `conversation_history` 93% | **REAL**. `VACUUM ANALYZE` es 1 comando, 0 downtime. |
| 5 | Referencias `mi-horario` muertas: `lib/actions.ts:2141`, `sidebar.tsx:11`, `topbar.tsx:18` | **REAL**. 3 referencias a ruta inexistente + archivos V1 muertos. |
| 6 | Orange leftovers: 48 referencias en 8 archivos (inventory/clients/shared) | **REAL**. Migrar `bg-orange-*`/`text-orange-*` → `bg-amber-*`/`text-amber-*`. |
| 7 | Silent catch blocks: ~30 en 7 `actionsV2.ts` | **REAL**. Sin `console.error`, imposible debuggear errores. |

### P2 — Medios

| # | Hallazgo |
|---|----------|
| 8 | `getClientes()` N+1 sin paginación (con 33 clientes no es bottleneck hoy) |
| 9 | Debug endpoint expuesto |
| 10 | Dead business id=2 en DB |

### Nuevos hallazgos — Bot + Sincronización

| # | Hallazgo | Severidad |
|---|----------|-----------|
| 11 | **`services_text` desincronizado**: CRUD de servicios V2 (`lib/services.ts`) NUNCA regenera `businesses.services_text`. El bot lee ese campo en cada mensaje → clientes de WhatsApp ven precios/nombres viejos. | **CRÍTICO** |
| 12 | **Camila (admin) aparece como profesional en el bot**: Lookup Negocio (`restored.json:72`) hace `LEFT JOIN professionals p ON p.active = true` sin filtrar por rol. | **ALTO** |
| 13 | **Equipo V2: no hay modal "Cambiar contraseña"**: `updateMiembroCredenciales` existe (`actions.ts:1701`) pero nunca se llama desde V2. | **ALTO** |
| 14 | **Equipo V2: no hay modal "Editar credenciales"**: V1 tenía inline edit (name/email/password), V2 lo perdió. | **ALTO** |
| 15 | **Bot no usa `professional_services`**: Asigna cualquier profesional a cualquier servicio sin validar especialidades. | **MEDIO** |
| 16 | **Equipo: no se notifica al nuevo miembro**: `createMiembroEquipo` crea usuario pero no envía credenciales. | **MEDIO** |
| 17 | **Caja checkout es fake**: `pos-cartV2.tsx:44-47` solo muestra animación. No guarda transacción. | **CRÍTICO** |

---

## Plan de Correcciones (18 ítems, priorizado)

| Orden | # | Acción | Minutos |
|:---:|:---:|------|:---:|
| 1 | 4 | ✅ `VACUUM ANALYZE` 9 tablas DB | 1 |
| 2 | 11 | Fix `services_text` sync: helper `regenerateServicesText()` llamado desde CRUD | 15 |
| 3 | 12 | Fix bot Lookup Negocio: excluir admins de lista profesionales | 10 |
| 4 | 13+14 | Modal "Cambiar credenciales" en Equipo V2 | 15 |
| 5 | 16 | Notificar credenciales al crear miembro | 10 |
| 6 | 15 | Bot: validar `professional_services` al asignar profesional | 10 |
| 7 | — | Confirmación delete en inventario + fix stats incluyen inactivos | 5 |
| 8 | — | Confirmación delete en servicios (shadcn dialog) | 3 |
| 9 | — | Crear/eliminar métodos de pago | 10 |
| 10 | 17 | Caja: implementar checkout real (tabla `transactions`) | 30 |
| 11 | 3 | Quitar `"use server"` de `lib/services.ts` + auth en `getServiceById` | 2 |
| 12 | 5 | Limpiar dead mi-horario references | 5 |
| 13 | 6 | Migrar orange → amber (48 refs, 8 archivos) | 10 |
| 14 | 7 | `console.error("[module]", e)` en ~30 catch blocks | 10 |
| 15 | — | Validar Agenda List carga datos (fetch + Route Handlers) | 5 |
| 16 | 2 | Cross-business auth bypass en 3 server actions | 5 |

**Total: ~2.5 horas**

---

## Archivos Clave

### Agenda V2
| Archivo | Descripción |
|---------|-------------|
| `dashboard/features/agenda/components/week-viewV2.tsx` | Orquestador Calendar/Lista (~370 líneas) |
| `dashboard/features/agenda/components/timeline-gridV2.tsx` | Grid premium con position:absolute, z-index |
| `dashboard/features/agenda/components/parts/appointment-blockV2.tsx` | Card atómica STATUS_STYLE |
| `dashboard/features/agenda/components/agenda-list-containerV2.tsx` | Lista mensual + fetch Route Handlers |
| `dashboard/features/agenda/components/parts/day-stripV2.tsx` | 7 días + month picker |
| `dashboard/features/agenda/components/parts/day-accordionV2.tsx` | Acordeón diario con bloqueos |
| `dashboard/features/agenda/components/parts/appointment-cardV2.tsx` | Card cita mobile/desktop |
| `dashboard/features/agenda/components/agenda-modalV2.tsx` | Modal 2 tabs crear cita/bloquear |
| `dashboard/features/agenda/actionsV2.ts` | Server actions + deleteBloqueoV2 |
| `dashboard/app/api/appointments/month/route.ts` | Route Handler GET citas del mes |
| `dashboard/app/api/bloqueos/route.ts` | Route Handler GET bloqueos |
| `dashboard/app/api/professional-services/route.ts` | Route Handler GET servicios profesional |

### Roles & Layout
| Archivo | Descripción |
|---------|-------------|
| `dashboard/components/shared/sidebarV2.tsx` | Nav con allRoles filter, items ocultos por rol |
| `dashboard/components/shared/notification-bell.tsx` | Bell con badge, dropdown, colores por acción |
| `dashboard/auth.config.ts` | Middleware — profesional en config, bloqueado auditoria/equipo |
| `dashboard/next.config.ts` | deploymentId + Cache-Control headers |
| `dashboard/features/config-tabs/components/configuracion-client.tsx` | Tabs dinámicos por rol |
| `dashboard/features/config-schedule/components/schedule-blocksV2.tsx` | filterProfessionalId |
| `dashboard/features/clients/components/client-tableV2.tsx` | Toggle Todos/Mis clientes |

### Backend
| Archivo | Descripción |
|---------|-------------|
| `dashboard/lib/appointments.ts` | getWeekAppointments con referenceDate UTC-5 |
| `dashboard/lib/audit.ts` | auditar() → notifications + audit_log |
| `dashboard/lib/actions.ts` | updateMiembroCredenciales (línea 1701), getClientesV2 |
| `dashboard/lib/services.ts` | CRUD servicios (NO regenera services_text — bug #11) |

---

## Credenciales VPS

```
ssh root@178.104.27.180
DB: docker exec meyer_postgres psql -U meyer_user -d meyer_db
PM2: pm2 restart meyer-dashboard
Build: cd /root/meyer-bot/dashboard && rm -rf .next && npm run build
Puerto: 3001 (nginx proxy 443 → 3001)
```

| Recurso | Dato |
|---------|------|
| cristian@hotmail.com | cristian123 (profesional) |
| camila@hotmail.com | (admin, professional_id=14) |

---

## Próximo Paso

Ejecutar fix #2: `services_text` sync. Ver `HANDOFF.md` para estado completo.
