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

## Sprint 12 (Multi-profesional + agenda paralela) — COMPLETADO ✅ (Julio 10-11, 2026)

### A — #4 (Bot pregunta profesional)
- Lookup Negocio SQL: LEFT JOIN `professionals` + GROUP BY para traer profesionales activos
- Procesar Mensaje: parsing robusto de `professionals` (string o array) desde el nodo anterior
- AI Agent: system prompt reordenado (servicios → profesional → fecha → hora → confirmar)
- Resumen de cita incluye `👤 Profesional:`
- Formato `CITA_CONFIRMADA` extendido con `nombreProfesional`
- Gap de inactividad 10-60 min → bot pregunta si continuar; >1h → historial borrado
- Recordatorios 24h y 2h: SQL JOIN con `professionals`, mensajes incluyen profesional
- n8n API returns 401 — import/update manual de workflows

### B — #5 (Dashboard multi-profesional)
- **Filtro server-side por professionalId en todas las queries**: getTodayAppointments, getTodayStats, getAppointmentsByMonth, getWeekAppointments
- **Dashboard hoy**: profesional ve solo sus citas, owner/admin ven todo
- **Slots disponibles**: `getAvailableSlots` server action que calcula slots de 30min según:
  - `schedule_text` del negocio (día de semana → horas)
  - `schedule_exceptions`: `cerrado` → sin slots, `horario_especial` → slots solo en ese rango
  - Business-wide + professional-specific exceptions ambos considerados
  - Citas existentes no canceladas del profesional
- **API routes nuevas**: `/api/appointments/slots`, `/api/appointments/week`
- **NewAppointmentSheet**: migrado de input `time` libre a grilla de slots disponibles
- **SemanaClient**: dropdown de filtro por profesional en vista lista y calendario
- **CalendarMonthView**: acepta `professionalFilter`, refetch automático al cambiar filtro
- **Fix**: `schedule_text` es tipo JSON en PostgreSQL, pg driver lo devuelve ya parseado — usar directo sin `JSON.parse()` duplicado

### C — RBAC server-side (protector)
- `updateServicesText`: owner/admin solo pueden modificar servicios
- `createBloqueo`/`deleteBloqueo`: profesional solo bloquea/elimina sus propios días
- `createAppointment`: profesional siempre agenda a su propio `professionalId` (ignora input del form)

### Lecciones Sprint 12
- `schedule_text` es columna `JSON` en PostgreSQL. `pg` driver la devuelve como objeto JS ya parseado. NO hacer `JSON.parse()` — usar directo o `typeof === 'string'` condicional.
- Business-wide exceptions (`professional_id IS NULL`) deben aplicarse también cuando se filtra por profesional específico en `getAvailableSlots`.
- `fetch` desde cliente a API route Next.js incluye cookies automáticamente (mismo origen).
- `useCallback` con `[]` deps captura variables del closure inicial — incluir variables reactivas en deps o pasar como argumento.
- JSON type columns in pg driver are automatically parsed — check with `typeof` before JSON.parse.

## Sprint 13 (Auditoría + Horarios + No-Shows) — COMPLETADO ✅ (Julio 11, 2026)

### A — Auditoría (tabla + UI + server actions)
- Migración `013_audit_log.sql`: tabla `audit_log` con business_id, user_id, accion, entidad, entidad_id, detalle, created_at
- `lib/audit.ts`: helper `auditar()` y `getAuditLogs()` con paginación + filtros por acción y rango de fechas
- `lib/audit-types.ts`: tipos compartidos client-side seguros
- 9 server actions instrumentadas en `lib/actions.ts`: createAppointment, updateAppointmentStatus, deleteAppointment, createBloqueo, deleteBloqueo, updateServicesText, createMiembroEquipo, toggleMiembroActivo, updateMiembroRole
- UI `/dashboard/auditoria` con tabla paginada, filtros por acción y fechas, drawer de detalle
- Sidebar link a Auditoría

### B — Horarios desde dashboard
- Server action `updateScheduleText` con RBAC + validación de tipos
- `HorarioClient`: editor día por día con toggle abierto/cerrado + selects de hora
- Sección Horarios en `/dashboard/configuracion`

