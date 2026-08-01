# HANDOFF — Estado Final Dashboard V2 + B18 + F3.4

**Fecha**: 2026-08-01 | **Avance**: B18 fixeado, F3.4 incrementos 1-2 completos, bot-service en prod

---

## HARNESS — Limpieza y estado actual

Los docs del harness (`workflows/docs/`) estan al dia:
- `INICIO.md`: B18 🟢, F3.4 🟢, F3.6 ⚫ descartado, Dashboard 🔴 pendiente
- `05-BUGS.md`: B18 ✅ FIX, contadores actualizados (12 fix, 21 high, 3 med, 10 crit)
- `01-BOT.md`: B18 en tabla de fixes activos
- `F3-MIGRACION.md`: Spec completo con 11 gaps, 18 campos HTTP Request, incremento 3 pendiente
- `02-ROADMAP.md`, `03-INVESTIGACION.md`, `04-REGLAS.md`: sin cambios

---

## Lo que sigue

1. **Incremento 3 F3.4** (10 min manual): cambiar Code node "AI Agent" por HTTP Request en n8n UI. Ver F3-MIGRACION.md seccion "INCREMENTO 3".
2. **G3 fix** (1 min): agregar `timezone` al return JSON de Procesar Mensaje en `restored.json`.
3. **Dashboard bugs**: B1, N2, N11, N24.
4. **B15 seguridad**: rotar Evolution API key leakada.

---

## Servidor (178.104.27.180)

```
ssh root@178.104.27.180
```

- Docker compose activo: `/root/n8n/docker-compose.yml`
- bot-service: `docker compose logs -f bot-service` (puerto 3003, red meyer_network)
- Probar: `docker exec n8n-n8n-1 wget -qO- http://bot-service:3003/health`
- .env: `/root/n8n/.env`
- Test bot-core: `cd /root/meyer-bot/packages/bot-core && npm test`

---

## Archivos criticos nuevos (fuera del harness)

| Archivo | Descripcion |
|---------|------------|
| `packages/bot-core/src/types.ts` | 12 interfaces TS |
| `packages/bot-core/src/constants.ts` | 7 providers, regex patterns |
| `packages/bot-core/src/date-parser.ts` | `extraerFechaLejana()` B18 detection |
| `packages/bot-core/src/normalizer.ts` | `normalizar()` regex extraction |
| `packages/bot-core/src/validation.ts` | `neutralizador()` B17 guard |
| `packages/bot-core/src/gap-message.ts` | `computeGapMessage()` inactivity |
| `packages/bot-core/src/prompt-builder.ts` | `buildSystemPrompt()` 22 secciones |
| `packages/bot-core/src/llm-chain.ts` | `callWithFallback()` + circuit breaker |
| `apps/bot-service/src/index.ts` | Express POST /api/chat + GET /health |
| `apps/bot-service/Dockerfile` | node:22-alpine, non-root, NODE_ENV=production |

# HANDOFF — Estado Final Dashboard V2

**Fecha**: 2026-07-31 | **Avance**: 12/12 modulos + layout V2 + login ZF + notificaciones

## URLs (VPS: zyvenshop.com)

| Ruta | Componente V2 |
|------|-------------|
| `/login` | ZF theme (card blanca, fondo crema) |
| `/dashboard` | `DashboardPageV2` (KPIs + bar chart + top profesionales + heatmap) |
| `/dashboard/semana` | `WeekViewV2` (Profesional / Lista / Calendario + modal crear cita) |
| `/dashboard/clientes` | `ClientTableV2` (tabla CRM + search + drawer historial + WhatsApp) |
| `/dashboard/inventario` | `ProductCatalogV2` (stats + tabla + stock badges + paginación) |
| `/dashboard/caja` | `PosLayoutV2` (POS demo 60/40: catálogo + carrito + IVA + método pago) |
| `/dashboard/configuracion` | Tabs: Perfil / Servicios / Pagos / Equipo / Horarios / Auditoría |

> Después de cada deploy, **Ctrl+Shift+R** en el browser para limpiar cache de Server Action IDs.

## Layout V2 (implantado)

- **SidebarV2**: 6 íconos (Dashboard, Agenda, Clientes, Inventario, Caja, Config). Desktop: lateral. Mobile: bottom bar.
- **TopbarV2**: nombre negocio + notification bell (con badge contador) + avatar + logout.
- **Login**: fondo `bg-zf-bg`, card `bg-zf-surface`, botón `bg-zf-primary`.

## Migrations ejecutadas en VPS

| # | Tabla/Cambio |
|---|-------------|
| 019 | `businesses.*` (address, phone, email, tax_id, currency, logo_url) + `payment_methods` |
| 020 | `customers` + email, direccion |
| 021 | `reviews` (rating 1-5, FK customers/appointments) |
| 022 | `products` (retail/supply, stock, iva) |
| 023 | `notifications` (basada en audit_log) |

## Server Actions — Regla crítica

**`export type { X }` en archivos `"use server"` causa `ReferenceError` con Turbopack (Next.js 16).**
Todos los `export type` re-exports fueron eliminados de `features/*/actionsV2.ts`.
Los componentes ahora importan tipos directamente de `lib/actions.ts`, `lib/appointments.ts`, `lib/services.ts`.

## Credenciales

| Recurso | Dato |
|---------|------|
| VPS | `ssh root@178.104.27.180` |
| DB | `docker exec meyer_postgres psql -U meyer_user -d meyer_db` |
| PM2 | `pm2 restart meyer-dashboard` |
| Build | `cd /root/meyer-bot/dashboard && rm -rf .next && npm run build` |
| Puerto | 3001 (nginx proxy en 443 → 3001) |

## Bugs resueltos esta sesión

- B1: `createAppointment` valida `schedule_exceptions` ✅
- B2: `fetchOcupacion` considera `schedule_exceptions` ✅
- `ReferenceError: ServiceRow/Cliente/MetricasData` → `export type` re-exports eliminados ✅
- Dark theme → ZF light theme (custom tokens redirigidos a `--zf-*`) ✅
- Inventario search sin debounce → 300ms debounce ✅

## Archivos clave si hay que tocar algo

| Si toca... | Archivo |
|-----------|---------|
| Layout | `components/shared/sidebarV2.tsx`, `topbarV2.tsx`, `layout.tsx` |
| Notificaciones | `components/shared/notification-bell.tsx`, `dashboard-home/actionsV2.ts` |
| Config tabs | `features/config-tabs/components/configuracion-client.tsx` |
| Servicios Tab 2 | `features/config-services/components/services-listV2.tsx` |
| Auditoría formato | `lib/audit-types.ts` (función `describirDetalle`) |
| Pagos | `features/config-payments/components/payment-methods-listV2.tsx` |
| Globals CSS | `app/globals.css` (custom tokens → ZF, dark class removida) |
