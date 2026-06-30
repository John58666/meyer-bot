# CONTEXT.md — meyer-bot

> Última actualización: 29 de junio de 2026 (post Sprint 9 — Configuración + Nav responsive).
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
- **Dashboard operativo:** título dinámico, calendario clickeable, agendar manual, servicios dinámicos con precios, hora libre, anti-doble-booking, métricas con selector de rango Hoy/Semana/Mes, bloqueos de agenda (días cerrados y horarios especiales), **edición de servicios desde dashboard**, **nav responsive móvil 4 ítems**.
- **Bot robusto:** fallback chain multi-LLM, historial conversacional, filtro de audios/multimedia, scope off-topic, rate limit. Slots cada 30 minutos. Respeta `schedule_exceptions`.
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

## Navegación — estado actual

### Bottom nav móvil (4 ítems fijos)
| Ícono | Label | Ruta | Estado |
|-------|-------|------|--------|
| 🏠 | Inicio | `/dashboard` | ✅ |
| 📅 | Agenda | `/dashboard/semana` | ✅ |
| 📊 | Métricas | `/dashboard/metricas` | ✅ |
| 👥 | Clientes | `/dashboard/clientes` | 404 hasta Sprint CRM |

### Sidebar PC
- Nav principal: Inicio, Agenda, Métricas, Clientes
- Bottom: ⚙️ Configuración (`/dashboard/configuracion`), ❓ Ayuda
- Configuración también accesible desde dropdown del avatar en móvil (oculto en PC con `sm:hidden`)

### Dropdown avatar
- Muestra: nombre del usuario + nombre del negocio
- Ítems: Configuración (solo móvil, `sm:hidden`), Cerrar sesión

## Archivos clave del dashboard
- `dashboard/lib/parse-services.ts` — `parsePrice()` y `parseServices()`: parsean `services_text` a Map/array con precios.
- `dashboard/lib/actions.ts` — server actions: `createAppointment`, `updateAppointmentStatus`, `rescheduleAppointment`, `getMetricas`, `getBloqueos`, `createBloqueo`, `deleteBloqueo`, `updateServicesText`.
- `dashboard/components/metricas/metricas-client.tsx` — client component métricas con recharts.
- `dashboard/components/bloqueos/bloqueos-client.tsx` — client component bloqueos (crear, editar inline, eliminar).
- `dashboard/components/configuracion/servicios-client.tsx` — client component edición de servicios con preview en tiempo real.
- `dashboard/app/(dashboard)/dashboard/semana/bloqueos/page.tsx` — página bloqueos.
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — página configuración (primer ítem: Servicios).
- `dashboard/app/(dashboard)/layout.tsx` — layout shell. `<main>` con `ml-0 sm:ml-[56px] mt-[56px] pb-[56px] sm:pb-0 p-6`.
- `dashboard/components/sidebar.tsx` — sidebar PC con 4 ítems nav + 2 bottom (Config, Ayuda).
- `dashboard/components/topbar.tsx` — topbar con bottom nav móvil 4 ítems + dropdown avatar.

## Backlog priorizado

### 🔴 SPRINT 10 (próximo)
1. **Sprint RBAC** — middleware de rol + `professionalId` en JWT + filtros en actions + UI condicional. **Prerrequisito de multi-barbero.**
2. **CRM** — upsert automático en `customers` al agendar por WhatsApp + UI `/dashboard/clientes` (activa el botón del nav).

### 🟡 DESPUÉS
3. **Multi-barbero completo** — sprint dedicado DESPUÉS de RBAC.
4. **Fix 3** — verificar sync cancelación WhatsApp → dashboard en producción.
5. **Notificación al dueño con nombre del cliente** — lookup en `customers` en `Construir Mensajes`.
6. **Quitar branding "Meyer"** del producto.
7. **Confirmar services_text de Brayan** con el cliente y aplicar UPDATE.
8. **Password fuerte con Bitwarden.**
9. **Horarios desde dashboard** — editar `schedule_text` JSONB (hoy solo via SQL manual).
10. **Datos del negocio desde dashboard** — nombre, teléfono owner, timezone.

### 🟠 ALTA PRIORIDAD
11. **`Confirmar Reagendamiento` → Raw body** — deuda técnica (hoy usa IIFE en bodyParameters).
12. Gestión de no-shows: cron que auto-completa citas pasadas sin marcar.
13. `reminder_config` JSONB en businesses: recordatorios configurables por negocio.
14. Panel admin Johnander (todos los negocios, métricas agregadas).
15. Google private key fuera del .env del VPS.
16. Evolution API en 0.0.0.0:8080 — asegurar con firewall.
17. **`pm2 reload`** en vez de `pm2 restart` cuando haya 10+ clientes (zero-downtime).
18. Staging environment cuando se haga upgrade de VPS.
19. `middleware.ts` deprecation warning — renombrar a convención `proxy` en Next.js futuro.

### 🟢 FUTURO
20. WhatsApp Cloud API oficial.
21. Prompt caching.
22. Timezone dinámico por negocio.
23. Mover DNS a Cloudflare.
24. Rate limit persistente en PostgreSQL.
25. Facturación Stripe/Wompi.
26. Migración n8n → Node.js + BullMQ + Redis (30+ clientes).
27. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes.
28. Tabla `services` normalizada (reemplaza `services_text`).
29. Expansión regional.
30. Exportación CSV clientes/métricas.

## Reglas de trabajo (no negociables)
- **claude.ai:** arquitectura, decisiones, documentos de implementación numerados.
- **Claude Code:** ejecución en repo local únicamente. Nunca commitea sin aprobación de diff.
- Flujo: claude.ai diseña → Johnander aprueba → Claude Code ejecuta → claude.ai revisa diff → Johnander aprueba → commit.
- `/model sonnet` para archivos simples. `/model opus` para lógica compleja.
- `/clear` en Claude Code entre pasos mayores.
- **Claude Code nunca hace `git add -A` sin que Johnander revise `git status` primero** — puede incluir archivos huérfanos.
- **Contradecir si hay error** — Claude Code verifica rutas/hechos reales antes de asumir que el diagnóstico es correcto.
- Deploy seguro: migración DB ANTES del deploy de código. Ver RUNBOOK.md y ARCHITECTURE.md.

## Lecciones aprendidas Sprint 9
- `git add -A` en la raíz del repo incluye archivos huérfanos (docs viejos, package.json de scripts). Siempre revisar `git status` y `git diff --staged --name-only` antes de commitear.
- `window.location.href` en Next.js client component funciona pero hace hard navigation. Usar `router.push` de `useRouter` para client-side routing correcto.
- `sm:hidden` en Tailwind oculta en `sm` (≥640px) y muestra en móvil — patrón correcto para ítems solo móvil.
- Configuración en el dropdown del avatar con `sm:hidden` + engranaje en sidebar PC = solución limpia sin duplicados.
- Bottom nav de 4 ítems con Clientes apuntando a 404 es preferible a un slot vacío — el usuario ve el nav completo y entiende que viene.

## Seguridad pendiente
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ Evolution API expuesta en 0.0.0.0:8080
- ⚠️ Password meyer_user débil (pendiente Bitwarden)
- ⚠️ RBAC no implementado — role viaja en JWT pero nadie lo lee
- NUNCA subir .env ni secrets a Git

## Docs de referencia
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas, RBAC, multi-barbero
- `docs/SPRINTS.md` — historial completo Sprint 0-9
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API, variables de entorno, túnel SSH
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas n8n + LLM + Next.js + infra
