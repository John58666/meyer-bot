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

## Backlog actual (Julio 11, 2026)

### PENDIENTE — Fase 2: Bot & Sistema
1. **Inactividad bot** — que pregunte "¿Sigues ahí?" si el cliente no responde tras X tiempo durante el flujo de agenda
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
