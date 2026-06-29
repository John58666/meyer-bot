# CONTEXT.md — meyer-bot

> Última actualización: 28 de junio de 2026 (post Sprint 6 — fixes dashboard lunes Brayan).
> Documento maestro de contexto. Cualquier chat o persona nueva debe leer esto primero.

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales de belleza y barbería.
Producto: bot conversacional WhatsApp + dashboard de gestión + CRM (en desarrollo).
Diferenciador: **WhatsApp-native** (la competencia —Fresha, Booksy, SimplyBook— obliga a salir de WhatsApp), español colombiano con jerga, precio accesible para LATAM.
Expansión planificada: Colombia → España, México, Estados Unidos.

> **Nota de naming:** "meyer-bot" es el nombre interno del proyecto/repo. "Meyer" es además el nombre de un negocio real (business_id=1), lo que genera confusión. **FIX PENDIENTE:** desacoplar el branding del producto del nombre del cliente Meyer (ver Backlog).

## Estado del producto (resumen ejecutivo)
- **Vendible HOY para negocios de UN solo barbero.** Flujo completo de agendar/cancelar/reagendar por WhatsApp funciona end-to-end, probado E2E (bloques 1-6).
- **Dashboard operativo** con todas las vistas, agendar manual, calendario clickeable y servicios dinámicos por negocio.
- **NO vendible aún para multi-barbero.** Falta diseño de arquitectura completo (ver sección Multi-Barbero).
- Brayan Study (1 barbero, business_id=3) es el primer cliente real. Presentación completada.

## Stack actual
- **n8n 2.10.3** self-hosted (n8n.zyvenshop.com, Docker, contenedor `n8n-n8n-1`, runner interno) — orquestador de workflows. Reemplazar con Node.js + BullMQ + Redis antes de 30 clientes.
- **Evolution API v2.3.7** — conexión WhatsApp (transitorio, migrar a WA Cloud API oficial de Meta por cliente)
- **Fallback chain multi-LLM** (reemplazó a Groq/llama-3.3-70b como único modelo):
  - Gemini 2.5 Flash-Lite (primario) → Cerebras gpt-oss-120b → Groq gpt-oss-120b
  - Todos vía endpoints OpenAI-compatibles, llamados desde un Code node con `this.helpers.httpRequest`
- **PostgreSQL 16 Alpine** (Docker: `meyer_postgres`) — base de datos principal y única
- **Next.js 16** + App Router — dashboard frontend (en producción)
- **Tailwind v4** + **shadcn/ui** — estilos y componentes dashboard
- **NextAuth v5** (JWT) — autenticación dashboard contra PostgreSQL
- **PM2** — process manager Next.js en VPS
- **VPS Ubuntu Hetzner** — 178.104.27.180 (no compartir)
- **nginx** — proxy reverso (v1.24.0)

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local Mac: `/Users/johnanderprietogarzon/Documents/meyer-bot` (`~/Documents/meyer-bot`)
- Clon VPS: `/root/meyer-bot`
- Auth Git: PAT classic (scope `repo`). Remote con token embebido en ambos (Mac y VPS):
  `https://John58666:<TOKEN>@github.com/John58666/meyer-bot.git`
- Deploy: `git push` desde Mac → `git pull` en VPS → build → `pm2 restart`. Commits siempre desde Mac, nunca desde VPS.

