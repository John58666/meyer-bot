# CONTEXT.md — meyer-bot

> Última actualización: 12 julio 2026 (sesión 12 — GPU glitch fix. Causa raíz: `--border-subtle: rgba(255,255,255,0.06)` forzaba composición GPU en cada borde. Fix: cambiar a hex sólido `#2A2A2A` en globals.css — un solo cambio cascada a cards, nav, charts, sidebar.)
> Documento maestro CORTO. Cualquier chat nuevo lee esto primero.
> **⚠️ ANTES de tocar NADA: leer `docs/SECURITY_AUDIT.md`** — reporte maestro de seguridad, hallazgos activos y plan de remediación.
> Para profundidad: ver docs/ (ARCHITECTURE.md, SPRINTS.md, RUNBOOK.md, KEY_LEARNINGS.md, SECURITY_AUDIT.md)

## Qué es este proyecto
SaaS WhatsApp-native de agendamiento para cualquier negocio que gestione citas (barberías, salones, spas, consultorios, etc.) en LATAM. Expansión planificada a España, México, USA y Canadá.
Bot conversacional WhatsApp + dashboard de gestión + CRM operativo.
Diferenciador: WhatsApp-native (Fresha/Booksy/SimplyBook obligan a salir de WhatsApp).

> **Naming:** "meyer-bot" es el repo interno. "Meyer" es también un negocio real (business_id=1). Pendiente desacoplar branding (ver Backlog).

## Estado del producto
- **Vendible HOY** para negocios de un solo profesional. E2E completo (agendar/cancelar/reagendar).
- **Dashboard operativo:** título dinámico, calendario clickeable, agendar manual, servicios dinámicos con precios, hora libre, anti-doble-booking, métricas con selector de rango Hoy/Semana/Mes, bloqueos de agenda, edición de servicios, nav responsive móvil 4 ítems, CRM /dashboard/clientes, **RBAC completo (Sprint 11)**, **gestión de equipo /dashboard/equipo**, **FAQ/Ayuda en /dashboard/help**, **Auditoría con filtro de semana actual y texto explicativo**.
- **Bot robusto:** fallback chain multi-LLM, historial conversacional, filtro de audios/multimedia, scope off-topic, rate limit. Slots cada 30 minutos. Respeta `schedule_exceptions`. Upsert automático en `customers` al agendar.
- **Vendible para multi-profesional** desde Sprint 12 — bot pregunta profesional, dashboard filtra por profesional, slots y bloqueos independientes por profesional.
- **Dashboard Sync:** 3 webhooks (sync-new, sync-cancel, sync-reagend) que registran en audit_log con origen "whatsapp" y revalidan caché.
- Brayan Study (business_id=3, 1 profesional) es el primer cliente real. Operativo.

## Stack
- **n8n 2.10.3** self-hosted — orquestador workflows. Migrar a Node.js+BullMQ+Redis antes de 30 clientes (adelantar a Sprint 14 por i18n multi-región).
- **Evolution API v2.3.7** — conexión WhatsApp. Migrar a WA Cloud API oficial por cliente.
- **LLM fallback chain:** Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- **PostgreSQL 16 Alpine** (Docker: `meyer_postgres`, DB: `meyer_db`, usuario: `meyer_user`) — única DB.
- **Next.js 16** + App Router + Tailwind v4 + shadcn/ui + **recharts** — dashboard en producción.
- **NextAuth v5** JWT — auth dashboard contra PostgreSQL.
- **PM2** + nginx — proceso y proxy en VPS. Dashboard en `/root/meyer-bot/dashboard/`.
- **Beszel** — monitoreo de servidor (CPU, RAM, disco, Docker). Hub en Docker, expuesto en https://monitor.zyvenshop.com
- **Uptime Kuma** — health checks de servicios. En Docker, expuesto en https://status.zyvenshop.com
- **VPS Ubuntu Hetzner** 178.104.27.180 (2 vCPU / 3.7GB RAM / 38GB disco).

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local Mac: `~/Documents/meyer-bot`
- VPS: `/root/meyer-bot` — el dashboard vive en `/root/meyer-bot/dashboard/`
- Deploy: `git push` Mac → `git pull` VPS → `cd dashboard && npm run build` → `pm2 restart meyer-dashboard`
- `npm run build` se ejecuta desde `/root/meyer-bot/dashboard/`, NO desde la raíz del repo.
- Commits siempre desde Mac, nunca desde VPS.