### C — Sync cancelación WhatsApp → dashboard
- Endpoint `POST /api/webhooks/sync-cancel` con autenticación via `WEBHOOK_SECRET`
- Registro en audit_log con origen="whatsapp"
- RevalidatePath para refrescar dashboard
- Fix: excluir `/api/webhooks` del middleware de NextAuth
- Fix: n8n Docker container → `extra_hosts: host.docker.internal:host-gateway` + `DASHBOARD_URL=http://host.docker.internal:3001`

### D — Reagendamiento raw body
- Nuevo Code node "Construir Mensaje Reagendamiento" reemplaza IIFE, usa `contentType: raw`

### E — Workflow No-Shows
- Cron 23:59, completa citas Pendiente con fecha pasada

### F — Fix UI auditoría
- "n8n bot" → "WhatsApp" (user-friendly, no técnico)
- Entidades con labels legibles (appointment → "Cita", bloqueo → "Bloqueo")
- Drawer detalle con descripciones claras en vez de JSON crudo
- `describirDetalle()` en audit-types.ts formatea según cada acción

### G — Dashboard Sync completo (new + cancel + reagend) — COMPLETADO ✅ (Julio 11, 2026)
- Nuevo nodo `Sync New Dashboard` en workflow, en paralelo a `Construir Mensajes`
- `Sync Cancel Dashboard` mejorado: envía datos completos (servicio, fecha, hora, nombre, estado, professional_name)
- `Sync Reagend Dashboard` corregido: URL `/api/webhooks/sync-reagend`, header `x-webhook-secret`, body con datos completos
- Dashboard: endpoint `POST /api/webhooks/sync-new` con audit_log `create_appointment`
- Dashboard: endpoint `POST /api/webhooks/sync-reagend` con audit_log `reschedule_appointment`
- Dashboard: `sync-cancel` mejorado con JOIN a `professionals` para `professional_name`
- Todos los sync incluyen `hora`, `estado`, `professional_name` en audit_log detalle

## Sprint 14 (Dashboard Fixes + Help) — COMPLETADO ✅ (Julio 11, 2026)

### A — Fix #26: Título negocio como link a inicio
- Nombre del negocio en `topbar.tsx` ahora es un `<Link href="/dashboard">`
- Incluye `hover` con color accent para feedback visual
- Todos los negocios, todos los roles, responsive

### B — Fix #25: Tooltips en botones
- Sidebar PC: ya tenía `title` en todos los íconos (sin cambios)
- Bottom nav móvil: agregado `title` a cada link
- Auditoría: agregado `title` a botón "Filtrar", paginación anterior/siguiente
- Compatible con lectores de pantalla y hover en desktop

### C — Fix #23: Auditoría — explicación + default semana actual
- Agregado texto explicativo: "Registro de acciones realizadas en el sistema..."
- Filtros por defecto: `desde` = lunes de la semana actual, `hasta` = domingo
- Cálculo en timezone `America/Bogota` vía server component
- El usuario puede cambiar fechas manualmente si necesita otro rango

### D — Fix #24: Botón ? → FAQ (página /dashboard/help)
- Creada `app/(dashboard)/dashboard/help/page.tsx`
- 10 preguntas frecuentes sobre uso del sistema (agendar, cancelar, métricas, roles, etc.)
- Contenido filtrado por rol: owner ve todo, profesional ve solo lo relevante
- Acordeón interactivo con íconos, responsive, dark mode

### E — Fix: Auditoría link en dropdown móvil
- Agregado `ClipboardList` icon + menú Auditoría en dropdown avatar móvil (antes solo estaba en sidebar)
- Visible para owner/admin (oculto para profesional, igual que en sidebar)

### F — Fix: Botón Editar en tabla Equipo
- Botón lápiz no se veía en tabla Equipo — faltaba texto label junto al icono SVG
- Agregado texto "Editar" y borde visible para mejor affordance
- Botón renderizado siempre (incluso owner, deshabilitado visualmente)
- Tabla responsive: `overflow-x-auto` en contenedor, `min-w-[500px]`, `w-12` en columna acciones

---

