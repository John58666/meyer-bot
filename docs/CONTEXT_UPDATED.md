# CONTEXT.md — meyer-bot

> Última actualización: 9 julio 2026 (sesión 2 — auditoría seguridad + VPS diagnosticado).
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
- **Dashboard operativo:** título dinámico, calendario clickeable, agendar manual, servicios dinámicos con precios, hora libre, anti-doble-booking, métricas con selector de rango Hoy/Semana/Mes, bloqueos de agenda, edición de servicios, nav responsive móvil 4 ítems, CRM /dashboard/clientes, **RBAC completo (Sprint 11)**, **gestión de equipo /dashboard/equipo**.
- **Bot robusto:** fallback chain multi-LLM, historial conversacional, filtro de audios/multimedia, scope off-topic, rate limit. Slots cada 30 minutos. Respeta `schedule_exceptions`. Upsert automático en `customers` al agendar.
- **NO vendible aún** para multi-profesional (ver ARCHITECTURE.md).
- Brayan Study (business_id=3, 1 profesional) es el primer cliente real. Operativo.

## Stack
- **n8n 2.10.3** self-hosted — orquestador workflows. Migrar a Node.js+BullMQ+Redis antes de 30 clientes (adelantar a Sprint 14 por i18n multi-región).
- **Evolution API v2.3.7** — conexión WhatsApp. Migrar a WA Cloud API oficial por cliente.
- **LLM fallback chain:** Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- **PostgreSQL 16 Alpine** (Docker: `meyer_postgres`, DB: `meyer_db`, usuario: `meyer_user`) — única DB.
- **Next.js 16** + App Router + Tailwind v4 + shadcn/ui + **recharts** — dashboard en producción.
- **NextAuth v5** JWT — auth dashboard contra PostgreSQL.
- **PM2** + nginx — proceso y proxy en VPS. Dashboard en `/root/meyer-bot/dashboard/`.
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
| Plan 1 | 3 | 1 |
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
- Bottom: Configuración (oculto para `profesional`), Equipo (solo `owner`), Ayuda
- Configuración y Equipo también en dropdown avatar móvil (sm:hidden)

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

### SPRINT 12 (próximo)
1. **Multi-profesional completo** — selección de profesional en bot (2 turnos extra), disponibilidad por `professional_id`, UI agenda paralela, métricas por profesional para owner/admin.

### SPRINT 13
2. **Auditoría** — tabla `audit_log`, instrumentación de actions, UI de consulta para owner/admin.

### SPRINT 14
3. **i18n completo** — dashboard multi-idioma + bot multi-idioma/multi-jerga por región (Colombia, México, España, USA/Canadá). Requiere system prompt configurable por negocio. Probable adelanto de migración n8n → Node.js+BullMQ+Redis.

### SPRINT 15
4. **Cumplimiento protección de datos** — GDPR (España), Ley 1581 Colombia (ya aplica HOY), LFPDPPP México.

### FIXES PENDIENTES
5. **Servicios nuevos no reflejados en bot** — al guardar desde configuración, bot puede usar services_text anterior. Investigar orden en system prompt vs timing del lookup. Fix probable: mover servicios al inicio del system prompt del AI Agent.
6. Fix 3 — sync cancelación WhatsApp → dashboard, pendiente verificación.
7. `Confirmar Reagendamiento` → Raw body (deuda técnica, usa IIFE hoy).
8. `updateMiembroRole` profesional→admin no valida `max_admins` — caso borde bajo riesgo.
9. `lib/auth.config.ts` huérfano — eliminar en sprint de limpieza.
10. Notificación al dueño con nombre del cliente (lookup en `customers` en Construir Mensajes).
11. Quitar branding "Meyer" del producto.
12. Confirmar services_text de Brayan y aplicar UPDATE.
13. Horarios desde dashboard (editar `schedule_text` sin SQL).
14. Datos del negocio desde dashboard (nombre, teléfono, timezone).
15. Gestión de no-shows: cron que auto-completa citas pasadas.
16. `reminder_config` JSONB configurable por negocio.
17. Panel admin Johnander (todos los negocios, métricas agregadas).
18. `pm2 reload` en vez de `pm2 restart` a 10+ clientes.

### FUTURO
19. Sistema de planes formal con Stripe/Wompi.
20. Documentación operativa centralizada (guía de tareas repetitivas).
21. WhatsApp Cloud API oficial por cliente.
22. Migración n8n → Node.js+BullMQ+Redis (adelantar a Sprint 14 si i18n lo requiere).
23. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes.
24. Tabla `services` normalizada.
25. Mover DNS a Cloudflare, staging environment, rate limit en PostgreSQL.
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
> Estado al 6 julio 2026:
> - 🔴 6 leaks de Google Private Key en git history (gitleaks)
> - 🟡 2 leaks de Evolution API Key en git history (gitleaks)
> - 🔴 Evolution API expuesta en 0.0.0.0:8080 (sin firewall)
> - 🔴 Password meyer_user débil en PostgreSQL
> - 🟡 GOOGLE_PRIVATE_KEY en .env del VPS
> - ✅ Bitwarden Cloud Free configurado como gestor de secrets
> - ✅ npm audit fix aplicado en local (commit `4a302ef`, no deployado)
> - ✅ 1 vuln moderate (postcss) queda — requiere upgrade Next.js
> - ⏳ Pendiente: rotar keys, firewall VPS, limpiar git history, compliance Ley 1581
>
> NUNCA subir .env ni secrets a Git.

## Docs de referencia
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas, RBAC, multi-profesional
- `docs/SPRINTS.md` — historial completo Sprint 0-11
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API, variables de entorno, túnel SSH
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas
- `docs/SECURITY_AUDIT.md` — ⚠️ auditoría de seguridad, leaks, plan de remediación, políticas