## Negocios en producción

| id | name | whatsapp_instance | owner_number | estado |
|----|------|-------------------|--------------|--------|
| 1 | Peluquería Meyer | peluqueria-beta | 573142556322 | activo |
| 2 | Negocio Prueba | negocio-prueba | 57XXXXXXXXXX | pruebas |
| 3 | Brayan Study | brayan-study | 573136053693 | activo |

**Brayan Study:** Medina, Cundinamarca. Primer cliente real. Dashboard: `brayanvaca84@gmail.com`, business_id=3. Pendiente confirmar services_text real con Brayan.

## JWT actual
Contiene: `userId`, `email`, `name`, `businessId`, `businessName`, `multiProfessional`, `role`, `professionalId`.
`professionalId` es `null` para owner/admin (ven todo), tiene valor numérico para `profesional` (ve solo lo suyo).

## Roles del sistema
| Role | Ve | Puede |
|------|-----|-------|
| owner | Todo el negocio | Todo incluyendo gestión de usuarios y cuenta |
| admin | Todo el negocio | Todo excepto crear/eliminar usuarios y gestión de cuenta |
| profesional | Solo sus citas/métricas/clientes | Marcar sus citas, bloquear sus propios días |

Owner y admin NO tienen agenda propia — agendan a nombre de los profesionales registrados.
Solo `profesional` cuenta contra `max_professionals` del plan.

## Planes (sin nombre formal todavía)
| Tier | max_professionals | max_admins |
|------|------------------|------------|
| Plan 1 | 5 | 1 |
| Plan 2 | 8 | 1 |
| Plan 3 | 20 | 2 |

Asignados manualmente por SQL al onboardear. Sistema formal con Stripe/Wompi en backlog futuro.

## Navegación — estado actual

### Bottom nav móvil (4 ítems fijos)
| Ícono | Label | Ruta | Estado |
|-------|-------|------|--------|
| Inicio | `/dashboard` | ✅ |
| Agenda | `/dashboard/semana` | ✅ |
| Métricas | `/dashboard/metricas` | ✅ |
| Clientes | `/dashboard/clientes` | ✅ |

### Sidebar PC
- Nav: Inicio, Agenda, Métricas, Clientes
- Bottom: Configuración (oculto para `profesional`), Auditoría (oculto para `profesional`), Equipo (solo `owner`), Ayuda (→ `/dashboard/help` con FAQ)

### Dropdown avatar móvil
- Configuración (owner/admin), Auditoría (owner/admin), Equipo (solo owner), Ayuda (todos)

## Archivos clave del dashboard
- `dashboard/lib/actions.ts` — todas las server actions (appointments, métricas, bloqueos, servicios, CRM, equipo).
- `dashboard/lib/appointments.ts` — queries de citas con filtro opcional `professionalId`.
- `dashboard/auth.ts` — NextAuth con `professional_id` en SELECT y JWT.
- `dashboard/auth.config.ts` — callbacks JWT/session + bloqueo de rutas por role.
- `dashboard/types/next-auth.d.ts` — tipos extendidos con `professionalId: number | null`.
- `dashboard/components/equipo/equipo-client.tsx` — gestión de usuarios.
- `dashboard/components/clientes/clientes-client.tsx` — lista + búsqueda.
- `dashboard/app/(dashboard)/layout.tsx` — pasa `role` a Sidebar y Topbar.
- `dashboard/components/sidebar.tsx` y `topbar.tsx` — nav condicional por role.

## CRM — estado
- Upsert automático en `customers` desde bot (n8n) y desde `createAppointment` (dashboard).
- UI read-only: lista + búsqueda + detalle con historial de 50 citas.