## Sprint 15 — Dashboard Métricas Premium — COMPLETADO ✅ (Julio 12, 2026)

> Spec: `docs/superpowers/specs/2026-07-11-sprint15-metricas-premium.md`

### UI/UX Audit (sesión 9, 12 julio 2026)
Auditoría post-implementación con `ui-ux-pro-max` skill. Hallazgos categorizados en 6 áreas, sin ejecución de cambios:
1. **KPIs sin contexto visual** — badges verde/rojo sin semántica, faltan sparklines, skeleton loader, tooltips comparativos
2. **Filtros por fecha ausentes** — no hay DatePicker global, solo periodo hardcodeado 28 días
3. **Charts con interacción pobre** — heatmap sin tooltip/legend, chart ingresos sin toggle bruto/neto, barras sin etiquetas ni animación
4. **Responsive frágil** — KPIs horizontales sin pagination dots, sin breakpoint md, charts con altura fija
5. **Drawers sin loading/error** — se ven blancos hasta que fetch termina, sin fallback en error
6. **Accesibilidad** — colores sin soporte SR, charts sin aria-label, tabs sin aria-selected

Detalle completo en spec sección 14. Pendiente de aprobación para ejecutar.

### Implementado
1. **Migración DB**: índice `idx_appointments_metrics` (business_id, professional_id, fecha, estado) creado CONCURRENTLY
2. **Server actions**: `getMetricas()` extendida con período anterior, ocupación, clientes nuevos vs recurrentes, agregación por profesional y servicio. `getMetricasDrawer()` para 4 tipos de drawer bajo demanda
3. **API route**: `POST /dashboard/metricas/api/drawer` con RBAC server-side
4. **6 KPIs**: ingresos, total citas, cancelaciones, ocupación, retención, clientes nuevos — todos con badge de variación vs período anterior
5. **3 Tabs**: General (KPIs + chart), Por Profesional (tabla comparativa), Servicios (ranking horizontal + KPIs)
6. **Chart Ingresos**: BarChart con línea punteada del período anterior, click en barra abre drawer de citas del día
7. **Chart Servicios**: BarChart horizontal con colores por servicio, click abre drawer de detalle
8. **4 Drawers**: Ingresos (desglose por profesional+servicio), Citas del Día (lista con estados), Ocupación (heatmap grid 7×N), Servicio Detalle (por profesional + tendencia mensual)
9. **Responsive móvil**: KPIs en scroll horizontal con snap, tabs scrolleables, sheets en modo bottom
10. **RBAC**: profesional solo ve vista General con sus datos, sin selector de profesional ni tab "Por Profesional"

### UI/UX Audit — Implementado (Sesión 10, 12 julio 2026)
**🔴 KPIs con contexto:**
- Sparkline SVG inline (60×20px) debajo del valor en cada KPI (ingresos, citas, cancelaciones, ocupación)
- Badges semánticos: `TrendingUp`/`TrendingDown` según tipo de métrica (↑ ingresos = verde, ↑ cancelaciones = rojo)
- Tooltip hover "vs período anterior" con valores actual vs anterior
- `METRICA_SEMANTICA` map (subir-bueno vs bajar-bueno) en metricas-client.tsx

**🔴 Filtro fechas global:**
- `RangoMetricas` extendido: `'trimestre'` y `'custom'`
- Botón "Trimestre" en rango selector
- Botón "Personalizar" con icono calendario → despliega inputs `date` Desde/Hasta + botón Aplicar
- `calcularRangoFechas()` y `calcularPeriodoAnterior()` actualizados para trimestre y custom
- Cache key extendido con fechas para rangos custom
- `page.tsx` acepta `desde`/`hasta` en searchParams

**🟡 Drawers con error states:**
- Los 4 drawers (`drawer-ingresos`, `drawer-citas-del-dia`, `drawer-ocupacion`, `drawer-servicio-detalle`): estado `error` con mensaje + botón "Reintentar" ejecuta `fetchData()` de nuevo
- Verificación `response.ok` + `d.error` en response JSON
- Función `fetchData()` extraída para poder re-ejecutarla