## Estructura del proyecto
```
meyer-bot/
├── workflows/
│   ├── WhatsApp Bot - Genérico.json       # Flujo genérico multi-tenant (ACTIVO, versión FIXED v2)
│   ├── Recordatorios_24h_Peluqueria.json  # Recordatorios automáticos (multi-tenant)
│   └── nodes-gestion-citas.md             # Referencia SQL+JS para nodos de gestión
├── database/
│   ├── schema.sql
│   ├── migrations/
│   │   ├── 002_sprint3_schema.sql        # Ejecutada
│   │   └── 003_sprint4_sessions_customers_exceptions.sql  # Ejecutada
│   └── seeds/
│       ├── seed-professionals.sql
│       └── create-user.js               # Script CLI para crear usuarios nuevos
├── dashboard/                           # Next.js app — EN PRODUCCIÓN
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/               # Vista Hoy (page.tsx)
│   │   │   │   └── semana/              # Vista Semana + Calendario (page.tsx + SemanaClient.tsx)
│   │   └── api/
│   │       ├── auth/
│   │       └── appointments/month/
│   ├── components/
│   │   ├── ui/
│   │   ├── calendar-month-view.tsx      # Grilla mes, clickeable en todos los días reales
│   │   ├── day-appointments-sheet.tsx   # Sheet por día: lista + CTA agendar + lógica pasado/futuro
│   │   └── new-appointment-sheet.tsx    # Formulario crear cita: servicios dinámicos, hora libre
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts                      # Re-export limpio de @/auth (NO instancia duplicada)
│   │   └── appointments.ts
│   ├── lib/actions.ts                   # Server actions: create/update/reschedule con anti-doble-booking
│   ├── auth.ts                          # Instancia canónica NextAuth con authorize + JOIN businesses
│   ├── auth.config.ts                   # Callbacks jwt/session — persiste businessId, businessName, multiProfessional, role
│   ├── types/next-auth.d.ts             # Tipado extendido de sesión
│   └── middleware.ts
├── infrastructure/
│   └── docker-compose.db.yml
├── CONTEXT_UPDATED.md                   # ESTE documento
├── FIX_RESPONSIVE.md
├── IMPLEMENTACION_MULTI_LLM.md
├── SPRINT4_SESSIONS_N8N.md
├── CLAUDE.md
└── README.md
```

## Historial de Sprints

### Sprint 0 — COMPLETADO ✅ (Mayo 18, 2026)
- Variables de entorno migradas a .env (EVOLUTION_API_KEY, URL, OWNER_NUMBER)
- Google private key eliminada del workflow

### Sprint 1 — COMPLETADO ✅ (Mayo 18, 2026)
- PostgreSQL en Docker, schema multi-tenant
- Meyer como business_id=1, 34 citas migradas desde Sheets

### Sprint 2 — COMPLETADO ✅ (Mayo 19, 2026)
- Disponibilidad proactiva con generate_series
- Timezone America/Bogota en todos los queries

### Sprint 3 — COMPLETADO ✅ (Mayo 25, 2026)
- Tablas: users, professionals
- Dashboard en producción con login, vista Hoy, vista Semana
- Polling 30s, responsive mobile-first

### Sprint 4 — COMPLETADO ✅ (Junio 12, 2026)
**Dashboard:** Vista Calendario en /semana (toggle Lista/Calendario), grilla de mes con puntos de color por estado, bottom sheet por día con acciones, nombre del negocio dinámico en topbar, multi-barbero UI condicional por flag `multi_professional`, script `create-user.js`.
**Workflows:** workflow genérico multi-tenant, cancelación/reagendamiento E2E con tabla `sessions`, recordatorios 24h multi-tenant.
**DB:** columnas `services_text`, `prompt_name`, `schedule_text JSONB` en `businesses`; tablas `sessions`, `customers`, `schedule_exceptions`.

### Sprint 5 (Multi-LLM + E2E + Hardening) — COMPLETADO ✅ (Junio 26-27, 2026)
- Fallback chain multi-LLM: Gemini 2.5 Flash-Lite → Cerebras gpt-oss-120b → Groq gpt-oss-120b
- Historial conversacional persistente en `conversation_history` (JSONB, TTL 2h)
- E2E bloques 1-6 todos pasados
- 9 bugs corregidos (slots pasados, hora ambigua, `==` en n8n, jerga colombiana, día de semana incorrecto, etc.)
- Brayan Study conectado (QR escaneado, bot operativo)
- Credenciales rotadas, repo sincronizado

### Sprint 6 (Fixes Dashboard) — COMPLETADO ✅ (Junio 28, 2026)

