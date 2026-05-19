# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot en producción beta.
Objetivo: escalar a más negocios locales y reemplazar el trabajo actual de Johnander.

## Stack
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows
- **Evolution API** — conexión con WhatsApp (VPS Ubuntu) — temporal, migrar a WA Cloud API
- **Groq / llama-3.3-70b** — modelo de IA para conversación
- **PostgreSQL 16** (Docker: meyer_postgres) — base de datos principal
- **Google Sheets** — desconectado del bot, solo referencia histórica
- **VPS Ubuntu** — servidor en 178.104.27.180 (no compartir esta IP)

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
│   └── docker-compose.db.yml       # Referencia del servicio postgres agregado al VPS
├── docs/
│   ├── proyecto.md
│   ├── workflow-arquitectura.md
│   └── pendientes-seguridad.md
├── prompts/
│   └── meyer-system-prompt.md
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

### ⚠️ Pendiente de seguridad
- Google private key aún está en `/root/n8n/.env` en texto plano
  → Migrar a n8n credentials nativas (Google Service Account)
  → Eliminar GOOGLE_PRIVATE_KEY del .env del VPS

## Sprint 2 — COMPLETADO ✅ (Mayo 18, 2026)

### ✅ Disponibilidad proactiva
- Nuevo nodo PostgreSQL "Leer Slots Disponibles" antes del AI Agent
- Query con generate_series: calcula slots libres de los próximos 7 días
- Nuevo nodo Code "Formatear Disponibilidad": agrupa slots por día en texto natural
- AI Agent recibe disponibilidad real en el system prompt
- Bot muestra horarios disponibles antes de que el cliente elija
- Domingos con horario diferente (10AM-5PM) correctamente excluidos del generate_series

### 🔧 Ajustes pendientes del Sprint 2
1. **Texto demasiado largo**: bot muestra todos los días de golpe en WhatsApp
   → Ajustar prompt para mostrar solo el día solicitado
2. **Confusión de fechas**: "mañana" no siempre coincide entre el calendario y el listado
   → Sincronizar fecha del Code in JavaScript con el generate_series

## Arquitectura del Workflow Principal (21 nodos)

### Fase 1: Recepción y Filtrado
1. **Webhook** → recibe POST de Evolution API
2. **If** → filtra grupos (@g.us) y mensajes vacíos
3. **Code in JavaScript** → rate limit + extrae mensaje + calcula fechas (Bogotá timezone)

### Fase 2: Disponibilidad + Conversación IA
4. **Leer Slots Disponibles** → PostgreSQL: slots libres próximos 7 días
5. **Formatear Disponibilidad** → Code JS: agrupa slots por día en texto natural
6. **AI Agent** → orquesta la conversación con disponibilidad real en system prompt
7. **Groq Chat Model** → llama-3.3-70b
8. **Simple Memory** → historial de 10 mensajes por usuario
9. **Wait** → espera 3 segundos antes de continuar

### Fase 3: Decisión y Validación
10. **If1** → detecta "CITA_CONFIRMADA|servicio|fecha|hora" en respuesta
11. **Leer Disponibilidad** → PostgreSQL COUNT: verifica si el slot sigue libre
12. **Verificar Slot** → Code JS: evalúa resultado del COUNT
13. **¿Disponible?** → decide si el horario está libre

### Fase 4: Persistencia y Notificaciones
14. **Insertar Cita** → PostgreSQL INSERT en tabla appointments
15. **Code in JavaScript1** → construye mensajes para dueño y cliente
16. **Code in JavaScript2** → (DESHABILITADO) Google Calendar
17. **HTTP Request1** → notificación al dueño (WhatsApp)
18. **HTTP Request2** → confirmación al cliente (WhatsApp)

### Rama alternativa
19. **If2** → detecta si NO hay confirmación
20. **HTTP Request** → responde conversación normal
21. **Aviso Slot Ocupado** → informa si el horario está ocupado

## Base de Datos PostgreSQL

### Conexión
- Host (desde n8n): `meyer_postgres`
- Puerto: 5432
- Base de datos: `meyer_db`
- Usuario: `meyer_user`
- Password: en `$POSTGRES_PASSWORD` del .env del VPS
- Container Docker: `meyer_postgres` en red `n8n_default`

### Schema
```sql
businesses (id, slug, name, whatsapp_instance, owner_number, timezone, active)
appointments (id, business_id, fecha DATE, hora TIME, nombre, servicio, 
              numero, estado, calendar_event_id, created_at, updated_at)
```

### Estados válidos de appointments
`Pendiente` | `Confirmada` | `Cancelada` | `Completada`

