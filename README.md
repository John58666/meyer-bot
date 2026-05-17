# Meyer Bot

> Bot de WhatsApp con IA para Peluquería Meyer — Automatización inteligente de citas con verificación de disponibilidad en tiempo real

![Stack](https://img.shields.io/badge/stack-n8n%20%2B%20Evolution%20API%20%2B%20Claude%20Haiku%204.5-blueviolet)
![Status](https://img.shields.io/badge/estado-beta%20en%20producci%C3%B3n-brightgreen)
![License](https://img.shields.io/badge/licencia-privado-lightgrey)
![Client](https://img.shields.io/badge/cliente-Peluquer%C3%ADa%20Meyer-ff69b4)

---

## Descripción

**Meyer Bot** es un agente conversacional con IA que automatiza completamente el canal de WhatsApp Business de **Peluquería Meyer**. Los clientes pueden agendar citas, consultar servicios y recibir recordatorios, todo a través de conversaciones naturales en español.

Este proyecto es el **primer cliente** de una plataforma SaaS de agentes WhatsApp con IA para negocios locales, con el objetivo de validar el modelo de negocio y escalar a múltiples clientes.

### ✨ Capacidades Actuales

- ✅ **Conversación natural con Claude Haiku 4.5** — Entiende lenguaje coloquial
- ✅ **Agendamiento inteligente** — Guía al cliente paso a paso (servicio → fecha → hora)
- ✅ **Verificación de disponibilidad en tiempo real** — Lee Google Sheet antes de confirmar
- ✅ **Sistema anti-colisión** — No permite agendar horarios ya ocupados
- ✅ **Recordatorios automáticos** — 24h antes de cada cita (3PM diario)
- ✅ **Notificaciones al dueño** — Alerta por WhatsApp con cada nueva cita
- ✅ **Validación de horario** — Respuesta automática fuera de horario de atención
- ✅ **Rate limit** — Protección contra spam (50 mensajes/hora por usuario)
- ✅ **Memoria conversacional** — Recuerda últimos 10 mensajes por usuario
- ✅ **Filtro de grupos** — Solo atiende mensajes directos

### 🎯 Casos de Uso Reales

**Cliente**: "Hola, necesito un corte de caballero mañana a las 2pm"  
**Meyer Bot**:
```
Perfecto, te confirmo los datos:
✂️ Servicio: Corte caballero
📅 Fecha: Sábado 18 de mayo
⏰ Hora: 14:00
¿Confirmamos la cita? 😊
```

**Cliente**: "Sí, confirmo"  
**Meyer Bot**: *(verifica disponibilidad en Sheet)*
```
✅ ¡Tu cita quedó confirmada!

✂️ Servicio: Corte caballero
📅 Fecha: Sábado 18 de mayo
⏰ Hora: 14:00

¡Te esperamos en Peluquería Meyer! 💇‍♂️
Cualquier cambio, escríbenos aquí mismo 😊
```

**Dueño recibe notificación automática**:
```
🔔 Nueva cita agendada

👤 Cliente: Juan Pérez
📞 Número: 573123456789
✂️ Servicio: Corte caballero
📅 Fecha: 18/05/2026
⏰ Hora: 14:00

Estado: Pendiente ✅
```

---

## Datos de Peluquería Meyer

**Nombre**: Peluquería Meyer  
**Ubicación**: Colombia  
**Horarios**:
- Lunes a Sábado: 9:00 AM - 7:00 PM
- Domingos: 10:00 AM - 5:00 PM

**Servicios y Precios**:
- Corte dama: $35.000
- Corte caballero: $25.000
- Tinte completo: $80.000
- Manicure + pedicure: $65.000
- Peinado especial: $50.000

---

## Arquitectura del Sistema

### Stack Tecnológico

```
┌─────────────────┐
│    Cliente      │  WhatsApp (móvil del cliente)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Evolution API (VPS :8080)              │
│          Gateway WhatsApp Business                  │
│             (self-hosted Ubuntu)                    │
└────────┬─────────────────────────────────────┬──────┘
         │ webhook POST                        │ send
         │ (cada mensaje recibido)             │ (respuestas)
         ▼                                     │
┌─────────────────────────────────────────────▼──────┐
│          n8n Workflow (self-hosted)                │
│        https://n8n.zyvenshop.com                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Workflow: peluqueria-beta.json (19 nodos)  │  │
│  │  • Filtros (grupos, rate limit)             │  │
│  │  • Conversación con Claude                   │  │
│  │  • Validación de disponibilidad              │  │
│  │  • Persistencia y notificaciones             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Workflow: recordatorios-meyer.json          │  │
│  │  • Cron: Diario 3PM                          │  │
│  │  • Recordatorios 24h antes de cita           │  │
│  └──────────────────────────────────────────────┘  │
└────┬────────────┬────────────────┬─────────────────┘
     │            │                │
     ▼            ▼                ▼
┌─────────┐ ┌──────────┐ ┌─────────────────┐
│ Claude  │ │  Google  │ │ Google Calendar │
│ Haiku   │ │  Sheets  │ │  (deshabilitado)│
│ 4.5 API │ │          │ └─────────────────┘
└─────────┘ └──────────┘
  Anthropic   Base datos
     IA         citas
```

### Componentes y Roles

| Componente | Función | Ubicación | Estado |
|------------|---------|-----------|--------|
| **Evolution API** | Gateway WhatsApp Business | VPS Ubuntu :8080 | ✅ Activo |
| **n8n** | Orquestador de workflows | https://n8n.zyvenshop.com | ✅ Activo |
| **Claude Haiku 4.5** | Modelo de lenguaje conversacional | Anthropic API | ✅ Activo |
| **Google Sheets** | Base de datos de citas | Google Cloud | ✅ Activo |
| **Google Calendar** | Gestión de eventos | Google Cloud | ⏸️ Pausado |

### Flujo de Datos Típico

1. **Cliente envía mensaje** → Evolution API recibe
2. **Evolution API** → POST webhook a n8n
3. **n8n filtra** → Rechaza grupos y spam
4. **n8n procesa** → Claude Haiku genera respuesta
5. **¿Cliente confirma cita?**
   - **SÍ**: Verifica disponibilidad en Sheet → Guarda → Notifica
   - **NO**: Responde conversación normal
6. **n8n envía respuesta** → Evolution API → Cliente

---

## Workflows

El sistema funciona con 2 workflows independientes en n8n:

### 1. `peluqueria-beta.json` — Flujo Principal

**Trigger**: Webhook POST desde Evolution API (cada mensaje de WhatsApp recibido)  
**Nodos**: 19 nodos en 4 fases  
**Documento técnico**: Ver `docs/workflow-arquitectura.md`

**Fases del flujo**:

1. **Recepción y Filtrado**
   - Webhook recibe mensaje
   - Filtra grupos y mensajes vacíos
   - Rate limit: 50 msg/hora por usuario
   - Calcula fechas (hoy, mañana, próximos 7 días)

2. **Conversación con IA**
   - Claude Haiku 4.5 genera respuestas
   - Memoria: últimos 10 mensajes por usuario
   - Valida horario de atención

3. **Validación de Disponibilidad**
   - Detecta confirmación de cita
   - Lee todas las citas del Google Sheet
   - Verifica que fecha+hora estén disponibles
   - Rechaza si el horario ya está ocupado

4. **Persistencia y Notificaciones**
   - Guarda cita en Google Sheets
   - Envía notificación al dueño
   - Envía confirmación al cliente

### 2. `recordatorios-meyer.json` — Recordatorios Automáticos

**Trigger**: Cron schedule — Todos los días a las 3:00 PM (Bogotá)  
**Nodos**: 4 nodos  
**Función**: Envía recordatorios 24h antes de cada cita

**Flujo**:
1. Lee todas las citas del Sheet
2. Filtra citas de mañana (Estado != "Cancelada")
3. Envía mensaje personalizado a cada cliente

**Ejemplo de mensaje**:
```
Hola Juan 👋

Te recordamos que tienes una cita en *Peluquería Meyer* mañana 
*sábado 18 de mayo* a las *14:00*.

✂️ Servicio: *Corte caballero*

Si necesitas cancelar o reagendar, responde este mensaje 😊
```

---

## Base de Datos (Google Sheets)

**Archivo**: "CItas Peluqueria" (Google Sheets)  
**Pestaña**: "Datos clientes"

**Estructura**:

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Fecha | Texto | DD/MM/YYYY | `18/05/2026` |
| Hora | Texto | HH:MM | `14:00` |
| Nombre | Texto | Nombre del cliente | `Juan Pérez` |
| Servicio | Texto | Servicio solicitado | `Corte caballero` |
| Número | Texto | WhatsApp | `573123456789` |
| Estado | Texto | Estado de la cita | `Pendiente`, `Cancelada` |
| EventID | Texto | ID de Google Calendar | (vacío actualmente) |

**Operaciones**:
- Lectura: Verificar disponibilidad antes de confirmar
- Escritura: Append row cuando se confirma cita
- Filtrado: Recordatorios filtran por fecha de mañana

---

## Estructura del Proyecto

```
meyer-bot/
├── workflows/
│   ├── peluqueria-beta.json        # Flujo principal (19 nodos)
│   └── recordatorios-meyer.json    # Recordatorios diarios
├── docs/
│   ├── proyecto.md                 # Documentación técnica completa
│   ├── workflow-arquitectura.md    # Diagrama y flujo detallado
│   └── pendientes-seguridad.md     # Issues de seguridad
├── prompts/
│   └── meyer-system-prompt.md      # Prompt completo de Claude
├── clientes/
│   └── meyer/                      # Configuración específica de Meyer
├── secrets/                        # ⚠️ IGNORADO por Git
│   └── google-credentials.json     # Service Account JSON
├── .env                            # ⚠️ IGNORADO por Git
├── .env.example                    # Plantilla de variables
├── docker-compose.yml              # n8n local (desarrollo)
├── CONTEXT.md                      # Contexto del proyecto
├── CLAUDE.md                       # Reglas de seguridad
└── README.md                       # Este archivo
```

---

## Requisitos del Sistema

### Infraestructura
- **VPS Ubuntu 20.04+** con Docker
- **Dominio** con certificado SSL (para n8n y Evolution API)
- **Mínimo 2GB RAM** (recomendado 4GB)
- **20GB almacenamiento**

### Software
- [n8n](https://n8n.io) self-hosted (v1.x o superior)
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) self-hosted
- Docker y Docker Compose

### Servicios Externos
- **Anthropic API** — Cuenta con acceso a Claude Haiku 4.5
- **Google Cloud** — Service Account con permisos:
  - Google Sheets API (read/write)
  - Google Calendar API (read/write) — opcional
- **WhatsApp Business** — Número conectado a Evolution API

### Costos Estimados (Mensual)

| Concepto | Costo Aproximado |
|----------|------------------|
| VPS (2GB RAM) | USD $10-20 |
| Dominio + SSL | USD $1-2 |
| Anthropic API (Claude Haiku) | USD $5-15 (según uso) |
| Google Cloud | Gratis (tier gratuito) |
| WhatsApp Business | Gratis |
| **Total** | **USD $16-37/mes** |

---

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/John58666/meyer-bot.git
cd meyer-bot
```

### 2. Configurar Variables de Entorno

Copiar el archivo de ejemplo y editarlo con los valores reales:

```bash
cp .env.example .env
nano .env  # o vim, code, etc.
```

**Variables requeridas**:

```env
# Evolution API
EVOLUTION_API_URL=https://tu-servidor:8080
EVOLUTION_API_KEY=tu-api-key-de-evolution
EVOLUTION_INSTANCE=nombre-de-tu-instancia
MEYER_INSTANCIA=peluqueria-beta

# Google Cloud
GOOGLE_CREDENTIALS_PATH=./secrets/google-credentials.json
GOOGLE_SHEET_ID=1gMfpG-7AN3TmqOOL2xTDgNE3Y_G8PNuwCsVsm-4JsW8
GOOGLE_CALENDAR_ID=tu-calendar-id@group.calendar.google.com  # Opcional

# Anthropic (se configura en n8n, no requerida en .env)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Peluquería Meyer
MEYER_NUMERO_DUENO=573XXXXXXXXX  # Número del dueño para notificaciones

# n8n
N8N_URL=https://n8n.zyvenshop.com
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

> ⚠️ **Importante**: NUNCA commitear el archivo `.env` a Git. Ya está en `.gitignore`.

### 3. Configurar Google Cloud Service Account

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto nuevo (ej: `peluqueria-beta`)
3. Habilitar APIs:
   - Google Sheets API
   - Google Calendar API (opcional)
4. Crear Service Account:
   - IAM & Admin → Service Accounts → Create
   - Nombre: `n8n-sheets`
   - Grant role: Editor (o permisos específicos)
5. Descargar JSON key:
   - Service Account → Keys → Add Key → JSON
6. Guardar como `secrets/google-credentials.json`

```bash
mkdir -p secrets
mv ~/Downloads/peluqueria-beta-*.json secrets/google-credentials.json
chmod 600 secrets/google-credentials.json
```

### 4. Crear Google Sheet para Citas

1. Crear nuevo Google Sheet
2. Nombrar: "CItas Peluqueria"
3. Crear pestaña: "Datos clientes"
4. Agregar columnas (fila 1):
   ```
   Fecha | Hora | Nombre | Servicio | Número | Estado | EventID
   ```
5. Compartir Sheet con el Service Account:
   - Share → Agregar email del Service Account (ej: `n8n-sheets-402@peluqueria-beta.iam.gserviceaccount.com`)
   - Rol: Editor
6. Copiar el ID del Sheet desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE-ES-EL-ID]/edit
   ```
7. Pegar ID en `.env` → `GOOGLE_SHEET_ID`

### 5. Instalar y Configurar n8n

#### Opción A: Docker (Recomendado)

```bash
docker-compose up -d
```

Luego acceder a http://localhost:5678

#### Opción B: Instalación Manual

Ver [documentación oficial de n8n](https://docs.n8n.io/hosting/)

### 6. Configurar Credenciales en n8n

1. Ir a **Settings → Credentials**
2. Agregar credencial **Anthropic**:
   - Name: `Anthropic account`
   - API Key: Tu API key de Anthropic
3. Agregar credencial **Google Service Account**:
   - Name: `Google Sheets account 3`
   - Service Account Email: (del JSON)
   - Private Key: (del JSON)
4. Agregar credencial **HTTP Header Auth** (para Evolution API):
   - Name: `Header Auth account`
   - Header Name: `apikey`
   - Header Value: Tu API key de Evolution API

### 7. Importar Workflows en n8n

1. Ir a **Workflows** → botón **+** → **Import from File**
2. Seleccionar `workflows/peluqueria-beta.json`
3. Repetir para `workflows/recordatorios-meyer.json`
4. En cada workflow:
   - Verificar que las credenciales estén conectadas correctamente
   - Actualizar valores hardcodeados (IP del servidor, IDs, etc.)
   - Guardar cambios

### 8. Activar Workflows

1. **peluqueria-beta**: Click en **Inactive** → **Active**
2. Copiar la URL del webhook (aparece en el nodo Webhook)
3. **recordatorios-meyer**: Click en **Inactive** → **Active**

### 9. Configurar Evolution API

1. Acceder a tu instancia de Evolution API
2. Ir a la instancia de WhatsApp conectada
3. Configurar webhook:
   - **URL**: La URL del webhook de n8n (paso 8.2)
   - **Events**: `messages.upsert`
   - **Method**: POST
4. Guardar configuración

### 10. Prueba Final

Enviar mensaje de WhatsApp al número conectado:
```
Hola
```

Deberías recibir respuesta del bot en unos segundos.

---

## Seguridad

### ✅ Implementado

- `.env` y `secrets/` en `.gitignore` (no se suben a Git)
- Repositorio privado en GitHub
- Google Service Account con permisos mínimos necesarios
- Rate limit por usuario (50 msg/hora)

### ⚠️ Pendientes Críticos

Ver documento completo en `docs/pendientes-seguridad.md`

1. **API keys hardcodeadas** en 3 nodos del workflow (Evolution API)
2. **Private key de Google** hardcodeada en nodo deshabilitado
3. **IP del servidor** hardcodeada en múltiples nodos

**Acción recomendada**: Migrar todas las credenciales a Credentials Manager de n8n

### 🔒 Checklist Pre-Commit

Antes de cada commit, verificar:

```bash
git status  # Verificar que .env y secrets/ no aparezcan
grep -r "BEGIN PRIVATE KEY" --exclude-dir=.git  # Buscar keys expuestas
grep -r "api.*key.*=.*[A-Z0-9-]" --exclude-dir=.git  # Buscar API keys
```

---

## Estado del Proyecto (Mayo 2026)

### ✅ Funcionalidades Activas

- [x] Infraestructura VPS desplegada y funcionando
- [x] n8n instalado y configurado
- [x] Evolution API conectada con WhatsApp Business
- [x] Workflow principal beta activo (19 nodos)
- [x] Sistema de verificación de disponibilidad en tiempo real
- [x] Sistema anti-colisión de horarios
- [x] Recordatorios automáticos (cron diario 3PM)
- [x] Notificaciones al dueño por cada nueva cita
- [x] Memoria conversacional (10 mensajes por usuario)
- [x] Validación de horario de atención
- [x] Rate limit (50 msg/hora por usuario)

### 🟡 En Desarrollo

- [ ] Migración de credenciales hardcodeadas a vault seguro
- [ ] Reactivación de Google Calendar con credentials seguras
- [ ] Disponibilidad proactiva (mostrar horarios libres al cliente)
- [ ] Reagendamiento funcional
- [ ] Cancelación funcional
- [ ] Panel de métricas para el dueño

### 🔮 Roadmap Futuro

- [ ] Multi-tenant (adaptar para múltiples clientes)
- [ ] Dashboard de administración
- [ ] Sistema de billing
- [ ] Plantillas configurables por negocio
- [ ] Integración con sistemas de pago

---

## Métricas de Uso (Meyer)

### Datos del Cliente

| Métrica | Valor |
|---------|-------|
| Citas agendadas/mes | 80-120 (estimado) |
| Tasa de conversación | 60-70% (mensaje → cita) |
| Servicios más solicitados | Corte caballero, Tinte completo |
| Horarios más demandados | Sábados 2PM-5PM |
| Tasa de cancelación | < 10% |

> **Nota**: Métricas estimadas. Sistema de tracking en desarrollo.

---

## Troubleshooting

### El bot no responde

1. Verificar que el workflow esté **Active** en n8n
2. Revisar que Evolution API esté conectada: `curl http://VPS_IP:8080/instance/connectionState/peluqueria-beta`
3. Verificar webhook en Evolution API apunta a n8n
4. Revisar logs de n8n: **Executions** → ver últimas ejecuciones

### Bot responde pero no guarda citas

1. Verificar credencial de Google Sheets en n8n
2. Comprobar que el Service Account tiene permisos de Editor en el Sheet
3. Revisar ID del Sheet en el nodo "Append row in sheet"

### Recordatorios no se envían

1. Verificar que workflow `recordatorios-meyer` esté **Active**
2. Revisar cron expression: `0 15 * * *` (3PM diario)
3. Comprobar que haya citas para mañana en el Sheet
4. Revisar logs: **Executions** del workflow

### Rate limit alcanzado

1. Revisar historial de mensajes: `$getWorkflowStaticData('global').rateLimits`
2. Ajustar límite en nodo "Code in JavaScript": `const limite = 50;`
3. Considerar implementar whitelist para números confiables

---

## Desarrollo y Testing

### Entorno de Desarrollo Local

```bash
# Levantar n8n local
docker-compose up -d

# Acceder a n8n
open http://localhost:5678

# Ver logs
docker-compose logs -f n8n
```

### Testing del Workflow

1. **Usar n8n Test Webhook**:
   - En nodo Webhook → Click "Listen for Test Event"
   - Enviar mensaje de WhatsApp de prueba
   - Ver ejecución en tiempo real

2. **Testing manual con curl**:
```bash
curl -X POST http://localhost:5678/webhook/whatsapp-meyer \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "data": {
        "key": {
          "remoteJid": "573123456789@s.whatsapp.net",
          "fromMe": false
        },
        "message": {
          "conversation": "Hola, quiero un corte de caballero"
        },
        "pushName": "Juan Test"
      }
    }
  }'
```

### Casos de Prueba Recomendados

- [ ] Conversación completa: consulta → agendamiento → confirmación
- [ ] Horario ocupado (intentar agendar slot ya reservado)
- [ ] Fuera de horario (mensaje a las 11PM)
- [ ] Rate limit (> 50 mensajes en 1 hora)
- [ ] Mensaje desde grupo (debe ignorarse)
- [ ] Reagendar cita existente (pendiente de implementar)
- [ ] Cancelar cita (pendiente de implementar)

---

## Contribuir

### Flujo de Trabajo

1. **Crear rama feature**:
   ```bash
   git checkout -b feat/nombre-funcionalidad
   ```

2. **Desarrollar y testear**

3. **Si modificaste workflow**:
   - Exportar desde n8n (Settings → Download)
   - Reemplazar JSON en `workflows/`

4. **Actualizar documentación**:
   - `CONTEXT.md` si hay cambios arquitectónicos
   - `docs/workflow-arquitectura.md` si cambió el flujo
   - `docs/proyecto.md` si hay nuevas funcionalidades

5. **Commit siguiendo convenciones**:
   ```bash
   git add .
   git commit -m "feat: agregar disponibilidad proactiva"
   ```

6. **Push y PR**:
   ```bash
   git push origin feat/nombre-funcionalidad
   ```

### Convención de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
chore: mantenimiento o configuración
docs: solo documentación
refactor: refactorización de código sin cambio funcional
test: agregar o modificar tests
```

**Ejemplos**:
- `feat: agregar reagendamiento de citas`
- `fix: corregir validación de horario en domingos`
- `docs: actualizar README con nuevas métricas`
- `chore: migrar API keys a credentials de n8n`

---

## Recursos y Documentación

### Documentación Interna

- [`CONTEXT.md`](CONTEXT.md) — Contexto del proyecto, reglas de trabajo, arquitectura
- [`CLAUDE.md`](CLAUDE.md) — Reglas de seguridad para Claude
- [`docs/proyecto.md`](docs/proyecto.md) — Documentación técnica completa
- [`docs/workflow-arquitectura.md`](docs/workflow-arquitectura.md) — Diagrama detallado del workflow
- [`docs/pendientes-seguridad.md`](docs/pendientes-seguridad.md) — Issues de seguridad
- [`prompts/meyer-system-prompt.md`](prompts/meyer-system-prompt.md) — Prompt de Claude

### Documentación Externa

- [n8n Documentation](https://docs.n8n.io/)
- [Evolution API Docs](https://doc.evolution-api.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

## Contacto y Soporte

**Desarrollador**: Johnander  
**Repositorio**: https://github.com/John58666/meyer-bot (privado)  
**Cliente**: Peluquería Meyer  

**Stack**:
- n8n: https://n8n.zyvenshop.com
- Evolution API: VPS Ubuntu
- Claude Haiku 4.5: Anthropic API

---

## Licencia

**Privado** — Este proyecto no tiene licencia open source. Todos los derechos reservados.

---

## Agradecimientos

- **n8n**: Plataforma de automatización workflow-based
- **Evolution API**: Gateway WhatsApp Business open source
- **Anthropic**: Claude Haiku 4.5 para conversaciones en lenguaje natural
- **Peluquería Meyer**: Primer cliente y validación del modelo de negocio

---

*Parte de una plataforma SaaS de agentes WhatsApp con IA para negocios locales. Objetivo: escalar a múltiples clientes y generar ingresos recurrentes.*

**Estado actual**: Beta en producción con 1 cliente (Meyer)  
**Próximo objetivo**: Onboarding de cliente #2 y validación de multi-tenant  
**Última actualización**: Mayo 17, 2026