#### Fix 1 — Título de pestaña sincronizado ✅
**Causa raíz:** `app/layout.tsx` importaba `auth` desde `@/lib/auth` (segunda instancia de NextAuth), no de `@/auth` (la canónica). Dos instancias resuelven la sesión distinto → solo el `<title>` se desincronizaba.
**Fix:** unificación a `@/auth` en `app/layout.tsx`. `lib/auth.ts` colapsado a re-export limpio.
**De paso:** `multi_professional` ya estaba correcto en `auth.ts` canónica (SELECT incluía `b.multi_professional`).
**Archivos:** `dashboard/app/layout.tsx`, `dashboard/lib/auth.ts`
**Propiedad:** el nombre sale del JOIN `users ⋈ businesses` en `authorize` — fresco por login, genérico para cualquier negocio nuevo con credenciales.

#### Fix 2+4 — Calendario clickeable + Agendar cita manual ✅
**Fix 2 — Días sin citas clickeables:**
- `handleDayClick` en `calendar-month-view.tsx`: eliminado el early return que bloqueaba días vacíos.
- Todas las celdas de días reales tienen `cursor-pointer` + hover. Las celdas de padding (`null`) siguen sin click.
- El sheet decide qué mostrar según la fecha.

**Fix 4 — Agendar cita manual desde calendario:**
- `DayAppointmentsSheet`: lógica `isPast`/`canBook` basada en la fecha del día clickeado.
  - Con citas + hoy/futuro → lista + botón "+ Agendar otra cita"
  - Vacío + hoy/futuro → empty state + CTA "Agendar cita"
  - Vacío/con citas + pasado → sin CTA de agendar (no se agenda en el pasado)
- `NewAppointmentSheet`: refactorizado con props opcionales `fecha`, `servicesText`, `trigger`.
  - Servicios dinámicos: parseados desde `services_text` del negocio (formato: `"Nombre $precio, ..."`). Fallback a lista hardcodeada si no viene.
  - Fecha precargada cuando viene del calendario.
  - Hora: `<input type="time">` libre — dueño tiene autoridad total (no slots fijos). Mismo fix en el reagendar.
  - Anti-doble-booking: `createAppointment` verifica conflicto antes de insertar. Si hay conflicto → `{ conflict: true }`. UI muestra warning suave con botones "Sí, confirmar" / "Cancelar". Segunda llamada con `forceOverride=true` salta el chequeo.
- `semana/page.tsx`: query `SELECT services_text FROM businesses WHERE id = $1` en paralelo con las otras queries. Baja por la cadena `SemanaClient → CalendarMonthView → DayAppointmentsSheet`.
- `dashboard/page.tsx` (vista Hoy): misma query en paralelo, pasa `servicesText` a `NewAppointmentSheet`.
**Archivos:** `calendar-month-view.tsx`, `day-appointments-sheet.tsx`, `new-appointment-sheet.tsx`, `lib/actions.ts`, `semana/page.tsx`, `semana/SemanaClient.tsx`, `dashboard/page.tsx`

#### Fix 3 — Sync cancelación WhatsApp → dashboard
**En pausa.** El polling 30s + `revalidatePath("/dashboard/semana")` ya parecen manejarlo. Pendiente verificación en producción post-presentación.
**Nota importante:** `revalidatePath("/dashboard/semana")` ES CORRECTO. La ruta del archivo es `app/(dashboard)/dashboard/semana/page.tsx` donde `(dashboard)` es route group (no aparece en URL) y `dashboard/semana` son carpetas reales. NO cambiar a `/semana`.

---

## Arquitectura del Workflow Genérico ("WhatsApp Bot - Genérico", ACTIVO)

### Fase 1: Recepción y Filtrado
1. **Webhook** → path `whatsapp-bot`, recibe todos los negocios
2. **Filtro Inicial** → descarta grupos (@g.us) y mensajes vacíos
3. **Lookup Negocio** → SELECT en businesses por `$json.body.instance`
4. **¿Negocio Existe?** → descarta instancias no registradas

