# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales de belleza y barbería.
Producto: bot conversacional WhatsApp + dashboard de gestión + CRM (en desarrollo).
Diferenciador: WhatsApp-native, español colombiano, precio accesible para LATAM.
Expansión planificada: Colombia → España, México, Estados Unidos.

## Stack actual
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows (reemplazar con Node.js + BullMQ + Redis antes de 30 clientes)
- **Evolution API v2.3.7** — conexión WhatsApp (transitorio, migrar a WA Cloud API oficial de Meta por cliente)
- **Groq / llama-3.3-70b** — modelo de IA (límite 100K tokens/día en plan gratuito)
- **PostgreSQL 16** (Docker: meyer_postgres) — base de datos principal y única
- **Next.js 16** + App Router — dashboard frontend (en producción)
- **Tailwind v4** + **shadcn/ui** — estilos y componentes dashboard
- **NextAuth v5** (JWT) — autenticación dashboard contra PostgreSQL
- **PM2** — process manager Next.js en VPS
- **VPS Ubuntu Hetzner** — 178.104.27.180 (no compartir)
- **nginx** — proxy reverso (v1.24.0)

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local: ~/Documents/meyer-bot

## Estructura del proyecto
```
meyer-bot/
├── workflows/
│   ├── Peluqueria_Beta.json              # Flujo Meyer (legacy, activo en paralelo)
│   ├── whatsapp-bot-generico.json        # Flujo genérico multi-tenant (ACTIVO)
│   ├── Recordatorios_24h_Peluqueria.json # Recordatorios automáticos (multi-tenant)
│   └── nodes-gestion-citas.md           # Referencia SQL+JS para nodos de gestión
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
│   │   │   ├── dashboard/               # Vista Hoy
│   │   │   └── semana/                  # Vista Semana + Calendario
│   │   └── api/
│   │       ├── auth/
│   │       └── appointments/month/
│   ├── components/
│   │   ├── ui/
│   │   ├── calendar-month-view.tsx
│   │   └── day-appointments-sheet.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts                      # JWT con business_name, multi_professional
│   │   └── appointments.ts
│   ├── lib/actions.ts
│   ├── types/next-auth.d.ts             # Tipado extendido de sesión
│   └── middleware.ts
├── infrastructure/
│   └── docker-compose.db.yml
├── CONTEXT.md
├── CLAUDE.md
└── README.md
```

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

### Dashboard
- Vista Calendario en /semana con toggle Lista/Calendario
- Grilla de mes con puntos de color por estado (morado/azul/verde/rojo)
- Bottom sheet por día con acciones (completar/cancelar/reagendar)
- Nombre del negocio dinámico en topbar (✂️ {businessName})
- Multi-barbero UI: columna "Profesional" condicional según `multi_professional` flag
- `multiProfessional` y `businessName` en JWT → session → UI
- Script `database/seeds/create-user.js` para onboarding de usuarios desde terminal

### Workflows n8n
- **Workflow genérico `WhatsApp Bot - Genérico`** — un solo workflow para todos los negocios
  - Identifica negocio por `$json.body.instance` → lookup en `businesses`
  - System prompt 100% dinámico desde DB (prompt_name, services_text, schedule_text)
  - sessionKey: `{businessId}_{numero}_v5`
  - URL Evolution API dinámica por instancia
  - Switch de 5 ramas: Confirmar Cita / Gestionar Cita / Cancelar Cita / Reagendar Cita / Fallback
- **Cancelación y reagendamiento por WhatsApp** — funcional end-to-end
  - Tabla `sessions` persiste estado entre turnos (TTL 30 min)
  - Bot detecta intención con vocabulario amplio + jerga colombiana
  - Muestra lista de citas activas, guarda sesión, en siguiente turno inyecta IDs en system prompt
  - UPDATE en appointments + limpieza de sesión + confirmación al cliente
  - Si no hay citas activas: mensaje claro al cliente
- **Recordatorios 24h** — URL dinámica por `whatsapp_instance`, multi-tenant
- **Fix confirmación parcial** — "sí y también X" confirma la cita Y atiende X en siguiente turno

### Base de datos
- Columnas nuevas en `businesses`: `services_text TEXT`, `prompt_name TEXT`, `schedule_text JSONB`
- `schedule_text` schema por día: `{"0":{"open":10,"close":17},"1":{"open":9,"close":19},...}`
- Día sin clave = cerrado. Portable a Redis en migración a Node.js.

### Nuevas tablas en producción
```sql
sessions (id, business_id, numero, accion, citas JSONB, expires_at, created_at)
customers (id, business_id, numero, nombre, genero, preferred_professional_id, notas, primera_visita, ultima_visita, total_visitas, created_at, updated_at)
schedule_exceptions (id, business_id, professional_id, fecha, tipo, hora_inicio, hora_fin, motivo, created_at)
```

