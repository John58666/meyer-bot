# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot en producción beta.
Objetivo: escalar a más negocios locales y reemplazar el trabajo actual de Johnander.

## Stack actual
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows (temporal, será reemplazado por backend propio)
- **Evolution API** — conexión con WhatsApp (temporal, migrar a WA Cloud API)
- **Groq / llama-3.3-70b** — modelo de IA para conversación
- **PostgreSQL 16** (Docker: meyer_postgres) — base de datos principal
- **VPS Ubuntu** — servidor en 178.104.27.180 (no compartir esta IP)
- **nginx** — proxy reverso (v1.24.0)

## Stack futuro (Dashboard V1)
- **Next.js 14** + App Router — frontend dashboard
- **Tailwind CSS** + **shadcn/ui** — estilos y componentes
- **NextAuth v5** — autenticación contra PostgreSQL
- **PM2** — process manager para Next.js en VPS
- **Polling 30s** — sincronización dashboard ↔ bot (sin WebSockets por ahora)
- **Todo en el mismo VPS** — sin Supabase, sin Vercel, una sola BD

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
│   └── n8n-queries.sql             # Queries de referencia para nodos n8n
├── infrastructure/
│   └── docker-compose.db.yml       # Referencia del servicio postgres
├── docs/
│   ├── proyecto.md
│   ├── workflow-arquitectura.md
│   └── pendientes-seguridad.md
├── prompts/
│   └── meyer-system-prompt.md
├── dashboard/                      # NUEVO — Next.js app
│   ├── (pendiente de crear)
│   └── ...
├── clientes/meyer/
├── secrets/                        # Credenciales Google (ignorado en Git)
├── .env                            # Variables de entorno (ignorado en Git)
├── .env.example
├── docker-compose.yml
├── CONTEXT.md
├── CLAUDE.md
└── README.md
```

## Sprint 0 — COMPLETADO ✅ (Mayo 18, 2026)

### ✅ Seguridad
- EVOLUTION_API_KEY migrada a .env — todos los nodos usan `$env.EVOLUTION_API_KEY`
- Google private key eliminada del workflow (nodo "Code in JavaScript2" desconectado)
- N8N_BLOCK_ENV_ACCESS_IN_NODE=false configurado en docker-compose.yml
- IP del servidor migrada a `$env.EVOLUTION_API_URL` en los 4 nodos HTTP
- Número del dueño migrado a `$env.OWNER_NUMBER` en Code in JavaScript1

## Sprint 1 — COMPLETADO ✅ (Mayo 18, 2026)

### ✅ PostgreSQL
- Container meyer_postgres corriendo en VPS (postgres:16-alpine)
- Mismo VPS, red Docker n8n_default
- Schema multi-tenant: tablas `businesses` + `appointments`
- Meyer registrado como business_id=1
- 34 citas migradas desde Google Sheets (datos de beta)
- Credential "Postgres account" en n8n con host `meyer_postgres`

### ✅ Workflows migrados a PostgreSQL
- peluqueria-beta: nodos Sheets reemplazados por PostgreSQL
  - "Leer Disponibilidad" → PostgreSQL COUNT query
  - "Verificar Slot" → JS simplificado que lee total del COUNT
  - "Append row in sheet" → "Insertar Cita" PostgreSQL INSERT
- recordatorios-meyer: nodo "Leer Citas" → PostgreSQL SELECT

## Sprint 2 — COMPLETADO ✅ (Mayo 19, 2026)

### ✅ Disponibilidad proactiva
- Nodo PostgreSQL "Leer Slots Disponibles" antes del AI Agent
- Query con generate_series: calcula slots libres próximos 7 días
- Nodo Code "Formatear Disponibilidad": agrupa slots por día en texto natural
- AI Agent recibe disponibilidad real en el system prompt
- Bot muestra horarios disponibles antes de que el cliente elija
- Domingos con horario diferente (10AM-5PM) correctamente excluidos
- Timezone corregido a America/Bogota en todos los queries
- generate_series(0,7) para incluir día actual
- System prompt ajustado: mostrar solo día solicitado, no todos de golpe

### ✅ Fixes aplicados
- Hora sin segundos en recordatorios (substring 0,5)
- Timezone corregido con NOW() AT TIME ZONE 'America/Bogota'
- System prompt: instrucción OBLIGATORIA para usar datos de disponibilidad

### 🔧 Ajustes pendientes del Sprint 2
1. Mejora visual de cómo se muestran horarios en WhatsApp (formato compacto, separar AM/PM)
2. Orden estricto: servicio → fecha → hora (modelo a veces salta pasos)

## Sprint 3 — Dashboard V1 (PLANIFICADO)

### Decisiones de arquitectura aprobadas
- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Auth:** NextAuth v5 con credentials provider contra PostgreSQL propio
- **BD:** PostgreSQL existente en VPS (UNA sola BD para todo)
- **Realtime:** Polling cada 30s (sin WebSockets — volumen no lo justifica)
- **Deploy:** VPS con PM2 + nginx en dashboard.zyvenshop.com
- **NO Supabase** — evitar dependencia externa y dos BDs separadas
- **NO Vercel** — evitar latencia entre edge y VPS

### Descartado con justificación
- Supabase Auth → Crea dos BDs separadas, Realtime no funciona con PostgreSQL externo
- Vercel → Latencia con PostgreSQL en VPS, complejidad innecesaria
- WebSockets → Over-engineering para 5-20 citas/día por negocio
- Mapa en V1 → Sin valor funcional, se agrega después al bot como link de Google Maps en confirmación

### Funcionalidades V1
1. Login/signup con email + contraseña
2. Vista "Hoy" — lista de citas del día
3. Vista "Semana" — citas agrupadas por día
4. Agendar cita manualmente (para cuando cliente llama por teléfono)
5. Cancelar cita
6. Reagendar cita
7. Marcar como completada
8. Stats: total hoy, pendientes, completadas, canceladas
9. Responsive mobile-first
10. Polling 30s — citas nuevas del bot aparecen automáticamente

### Schema nuevo (agregar a PostgreSQL existente)

```sql
-- Tabla de usuarios del dashboard
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  business_id INTEGER REFERENCES businesses(id),
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner','employee','admin')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de profesionales (peluqueros)
CREATE TABLE professionals (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Agregar a businesses
ALTER TABLE businesses ADD COLUMN multi_professional BOOLEAN DEFAULT false;

-- Agregar a appointments
ALTER TABLE appointments ADD COLUMN professional_id INTEGER REFERENCES professionals(id);
```

### Multi-profesional (diseñado pero no activo en V1)
- `businesses.multi_professional = false` → bot no pregunta "¿con quién?", dashboard no muestra peluquero
- `businesses.multi_professional = true` → bot pregunta, dashboard filtra por peluquero
- Meyer V1: multi_professional = false (1 solo peluquero)
- Se activa por cliente cuando lo requiera
- En dashboard: si multi_professional = true → citas muestran nombre peluquero, formulario tiene selector, filtro por profesional
- En dashboard: si multi_professional = false → nada de eso aparece

### Fases de ejecución
```
Fase 1 → Schema + Auth (sesión 1)
  1.1 Crear tablas users, professionals en PostgreSQL
  1.2 Agregar professional_id y multi_professional al schema
  1.3 Inicializar Next.js + Tailwind + shadcn/ui
  1.4 Configurar NextAuth v5
  1.5 Login funcional

Fase 2 → Dashboard funcional (sesión 2-3)
  2.1 Vista "Hoy"
  2.2 Vista "Semana"
  2.3 Agendar cita manual
  2.4 Cancelar / Completar / Reagendar
  2.5 Stats
  2.6 Responsive

Fase 3 → Sincronización (sesión 4)
  3.1 Polling 30s
  3.2 Bot confirma → dashboard actualiza
  3.3 Dashboard cancela → no afecta bot

Fase 4 → Deploy (sesión 4)
  4.1 Next.js en VPS con PM2
  4.2 nginx proxy → dashboard.zyvenshop.com
  4.3 SSL con certbot
  4.4 DNS en Namecheap (A record → 178.104.27.180)
```

## Arquitectura del Workflow Principal (21 nodos)

### Fase 1: Recepción y Filtrado
1. **Webhook** → recibe POST de Evolution API
2. **If** → filtra grupos (@g.us) y mensajes vacíos
3. **Code in JavaScript** → rate limit + extrae mensaje + calcula fechas (Bogotá timezone)

### Fase 2: Disponibilidad + Conversación IA
4. **Leer Slots Disponibles** → PostgreSQL: slots libres próximos 7 días (NOW() AT TIME ZONE 'America/Bogota')
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
- Puerto: 5432
- Base de datos: `meyer_db`
- Usuario: `meyer_user`
- Password: en $POSTGRES_PASSWORD del .env del VPS
- Container Docker: `meyer_postgres` en red `n8n_default`

### Schema actual
```sql
businesses (id, slug, name, whatsapp_instance, owner_number, timezone, active, multi_professional)
appointments (id, business_id, professional_id, fecha DATE, hora TIME, nombre, servicio, numero, estado, calendar_event_id, created_at, updated_at)
users (id, email, password_hash, name, business_id, role, active, created_at) -- PENDIENTE
professionals (id, business_id, name, active) -- PENDIENTE
```

### Estados válidos de appointments
`Pendiente` | `Confirmada` | `Cancelada` | `Completada`

### Roles de users
`owner` | `employee` | `admin`

## Variables de entorno del VPS (/root/n8n/.env)
```
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...
NODE_FUNCTION_ALLOW_ENV=...,EVOLUTION_API_URL,OWNER_NUMBER
```
⚠️ GOOGLE_PRIVATE_KEY aún en texto plano — pendiente de limpiar

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
- ✅ Cálculo automático de fechas con timezone Bogotá

## Backlog priorizado

### 🔴 CRÍTICO
1. **Sprint 3 — Dashboard V1** (SIGUIENTE — ver plan arriba)

### 🟡 ALTA PRIORIDAD
2. Google private key fuera del .env del VPS
3. Reagendamiento por WhatsApp (buscar cita por número → UPDATE)
4. Cancelación por WhatsApp (UPDATE estado = Cancelada)
5. Mejora visual de horarios en WhatsApp

### 🟠 MEDIA PRIORIDAD
6. Migración a WhatsApp Cloud API oficial
7. Reactivar Google Calendar con credentials nativas
8. Timezone dinámico por negocio
9. Horarios y servicios dinámicos por negocio (tablas en PostgreSQL)

### 🟢 MEJORAS
10. Rate limit en PostgreSQL (persistente vs static data)
11. Multi-tenant real (business_id dinámico)
12. Métricas automáticas para el dueño
13. Sistema de onboarding sin tocar código
14. Mapa Google Maps link en confirmación de cita por WhatsApp
15. Facturación con Stripe/Wompi

## Plan de reemplazo de n8n (cuando haya 30+ clientes)
```
n8n actual → Backend propio Node.js + Express/Fastify
           → Cola de mensajes BullMQ + Redis
           → Workers de procesamiento
           → Misma BD PostgreSQL
           → Mismo schema, mismas queries
```
No hacer antes de 30 clientes. n8n aguanta 10-15 sin problemas.

## Infraestructura VPS al cierre
```
CONTAINER          IMAGE                STATUS
n8n-n8n-1          n8nio/n8n            Up
meyer_postgres     postgres:16-alpine   Up
evolution-api      evoapicloud/v2.3.7   Up
evolution-postgres postgres:15          Up (no tocar)
redis:7-alpine                          Up

VPS specs: 2 vCPU | 3.7GB RAM (2.5GB libre) | 38GB disco (21GB libre)
nginx 1.24.0 instalado
DNS: Namecheap (zyvenshop.com)
```

## Reglas de seguridad
- ✅ EVOLUTION_API_KEY en $env
- ✅ EVOLUTION_API_URL en $env
- ✅ OWNER_NUMBER en $env
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- NUNCA subir .env ni secrets/ a Git
- Verificar con `git status` antes de cada commit

## Reglas de trabajo
- Pensar siempre en escala, no solo en Meyer
- No dar la razón sin razonar primero — siempre cuestionar antes de ejecutar
- Cada decisión considera cómo funciona para el cliente 10 o 100
- Documentar TODO: cada cambio actualiza CONTEXT.md
- Commits descriptivos: `feat:`, `fix:`, `chore:`, `docs:`
- Exportar workflow de n8n antes de cada commit
- NO construir nada sin aprobación explícita del usuario
- Preguntar primero, construir después