### Fase 2: Procesamiento
5. **Procesar Mensaje** → filtro fromMe, rate limit por `businessId_numero`, fechas, validación de horario, numeroLimpio
6. **Leer Sesión activa** → lee `sessions` activas (Always Output Data ON)
7. **Leer Slots Disponibles** → generate_series con schedule_text JSONB; filtra slots pasados; usa `$('Procesar Mensaje').item.json.businessId`
8. **Formatear Disponibilidad** → agrupa slots + inyecta sesionContexto con fecha/hora PRECALCULADAS; usa `$('Leer Sesión activa').first().json`

### Fase 3: IA
9. **Leer Historial** → lee `conversation_history` (Always Output Data ON)
10. **AI Agent** (Code node) → short-circuit fuera de horario, system prompt dinámico, fallback chain multi-LLM, normalización, actualización de historial. Emite `output` que leen Switch y ramas.
11. **Guardar Historial** → upsert en `conversation_history`
12. **Wait** → 3 segundos

### Fase 4: Switch de 5 ramas
13. **Switch** → CITA_CONFIRMADA / GESTIONAR_CITA / CANCELAR_CITA / REAGENDAR_CITA / Fallback

#### Rama Confirmar Cita
14. Leer Disponibilidad → Verificar Slot → ¿Disponible? → Insertar Cita → Construir Mensajes → Notificar Dueño → Confirmar Cliente
15. Aviso Slot Ocupado (rama false de ¿Disponible?)

#### Rama Gestionar Cita
16. Leer Citas Cliente (Always Output Data) → Formatear Citas → IF tieneCitas → Guardar Sesión → Enviar Lista de citas
17. IF false → directo a Enviar Lista de citas (mensaje "no hay citas")

#### Rama Cancelar Cita
18. Ejecutar Cancelación → Construir Confirmación Cancelación (Code) → Confirmar Cancelación (Raw body) → Limpiar Sesión Cancelación

#### Rama Reagendar Cita
19. Ejecutar Reagendamiento → Confirmar Reagendamiento (IIFE bodyParameters, ver deuda técnica) → Limpiar Sesión Reagendamiento

#### Fallback
20. ¿Confirmar o Responder? → Respuesta Normal

## Nodos críticos — configuración especial
- **Leer Sesión activa / Leer Citas Cliente / Leer Historial**: Always Output Data = ON
- **AI Agent**: nombre load-bearing, NO renombrar. Modo "Run Once for All Items". Requiere `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` y las API keys en `NODE_FUNCTION_ALLOW_ENV`.
- **Formatear Disponibilidad**: referencia sesión con `$('Leer Sesión activa').first().json`; precalcula fechaNatural/horaAmPm
- **Leer Slots Disponibles**: usa `$('Procesar Mensaje').item.json.businessId` explícitamente; filtra slots pasados
- **HTTP Request (Confirmar Cancelación)**: contentType raw, body `{{ $json.body }}`, URL/apikey con UN solo `=`

## Schema completo actual
```sql
businesses (id, slug, name, whatsapp_instance, owner_number, timezone, active,
            multi_professional, services_text, prompt_name, schedule_text)

appointments (id, business_id, professional_id, fecha, hora, nombre, servicio,
              numero, estado, calendar_event_id, created_at, updated_at)

users (id, email, password_hash, name, business_id, role, active,
       last_login_at, created_at, updated_at)

professionals (id, business_id, name, active, created_at, updated_at)

sessions (id, business_id, numero, accion, citas JSONB, expires_at, created_at)  -- TTL 30 min

customers (id, business_id, numero, nombre, genero, preferred_professional_id,
           notas, primera_visita, ultima_visita, total_visitas, created_at, updated_at)

schedule_exceptions (id, business_id, professional_id, fecha, tipo,
                     hora_inicio, hora_fin, motivo, created_at)

conversation_history (business_id, numero, messages JSONB, updated_at, expires_at)  -- TTL 2h
                     -- PK/UNIQUE (business_id, numero)
```
- `schedule_text` JSONB por día: `{"0":{"open":10,"close":17},"1":{"open":9,"close":19},...}`. Clave = día semana 0-6 (domingo=0). Día sin clave = cerrado. Portable a Redis.
- `services_text` formato actual: `"Nombre $precio, Nombre2 $precio2"`. Parseado en dashboard con split+regex. No hay tabla `services` — a mediano plazo conviene normalizarla.

