# CONTEXT.md — meyer-bot

> Última actualización: 29 de junio de 2026 (post Sprint 7 — Métricas dashboard).
> Documento maestro CORTO. Cualquier chat nuevo lee esto primero.
> Para profundidad: ver docs/ (ARCHITECTURE.md, SPRINTS.md, RUNBOOK.md, KEY_LEARNINGS.md)

## Qué es este proyecto
SaaS WhatsApp-native de agendamiento para barberías y salones en LATAM.
Bot conversacional WhatsApp + dashboard de gestión + CRM (en desarrollo).
Diferenciador: WhatsApp-native (Fresha/Booksy/SimplyBook obligan a salir de WhatsApp).
Expansión: Colombia → España, México, EEUU.

> **Naming:** "meyer-bot" es el repo interno. "Meyer" es también un negocio real (business_id=1). Pendiente desacoplar branding (ver Backlog).

## Estado del producto
- **Vendible HOY** para negocios de un solo barbero. E2E completo (agendar/cancelar/reagendar).
- **Dashboard operativo:** título dinámico, calendario clickeable, agendar manual, servicios dinámicos con precios, hora libre, anti-doble-booking, **métricas con selector de rango Hoy/Semana/Mes**.
- **Bot robusto:** fallback chain multi-LLM, historial conversacional, filtro de audios/multimedia, scope off-topic, rate limit.
- **NO vendible aún** para multi-barbero (ver ARCHITECTURE.md).
- Brayan Study (business_id=3, 1 barbero) es el primer cliente real. Operativo.

## Stack
- **n8n 2.10.3** self-hosted — orquestador workflows. Migrar a Node.js+BullMQ+Redis antes de 30 clientes.
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
- ⚠️ `npm run build` se ejecuta desde `/root/meyer-bot/dashboard/`, NO desde la raíz del repo.
- Commits siempre desde Mac, nunca desde VPS.
- Ver RUNBOOK.md para comandos completos.

## Negocios en producción

| id | name | whatsapp_instance | owner_number | estado |
|----|------|-------------------|--------------|--------|
| 1 | Peluquería Meyer | peluqueria-beta | 573142556322 | ✅ activo |
| 2 | Negocio Prueba | negocio-prueba | 57XXXXXXXXXX | pruebas |
| 3 | Brayan Study | brayan-study | 573136053693 | ✅ activo |

**Brayan Study:**
- Medina, Cundinamarca. Primer cliente real.
- Servicios en DB: `Corte caballero $18.000, Corte+barba $22.000, Barba $10.000, Cejas $5.000`
- ⚠️ Pendiente confirmar nombres reales con Brayan y aplicar UPDATE (ver Backlog).
- Horarios: Lun 12PM-7PM | Mar-Sáb 7AM-7PM | Dom 7AM-4PM
- Dashboard: `brayanvaca84@gmail.com`, business_id=3

## JWT actual
Contiene: `userId`, `email`, `name`, `businessId`, `businessName`, `multiProfessional`, `role`.
`professional_id` en tabla `users` existe (migración 005 ejecutada). **Pendiente Sprint RBAC:** agregar `professionalId` al JWT con middleware de rol.

## Bottom nav definitivo (no cambiar sin aprobación)
| Ícono | Label | Ruta | Estado |
|-------|-------|------|--------|
| 🏠 | Inicio | `/dashboard` | ✅ existe |
| 📅 | Agenda | `/dashboard/semana` | ✅ existe |
| 📊 | Métricas | `/dashboard/metricas` | ✅ Sprint 7 |
| 👥 | Clientes | `/dashboard/clientes` | Sprint CRM |

## Archivos clave del dashboard
- `dashboard/lib/parse-services.ts` — `parsePrice()` y `parseServices()`: parsean `services_text` a Map/array con precios. Función compartida, usar en cualquier feature que necesite precios.
- `dashboard/lib/actions.ts` — server actions: `createAppointment`, `updateAppointmentStatus`, `rescheduleAppointment`, `getMetricas`.
- `dashboard/components/metricas/metricas-client.tsx` — client component métricas con recharts. URL params para rango (`?rango=hoy|semana|mes`).
- `dashboard/app/(dashboard)/layout.tsx` — layout shell. `<main>` con `ml-0 sm:ml-[56px] mt-[56px] pb-[56px] sm:pb-0 p-6`. Los componentes de página NO deben agregar `max-w` ni `mx-auto` propios — el layout ya maneja el espaciado.

## Backlog priorizado

