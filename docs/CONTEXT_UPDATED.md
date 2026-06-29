# CONTEXT.md — meyer-bot

> Última actualización: 29 de junio de 2026 (post Sprint 6 + decisiones arquitectura Sprint 7).
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
- **Dashboard operativo:** título dinámico, calendario clickeable, agendar manual, servicios dinámicos con precios, hora libre, anti-doble-booking.
- **Bot robusto:** fallback chain multi-LLM, historial conversacional, filtro de audios/multimedia, scope off-topic, rate limit.
- **NO vendible aún** para multi-barbero (ver ARCHITECTURE.md).
- Brayan Study (business_id=3, 1 barbero) es el primer cliente real. Operativo.

## Stack
- **n8n 2.10.3** self-hosted — orquestador workflows. Migrar a Node.js+BullMQ+Redis antes de 30 clientes.
- **Evolution API v2.3.7** — conexión WhatsApp. Migrar a WA Cloud API oficial por cliente.
- **LLM fallback chain:** Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- **PostgreSQL 16 Alpine** (Docker: `meyer_postgres`) — única DB.
- **Next.js 16** + App Router + Tailwind v4 + shadcn/ui — dashboard en producción.
- **NextAuth v5** JWT — auth dashboard contra PostgreSQL.
- **PM2** + nginx — proceso y proxy en VPS.
- **VPS Ubuntu Hetzner** 178.104.27.180 (2 vCPU / 3.7GB RAM / 38GB disco).

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local Mac: `~/Documents/meyer-bot`
- VPS: `/root/meyer-bot`
- Deploy: `git push` Mac → `git pull` VPS → `npm run build` → `pm2 restart meyer-dashboard`
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
- ⚠️ Pendiente confirmar nombres reales con Brayan y aplicar UPDATE (ver ARCHITECTURE.md).
- Horarios: Lun 12PM-7PM | Mar-Sáb 7AM-7PM | Dom 7AM-4PM
- Dashboard: `brayanvaca84@gmail.com`, business_id=3

## JWT actual
Contiene: `userId`, `email`, `name`, `businessId`, `businessName`, `multiProfessional`, `role`.
**Pendiente Sprint 7:** agregar `professionalId` (nullable) para RBAC y métricas por barbero.

## Bottom nav definitivo (no cambiar sin aprobación)
| Ícono | Label | Ruta | Estado |
|-------|-------|------|--------|
| 🏠 | Inicio | `/dashboard` | ✅ existe |
| 📅 | Agenda | `/dashboard/semana` | ✅ existe |
| 📊 | Métricas | `/dashboard/metricas` | Sprint 7 |
| 👥 | Clientes | `/dashboard/clientes` | Sprint CRM |

## Backlog priorizado

### 🔴 SPRINT 7 (próximo)
1. **Métricas dashboard** — vista nueva `/dashboard/metricas`: ingresos (solo citas Completadas), tasa cancelación, horas pico, historial día/semana/mes. Sin género (dato no existe aún). Exportación CSV incluida. Queries con filtro `professional_id` opcional preparado para multi-barbero. Ver ARCHITECTURE.md para decisiones de diseño.
2. **Migración `004_sprint7.sql`** — `ALTER TABLE users ADD COLUMN professional_id INTEGER REFERENCES professionals(id)` (nullable). Prerequisito de RBAC.
3. **Bloqueo de agenda** — UI dashboard + JOIN `schedule_exceptions` en `Leer Slots Disponibles` de n8n. Cruza dashboard + n8n. Sprint dedicado.
4. **Edición de servicios desde dashboard** — UI + validación formato `"Nombre $precio, ..."`. El bot ya lee `services_text` desde DB en cada turno, no requiere cambios en n8n.

### 🟡 DESPUÉS
5. **Sprint RBAC** — middleware de rol + filtros en actions + UI condicional. **Prerrequisito de multi-barbero.** Sin esto, un barbero con login puede ver/modificar todo el negocio.
6. **CRM** — upsert automático en `customers` al agendar por WhatsApp + UI `/dashboard/clientes`.
7. **Fix 3** — verificar sync cancelación WhatsApp → dashboard en producción.
8. **Notificación al dueño con nombre del cliente** — lookup en `customers` en `Construir Mensajes`.
9. **Quitar branding "Meyer"** del producto.
10. **Confirmar services_text de Brayan** con el cliente y aplicar UPDATE.
11. **Password fuerte con Bitwarden.**

### 🟠 ALTA PRIORIDAD
12. **Multi-barbero completo** — sprint dedicado DESPUÉS de RBAC (ver ARCHITECTURE.md).
13. **`Confirmar Reagendamiento` → Raw body** — deuda técnica (hoy usa IIFE en bodyParameters).
14. Gestión de no-shows: cron que auto-completa citas pasadas sin marcar.
15. `reminder_config` JSONB en businesses: recordatorios configurables por negocio.
16. Panel admin Johnander (todos los negocios, métricas agregadas).
17. Google private key fuera del .env del VPS.
18. Evolution API en 0.0.0.0:8080 — asegurar con firewall.
19. **`pm2 reload`** en vez de `pm2 restart` cuando haya 10+ clientes (zero-downtime).
20. Staging environment cuando se haga upgrade de VPS.

### 🟢 FUTURO
21. WhatsApp Cloud API oficial.
22. Prompt caching.
23. Timezone dinámico por negocio.
24. Mover DNS a Cloudflare.
25. Rate limit persistente en PostgreSQL.
26. Facturación Stripe/Wompi.
27. Migración n8n → Node.js + BullMQ + Redis (30+ clientes).
28. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes → ahí meter staging.
29. Tabla `services` normalizada (reemplaza `services_text`).
30. Expansión regional.
31. Exportación CSV clientes/métricas (aditiva, no afecta arquitectura actual).

## Reglas de trabajo (no negociables)
- **claude.ai:** arquitectura, decisiones, documentos de implementación numerados.
- **Claude Code:** ejecución en repo local únicamente. Nunca commitea sin aprobación de diff.
- Flujo: claude.ai diseña → Johnander aprueba → Claude Code ejecuta → claude.ai revisa.
- `/model sonnet` para archivos simples. `/model opus` para lógica compleja.
- `/clear` en Claude Code entre pasos mayores.
- **Contradecir si hay error** — en Sprint 6 claude.ai tuvo error de diagnóstico en `revalidatePath` que Claude Code siguió sin verificar. Claude Code verifica rutas/hechos reales antes de asumir que el diagnóstico es correcto.
- Deploy seguro: migración DB ANTES del deploy de código. Ver RUNBOOK.md y ARCHITECTURE.md.

## Seguridad pendiente
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ Evolution API expuesta en 0.0.0.0:8080
- ⚠️ Password meyer_user débil (pendiente Bitwarden)
- ⚠️ RBAC no implementado — role viaja en JWT pero nadie lo lee
- NUNCA subir .env ni secrets a Git

## Docs de referencia
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas, RBAC, multi-barbero
- `docs/SPRINTS.md` — historial completo Sprint 0-6
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API, variables de entorno, túnel SSH
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas n8n + LLM + Next.js + infra