## Negocios en producción

| id | slug | name | whatsapp_instance | owner_number | bot_number | estado |
|----|------|------|-------------------|--------------|------------|--------|
| 1 | meyer | Peluquería Meyer | peluqueria-beta | 573142556322 | 573228767465 | ✅ activo |
| 2 | negocio-prueba | Negocio Prueba | negocio-prueba | 57XXXXXXXXXX | — | pruebas |
| 3 | brayan-study | Brayan Study | brayan-study | 573136053693 | 573114989202 | ✅ activo |

**Brayan Study — datos completos:**
- Barbería en Medina, Cundinamarca. Primer cliente real. Presentación completada.
- Servicios: Corte caballero $18.000, Corte+barba $22.000, Barba $10.000, Cejas $5.000
- Horarios: Lunes 12PM-7PM | Mar-Sáb 7AM-7PM | Dom 7AM-4PM
- Usuario dashboard: `brayanvaca84@gmail.com`, business_id=3
- Un solo barbero → caso vendible hoy sin multi-barbero.

## Multi-Barbero — DISEÑO PENDIENTE (bloquea venta a peluquerías con varios barberos)

Un negocio con N barberos no es "un negocio con N profesionales": son **N agendas independientes bajo un mismo techo**. Bot y dashboard deben reflejarlo.

### Modelo de usuarios por negocio (a definir permisos por `role`)
- **Dueño** — ve todo, configura precios/horarios/profesionales
- **Administrador** — ve todo, no configura
- **Barbero** — ve solo sus citas, bloquea sus propios días

### Bot con multi-barbero (un solo número WhatsApp por negocio)
1. Cliente dice servicio
2. Bot: "¿Tienes barbero de preferencia? Si no, te asigno el primero disponible 😊"
3. Si elige → disponibilidad de ese barbero; si no → slots donde haya al menos un barbero libre

### Ya resuelto
- Tabla `professionals` ✅ · `professional_id` en `appointments` ✅ · flag `multi_professional` en JWT/UI ✅ · tabla `schedule_exceptions` ✅

### Falta diseñar
1. Query de disponibilidad por `professional_id`
2. Flujo de selección de barbero en el bot (2 turnos extra)
3. Permisos por rol en dashboard (dueño/admin/barbero)
4. UI de agenda por barbero
5. UI de `schedule_exceptions` (barbero bloquea días/horas)
6. Métricas por barbero en CRM

## CRM (punto de backlog)
La tabla `customers` ya existe. El CRM consiste en:
- **Upsert automático**: al insertar cita por WhatsApp, upsert en `customers` actualizando `ultima_visita`, `total_visitas`, `nombre`.
- **UI en dashboard**: vista de clientes con historial, notas editables, métricas.

## Feature pendiente de alta prioridad — Bloqueo de agenda

El dueño necesita bloquear días/horas para que el bot no agende (vacaciones, días sin asistir, etc.).
- **Tabla `schedule_exceptions`** ya existe en la DB.
- **Problema crítico:** el workflow `Leer Slots Disponibles` en n8n **NO consulta `schedule_exceptions`**. Solo mira `schedule_text` y `appointments`. Implementarlo requiere:
  1. UI en dashboard para crear excepciones por fecha/rango.
  2. Modificar el SQL de `Leer Slots Disponibles` para hacer JOIN/exclusión con `schedule_exceptions`.
- Es una feature que cruza dashboard + n8n. Sprint dedicado. Alta prioridad de venta.

