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
**Dashboard:** Vista Calendario en /semana, grilla de mes con puntos de color, bottom sheet por día, nombre dinámico en topbar, multi-profesional UI condicional por flag `multi_professional`, script `create-user.js`.
**Workflows:** workflow genérico multi-tenant, cancelación/reagendamiento E2E con tabla `sessions`, recordatorios 24h multi-tenant.
**DB:** columnas `services_text`, `prompt_name`, `schedule_text JSONB` en `businesses`; tablas `sessions`, `customers`, `schedule_exceptions`.

## Sprint 5 (Multi-LLM + E2E + Hardening) — COMPLETADO ✅ (Junio 26-27, 2026)
- Fallback chain multi-LLM: Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- Historial conversacional persistente en `conversation_history` (JSONB, TTL 2h)
- E2E bloques 1-6 todos pasados
- 9 bugs corregidos (slots pasados, hora ambigua, `==` en n8n, jerga colombiana, día de semana incorrecto, etc.)
- Brayan Study conectado (QR escaneado, bot operativo)

## Sprint 6 (Fixes Dashboard + Bot hardening) — COMPLETADO ✅ (Junio 28-29, 2026)
- Fix título de pestaña: unificación instancia NextAuth a `@/auth`
- Calendario clickeable + agendar cita manual con anti-doble-booking
- Filtro mensajes no-texto en bot
- Scope off-topic en system prompt
- Fix 3 (sync cancelación WhatsApp → dashboard) — en pausa, pendiente verificación

## Sprint 7 (Métricas Dashboard) — COMPLETADO ✅ (Junio 29, 2026)
- `/dashboard/metricas` con selector Hoy/Semana/Mes
- KPIs: Ingresos, Total citas, Tasa cancelación, Hora pico
- BarChart recharts con historial por día
- Migración 005: `ALTER TABLE users ADD COLUMN professional_id`
- `dashboard/lib/parse-services.ts` — funciones compartidas `parsePrice()` y `parseServices()`

## Sprint 8 (Bloqueos de agenda + Slots 30min) — COMPLETADO ✅ (Junio 29, 2026)
- UI en `/dashboard/semana/bloqueos` — crear, editar inline y eliminar excepciones
- Bot respeta `schedule_exceptions` — `tipo='cerrado'` excluye día, `tipo='horario_especial'` recorta horario
- Slots del bot cada 30 minutos
- Filtro `professional_id IS NULL` — multi-profesional pendiente

## Sprint 9 (Configuración servicios + Nav responsive) — COMPLETADO ✅ (Junio 29, 2026)
- `/dashboard/configuracion` con edición de `services_text` + preview en tiempo real
- Edición inline de bloqueos
- Bottom nav móvil 4 ítems: Inicio | Agenda | Métricas | Clientes
- Dropdown avatar limpio con Configuración solo en móvil
- `router.push` en vez de `window.location.href` para client-side routing

## Sprint 10 (CRM) — COMPLETADO ✅ (Junio 29, 2026)
- Nodo `Upsert Customer` en n8n entre `Insertar Cita` y `Construir Mensajes`
- Upsert en `createAppointment` del dashboard (citas manuales también registran cliente)
- `/dashboard/clientes` — lista con búsqueda client-side, visitas, último servicio, última visita
- `/dashboard/clientes/[id]` — historial completo por cliente (50 citas)
- Nav de Clientes activo (dejó de ser 404)
- `ultimo_servicio` = última cita `Completada`. NULL → "—"

### Lecciones Sprint 10
- Upsert de `customers` debe implementarse en TODOS los puntos de creación de cita (bot + dashboard).
- `params` en Next.js 16 App Router es `Promise<{id: string}>` — siempre `await params`.
- Filtrado client-side con `useMemo` suficiente con ≤200 clientes.

## Sprint 11 (RBAC + Equipo + Límites de plan) — COMPLETADO ✅ (Junio 30, 2026)

### A — professionalId en JWT/session
- `u.professional_id` agregado al SELECT en `auth.ts`
- `token.professionalId` en callback `jwt`, `session.user.professionalId` en callback `session`
- Tipos extendidos en `next-auth.d.ts`: `professionalId: number | null`

