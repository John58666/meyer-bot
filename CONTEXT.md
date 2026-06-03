# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot + dashboard en producción.
Objetivo: escalar a más negocios locales (meta: 5 clientes esta semana).

## Stack actual
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows (temporal, reemplazar con 30+ clientes)
- **Evolution API** — conexión con WhatsApp (temporal, migrar a WA Cloud API oficial de Meta)
- **Groq / llama-3.3-70b** — modelo de IA para conversación
- **PostgreSQL 16** (Docker: meyer_postgres) — base de datos principal
- **Next.js 16** + App Router — dashboard frontend (en producción)
- **Tailwind v4** + **shadcn/ui** — estilos y componentes dashboard
- **NextAuth v5** (JWT) — autenticación dashboard contra PostgreSQL
- **PM2** — process manager Next.js en VPS
- **VPS Ubuntu** — servidor en 178.104.27.180 (no compartir esta IP)
- **nginx** — proxy reverso (v1.24.0)

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local: ~/Documents/meyer-bot

## Estructura del proyecto
```
meyer-bot/
├── workflows/
│   ├── peluqueria-beta.json        # Flujo principal (21 nodos)
│   └── recordatorios-meyer.json    # Recordatorios automáticos
├── database/
│   ├── schema.sql                  # Schema PostgreSQL multi-tenant
│   ├── migrate-from-sheets.js      # Script one-shot de migración (ya ejecutado)
│   ├── n8n-queries.sql             # Queries de referencia para nodos n8n
│   ├── migrations/
│   │   └── 002_sprint3_schema.sql  # Migración Sprint 3 (ya ejecutada)
│   └── seeds/
│       ├── seed-professionals.sql  # Profesional inicial Meyer (ya ejecutado)
│       └── seed-users.js           # Crear usuarios del dashboard
├── dashboard/                      # Next.js app — EN PRODUCCIÓN
│   ├── app/
│   │   ├── (auth)/login/           # Pantalla de login
│   │   ├── (dashboard)/            # Layout con sidebar + topbar
│   │   │   ├── dashboard/          # Vista Hoy (/)
│   │   │   └── semana/             # Vista Semana + Calendario
│   │   └── api/
│   │       ├── auth/               # NextAuth handlers
│   │       └── appointments/
│   │           └── month/          # GET /api/appointments/month
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── calendar-month-view.tsx # Vista calendario mes con puntos de estado
│   │   └── day-appointments-sheet.tsx # Bottom sheet por día con acciones
│   ├── lib/
│   │   ├── db.ts                   # Pool PostgreSQL
│   │   ├── auth.ts                 # NextAuth config
│   │   └── appointments.ts         # Queries de citas (incl. getAppointmentsByMonth)
│   ├── lib/actions.ts              # Server Actions (crear, cancelar, reagendar)
│   └── middleware.ts               # Protección de rutas
├── infrastructure/
│   └── docker-compose.db.yml
├── docs/
├── prompts/
│   └── meyer-system-prompt.md
├── secrets/                        # (ignorado en Git)
├── .env                            # (ignorado en Git)
├── docker-compose.yml
├── CONTEXT.md
├── CLAUDE.md
└── README.md
```

## Sprint 0 — COMPLETADO ✅ (Mayo 18, 2026)
- EVOLUTION_API_KEY, EVOLUTION_API_URL, OWNER_NUMBER migradas a .env
- Google private key eliminada del workflow
- N8N_BLOCK_ENV_ACCESS_IN_NODE=false en docker-compose.yml

## Sprint 1 — COMPLETADO ✅ (Mayo 18, 2026)
- Container meyer_postgres en VPS (postgres:16-alpine)
- Schema multi-tenant: businesses + appointments
- Meyer registrado como business_id=1
- 34 citas migradas desde Google Sheets
- Workflows n8n migrados a PostgreSQL

## Sprint 2 — COMPLETADO ✅ (Mayo 19, 2026)
- Disponibilidad proactiva con generate_series
- Timezone America/Bogota en todos los queries
- System prompt: mostrar solo día solicitado