## Evolution API
- Manager UI: `http://178.104.27.180:8080/manager` (con apikey)
- Webhook update: `POST /webhook/set/{instance}` con body `{"webhook":{...}}` ← PUT retorna 404
- API key: en `/root/n8n/.env` como `EVOLUTION_API_KEY`
- Conexión QR: usar el manager UI, el QR expira en ~20 segundos

## Dashboard en producción
- URL: https://dashboard.zyvenshop.com (PM2 `meyer-dashboard`, puerto 3001 tras nginx)
- JWT contiene: userId, email, name, businessId, businessName, multiProfessional, role
- `multiProfessional` viene del SELECT `b.multi_professional` en `authorize` — correcto y genérico
- Vista "Hoy" — stats (Total/Pendientes/Completadas/Canceladas) + lista de citas + botón nueva cita con servicios dinámicos
- Vista "Semana" — toggle Lista/Calendario, grilla mes clickeable, sheet por día con acciones + agendar
- Polling 30s, responsive mobile-first, bottom nav móvil
- `services_text` se carga desde DB en `semana/page.tsx` y `dashboard/page.tsx` — query en paralelo con las demás

## Onboarding de nuevo negocio (proceso manual actual)
1. SQL INSERT en `businesses` con todos los campos incluyendo `schedule_text` JSONB y `services_text`
2. Evolution API manager: crear instancia con mismo nombre que `whatsapp_instance`
3. Configurar webhook: `POST /webhook/set/{instance}` → `https://n8n.zyvenshop.com/webhook/whatsapp-bot`
4. Conectar número escaneando QR en el manager
5. Crear usuario dashboard: `node database/seeds/create-user.js --email=X --password=X --name=X --business_id=N --role=owner`
6. El título del dashboard, los servicios del formulario y la UI multi-barbero son automáticos por negocio — no requieren código por cliente.

## Variables de entorno

### VPS — /root/n8n/.env
```
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...            # rotada (placeholder débil, pendiente Bitwarden)
GEMINI_API_KEY=...
CEREBRAS_API_KEY=...
GROQ_API_KEY=...
NODE_FUNCTION_ALLOW_ENV=GOOGLE_SERVICE_ACCOUNT_EMAIL,GOOGLE_PRIVATE_KEY,EVOLUTION_API_KEY,EVOLUTION_API_URL,OWNER_NUMBER,GEMINI_API_KEY,CEREBRAS_API_KEY,GROQ_API_KEY
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```
⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS — pendiente limpiar

### Dashboard — /root/meyer-bot/dashboard/.env.local
```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...            # rotada — mismo valor que n8n
AUTH_SECRET=...
NEXTAUTH_URL=https://dashboard.zyvenshop.com
AUTH_TRUST_HOST=true
```

### Dashboard local — ~/Documents/meyer-bot/dashboard/.env.local
```
POSTGRES_HOST=localhost  (túnel: ssh -f -N -L 5432:localhost:5432 root@178.104.27.180)
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```
Cerrar túnel: `kill $(lsof -t -i:5432)`

## Lo que está funcionando ✅
- Bot agenda / cancela / reagenda por WhatsApp — flujo completo, probado E2E (B1-B6)
- Fallback chain multi-LLM con degradación grácil
- Historial conversacional persistente (conversation_history, TTL 2h)
- Sessions en PostgreSQL para estado entre turnos (TTL 30 min)
- Disponibilidad proactiva por negocio, filtrando slots pasados
- Validación de horario dinámico por día; short-circuit fuera de horario sin LLM
- Workflow genérico multi-tenant; recordatorios 24h
- Notificación al dueño + confirmación al cliente con fecha natural y AM/PM
- Rate limit 50 msg/hora por número por negocio; filtro grupos/fromMe/vacíos
- Dashboard: título dinámico por negocio, calendario clickeable, agendar manual con servicios dinámicos y hora libre, anti-doble-booking con warning suave
- JWT con businessName, multiProfessional, role — correcto y genérico por negocio
- Brayan Study conectado y operativo

## Backlog priorizado