## Schema completo actual
```sql
businesses (id, slug, name, whatsapp_instance, owner_number, timezone, active,
            multi_professional, services_text, prompt_name, schedule_text)

appointments (id, business_id, professional_id, fecha, hora, nombre, servicio,
              numero, estado, calendar_event_id, created_at, updated_at)

users (id, email, password_hash, name, business_id, role, active,
       last_login_at, created_at, updated_at)

professionals (id, business_id, name, active, created_at, updated_at)

sessions (id, business_id, numero, accion, citas, expires_at, created_at)

customers (id, business_id, numero, nombre, genero, preferred_professional_id,
           notas, primera_visita, ultima_visita, total_visitas, created_at, updated_at)

schedule_exceptions (id, business_id, professional_id, fecha, tipo,
                     hora_inicio, hora_fin, motivo, created_at)
```

## Negocios en producción

| id | slug | name | whatsapp_instance | owner_number | bot_number | estado |
|----|------|------|-------------------|--------------|------------|--------|
| 1 | meyer | Peluquería Meyer | peluqueria-beta | 573142556322 | 573228767465 | ✅ activo |
| 2 | negocio-prueba | Negocio Prueba | negocio-prueba | 57XXXXXXXXXX | — | pruebas |
| 3 | brayan-study | Brayan Study | brayan-study | 573136053693 | 573114989202 | ⏳ pendiente QR |

**Brayan Study — datos completos:**
- Barbería en Medina, Cundinamarca
- Servicios: Corte caballero $18.000, Corte+barba $22.000, Barba $10.000, Cejas $5.000
- Horarios: Lunes 12PM-7PM | Mar-Sáb 7AM-7PM | Dom 7AM-4PM
- Usuario dashboard: `brayanvaca84@gmail.com`, business_id=3
- Instancia Evolution API: `brayan-study` — webhook configurado → `whatsapp-bot`
- **Pendiente:** escanear QR con número 3114989202 para activar

## Arquitectura del Workflow Genérico

### Fase 1: Recepción y Filtrado
1. **Webhook** → path `whatsapp-bot`, recibe todos los negocios
2. **Filtro Inicial** → descarta grupos (@g.us) y mensajes vacíos
3. **Lookup Negocio** → SELECT en businesses por `$json.body.instance`
4. **¿Negocio Existe?** → descarta instancias no registradas

### Fase 2: Procesamiento
5. **Procesar Mensaje** → rate limit por `businessId_numero`, fechas, horario, numeroLimpio
6. **Leer Sesión activa** → lee `sessions` activas (Always Output Data activo)
7. **Leer Slots Disponibles** → generate_series con schedule_text JSONB — usa `$('Procesar Mensaje').item.json.businessId`
8. **Formatear Disponibilidad** → agrupa slots + inyecta sesionContexto si hay sesión — usa `$('Leer Sesión activa').first().json`

### Fase 3: IA
9. **AI Agent** → system prompt dinámico con promptName, servicesText, horarioTexto, sesionContexto
10. **Groq Chat Model** → llama-3.3-70b
11. **Simple Memory** → sessionKey `{businessId}_{numero}_v5`, 10 mensajes
12. **Wait** → 3 segundos

### Fase 4: Switch de 5 ramas
13. **Switch** → Rules: CITA_CONFIRMADA / GESTIONAR_CITA / CANCELAR_CITA / REAGENDAR_CITA / Fallback

#### Rama Confirmar Cita
14. Leer Disponibilidad → Verificar Slot → ¿Disponible? → Insertar Cita → Construir Mensajes → Notificar Dueño → Confirmar Cliente
15. Aviso Slot Ocupado (rama false de ¿Disponible?)

#### Rama Gestionar Cita
16. Leer Citas Cliente (Always Output Data) → Formatear Citas → IF tieneCitas → Guardar Sesión → Enviar Lista de citas
17. IF false → directo a Enviar Lista de citas (mensaje "no hay citas")

#### Rama Cancelar Cita
18. Ejecutar Cancelación → Confirmar Cancelación → Limpiar Sesión Cancelación

#### Rama Reagendar Cita
19. Ejecutar Reagendamiento → Confirmar Reagendamiento → Limpiar Sesión Reagendamiento

#### Fallback
20. ¿Confirmar o Responder? → Respuesta Normal

## Nodos críticos — configuración especial
- **Leer Sesión activa**: Always Output Data = ON
- **Leer Citas Cliente**: Always Output Data = ON
- **Confirmar Cancelación** campo `number`: modo Expression, valor `{{ $('Procesar Mensaje').item.json.numeroLimpio }}`
- **Formatear Disponibilidad**: referencia sesión con `$('Leer Sesión activa').first().json`
- **Leer Slots Disponibles**: usa `$('Procesar Mensaje').item.json.businessId` explícitamente

