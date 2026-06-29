# SPRINTS.md — meyer-bot

> Historial completo de sprints. Solo para referencia. No se lee en cada chat.

## Sprint 0 — COMPLETADO ✅ (Mayo 18, 2026)
- Variables de entorno migradas a .env (EVOLUTION_API_KEY, URL, OWNER_NUMBER)
- Google private key eliminada del workflow

## Sprint 1 — COMPLETADO ✅ (Mayo 18, 2026)
- PostgreSQL en Docker, schema multi-tenant
- Meyer como business_id=1, 34 citas migradas desde Sheets

## Sprint 2 — COMPLETADO ✅ (Mayo 19, 2026)
- Disponibilidad proactiva con generate_series
- Timezone America/Bogota en todos los queries

## Sprint 3 — COMPLETADO ✅ (Mayo 25, 2026)
- Tablas: users, professionals
- Dashboard en producción con login, vista Hoy, vista Semana
- Polling 30s, responsive mobile-first

## Sprint 4 — COMPLETADO ✅ (Junio 12, 2026)
**Dashboard:** Vista Calendario en /semana (toggle Lista/Calendario), grilla de mes con puntos de color por estado, bottom sheet por día con acciones, nombre del negocio dinámico en topbar, multi-barbero UI condicional por flag `multi_professional`, script `create-user.js`.
**Workflows:** workflow genérico multi-tenant, cancelación/reagendamiento E2E con tabla `sessions`, recordatorios 24h multi-tenant.
**DB:** columnas `services_text`, `prompt_name`, `schedule_text JSONB` en `businesses`; tablas `sessions`, `customers`, `schedule_exceptions`.

## Sprint 5 (Multi-LLM + E2E + Hardening) — COMPLETADO ✅ (Junio 26-27, 2026)
- Fallback chain multi-LLM: Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- Historial conversacional persistente en `conversation_history` (JSONB, TTL 2h)
- E2E bloques 1-6 todos pasados
- 9 bugs corregidos (slots pasados, hora ambigua, `==` en n8n, jerga colombiana, día de semana incorrecto, etc.)
- Brayan Study conectado (QR escaneado, bot operativo)
- Credenciales rotadas, repo sincronizado

## Sprint 6 (Fixes Dashboard + Bot hardening) — COMPLETADO ✅ (Junio 28-29, 2026)

### Fix 1 — Título de pestaña sincronizado ✅
**Causa raíz:** `app/layout.tsx` importaba `auth` desde `@/lib/auth` (segunda instancia de NextAuth). Dos instancias resuelven la sesión distinto → solo el `<title>` se desincronizaba.
**Fix:** unificación a `@/auth`. `lib/auth.ts` colapsado a re-export limpio.
**Archivos:** `dashboard/app/layout.tsx`, `dashboard/lib/auth.ts`

### Fix 2+4 — Calendario clickeable + Agendar cita manual ✅
- Todos los días reales del calendario son clickeables.
- Sheet decide según fecha: con citas + hoy/futuro → lista + CTA agendar; vacío + hoy/futuro → empty state + CTA; pasado → sin CTA.
- `NewAppointmentSheet`: servicios dinámicos con precio desde `services_text`, fecha precargada, hora libre `<input type="time">`, anti-doble-booking con warning suave + override.
- `services_text` fetchado desde DB en cada page server component en paralelo con otras queries.
- `revalidatePath("/dashboard/semana")` ES CORRECTO (carpeta `dashboard` es real, `(dashboard)` es route group invisible).
**Archivos:** `calendar-month-view.tsx`, `day-appointments-sheet.tsx`, `new-appointment-sheet.tsx`, `lib/actions.ts`, `semana/page.tsx`, `semana/SemanaClient.tsx`, `dashboard/page.tsx`

### Fix — Precios en selector de servicios ✅
Parser `parseServices` muestra nombre + precio en cada opción. Útil para métricas de ingresos.