## RBAC — Sprint 11 completo
- `professionalId` en JWT, middleware de rutas, filtros server-side en todas las queries.
- `/dashboard/equipo`: crear/editar usuarios, toggle activo/inactivo, cambiar role.
- Límites de plan: `max_professionals` y `max_admins` en `businesses`.
- Constraint DB: `role IN ('owner', 'admin', 'profesional')`.

## Backlog priorizado

### SPRINT 12 — COMPLETADO ✅ (11 julio 2026)
1. **Multi-profesional completo** — #4 (bot pregunta profesional) y #5 (agenda paralela con slots, filtro dashboard, independencia de roles) implementados y deployados.

### SPRINT 13 — COMPLETADO ✅ (11 julio 2026)
2. **Auditoría** — tabla `audit_log`, instrumentación de 9 actions, UI `/dashboard/auditoria`.
3. **Horarios desde dashboard** — editor día por día en configuración.
4. **Sync cancel WhatsApp→dashboard** — endpoint webhook con WEBHOOK_SECRET, audit_log, revalidatePath.
5. **Reagendamiento raw body** — IIFE reemplazada por Code node con contentType raw.
6. **No-Shows cron** — workflow n8n que auto-completa citas Pendiente con fecha pasada.

### SPRINT 14 — COMPLETADO ✅ (11 julio 2026)
7. **Fix #26** — Título negocio como link a `/dashboard` ✅
8. **Fix #25** — Tooltips en botones (bottom nav, filtros, paginación) ✅
9. **Fix #23** — Auditoría: texto explicativo + default semana actual ✅
10. **Fix #24** — Página `/dashboard/help` con FAQ filtrada por rol ✅
11. **Fix móvil** — Auditoría link en dropdown avatar móvil ✅
12. **Fix Equipo** — Botón Editar con texto visible, tabla responsive ✅

### PENDIENTE — Fase 2: Bot & Sistema
12. **Inactividad bot** — que pregunte si cliente sigue ahí tras X tiempo sin respuesta.
13. **Debugging errores bot** — revisar executions n8n, identificar y corregir causas raíz de errores frecuentes.
14. **Pruebas de carga** — simular múltiples clientes simultáneos agendando, medir comportamiento del sistema.

### SPRINT 15 — COMPLETADO ✅ (12 julio 2026)
15. **Dashboard Métricas Premium** — KPIs expandidos (6 cards con badges de variación), tabs General/Profesional/Servicios, chart ingresos con overlay período anterior, chart horizontal servicios, grid heatmap ocupación, 4 drawers drill-down con Sheet, RBAC profesional, responsive móvil.

### SESIÓN 9 — UI/UX Audit (12 julio 2026)
Auditoría de interfaz post-Sprint 15 usando `ui-ux-pro-max`. **Sin ejecutar cambios.**
Hallazgos en 6 áreas (detalle en `docs/superpowers/specs/2026-07-11-sprint15-metricas-premium.md` sección 14):
- KPIs sin sparkline/skeleton/contexto semántico (🔴 alta)
- Filtros por fecha ausentes (🔴 alta)
- Drawers sin loading/error state (🟡 media)
- Accesibilidad SR + colores (🟡 media)
- Responsive tablet + pagination dots (🟢 baja)
- Heatmap tooltip/legend + chart interactividad (🟢 baja)

### SESIÓN 10 — UI/UX Audit implementado (12 julio 2026)
Ejecución de todos los hallazgos de la sesión 9. Ver detalle en `docs/SPRINTS.md` sección Sprint 15 UI/UX.
- 🔴 KPIs: sparkline SVG, TrendingUp/Down semántico según tipo de métrica, tooltip hover comparativo
- 🔴 Filtro fechas: Trimestre + Personalizar con DatePicker, extiende RangoMetricas
- 🟡 Drawers: error state con mensaje + botón reintentar en los 4 drawers
- 🟡 Accesibilidad: aria-selected/role="tab" en tabs, aria-label/role="img" en charts, sr-only en badges
- 🟢 Responsive: pagination dots para KPIs mobile
- 🟢 Heatmap: tooltip flotante + indicador hora actual
- 🟢 Charts: LabelList en barras servicios + animationDuration