### 🔴 PRÓXIMO SPRINT
1. **Fix 5 — Métricas dashboard:** ingresos día/semana (parseando `services_text`), tasa de cancelación, completadas vs pendientes, horas pico, clientes por género, historial por día/semana/mes. Diferenciador de venta fuerte.
2. **Bloqueo de agenda** — UI en dashboard + JOIN en `Leer Slots Disponibles` del workflow n8n. Cruza dashboard y n8n. Alta prioridad de venta (dueños preguntan esto activamente).

### 🟡 DESPUÉS
3. **Password fuerte con Bitwarden** — reemplazar el placeholder en los 3 lugares
4. **CRM** — upsert automático en `customers` al agendar por WhatsApp + UI dashboard
5. **Fix 3 dashboard** — verificar en producción que sync cancelación WhatsApp → dashboard funciona con el polling actual. Si no, diagnosticar la route API.
6. **Notificación al dueño con nombre del cliente** — lookup en `customers` en `Construir Mensajes`
7. **Quitar branding "Meyer"** del producto. Implica: renombrar instancia `peluqueria-beta`, `whatsapp_instance` en `businesses`, workflow en n8n, referencias en repo.

### 🟠 ALTA PRIORIDAD
8. **Multi-barbero completo** — sprint dedicado (ver sección).
9. **`Confirmar Reagendamiento` → Raw body** — deuda técnica; hoy usa IIFE en bodyParameters (frágil pero probado).
10. Gestión de no-shows: cron que detecta citas pasadas sin marcar + aviso al barbero
11. `reminder_config` JSONB en businesses: recordatorios configurables por negocio
12. Panel admin para Johnander (ver todos los negocios, métricas agregadas)
13. Google private key fuera del .env del VPS
14. Evolution API expuesta en 0.0.0.0:8080 — asegurar con firewall

### 🟢 MEJORAS FUTURAS
15. Migración a WhatsApp Cloud API oficial (botones interactivos, mayor escala)
16. Prompt caching (reducir el ~33K tokens/conversación a escala)
17. Timezone dinámico por negocio
18. Mover DNS a Cloudflare
19. Rate limit en PostgreSQL (persistente entre reinicios)
20. Facturación con Stripe/Wompi
21. Migración n8n → Node.js + BullMQ + Redis (30+ clientes)
22. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes activos
23. Tabla `services` normalizada (reemplaza `services_text` string)
24. Expansión regional: España y EEUU

## Infraestructura VPS
```
CONTAINER            IMAGE                    STATUS    PUERTO
n8n-n8n-1            n8nio/n8n (2.10.3)       Up        5678
meyer_postgres       postgres:16-alpine       Up        127.0.0.1:5432
evolution-api        evoapicloud/v2.3.7       Up        0.0.0.0:8080 ⚠️
evolution-postgres   postgres:15              Up        interno
redis:7-alpine       redis:7-alpine           Up        interno
meyer-dashboard      PM2 (Next.js)            Up        127.0.0.1:3001

VPS specs: 2 vCPU | 3.7GB RAM | 38GB disco
nginx 1.24.0 — proxies: n8n.zyvenshop.com, dashboard.zyvenshop.com
DNS: Namecheap (zyvenshop.com) — migrar a Cloudflare
```
⚠️ evolution-api expuesto en 0.0.0.0:8080 — pendiente firewall

## Reglas de seguridad
- ✅ EVOLUTION_API_KEY/URL, OWNER_NUMBER, API keys LLM en $env de n8n
- ✅ meyer_postgres solo en 127.0.0.1:5432
- ✅ Password meyer_user rotada (pendiente fortalecer con Bitwarden)
- ✅ PAT GitHub regenerado scope repo
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ evolution-api expuesto en 0.0.0.0:8080
- NUNCA subir .env ni secrets/ a Git