### Fix — Filtro mensajes no-texto ✅
`Procesar Mensaje` detecta audio/ptt/imagen/video/sticker/documento/ubicación/liveLocation y responde "Solo proceso mensajes de texto 😊 Escríbeme lo que necesitas." Corta el flujo sin pasar por el LLM.

### Fix — Scope off-topic en system prompt ✅
Bloque SCOPE: redirige en 1 línea si el mensaje no tiene relación con citas/servicios/horarios/precios.
Bloque RECOMENDACIONES: puede responder brevemente si el cliente pregunta qué servicio le conviene, basándose ÚNICAMENTE en el catálogo del negocio.

### Correcciones de datos en DB ✅
- `businesses.name` de Meyer estaba corrupto ("Barbería Brayan") → corregido a "Peluquería Meyer"
- `businesses.services_text` de Meyer y Brayan tenían formato con guiones → corregido a formato coma-separado

### Fix 3 — Sync cancelación WhatsApp → dashboard
**En pausa.** El polling 30s + `revalidatePath` ya parecen manejarlo. Pendiente verificación en producción.

---

## Sprint 7 (Métricas Dashboard) — COMPLETADO ✅ (Junio 29, 2026)

### Métricas operativas en `/dashboard/metricas` ✅
Vista nueva con selector de rango Hoy/Semana/Mes via URL params (`?rango=hoy|semana|mes`).

**KPIs:**
- Ingresos del período (solo citas `Completada`, parseando precio desde `services_text`)
- Total citas + cuántas completadas
- Tasa de cancelación (%)
- Hora pico (hora con más citas activas)

**Distribución:** barras Completadas / Pendientes / Canceladas con porcentaje visual.

**Historial por día:** BarChart de recharts — muestra ingresos si hay citas Completadas, citas totales si no. Tooltip interactivo. Responsive automático.

**Decisiones de diseño:**
- Sin género — tabla `customers` existe pero upsert automático no está implementado. Se agrega cuando CRM esté activo.
- Sin export CSV en MVP — backlog, se agrega sin tocar arquitectura.
- Ingresos = solo `Completada`. Pendientes no inflan el número. El dueño aprende a marcar citas.
- Cálculo 100% en JS sobre filas planas — SQL devuelve raw, JS agrega. Más fácil de extender.
- Query con `($4::int IS NULL OR professional_id = $4)` preparado para multi-barbero/RBAC.

**Archivos creados:**
- `database/migrations/005_sprint7.sql` — `ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professionals(id)`
- `dashboard/lib/parse-services.ts` — `parsePrice()` y `parseServices()` como funciones compartidas
- `dashboard/lib/actions.ts` — `getMetricas(businessId, rango, professionalId?)` agregado al final
- `dashboard/app/(dashboard)/dashboard/metricas/page.tsx` — server component con URL params
- `dashboard/components/metricas/metricas-client.tsx` — client component con recharts
- Bottom nav y sidebar desktop: ítem Métricas agregado (`BarChart2` de lucide-react)

### Lecciones técnicas Sprint 7
- `npm run build` se ejecuta desde `dashboard/`, NO desde la raíz del repo.
- `git pull` en VPS ANTES de ejecutar la migración — el archivo SQL viaja en el repo.
- Si VPS tiene cambios locales sin commitear (`package-lock.json` por `npm install`): `git checkout -- <archivo>` antes del pull.
- `recharts` instalado en Mac — VPS necesita `npm install` propio antes del build si el paquete es nuevo.
- Los componentes de página NO agregan `max-w` ni `mx-auto` propios — el `<main>` del layout maneja el espaciado con `p-6`.
- DB en Docker: nombre `meyer_db`, usuario `meyer_user`. Conectar: `docker exec -i meyer_postgres su -s /bin/sh postgres -c "psql -U meyer_user -d meyer_db"`.
- Migración renombrada a `005` porque `004_conversation_history.sql` ya existía — verificar siempre el último número antes de nombrar una migración.