### SESIÓN 11 — Responsive bugs post-deploy + fix (12 julio 2026)
Dos bugs responsive aparecieron tras deploy de UI/UX Audit:
- **Bug 1 — KPI overflow**: scroll horizontal forzado en todos los tamaños. Fix: dual container (scroll mobile + grid desktop `sm:grid-cols-3`).
- **Bug 2 — "Pantallitas negras"**: `isMobile` state en 4 drawers causaba overlays fantasma de base-ui Dialog. Fix: eliminar `isMobile`, CSS-only `max-md:!w-[90vw]`, siempre `side="right"`.
- Charts altura responsive, date picker full-width mobile.

### SESIÓN 12 — GPU glitch fix (12 julio 2026)
GPU glitch persistente en móvil (estática/píxeles rotos en cards + nav). Fix anterior `backface-visibility` no funcionó.
- **Causa raíz**: `--border-subtle: rgba(255,255,255,0.06)` — cada borde semitransparente fuerza capa de composición GPU separada. 10-15 instancias saturan memoria GPU móvil.
- **Fix**: `globals.css`: `rgba` → hex sólido `#2A2A2A`. Un solo cambio cascada a todos los componentes.
- `metricas-chart-servicios.tsx`: `isAnimationActive={false}` para evitar repaint GPU por animaciones recharts.