## Sprint 3 — COMPLETADO ✅ (Mayo 25, 2026)
- `users` — usuarios del dashboard (BIGINT IDENTITY, índice LOWER(email), updated_at trigger)
- `professionals` — peluqueros por negocio
- `businesses.multi_professional` — flag para multi-barbero
- `appointments.professional_id` — FK a professionals (ON DELETE SET NULL)
- Estrategia sesión: JWT (migrar a Database sessions cuando haya empleados reales)
- Dashboard en producción: https://dashboard.zyvenshop.com
- Login seguro con bcryptjs + JWT
- Vista Hoy con stats en tiempo real
- Vista Semana agrupada por día
- Agendar, completar, cancelar, reagendar citas desde dashboard
- Polling 30s — sincronización automática bot ↔ dashboard
- Responsive mobile-first con bottom nav

## Sprint 4 — EN CURSO (Junio 3, 2026)

### ✅ Completado
- Vista calendario en /semana (toggle Lista/Calendario)
- date-fns instalada como dependencia del dashboard
- `AppointmentRow` y `getAppointmentsByMonth()` añadidas a `lib/appointments.ts`
- API route `GET /api/appointments/month?year=&month=`
- `calendar-month-view.tsx` — grilla de mes custom, puntos de color por estado, conteo
- `day-appointments-sheet.tsx` — bottom sheet con completar/cancelar/reagendar
- `SemanaClient.tsx` — toggle con localStorage persistente

### 🔧 Decisiones de arquitectura multi-tenant tomadas
- sessionKey cambia a `{{ business_id }}_{{ numero }}_v3`
- Tabla `customers`: id, business_id, nombre, numero, created_at
- Columnas nuevas en `businesses`: services_text, prompt_name, schedule_text
- Workflow genérico parametrizado (un solo workflow para todos los negocios)
- Onboarding manual para primeros 5 negocios, luego panel admin

### 🔴 En progreso
- Workflow genérico multi-tenant
- Migración SQL (customers + columnas businesses)
- Onboarding primer negocio nuevo

## Dashboard en producción
- URL: https://dashboard.zyvenshop.com
- Login con email + contraseña (NextAuth v5 JWT)
- Vista "Hoy" — stats (total, pendientes, completadas, canceladas) + lista de citas
- Vista "Semana" — toggle Lista/Calendario
  - Lista: citas agrupadas por día (lunes a domingo)
  - Calendario: grilla de mes, puntos morado/azul/verde/rojo por estado, navegación histórica
  - Click en día → bottom sheet con lista de citas y acciones
- Agendar cita manual — Bottom Sheet con nombre, teléfono, servicio, fecha, hora
- Completar / Cancelar (con confirmación 2 pasos) / Reagendar
- Polling automático 30s — citas del bot aparecen sin recargar
- Responsive mobile-first — sidebar oculto en móvil, bottom nav con Inicio/Semana
- Deploy: PM2 puerto 3001 + nginx proxy + SSL certbot

## Infraestructura dashboard
- Puerto meyer_postgres: 127.0.0.1:5432 (solo localhost, no público)
- AUTH_TRUST_HOST=true en .env.local del dashboard
- Deploy script: `/root/deploy-dashboard.sh`
  ```bash
  cd /root/meyer-bot && git pull origin main && cd dashboard && npm run build && pm2 restart meyer-dashboard
  ```

## Arquitectura del Workflow Principal (21 nodos)

### Fase 1: Recepción y Filtrado
1. **Webhook** → recibe POST de Evolution API
2. **If** → filtra grupos (@g.us) y mensajes vacíos
3. **Code in JavaScript** → rate limit + extrae mensaje + calcula fechas (Bogotá timezone)

### Fase 2: Disponibilidad + Conversación IA
4. **Leer Slots Disponibles** → PostgreSQL: slots libres próximos 7 días
5. **Formatear Disponibilidad** → Code JS: agrupa slots por día en texto natural
6. **AI Agent** → orquesta conversación con disponibilidad real en system prompt
7. **Groq Chat Model** → llama-3.3-70b
8. **Simple Memory** → historial de 10 mensajes por usuario
9. **Wait** → espera 3 segundos

### Fase 3: Decisión y Validación
10. **If1** → detecta "CITA_CONFIRMADA|servicio|fecha|hora"
11. **Leer Disponibilidad** → PostgreSQL COUNT
12. **Verificar Slot** → evalúa COUNT
13. **¿Disponible?** → decide

### Fase 4: Persistencia y Notificaciones
14. **Insertar Cita** → PostgreSQL INSERT
15. **Code in JavaScript1** → construye mensajes
16. **Code in JavaScript2** → (DESHABILITADO) Google Calendar
17. **HTTP Request1** → notificación al dueño
18. **HTTP Request2** → confirmación al cliente