**🟡 Accesibilidad:**
- `metricas-tab-selector`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- `metricas-client`: `role="tabpanel"` con `aria-labelledby`
- Charts envueltos en `<div role="img" aria-label="...">`
- `KpiCard`: `sr-only` en badges ("Mejoró/Empeoró X%")
- Select profesional: `aria-label="Filtrar por profesional"`

**🟢 Responsive:**
- Pagination dots: indicador de posición en KPIs horizontal mobile (6 dots, solo visible en `<sm`)
- Scroll tracking con `useRef` + `useEffect` + `scroll` event

**🟢 Heatmap:**
- Tooltip flotante posicionado con `fixed` + transform al hover de cada celda
- Indicador de hora actual: "10:00 ←" en color accent para la hora de Bogotá actual
- Color ramp legend existente sin cambios

**🟢 Charts:**
- `LabelList` con formato de pesos en barras de servicios
- `animationBegin={0}`, `animationDuration={600}`, `animationEasing="ease-out"` en servicio bars

### Responsive bugs post-deploy — fix (Sesión 11, 12 julio 2026)

Tras el deploy de la UI/UX Audit, aparecieron 2 bugs responsive:

**Bug 1 — KPI grid overflow en tablet/desktop**
- KPIs en scroll horizontal forzado a TODOS los tamaños (solo `sm:flex-1 sm:min-w-0` como intento de responsive)
- En tablet (768px), 6 cards a ~150px = 900px, overflow horizontal
- Fix: dual container — scroll mobile (`flex sm:hidden`) + grid desktop (`hidden sm:grid sm:grid-cols-3`)

**Bug 2 — "Varias pantallitas negras" al clickear en General (móvil)**
- Causa raíz: `useState` + `useEffect` para `isMobile` agregado en los 4 drawers para switchear `side="bottom"` en móvil
- En cada re-render de los drawers (todos montados simultáneamente), el flip de estado `false→true` en los 4 Sheet provoca render de overlays/backdrops fantasma de base-ui Dialog
- Fix: eliminar `isMobile` de todos los drawers, siempre `side="right"`, usar CSS-only responsive width: `max-md:!w-[90vw] max-md:!max-w-[90vw]`

**Cambios de altura de charts:**
- `ChartIngresos`: `h-[180px]` mobile → `h-[260px]` desktop (wrap en container div, RC `height="100%"`)
- `ChartServicios`: container `min-h-[200px]` mobile → `min-h-[280px]` desktop
- `barSize` dinámico según cantidad de servicios

**Date picker:**
- Inputs full-width en mobile (`w-full`)
- Botón Aplicar full-width en mobile
- Labels con `shrink-0` para no comprimirse

### Archivos modificados (commit 7f8a780 — responsive layout fix)
- `dashboard/components/metricas/metricas-client.tsx` — KPI grid dual container + date picker full-width
- `dashboard/components/metricas/metricas-chart-ingresos.tsx` — responsive height container
- `dashboard/components/metricas/metricas-chart-servicios.tsx` — responsive height + barSize dinámico

### Archivos modificados (commit 43751c5 — isMobile regression fix)
- `dashboard/components/metricas/drawer-ingresos.tsx` — remove isMobile, CSS-only width
- `dashboard/components/metricas/drawer-citas-del-dia.tsx` — remove isMobile, CSS-only width
- `dashboard/components/metricas/drawer-ocupacion.tsx` — remove isMobile, CSS-only width
- `dashboard/components/metricas/drawer-servicio-detalle.tsx` — remove isMobile, CSS-only width

### Sesión 12 — GPU glitch fix (12 julio 2026)

**GPU glitch persistente en móvil:** Los borders con `rgba(255,255,255,0.06)` forzaban composición GPU en cada capa. El fix anterior (`backface-visibility: hidden`) no funcionó porque el problema no era transición sino **saturación de memoria de composición GPU**.

**Causa raíz:** `--border-subtle: rgba(255,255,255,0.06)` en `globals.css`. Cada borde semitransparente requiere que el GPU **blendee** el píxel del borde con el fondo detrás, creando una capa de composición separada. Con 10-15 bordes RGBA visibles simultáneamente en móvil (cards KPI + sidebar + topbar + bottom nav + charts), la memoria de composición se satura y genera artefactos de estática/píxeles rotos.

