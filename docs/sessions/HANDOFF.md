# HANDOFF — Estado Final Sesión Ago 3, 2026

**Fecha**: 2026-08-03 | **Avance**: Agenda V2 ✅, Roles V2 ✅, Auditoría ✅, Docs limpios ✅, Correcciones pendientes 🔴

---

## Lo que se completó esta sesión

### Agenda V2
- CalendarView: TimelineGridV2 (position:absolute, z-index, current time indicator, líneas dashed)
- ListView: DayAccordionV2 (cards), DayStripV2 (7d + month picker), Route Handlers
- Cards: AppointmentBlockV2 (STATUS_STYLE amber/emerald/sky), AppointmentCardV2 (mobile/desktop)
- Responsive: touch 44px+, safe-area iPhone, mobile single-column grid
- Modal: AgendaModalV2 2 tabs, isOwnerOrAdmin oculta selector profesional

### Roles RBAC V2
- `isOwnerOrAdmin` por `session.user.role`, no por `professionalId == null`
- SidebarV2: profesional sin Caja/Inventario, Config solo "Mi Horario"+"Mis Servicios"
- ConfiguracionClient: tabs dinámicos por rol (2 para profesional, 6 para owner/admin)
- Middleware: profesional bloqueado en /auditoria y /equipo
- ScheduleBlocksV2: filterProfessionalId oculta columna profesional
- ClientTableV2: toggle "Todos/Mis clientes"

### Build & Sync
- Server Actions → Route Handlers: GET /api/appointments/month, GET /api/bloqueos
- deploymentId + Cache-Control: no-cache en next.config.ts
- Landing page eliminada (14 archivos), globals.css revertido
- getWeekAppointments con referenceDate UTC-5
- Auto-refresh 15s + focus/visibility listeners
- auditar() → notifications + audit_log + webhooks sync-*

### Documentación
- `docs/frontend-reference.md` eliminado (1126 líneas)
- Caja spec preservada en `docs/reference/caja-spec.md`
- Perfil Negocio rules → `ARCHITECTURE.md`
- `docs/refactoring-v2/` archivado en `docs/archive/`
- Membresías futuro → `SPRINTS.md`

---

## Lo que sigue (próxima sesión)

Ejecutar el plan de 16 correcciones en este orden:

| # | Acción | Min | Prioridad |
|---|--------|:---:|:---:|
| 1 | ✅ `VACUUM ANALYZE` 9 tablas DB | 1 | P1 |
| 2 | Fix `services_text` sync (regenerar al guardar servicios) | 15 | **CRÍTICO** |
| 3 | Fix bot Lookup Negocio (excluir admins de profesionales) | 10 | ALTO |
| 4 | Modal "Cambiar credenciales" en Equipo V2 | 15 | ALTO |
| 5 | Notificar credenciales al crear miembro | 10 | MEDIO |
| 6 | Bot: validar professional_services al asignar | 10 | MEDIO |
| 7 | Confirmación delete inventario + stats fix | 5 | BAJO |
| 8 | Confirmación delete servicios (shadcn dialog) | 3 | BAJO |
| 9 | Crear/eliminar métodos de pago | 10 | MEDIO |
| 10 | Caja: implementar checkout real | 30 | **CRÍTICO** |
| 11 | Auth en getServiceById | 2 | P0 |
| 12 | Limpiar dead mi-horario references | 5 | P1 |
| 13 | Migrar orange → amber (48 refs, 8 archivos) | 10 | P1 |
| 14 | console.error en ~30 catch blocks | 10 | P1 |
| 15 | Validar Agenda List carga datos | 5 | — |
| 16 | Cross-business auth bypass | 5 | P0 |

---

## Detalle de bugs activos