### Rama alternativa
19. **If2** → no confirmación
20. **HTTP Request** → respuesta normal
21. **Aviso Slot Ocupado** → horario ocupado

## Base de Datos PostgreSQL

### Conexión
- Host (desde n8n): `meyer_postgres`
- Host (desde dashboard en VPS): `127.0.0.1`
- Host (desde dashboard en desarrollo local): `localhost` (con túnel SSH)
- Puerto: 5432
- Base de datos: `meyer_db`
- Usuario: `meyer_user`
- Password: en $POSTGRES_PASSWORD del .env del VPS

### Schema actual (completo)
```sql
businesses (
  id SERIAL PK,
  slug TEXT,
  name TEXT,
  whatsapp_instance TEXT,
  owner_number TEXT,
  timezone TEXT,
  active BOOLEAN,
  multi_professional BOOLEAN DEFAULT false
  -- pendiente añadir: services_text, prompt_name, schedule_text
)

appointments (
  id SERIAL PK,
  business_id INTEGER → businesses(id),
  professional_id BIGINT → professionals(id) ON DELETE SET NULL,
  fecha DATE,
  hora TIME,
  nombre TEXT,
  servicio TEXT,
  numero TEXT,
  estado TEXT CHECK ('Pendiente','Confirmada','Cancelada','Completada'),
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PK,
  email TEXT UNIQUE (índice LOWER(email)),
  password_hash TEXT,
  name TEXT,
  business_id INTEGER → businesses(id) ON DELETE RESTRICT,
  role TEXT CHECK ('owner','employee','admin') DEFAULT 'owner',
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

professionals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PK,
  business_id INTEGER → businesses(id) ON DELETE RESTRICT,
  name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- pendiente crear:
customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PK,
  business_id INTEGER → businesses(id),
  nombre TEXT,
  numero TEXT,
  created_at TIMESTAMPTZ
)
```

## Variables de entorno

### VPS — /root/n8n/.env
```
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...
NODE_FUNCTION_ALLOW_ENV=...,EVOLUTION_API_URL,OWNER_NUMBER
```
⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS — pendiente limpiar

### Dashboard — /root/meyer-bot/dashboard/.env.local
```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...
AUTH_SECRET=...
NEXTAUTH_URL=https://dashboard.zyvenshop.com
AUTH_TRUST_HOST=true
```

### Dashboard local — ~/Documents/meyer-bot/dashboard/.env.local
```
POSTGRES_HOST=localhost  (con túnel: ssh -L 5432:localhost:5432 root@VPS)
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Servicios y precios (Peluquería Meyer)
- Corte dama: $35.000
- Corte caballero: $25.000
- Tinte completo: $80.000
- Manicure + pedicure: $65.000
- Peinado especial: $50.000
- Horario: Lunes-Sábado 9AM-7PM | Domingos 10AM-5PM

## Lo que está funcionando
- ✅ Bot agenda citas por WhatsApp con Groq (llama-3.3-70b)
- ✅ Disponibilidad proactiva: muestra slots libres reales antes de agendar
- ✅ Validación de horario de negocio
- ✅ Verificación anti-colisión en tiempo real
- ✅ PostgreSQL registra citas automáticamente
- ✅ Recordatorios 24h antes de cada cita (cron 3PM diario)
- ✅ Notificación al dueño cuando se agenda cita nueva
- ✅ Confirmación al cliente con detalles
- ✅ Filtro de grupos (solo mensajes directos)
- ✅ Rate limit: 50 mensajes/hora por número
- ✅ Memoria de conversación: últimos 10 mensajes por usuario
- ✅ Dashboard en producción: https://dashboard.zyvenshop.com
- ✅ Login seguro con bcryptjs + JWT
- ✅ Vista Hoy con stats en tiempo real
- ✅ Vista Semana agrupada por día
- ✅ Agendar, completar, cancelar, reagendar citas desde dashboard
- ✅ Polling 30s — sincronización automática bot ↔ dashboard
- ✅ Responsive mobile-first con bottom nav
- ✅ Vista Calendario en /semana con toggle Lista/Calendario
- ✅ Grilla de mes con puntos de color por estado y conteo de citas
- ✅ Bottom sheet por día con acciones (completar/cancelar/reagendar)

## Backlog priorizado

### 🔴 CRÍTICO (Sprint 4 — en curso)
1. ✅ Vista calendario con toggle Lista/Calendario
2. Workflow genérico multi-tenant (un solo workflow para todos los negocios)
3. Migración SQL: tabla customers + columnas businesses
4. Onboardear primeros 5 negocios nuevos

### 🟡 ALTA PRIORIDAD
5. Panel admin de onboarding (cuando sean 5+ negocios)
6. Multi-barbero UI en dashboard
7. Google private key fuera del .env del VPS
8. Reagendamiento por WhatsApp (buscar cita por número → UPDATE)
9. Cancelación por WhatsApp

### 🟠 MEDIA PRIORIDAD
10. Migración a WhatsApp Cloud API oficial (bloqueado por Meta Business Suite)
11. Timezone dinámico por negocio
12. Mejora visual de horarios en WhatsApp

### 🟢 MEJORAS
13. Rate limit en PostgreSQL (persistente vs static data)
14. Google Calendar reactivar
15. Métricas automáticas para el dueño
16. Mapa Google Maps link en confirmación WhatsApp
17. Facturación con Stripe/Wompi

## Infraestructura VPS
```
CONTAINER            IMAGE                   STATUS    PUERTO
n8n-n8n-1            n8nio/n8n               Up        5678
meyer_postgres       postgres:16-alpine      Up        127.0.0.1:5432
evolution-api        evoapicloud/v2.3.7      Up        0.0.0.0:8080 ⚠️
evolution-postgres   postgres:15             Up        interno
redis:7-alpine       redis:7-alpine          Up        interno
meyer-dashboard      PM2 (Next.js)           Up        127.0.0.1:3001