**Fix:**
1. `globals.css`: `--border-subtle: rgba(255,255,255,0.06)` → `#2A2A2A` (hex sólido mate)
2. `globals.css`: `--border-hover: rgba(255,255,255,0.12)` → `#3A3A3A` (hex sólido mate)
3. `metricas-kpi-card.tsx`: eliminar `backface-visibility` (experimento fallido)
4. `metricas-chart-servicios.tsx`: `isAnimationActive={false}` (desactiva animación SVG que forza repaint GPU)

**Impacto:** Un solo cambio en CSS variable cascada a todos los componentes — cards, nav, charts, sidebar — sin tocar cada archivo individualmente.

### Sesión 13 — GPU glitch continuation + post-Sprint 15 fixes (12 julio 2026)

GPU glitch del Sprint 15 tenía más rgba sin cubrir. El heatmap de ocupación usaba `rgba()` para backgroundColor de las celdas del grid — mismo patrón que el glitch original.

**Fixes:**

1. **Heatmap rgba → hex sólido** (`metricas-chart-ocupacion.tsx`):
   - `colorPorRatio()`: 4 colores rgba reemplazados por hex pre-multiplicados sobre fondo `#1A1A1A`:
     - `rgba(34,197,94,0.8)` → `#1A8A4A`
     - `rgba(34,197,94,0.4)` → `#1A5A3A`
     - `rgba(250,204,21,0.5)` → `#8A7010`
     - `rgba(107,114,128,0.2)` → `#3A3A3A`
   - Celda vacía: `rgba(107,114,128,0.1)` → `#2A2A2A` (mismo que `--border-subtle`)
   - 4 swatches de leyenda con los mismos hex

2. **h-48 → min-h-48** (`metricas-client.tsx`):
   - Error y empty states cambiados de `h-48` fijo a `min-h-48` para evitar compresión visual en tablet

3. **performance-audit.md creado** (`docs/performance-audit.md`):
   - Presupuesto CSS formal: "0 rgba borders, 0 rgba backgrounds, 0 animaciones SVG en móvil, 0 CSS filters"
   - Tabla de colores pre-multiplicados sobre `#1A1A1A`
   - Checklist de revisión pre-deploy

**Commit:** `c2cc8fc` — deployado a producción.

### Nuevas lecciones
- **El heatmap grid también usa rgba** — las celdas del grid con backgroundColor rgba crean capas de composición GPU igual que los borders. Si el heatmap se ve corrupto en móvil, aplicar mismo patrón: hex sólido.
- **Pre-multiplicación de color sobre fondo conocido** — calcular el hex resultante de rgba sobre `#1A1A1A` produce colores visualmente equivalentes sin composición GPU.
- **`h-48` fijo en estados vacíos** se ve comprimido en tablet (768px). Preferir `min-h-48` o `py-*` para altura flexible.

### Lecciones Sprint 15
- `useState` + `useEffect` para responsive en componentes montados simultáneamente (drawers) causa re-render cascades en todos. Preferir CSS-only con media queries.
- `side="bottom"` en base-ui Dialog añade overlays que pueden renderizarse fantasma durante re-renders de estado.
- `max-md:!w-[90vw]` con `!important` necesario para overridear `data-[side=right]:w-3/4` (mayor especificidad CSS).
- `min-h` + `style={{ height }}` en ResponsiveContainer wrapper: explicit height necesario para RC `height="100%"`.
- Dual container KPI (scroll mobile + grid desktop) evita CSS hacks con `overflow-x:auto` + `flex-wrap` (incompatible).
- **`rgba()` en borders es caro para GPU móvil.** Cada borde semitransparente fuerza una capa de composición separada. Con 10+ instancias, la memoria GPU se satura y produce artefactos visuales. Preferir hex sólidos en CSS variables compartidas para bordes.
- **Un CSS variable bien ubicado > editar N archivos.** Cambiar `--border-subtle` de rgba a hex en `globals.css` arregló todos los componentes simultáneamente, sin tocar cada archivo individual.
- **`backface-visibility: hidden` no arregla saturación de composición GPU.** El problema no es la transición CSS sino la cantidad de capas que el GPU debe componer. Eliminar la fuente de composición (rgba borders) es más efectivo que parchar síntomas.
- **Las animaciones recharts (`animationDuration`) fuerzan repaint en móvil.** Desactivar con `isAnimationActive={false}` reduce trabajo de GPU significativamente.
- **Heatmap grid cells con rgba también saturan composición GPU.** backgroundColor con rgba en cada celda del grid crea capas de composición individuales. Si el heatmap se ve corrupto en móvil, aplicar hex sólido pre-multiplicado.
- **Pre-multiplicación de color sobre fondo conocido:** para simular transparencia sobre fondo `#1A1A1A`, calcular `rgb(base + alpha*(color - base))` y usar el hex resultante. Visualmente equivalente, cero capas GPU.
- **`h-48` fijo en estados vacíos:** se ve comprimido en tablet. Preferir `min-h-48` o `py-*` para altura flexible.

