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
**Dashboard:** Vista Calendario en /semana (toggle Lista/Calendario), grilla de mes con puntos de color por estado, bottom sheet por día con acciones, nombre del negocio dinámico en topbar, multi-profesional UI condicional por flag `multi_professional`, script `create-user.js`.
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
**Causa raíz:** `app/layout.tsx` importaba `auth` desde `@/lib/auth` (segunda instancia de NextAuth).
**Fix:** unificación a `@/auth`. `lib/auth.ts` colapsado a re-export limpio.

### Fix 2+4 — Calendario clickeable + Agendar cita manual ✅
- Todos los días reales del calendario son clickeables.
- `NewAppointmentSheet`: servicios dinámicos con precio desde `services_text`, fecha precargada, hora libre, anti-doble-booking con warning suave + override.
- `revalidatePath("/dashboard/semana")` ES CORRECTO.

### Fix — Precios en selector de servicios ✅
### Fix — Filtro mensajes no-texto ✅
### Fix — Scope off-topic en system prompt ✅
### Fix 3 — Sync cancelación WhatsApp → dashboard — En pausa, pendiente verificación.

---

## Sprint 7 (Métricas Dashboard) — COMPLETADO ✅ (Junio 29, 2026)

### Métricas operativas en `/dashboard/metricas` ✅
- Selector Hoy/Semana/Mes via URL params
- KPIs: Ingresos, Total citas, Tasa cancelación, Hora pico
- BarChart recharts con historial por día
- Migración 005: `ALTER TABLE users ADD COLUMN professional_id`
- `dashboard/lib/parse-services.ts` — funciones compartidas `parsePrice()` y `parseServices()`

---

## Sprint 8 (Bloqueos de agenda + Slots 30min) — COMPLETADO ✅ (Junio 29, 2026)

### Bloqueos de agenda operativos ✅
- UI en `/dashboard/semana/bloqueos` — crear y eliminar excepciones
- Bot respeta `schedule_exceptions` — `tipo='cerrado'` excluye día, `tipo='horario_especial'` recorta horario
- Slots del bot cada 30 minutos (`generate_series` 30min, `hora_close_last_min = close * 60 - 30`)
- Filtro `professional_id IS NULL` — multi-profesional pendiente

**Archivos:** `dashboard/lib/actions.ts` (+3 actions), `dashboard/components/bloqueos/bloqueos-client.tsx`, `dashboard/app/(dashboard)/dashboard/semana/bloqueos/page.tsx`, `dashboard/app/(dashboard)/dashboard/semana/page.tsx`, n8n nodo `Leer Slots Disponibles` (SQL manual)

### Lecciones técnicas Sprint 8
- SQL de n8n no verificable via API REST — verificar visualmente en la UI.
- `horario_especial` define cuándo ABRE, no qué bloquea.
- Probar SQL directamente en psql antes de aplicar en n8n.

---

## Sprint 9 (Configuración servicios + Nav responsive) — COMPLETADO ✅ (Junio 29, 2026)

### Configuración de servicios en `/dashboard/configuracion` ✅
- Textarea con formato `"Nombre $precio, ..."` + preview en tiempo real con `parseServices()`
- Validación inline: error por línea con mensaje contextual y ejemplo corregido
- Botón "Guardar cambios" deshabilitado si hay errores de formato
- Server action `updateServicesText` con validación servidor
- Estructura de página preparada para crecer (Horarios, Datos del negocio en sprints futuros)

### Edición inline de bloqueos ✅
- Click en bloqueo existente → form inline precargado con sus valores
- Guardar = delete + insert (más simple que UPDATE, mismo resultado)
- Cancelar restaura el card de solo lectura

### Nav responsive completo ✅
**Bottom nav móvil — 4 ítems:** Inicio | Agenda | Métricas | Clientes
- Clientes apunta a `/dashboard/clientes` (404 hasta Sprint CRM)

**Sidebar PC — sin cambios en estructura:**
- Nav: Inicio, Agenda, Métricas, Clientes
- Bottom: ⚙️ Configuración, ❓ Ayuda

**Dropdown avatar:**
- Muestra nombre + nombre del negocio (quitado email)
- Configuración visible solo en móvil (`sm:hidden`)
- `min-w-[180px]` para evitar texto cortado
- Navegación con `router.push` (client-side, no hard navigation)

**Archivos modificados:**
- `dashboard/lib/actions.ts` — `updateServicesText`
- `dashboard/components/configuracion/servicios-client.tsx` — nuevo
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — nuevo
- `dashboard/components/bloqueos/bloqueos-client.tsx` — edición inline
- `dashboard/components/sidebar.tsx` — Clientes en navItems
- `dashboard/components/topbar.tsx` — 4 ítems bottom nav, dropdown limpio

### Lecciones técnicas Sprint 9
- `git add -A` en raíz del repo incluye archivos huérfanos. Siempre revisar `git status` y `git diff --staged --name-only` antes de commitear.
- `window.location.href` funciona pero hace hard navigation. Usar `router.push` de `useRouter`.
- `sm:hidden` oculta en ≥640px y muestra en móvil — patrón correcto para ítems solo móvil.
- Bottom nav con ítem a 404 es preferible a slot vacío — el usuario ve el nav completo.