### #2 — services_text desincronizado
**Raíz**: `ServicesListV2` usa `createService/updateService/toggleServiceActive/deleteService` (`lib/services.ts:92-216`) que NUNCA regeneran `businesses.services_text`. El bot lee ese campo en cada mensaje WhatsApp.
**Fix**: Crear `regenerateServicesText(businessId)` → leer `services` table activas → `"Nombre $precio (Xmin), ..."` → UPDATE `businesses`. Llamar desde los 4 CRUDs + `setProfessionalServices`.

### #3 — Camila (admin) aparece como profesional en bot
**Raíz**: Lookup Negocio n8n `workflows/WhatsApp Bot - Genérico restored.json:72` hace `LEFT JOIN professionals p ON p.active = true` sin filtrar por rol.
**Fix A (n8n)**: `AND p.id NOT IN (SELECT professional_id FROM users WHERE role IN ('admin','owner') AND professional_id IS NOT NULL)`
**Fix B (dashboard)**: Al crear usuario admin, si tiene `professionals` row, set `active = false`.

### #4 — No se pueden cambiar contraseñas en Equipo V2
**Raíz**: `updateMiembroCredenciales` (`actions.ts:1701`) existe pero nunca se llama desde ningún componente V2.
**Fix**: Modal "Cambiar credenciales" (nombre, email, nueva contraseña opcional) en `team-listV2.tsx`.

### #10 — Caja checkout es fake
**Raíz**: `pos-cartV2.tsx:44-47` — `handleCheckout()` solo muestra animación de éxito.
**Fix**: Crear tabla `transactions` + `transaction_items` (migración), implementar `createTransaction()` con SQL atómico (INSERT cabecera + items + descuento stock + cierre cita). Spec en `docs/reference/caja-spec.md`.

---

## Servidor (178.104.27.180)

```
ssh root@178.104.27.180
```

| Comando | Descripción |
|---------|-------------|
| `docker exec meyer_postgres psql -U meyer_user -d meyer_db` | DB |
| `pm2 restart meyer-dashboard` | Reiniciar app |
| `cd /root/meyer-bot/dashboard && rm -rf .next && npm run build` | Build |
| `pm2 logs meyer-dashboard --lines 30 --nostream` | Logs recientes |

Dashboard: `https://dashboard.zyvenshop.com` (nginx 443 → localhost:3001)
n8n: `https://n8n.zyvenshop.com`

---

## Credenciales

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Meyer | owner email | ver .env VPS | owner |
| Cristian | cristian@hotmail.com | cristian123 | profesional |
| Camila | camila@hotmail.com | ver DB | admin |

---

## Archivos clave si hay que tocar algo

| Si toca... | Archivo |
|-----------|---------|
| Agenda Calendar | `features/agenda/components/week-viewV2.tsx` |
| Agenda Lista | `features/agenda/components/agenda-list-containerV2.tsx` |
| Sidebar | `components/shared/sidebarV2.tsx` |
| Config tabs | `features/config-tabs/components/configuracion-client.tsx` |
| Equipo | `features/config-team/components/team-listV2.tsx` |
| Servicios | `features/config-services/components/services-listV2.tsx` |
| Inventario | `features/inventory/components/product-catalogV2.tsx` |
| Caja | `features/caja/components/pos-cartV2.tsx` |
| Notificaciones | `components/shared/notification-bell.tsx` |
| RBAC middleware | `auth.config.ts` |
| CRUD servicios | `lib/services.ts` |
| CRUD equipo | `lib/actions.ts` (~línea 1444-1840) |
| Auditoría | `lib/audit.ts` |
| n8n workflow | `workflows/WhatsApp Bot - Genérico restored.json` |

---

## Reglas nuevas aplicadas

- Server Actions en archivos compartidos (`lib/`) causan "Failed to find Server Action" — migrar a Route Handlers o fetch()
- `session.user.role` para RBAC, nunca `professionalId == null`
- Después de cada deploy: Ctrl+Shift+R para limpiar cache de Server Action IDs
- `deploymentId` en next.config.ts necesario para Next.js 16 en producción
- Todo archivo de docs obsoleto → archivar o eliminar. No acumular.