## Evolution API
- Manager UI: `http://178.104.27.180:8080/manager` (con apikey)
- Webhook update: `POST /webhook/set/{instance}` con body `{"webhook":{...}}` ← PUT retorna 404
- API key: en `/root/n8n/.env` como `EVOLUTION_API_KEY` = `***REMOVED-EVOLUTION-API-KEY***`
- Conexión QR: usar el manager UI, el QR expira en ~20 segundos

## Dashboard en producción
- URL: https://dashboard.zyvenshop.com
- JWT contiene: userId, email, name, businessId, businessName, multiProfessional, role
- Vista "Hoy" — stats + lista de citas del día
- Vista "Semana" — toggle Lista/Calendario
- Calendario: grilla de mes, puntos de color por estado
- Polling 30s automático
- Responsive mobile-first, bottom nav móvil

## Onboarding de nuevo negocio (proceso manual actual)
1. SQL INSERT en `businesses` con todos los campos incluyendo `schedule_text` JSONB
2. Evolution API manager: crear instancia con mismo nombre que `whatsapp_instance`
3. Configurar webhook: `POST /webhook/set/{instance}` apuntando a `https://n8n.zyvenshop.com/webhook/whatsapp-bot`
4. Conectar número escaneando QR en el manager
5. Crear usuario dashboard: `node database/seeds/create-user.js --email=X --password=X --name=X --business_id=N --role=owner`

## Variables de entorno

### VPS — /root/n8n/.env
```
EVOLUTION_API_KEY=***REMOVED-EVOLUTION-API-KEY***
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...
NODE_FUNCTION_ALLOW_ENV=GOOGLE_SERVICE_ACCOUNT_EMAIL,GOOGLE_PRIVATE_KEY,EVOLUTION_API_KEY,EVOLUTION_API_URL,OWNER_NUMBER
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
POSTGRES_HOST=localhost  (túnel: ssh -L 5432:localhost:5432 root@178.104.27.180)
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Lo que está funcionando ✅
- Bot agenda citas por WhatsApp — flujo completo
- Cancelación por WhatsApp con selección de cita — funcional
- Reagendamiento por WhatsApp — funcional
- Sessions en PostgreSQL para estado entre turnos
- Disponibilidad proactiva con schedule_text JSONB por negocio
- Validación de horario dinámico por día de semana
- Workflow genérico multi-tenant — un solo workflow para N negocios
- Recordatorios 24h automáticos — multi-tenant
- Notificación al dueño + confirmación al cliente
- Rate limit 50 msg/hora por número por negocio
- Filtro de grupos, fromMe, mensajes vacíos
- Dashboard en producción con todas las vistas
- Multi-barbero UI condicional por flag
- Nombre del negocio dinámico en topbar
- Script create-user.js para onboarding desde terminal

## Backlog priorizado

### 🔴 INMEDIATO (antes de cobrar)
1. **Fixes estéticos WhatsApp** — documento `SPRINT4_ONBOARDING_FIXES.md` Parte 2, FIX 1-5 pendientes de aplicar en n8n:
   - FIX 1: Confirmar Cancelación — fecha natural + hora AM/PM
   - FIX 2: Confirmar Reagendamiento — fecha natural + hora AM/PM
   - FIX 3: System prompt — lista horarios sin numeración ni servicio repetido
   - FIX 4: System prompt — IDs invisibles al cliente
   - FIX 5: Construir Mensajes — fecha natural + hora AM/PM en confirmación de agendamiento
2. **Conectar Brayan Study** — escanear QR con número 3114989202
3. **Fix dashboard: calendario clickeable** en días sin citas
4. **Fix dashboard: sincronización** cancelación WhatsApp → dashboard

### 🟡 PRÓXIMO SPRINT
5. Multi-modelo LLM: Cerebras + Groq + Gemini en cadena (resiliencia de tokens)
6. Gestión de no-shows: cron que detecta citas pasadas sin marcar + aviso al barbero
7. reminder_config JSONB en businesses: recordatorios configurables por negocio (horas antes, confirmación explícita)
8. CRM/métricas dashboard — tabla `customers` ya creada, falta UI y lógica de upsert
9. Onboardear más clientes beta

### 🟠 ALTA PRIORIDAD
10. Multi-barbero completo: selección en WhatsApp + schedule_exceptions UI en dashboard
11. `schedule_exceptions` UI — barbero puede bloquear días/horas desde dashboard
12. Panel admin para Johnander (ver todos los negocios, métricas agregadas)
13. Google private key fuera del .env del VPS

### 🟢 MEJORAS FUTURAS
14. Migración a WhatsApp Cloud API oficial (botones interactivos, mayor escala)
15. Timezone dinámico por negocio
16. Mover DNS a Cloudflare
17. Rate limit en PostgreSQL (persistente entre reinicios)
18. Google Calendar reactivar
19. Facturación con Stripe/Wompi
20. Migración n8n → Node.js + BullMQ + Redis (30+ clientes)
21. Upgrade VPS Hetzner (4 vCPU / 8GB) a los 8-10 clientes activos
22. Expansión regional: Europa (España) y Ashburn (EEUU)

## Infraestructura VPS
```
CONTAINER            IMAGE                    STATUS    PUERTO
n8n-n8n-1            n8nio/n8n                Up        5678
meyer_postgres       postgres:16-alpine       Up        127.0.0.1:5432
evolution-api        evoapicloud/v2.3.7       Up        0.0.0.0:8080 ⚠️
evolution-postgres   postgres:15              Up        interno
redis:7-alpine       redis:7-alpine           Up        interno
meyer-dashboard      PM2 (Next.js)            Up        127.0.0.1:3001