### PENDIENTE — Fase 4: Fixes complejos
21. **#21 — Onboarding negocio nuevo** — script/checklist multi-sistema
22. **#22 — Desambiguación clientes mismo nombre** — distinguir por teléfono/ID/notas
23. **Servicios nuevos no reflejados en bot** (#11 anterior) — investigar timing system prompt vs lookup
24. **Quitar branding Meyer del producto** (#15 anterior)
25. **Panel admin Johnander** — vista global de todos los negocios (#19 anterior)
26. `updateMiembroRole` profesional→admin no valida `max_admins` (#12)
27. `lib/auth.config.ts` huérfano — eliminar (#13)
28. Datos del negocio desde dashboard (#17)

### FUTURO (más adelante)
- i18n completo dashboard + bot multi-región
- Cumplimiento protección de datos GDPR / Ley 1581 / LFPDPPP
- Sistema de planes formal con Stripe/Wompi
- WhatsApp Cloud API oficial por cliente
- Migración n8n → Node.js+BullMQ+Redis
- Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes
- Integración Google Calendar
- Expansión regional, exportación CSV

### FUTURO
19. Sistema de planes formal con Stripe/Wompi.
20. Documentación operativa centralizada (guía de tareas repetitivas).
21. WhatsApp Cloud API oficial por cliente.
22. Migración n8n → Node.js+BullMQ+Redis (adelantar a Sprint 14 si i18n lo requiere).
23. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes.
24. Tabla `services` normalizada.
25. Backup automático de DB (pg_dump diario + copia remota a Backblaze/S3/Mac)
26. Mover DNS a Cloudflare, staging environment, rate limit en PostgreSQL.
26. Expansión regional, exportación CSV.
27. **Integración Google Calendar en el dashboard** — Sync bidireccional entre el calendario del dashboard y Google Calendar del usuario, para facilitar gestión. Service Account conservada en Google Cloud Console (key revocada el 6 julio 2026 — crear nueva key cuando se implemente). **OAuth flow recomendado** (no Service Account JSON) para que cada usuario conecte su propio Google Calendar. Ver `docs/SECURITY_AUDIT.md` → "Pendiente como feature futura".

## Reglas de trabajo (no negociables)
- **claude.ai:** arquitectura, documentos de implementación como archivos descargables.
- **Claude Code:** ejecución local únicamente. Nunca commitea sin aprobación de diff.
- Nunca `git add -A` sin revisar `git status` primero.
- Deploy: migración DB ANTES del código. Commits desde Mac, nunca desde VPS.
- No construir sin aprobación explícita.

## Lecciones aprendidas Sprint 11
- Al agregar nuevo role en DB, verificar constraint existente antes de insertar datos.
- Orden para rename de role con constraint: (1) ampliar constraint para aceptar ambos, (2) UPDATE datos, (3) cerrar constraint. Al revés da error.
- Conteo de límite de plan debe usar `users WHERE role='profesional'`, NO tabla `professionals` (puede tener filas huérfanas).
- Owner y admin no tienen agenda propia. Solo `profesional` tiene `professional_id` activo.

## Seguridad pendiente
> Reporte completo y plan de remediación: **`docs/SECURITY_AUDIT.md`** (leer primero).
>
> Estado al 10 julio 2026 (sesión 3):
> - ✅ Git history 100% limpio — `gitleaks`: 0 leaks, verificado desde clon fresco de GitHub (`main` + `fix/tab-title`)
> - ✅ **Evolution API restaurado** — causa raíz: contenedores sin `restart policy` tras reboot del VPS. Ahora `restart: unless-stopped` en los 3 (api/postgres/redis). WhatsApp reconectado sin re-escanear QR.
> - ✅ Password SSH rotada + acceso por key `id_ed25519` configurado
> - ✅ Password `meyer_user` PostgreSQL rotada — `.env` actualizados (Mac + VPS) + credencial de n8n UI actualizada
> - ✅ Firewall: puerto 8080 de Evolution API cerrado al público (UFW + iptables `DOCKER-USER`, persistido)
> - ✅ PAT de GitHub removido de la URL del remote git (ahora vía `gh auth`)
> - 🟡 **Pendiente**: rotar la Evolution API Key en sí (ya desbloqueado, falta ejecutar — requiere downtime breve)
> - 🟡 **Pendiente**: volumen persistente para `evolution-postgres`/`evolution-redis` (hoy los datos viven solo en el contenedor)
> - 🟡 **Pendiente**: migrar secrets hardcodeados del `docker-compose.yaml` de Evolution API a `.env`
> - 🟡 GOOGLE_PRIVATE_KEY en .env del VPS (key ya revocada, pero falta limpiar el archivo)
> - **🔴 CRÍTICO — Backup de DB requerido antes de producción seria:**
>   - `meyer_postgres` tiene volumen Docker pero **0 backups** — si el volumen se corrompe o borra, se pierde todo
>   - `evolution-postgres` y `evolution-redis` **sin volúmenes persistentes** — datos desaparecen si el contenedor se elimina
>   - **Fix pendiente:** (1) volúmenes persistentes para evolution, (2) cron diario `pg_dump` → comprimido → copia remota (Backblaze B2 ~$1-2/mes o a tu Mac vía SCP)
> - ✅ Bitwarden Cloud Free — SSH password y DB password nuevas ya guardadas
> - ✅ npm audit fix aplicado en local (commit `4a302ef`, no deployado)
> - ✅ 1 vuln moderate (postcss) queda — requiere upgrade Next.js
> - ⏳ Pendiente pre-Sprint 15: rate limiting, security headers, compliance Ley 1581
>
> NUNCA subir .env ni secrets a Git.

## Docs de referencia
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas, RBAC, multi-profesional
- `docs/SPRINTS.md` — historial completo Sprint 0-14, backlog fases 2-4
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API, variables de entorno, túnel SSH, Beszel, Uptime Kuma
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas
- `docs/SECURITY_AUDIT.md` — ⚠️ auditoría de seguridad, leaks, plan de remediación, políticas
- `docs/superpowers/specs/2026-07-11-sprint15-metricas-premium.md` — spec Sprint 15 (Dashboard Métricas Premium), aprobado pendiente implementación
- `docs/ARCHITECTURE_FUTURE.md` — plan de escalabilidad, triggers de migración, thresholds para upgrade de infraestructura, proyecciones por tipo de negocio, costos, monitoreo con Beszel + Uptime Kuma