## Variables de entorno del VPS (/root/n8n/.env)
```
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...
NODE_FUNCTION_ALLOW_ENV=...,EVOLUTION_API_URL,OWNER_NUMBER
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
- ✅ Validación de horario de negocio (fuera de horario = mensaje automático)
- ✅ Verificación anti-colisión en tiempo real antes de confirmar
- ✅ PostgreSQL registra citas automáticamente
- ✅ Recordatorios 24h antes de cada cita (cron 3PM diario)
- ✅ Notificación al dueño cuando se agenda una cita nueva
- ✅ Confirmación al cliente con detalles de la cita
- ✅ Filtro de grupos (solo mensajes directos)
- ✅ Rate limit: 50 mensajes/hora por número
- ✅ Memoria de conversación: últimos 10 mensajes por usuario
- ✅ Cálculo automático de fechas (hoy, mañana, próximos 7 días en contexto)

## Backlog priorizado

### 🔴 CRÍTICO
1. **Google private key en .env del VPS en texto plano**
   → Migrar a n8n credentials nativas (Google Service Account)
   → Eliminar GOOGLE_PRIVATE_KEY del .env del VPS
   → Afecta: si alguien accede al VPS, tiene la key expuesta

### 🟡 ALTA PRIORIDAD

2. **Sprint 3 — Dashboard de gestión** (siguiente)
   - Vista de citas del día y la semana
   - Acciones: cancelar, reagendar
   - Conectado directo a PostgreSQL
   - Servido desde el VPS con nginx
   - Tecnología: HTML/JS estático + n8n webhooks como API
     (sin frameworks, sin build, funcional para el dueño)

3. **Reagendamiento por WhatsApp** (faltaba en backlog original)
   - Buscar cita existente por número en PostgreSQL
   - UPDATE fecha/hora en appointments
   - Confirmar cambio al cliente

4. **Cancelación por WhatsApp** (faltaba en backlog original)
   - Buscar cita por número
   - UPDATE estado = 'Cancelada'
   - Confirmar al cliente

5. **Ajustes de disponibilidad proactiva**
   - Mostrar solo el día solicitado, no todos los días de golpe
   - Sincronizar "mañana" entre calendario y listado de slots

### 🟠 MEDIA PRIORIDAD

6. **Migración a WhatsApp Cloud API oficial** (cuando termine el dashboard)
   - Reemplazar Evolution API por Meta WhatsApp Business API
   - Cambios en: Webhook, nodo If, Code in JavaScript, 4 nodos HTTP Request
   - Requiere HTTPS en el webhook (ya disponible en n8n.zyvenshop.com)
   - Formato de payload completamente distinto al de Evolution API
   - Mantener Evolution API activo hasta que WA Cloud API esté probado

7. **Reactivar Google Calendar**
   - Migrar credenciales a n8n credentials nativas
   - Reconectar nodo Code in JavaScript2 al flujo
   - Guardar calendar_event_id en PostgreSQL para reagendamiento/cancelación

### 🟢 MEJORAS

8. **Métricas para el dueño**
   - Resumen semanal automático por WhatsApp
   - Tipos de servicio más solicitados
   - Horarios con mayor demanda
   - Tasa de cancelación
   - Fuente: queries SQL sobre appointments

9. **Rate limit en PostgreSQL** (en lugar de static data de n8n)
   - Actualmente usa $getWorkflowStaticData (se pierde al reiniciar n8n)
   - Migrar a tabla `rate_limits` en PostgreSQL para persistencia real

10. **Multi-tenant real**
    - Actualmente business_id=1 hardcodeado en todos los queries
    - Leer business_id desde la instancia de Evolution API (`peluqueria-beta`)
    - Permitir onboarding de nuevos clientes sin tocar el workflow

## Plan de migración a WhatsApp Cloud API

Cuando llegue el momento (post-dashboard), los cambios son:

| Nodo | Cambio |
|---|---|
| Webhook | Agregar verificación de token META |
| If | Cambiar path de remoteJid a messages[0].from |
| Code in JavaScript | Cambiar extracción de mensaje y número |
| HTTP Request (x4) | POST a graph.facebook.com con Bearer token |
| Variables .env | Agregar WHATSAPP_TOKEN, WHATSAPP_PHONE_ID |

## Reglas de seguridad
- ✅ EVOLUTION_API_KEY en $env
- ✅ EVOLUTION_API_URL en $env
- ✅ OWNER_NUMBER en $env
- ✅ Credenciales Google en secrets/ (ignorado en Git)
- ✅ .env ignorado en Git
- ⚠️ GOOGLE_PRIVATE_KEY aún en .env del VPS — pendiente de limpiar
- NUNCA subir .env ni secrets/ a Git
- Verificar con `git status` antes de cada commit

## Reglas de trabajo en equipo
- Pensar siempre en escala, no solo en Meyer
- No dar la razón sin razonar primero
- Cada decisión considera cómo funciona para el cliente 10 o 100
- Documentar TODO: cada cambio de arquitectura actualiza CONTEXT.md
- Commits descriptivos: `feat:`, `fix:`, `chore:`, `docs:`
- Exportar workflow de n8n antes de cada commit (UI → Export → Download)