### 🔴 SPRINT 8 (próximo)
1. **Bloqueo de agenda** — UI dashboard para crear `schedule_exceptions` + JOIN en `Leer Slots Disponibles` de n8n para respetarlas. Cruza dashboard + n8n. Alta prioridad de venta (dueños lo preguntan activamente).
2. **Edición de servicios desde dashboard** — UI + validación formato `"Nombre $precio, ..."`. El bot ya lee `services_text` desde DB en cada turno, no requiere cambios en n8n. Usar `parseServices()` de `lib/parse-services.ts`.

### 🟡 DESPUÉS
3. **Sprint RBAC** — middleware de rol + `professionalId` en JWT + filtros en actions + UI condicional. **Prerrequisito de multi-barbero.** Sin esto, un barbero con login puede ver/modificar todo el negocio.
4. **CRM** — upsert automático en `customers` al agendar por WhatsApp + UI `/dashboard/clientes`.
5. **Fix 3** — verificar sync cancelación WhatsApp → dashboard en producción.
6. **Notificación al dueño con nombre del cliente** — lookup en `customers` en `Construir Mensajes`.
7. **Quitar branding "Meyer"** del producto.
8. **Confirmar services_text de Brayan** con el cliente y aplicar UPDATE.
9. **Password fuerte con Bitwarden.**

### 🟠 ALTA PRIORIDAD
10. **Multi-barbero completo** — sprint dedicado DESPUÉS de RBAC (ver ARCHITECTURE.md).
11. **`Confirmar Reagendamiento` → Raw body** — deuda técnica (hoy usa IIFE en bodyParameters).
12. Gestión de no-shows: cron que auto-completa citas pasadas sin marcar.
13. `reminder_config` JSONB en businesses: recordatorios configurables por negocio.
14. Panel admin Johnander (todos los negocios, métricas agregadas).
15. Google private key fuera del .env del VPS.
16. Evolution API en 0.0.0.0:8080 — asegurar con firewall.
17. **`pm2 reload`** en vez de `pm2 restart` cuando haya 10+ clientes (zero-downtime).
18. Staging environment cuando se haga upgrade de VPS.

### 🟢 FUTURO
19. WhatsApp Cloud API oficial.
20. Prompt caching.
21. Timezone dinámico por negocio.
22. Mover DNS a Cloudflare.
23. Rate limit persistente en PostgreSQL.
24. Facturación Stripe/Wompi.
25. Migración n8n → Node.js + BullMQ + Redis (30+ clientes).
26. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes → ahí meter staging.
27. Tabla `services` normalizada (reemplaza `services_text`).
28. Expansión regional.
29. Exportación CSV clientes/métricas (aditiva, no afecta arquitectura actual).

## Reglas de trabajo (no negociables)
- **claude.ai:** arquitectura, decisiones, documentos de implementación numerados.
- **Claude Code:** ejecución en repo local únicamente. Nunca commitea sin aprobación de diff.
- Flujo: claude.ai diseña → Johnander aprueba → Claude Code ejecuta → claude.ai revisa.
- `/model sonnet` para archivos simples. `/model opus` para lógica compleja.
- `/clear` en Claude Code entre pasos mayores.
- **Contradecir si hay error** — en Sprint 6 claude.ai tuvo error de diagnóstico en `revalidatePath` que Claude Code siguió sin verificar. Claude Code verifica rutas/hechos reales antes de asumir que el diagnóstico es correcto.
- Deploy seguro: migración DB ANTES del deploy de código. Ver RUNBOOK.md y ARCHITECTURE.md.

## Lecciones aprendidas Sprint 7
- `npm run build` se corre desde `dashboard/`, no desde la raíz del repo. El `package.json` está en `dashboard/`.
- `git pull` en VPS siempre ANTES de ejecutar la migración — el archivo SQL viaja en el repo.
- Si VPS tiene cambios locales sin commitear (ej: `package-lock.json` modificado por `npm install`), hacer `git checkout -- <archivo>` antes del pull.
- `recharts` instalado en Mac via `npm install` — el VPS necesita su propio `npm install` antes del build si el paquete es nuevo.
- Los componentes de página no deben agregar `max-w` ni `mx-auto` propios — el `<main>` del layout ya maneja el espaciado con `p-6`.
- DB: nombre es `meyer_db`, usuario `meyer_user`. Conectar via `docker exec -i meyer_postgres su -s /bin/sh postgres -c "psql -U meyer_user -d meyer_db"`.

## Seguridad pendiente
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ Evolution API expuesta en 0.0.0.0:8080
- ⚠️ Password meyer_user débil (pendiente Bitwarden)
- ⚠️ RBAC no implementado — role viaja en JWT pero nadie lo lee
- NUNCA subir .env ni secrets a Git

## Docs de referencia
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas, RBAC, multi-barbero
- `docs/SPRINTS.md` — historial completo Sprint 0-7
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API, variables de entorno, túnel SSH
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas n8n + LLM + Next.js + infra