VPS specs: 2 vCPU | 3.7GB RAM | 38GB disco
nginx 1.24.0 — proxies: n8n.zyvenshop.com, dashboard.zyvenshop.com
DNS: Namecheap (zyvenshop.com) — migrar a Cloudflare
```
⚠️ evolution-api expuesto en 0.0.0.0:8080 — pendiente asegurar con firewall

## Reglas de seguridad
- ✅ EVOLUTION_API_KEY, URL, OWNER_NUMBER en $env de n8n
- ✅ meyer_postgres solo en 127.0.0.1:5432
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS
- ⚠️ evolution-api expuesto en 0.0.0.0:8080
- NUNCA subir .env ni secrets/ a Git

## Principios de arquitectura (no negociables)
- **Una sola DB PostgreSQL** — Supabase+Vercel rechazado por DB separadas
- **Polling sobre WebSockets** — correcto para volumen actual
- **Generic over specific** — un workflow parametrizado para todos los negocios
- **Diseño portable** — cada decisión considera la migración futura a Node.js
- **Tres horizontes** — cada decisión debe funcionar hoy, sobrevivir la migración, y no exponer errores al cliente
- **sessions en PostgreSQL** — misma interfaz que Redis; cuando se migre a Node.js se reemplaza con Redis sin cambiar lógica de negocio
- **No construir sin aprobación** — diseñar y aprobar antes de ejecutar

## Reglas de trabajo
- Claude.ai: orquestación, arquitectura, decisiones
- Claude Code: ejecución en repo local
- Instruction-file workflow: Claude.ai produce documento numerado → Claude Code ejecuta
- `/clear` en Claude Code entre pasos mayores
- Deploy: git push local → git pull VPS → npm run build → pm2 restart
- Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Prompt Claude Code: "meyer-bot dashboard. Next.js 16, Tailwind v4, shadcn. Producción: dashboard.zyvenshop.com. Repo: ~/Documents/meyer-bot/dashboard. Deploy: cd /root/meyer-bot && git pull origin main && cd dashboard && npm run build && pm2 restart meyer-dashboard"

## Key learnings
- **llama-3.3-70b** requiere instrucciones muy explícitas con "ÚNICAMENTE", "NUNCA", "OBLIGATORIO"
- **Simple Memory sessionKey** debe incluir businessId para aislar conversaciones entre negocios
- **Always Output Data** necesario en nodos Postgres que pueden devolver 0 filas como comportamiento normal
- **Switch sobre IF** cuando hay más de 2 ramas de decisión
- **$('Nodo').first()** en lugar de `.item` cuando el nodo anterior tiene múltiples items
- **Nombres de nodos** en n8n son case-sensitive — `Leer Sesión activa` ≠ `Leer Sesión Activa`
- **Evolution API v2.3.7** webhook usa POST con wrapper `{"webhook":{...}}`, no PUT
- **bcryptjs** sobre bcrypt — pure JS sin compilación nativa
- **AUTH_SECRET** no NEXTAUTH_SECRET en NextAuth v5
- **Groq límite**: 100K tokens/día en plan gratuito — suficiente para pruebas, insuficiente para producción con múltiples clientes
- **schedule_text JSONB** por día (clave = día semana 0-6) — portable y flexible para cualquier horario
- **Campos Expression en n8n** — siempre verificar que el ícono fx esté activo; en modo Fixed las expresiones no se evalúan
- **numero vs numeroLimpio** — `numero` incluye `@s.whatsapp.net`, `numeroLimpio` es solo dígitos. Usar `numeroLimpio` para Evolution API y sessions