### B — Middleware de rutas por role
- `/dashboard/configuracion` bloqueado para `profesional` (redirige a `/dashboard`)
- `/dashboard/equipo` bloqueado para no-owner (redirige a `/dashboard`)
- Lógica en `authConfig.callbacks.authorized` — no se toca `middleware.ts`

### C — Filtros server-side por professional_id
- `getTodayAppointments`, `getTodayStats`, `getAppointmentsByMonth`, `getWeekAppointments` — parámetro opcional `professionalId`
- `getClientes` — filtro EXISTS contra appointments (profesional ve solo clientes que atendió)
- `getBloqueos` / `createBloqueo` — scope por professional_id
- `updateAppointmentStatus` — profesional solo edita sus propias citas (rowCount=0 → error)
- Todos los callers actualizados: dashboard/page, semana/page, metricas/page, clientes/page, bloqueos/page, api/appointments/month

### D — UI condicional por role
- `layout.tsx` pasa `role` como prop a `Sidebar` y `Topbar`
- Sidebar: "Configuración" oculto para `profesional`, "Equipo" solo para `owner`
- Topbar dropdown: mismo criterio, ambos con `sm:hidden` en móvil

### E — /dashboard/equipo
- Server action `getEquipo` con JOIN a `professionals`
- `createMiembroEquipo`: crea fila en `professionals` (si role=profesional) + `users` en transacción
- `toggleMiembroActivo`: toggle `active` en `users`
- `updateMiembroRole`: cambia `role` en `users`
- UI: tabla con toggle inline de estado, cambio de role con select, form colapsable para crear

### F — Editar credenciales de usuario existente
- `updateMiembroCredenciales`: actualiza name/email + opcionalmente password_hash
- Sincroniza `professionals.name` si el usuario tiene `professional_id`
- Password opcional en edición (vacío = no cambia)
- Edición inline en tabla: fila expandible con formulario precargado

### G — Límites de plan
- `ALTER TABLE businesses ADD COLUMN max_professionals INT NOT NULL DEFAULT 3`
- `ALTER TABLE businesses ADD COLUMN max_admins INT NOT NULL DEFAULT 1`
- Validación en `createMiembroEquipo` antes del BEGIN de la transacción
- Mensaje: "Tu plan permite hasta N profesionales. Contacta a soporte para ampliar tu plan."

### H — Rename barbero → profesional
- Constraint DB actualizado: `role IN ('owner', 'admin', 'profesional')` — `'barbero'` eliminado
- Orden correcto: ampliar constraint → UPDATE datos → cerrar constraint
- 5 archivos TypeScript actualizados, 4 archivos markdown actualizados
- `professionals` tabla y `professional_id` columna NO cambiaron (ya estaban bien nombradas)

### I — Fix conteo de profesionales para límite de plan
- Conteo cambiado de `professionals WHERE active=true` a `users WHERE role='profesional' AND active=true`
- Razón: tabla `professionals` puede tener filas huérfanas de owner/admin
- Datos sucios limpiados: professional id=1 (Meyer/owner) y id=9 (Juliana/admin) desactivados
- `users.professional_id` de Juliana (admin) limpiado a NULL

### Lecciones Sprint 11
- Al agregar nuevo role en DB, verificar constraint existente antes de intentar INSERT.
- Orden para rename de role con constraint: (1) ampliar a ambos valores, (2) UPDATE datos, (3) cerrar. Al revés da error de constraint.
- Conteo de límite de plan debe usar `users.role`, NO tabla `professionals` (puede tener filas huérfanas de owner/admin que contaminan el conteo).
- Owner y admin no tienen agenda propia — solo `profesional` tiene `professional_id` activo.
- Cambiar role profesional→admin deja fila en `professionals` activa pero ya no afecta límite (conteo es en `users.role`).
- `lib/auth.config.ts` en `dashboard/lib/` es huérfano — el middleware usa `dashboard/auth.config.ts` (raíz de dashboard). Verificar con `cat middleware.ts | head -5` antes de editar.
