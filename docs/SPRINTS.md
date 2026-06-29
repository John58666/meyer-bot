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