---

## Sprint 16 — Inactividad Proactiva del Bot — COMPLETADO ✅ (Julio 12, 2026)

> Spec: `docs/superpowers/specs/2026-07-12-inactividad-proactiva-bot.md`

### Implementado
1. **Migración DB**: columna `inactividad_estado TEXT` en `conversation_history`
2. **Workflow cron n8n** (`Inactividad Bot - Proactivo`): Schedule cada 5 min → query PostgreSQL → Code node filtra (horario laboral, cierre de conversación, fuera de horario) → IF node bifurca:
   - True (avisar): envía "¿Sigues ahí?" vía Evolution API → marca `inactividad_estado = 'avisado'`
   - False (cerrar): marca `inactividad_estado = 'cerrado'`
3. **Guardar Historial modificado**: agrega `inactividad_estado = NULL` al UPSERT para resetear cuando el cliente responde
4. **15 min de inactividad** → bot pregunta "¿Sigues ahí?"
5. **Sin respuesta** → flujo cerrado, historial intacto
6. **No molesta** si: CITA_CONFIRMADA reciente, fuera de horario laboral, conversación ya cerrada

---

## Backlog actual (Julio 12, 2026)

### PENDIENTE — Fase 2: Bot & Sistema
1. ~~**Inactividad bot** — que pregunte "¿Sigues ahí?" si el cliente no responde tras X tiempo durante el flujo de agenda~~ ✅ Hecho en Sprint 16
2. **Debugging errores bot** — revisar executions fallidas en n8n, identificar patrones de error frecuentes, corregir causas raíz
3. **Pruebas de carga** — script que simule N clientes simultáneos agendando por WhatsApp, medir tiempos de respuesta del bot y del sistema completo (n8n + DB + dashboard)

### PENDIENTE — Fase 3: Dashboard Métricas (expansión)
4. **Métricas por profesional** — ingresos, citas, cancelaciones filtrados por cada barbero/profesional
5. **Comparativa servicios** — ranking de servicios más vendidos, ingresos por servicio, tendencias semanales/mensuales
6. **KPIs adicionales** — clientes nuevos vs recurrentes, hora pico por profesional, tasa de retención
7. **Comparativas temporales** — esta semana vs semana anterior, este mes vs mes anterior, variación porcentual
8. **Responsive + roles** — todo debe funcionar en móvil y respetar RBAC (profesional ve solo lo suyo)
9. **Sync con bot** — datos basados en citas reales agendadas tanto por WhatsApp como por dashboard

### PENDIENTE — Fase 4: Fixes complejos
10. **#21 — Onboarding negocio nuevo** — script/checklist que valide la configuración completa al agregar un business: schedule_text, services_text, whatsapp_instance, owner_number, timezone, profesionales, recordatorios, webhook secret
11. **#22 — Desambiguación clientes mismo nombre** — flujo para distinguir clientes con mismo nombre (por teléfono, ID, notas). Sin sync con Google Contacts por ahora.
12. **Servicios nuevos no reflejados en bot** — investigar orden en system prompt vs timing del lookup (#11 del backlog anterior)
13. **Quitar branding Meyer del producto** (#15)
14. **Panel admin Johnander** — vista global de todos los negocios (#19)