VPS specs: 2 vCPU | 3.7GB RAM | 38GB disco
nginx 1.24.0 — proxies: n8n.zyvenshop.com, dashboard.zyvenshop.com
DNS: Namecheap (zyvenshop.com)
```
⚠️ evolution-api expuesto en 0.0.0.0:8080 — pendiente asegurar

## Reglas de seguridad
- ✅ EVOLUTION_API_KEY en $env
- ✅ EVOLUTION_API_URL en $env
- ✅ OWNER_NUMBER en $env
- ✅ meyer_postgres solo en 127.0.0.1:5432 (no público)
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ evolution-api expuesto en 0.0.0.0:8080
- NUNCA subir .env ni secrets/ a Git
- Verificar con `git status` antes de cada commit

## Reglas de trabajo
- Pensar siempre en escala, no solo en Meyer
- No dar la razón sin razonar primero — siempre cuestionar antes de ejecutar
- Cada decisión considera cómo funciona para el cliente 10 o 100
- Documentar TODO: cada cambio actualiza CONTEXT.md
- Commits descriptivos: `feat:`, `fix:`, `chore:`, `docs:`
- NO construir nada sin aprobación explícita del usuario
- Preguntar primero, construir después
- Usar Claude Code para ejecución, Claude.ai para orquestación y decisiones
- Prompt corto para Claude Code: "meyer-bot dashboard. Next.js 16, Tailwind v4, shadcn. Producción: dashboard.zyvenshop.com. Repo: ~/Documents/meyer-bot/dashboard. Deploy: cd /root/meyer-bot && git pull origin main && cd dashboard && npm run build && pm2 restart meyer-dashboard"

## Key learnings y decisiones tomadas
- **Supabase + Vercel rechazado** — dos bases de datos separadas hacen joins imposibles
- **Polling sobre WebSockets** — correcto para el volumen actual
- **`multi_professional` flag** — cuando false, bot no pregunta por barbero y dashboard oculta columna
- **Timezone crítico** — PostgreSQL en UTC, negocio en Bogotá (UTC-5). Siempre usar `(NOW() AT TIME ZONE 'America/Bogota')::date`
- **llama-3.3-70b** — requiere lenguaje "OBLIGATORIO" y datos de disponibilidad al inicio del prompt
- **bcryptjs** sobre bcrypt — pure JS, sin compilación nativa
- **AUTH_SECRET** no NEXTAUTH_SECRET en NextAuth v5
- **n8n como SPOF** — reemplazar con Node.js + BullMQ + Redis a los 30+ clientes
- **sessionKey multi-tenant** — debe ser `{{ business_id }}_{{ numero }}_v3` para aislar conversaciones entre negocios
- **Workflow genérico** — un solo workflow parametrizado es la arquitectura correcta; duplicar por negocio no escala