## Principios de arquitectura (no negociables)
- **Una sola DB PostgreSQL** — Supabase+Vercel rechazado por DB separadas
- **Polling sobre WebSockets** — correcto para el volumen actual
- **Generic over specific** — un workflow parametrizado para todos los negocios
- **Diseño portable** — cada decisión considera la migración futura a Node.js
- **Tres horizontes** — cada decisión debe funcionar hoy, sobrevivir la migración a Node.js+BullMQ+Redis, y no exponer errores al cliente
- **sessions/conversation_history en PostgreSQL** — misma interfaz que Redis; se reemplaza sin cambiar lógica de negocio
- **No construir sin aprobación** — diseñar y aprobar antes de ejecutar

## Reglas de trabajo
- Claude.ai: orquestación, arquitectura, decisiones, documentos de implementación
- Claude Code: ejecución en repo local únicamente
- Instruction-file workflow: Claude.ai produce documento numerado → Claude Code ejecuta → Claude.ai revisa
- `/clear` en Claude Code entre pasos mayores. `/model sonnet` para archivos simples, `/model opus` para lógica compleja.
- Deploy: git push local → git pull VPS → `npm run build` → `pm2 restart meyer-dashboard`. Commits desde Mac, nunca VPS.
- Commits: `feat:`, `fix:`, `chore:`, `docs:`
- MCP en Claude Code (Mac): github (HTTP) + postgres (read-only, requiere túnel SSH activo)
- **Claude.ai debe verificar hechos antes de confirmar diagnósticos** — en Sprint 6 claude.ai tuvo un error de diagnóstico en `revalidatePath` que Claude Code siguió sin verificar. Claude Code debe chequear rutas/hechos reales antes de asumir que el diagnóstico de claude.ai es correcto.

## Key learnings (n8n + LLM + infra)
- **n8n 2.10.3 bug de `==` en campos Expression:** la UI muestra `=` pero persiste `==` en el JSON, rompiendo URLs. NO se arregla de forma fiable en la UI → exportar JSON, corregir programáticamente, reimportar.
- **`fetch` no existe en Code nodes de n8n** → usar `this.helpers.httpRequest`.
- **`docker compose restart` NO relee `.env`** → usar `docker compose down && up`.
- **Always Output Data** obligatorio en nodos Postgres que pueden devolver 0 filas.
- **Nombres de nodos** case-sensitive y load-bearing (`AI Agent` tiene ~13 referencias).
- **`$('Nodo').first()`** en vez de `.item` cuando el nodo anterior devuelve múltiples items.
- **Campos HTTP Request** en modo Expression (ícono fx). URL/headers con UN solo `=`.
- **Timezone:** PostgreSQL en UTC; negocio en Bogotá (UTC-5). Usar `(NOW() AT TIME ZONE 'America/Bogota')::date`, nunca `CURRENT_DATE`.
- **Apóstrofes en SQL embebido:** escapar con `.replace(/'/g, "''")`.
- **El normalizador del AI Agent devuelve SOLO el código** si hay match → no se puede mezclar código + texto en un turno.
- **Jerga colombiana** debe enumerarse explícitamente en el prompt.
- **Salida estructurada** (`CITA_CONFIRMADA|servicio|fecha|hora`) > prompting libre.
- **Instrucciones fuertes** ("OBLIGATORIO", "ÚNICAMENTE", "NUNCA") necesarias para que el LLM use datos de PostgreSQL sobre sus suposiciones.
- **bcryptjs** sobre bcrypt (pure JS). **AUTH_SECRET** no NEXTAUTH_SECRET en NextAuth v5.
- **schedule_text JSONB** por día (clave 0-6) — portable y flexible.
- **Next.js route groups** `(nombre)` NO aparecen en la URL. Solo las carpetas reales cuentan. `app/(dashboard)/dashboard/semana/page.tsx` → URL `/dashboard/semana`.
- **NextAuth v5 con dos instancias** rompe la sesión silenciosamente — siempre una sola instancia canónica, `lib/auth.ts` como re-export limpio si se necesita por compatibilidad.
- **`services_text`** se parsea en el cliente con split+regex. No está en la sesión JWT — se fetcha desde DB en cada page server component que lo necesite (en paralelo con otras queries).
