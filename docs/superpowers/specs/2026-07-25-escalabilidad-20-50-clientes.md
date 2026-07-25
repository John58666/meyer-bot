# Spec: Arquitectura 20-50 clientes — meyer-bot

> **Propósito:** Documento de diseño para escalar meyer-bot de 2 a 20-50 clientes. Lo ejecuta otro agente (chat separado).
> **Estado:** Pendiente de implementación
> **Prerrequisito:** Leer `docs/ARCHITECTURE.md`, `docs/KEY_LEARNINGS.md`, `docs/reference/RESEARCH.md`

---

## 1. Resumen ejecutivo

### Stack final
```
VPS único (Hetzner AX102-1-LTD, 12 vCPU, 32 GB, ~€157/mes)
├── Caddy (reverse proxy + SSL)
├── PostgreSQL 16 (n8n + app)
├── Redis 7 (n8n queue)
├── n8n main (UI + webhooks, queue mode)
├── n8n workers (2-3 contenedores)
├── Dashboard Next.js (abstraction layer WhatsApp)
└── (Evolution API en servidor separado o mismo VPS)

WhatsApp: Evolution API (hoy) → Meta BSP via BSP (futuro)
```

### Proveedor WhatsApp
- **Hoy:** Evolution API (self-hosted, WhatsApp Web no oficial)
- **Futuro:** Meta Business API via BSP (360dialog, Twilio, WATI)
- **Abstracción:** Dashboard API route `/api/whatsapp/*` — n8n nunca llama directo a Evolution/Meta
- **Switch:** Cambiar `WHATSAPP_PROVIDER` en `.env` + credenciales. Cero cambios en n8n.

### Costo estimado mensual (20-50 clientes)
| Componente | Costo |
|---|---|
| Hetzner AX102-1-LTD (32 GB, 12 vCPU, 2×1 TB NVMe) | ~€157/mes |
| Meta BSP (pricing por mensaje, no por conversación — ver §3.5) | ~$0.002-0.025/msg según categoría |
| Evolution API VPS (si separado) | ~€10-15 |
| **Total infra** | **~€170-180/mes** |

> **Nota de precio 2026:** Hetzner ajustó precios en Junio 2026. AX102-1-LTD a €157/mes es la opción más barata actual. SSD empresarial con PLP (Power Loss Protection) justifica el costo para PostgreSQL + Redis (50x más IOPS fsync que NVMe de consumo).

---

## 2. Infraestructura

### 2.1 Servidor único (recomendado para 20-50 clientes)

**Provider:** Hetzner AX102-1-LTD (AX series, stock limitado) o AX102-1 — 12 vCPU, 32 GB RAM, 2×1 TB NVMe empresarial (con PLP), ~€157/mes

> **Actualización Julio 2026:** Hetzner aplicó ajuste de precios en Junio 2026. AX102-1-LTD es €157/mes, AX102-1 regular es €257/mes. La variante LTD es mientras dure stock de hardware anterior. Benchmarks reales: 25,951 tps en pgbench (5x AX41-NVMe), 10,318 IOPS fsync (50x superior a NVMe de consumo). Los NVMe Datacenter Edition con PLP son críticos para PostgreSQL y Redis en producción.

**Distribución de recursos:**

| Servicio | RAM | CPU | Storage |
|---|---|---|---|
| PostgreSQL 16 | 4 GB | 2 vCPU | 50 GB NVMe |
| Redis 7 | 1 GB | 1 vCPU | 5 GB |
| n8n main | 1 GB | 1 vCPU | — |
| n8n worker ×2 | 3 GB | 4 vCPU | — |
| Dashboard Next.js | 1 GB | 1 vCPU | 200 MB |
| Caddy + sistema | 1 GB | 1 vCPU | — |
| **Reserva libre** | **~20 GB** | **2 vCPU** | **~1.9 TB** |

> El VPS actual probablemente es mas pequeño. Si es <16 GB, escalar a Hetzner AX102 cuando se pase de 10 clientes.

### 2.2 Arquitectura de red

```
Internet
  ↓
Caddy (puertos 80/443, SSL automático)
  ├── /api/* → Dashboard Next.js (puerto 3000)
  ├── /n8n/* → n8n main (puerto 5678)
  └── /webhook/* → n8n main (puerto 5678)
```

### 2.3 Docker Compose target

```yaml
# docker-compose.yml — producción
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n -d n8n"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 1gb
      --maxmemory-policy noeviction
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

  n8n-main:
    image: n8nio/n8n:latest # Pinar a version especifica en produccion
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      EXECUTIONS_MODE: queue
      QUEUE_BULL_REDIS_HOST: redis
      QUEUE_BULL_REDIS_PORT: 6379
      QUEUE_BULL_REDIS_DB: 1
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      N8N_HOST: ${N8N_HOST}
      WEBHOOK_URL: https://${N8N_HOST}
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: 168
      EXECUTIONS_DATA_PRUNE_MAX_COUNT: 50000
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  n8n-worker:
    image: n8nio/n8n:latest # Pinar a version especifica en produccion
    restart: unless-stopped
    command: worker --concurrency=10
    environment:
      EXECUTIONS_MODE: queue
      QUEUE_BULL_REDIS_HOST: redis
      QUEUE_BULL_REDIS_PORT: 6379
      QUEUE_BULL_REDIS_DB: 1
      QUEUE_WORKER_LOCK_DURATION: 120000
      QUEUE_WORKER_LOCK_RENEW_TIME: 15000
      QUEUE_WORKER_STALLED_INTERVAL: 30000
      QUEUE_BULL_JOB_OPTIONS_REMOVE_ON_COMPLETE: 1000
      QUEUE_HEALTH_CHECK_ACTIVE: "true"
      N8N_GRACEFUL_SHUTDOWN_TIMEOUT: 45
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2
```

Variables de entorno requeridas en `.env`:

```bash
POSTGRES_PASSWORD=<random-32-chars>
N8N_ENCRYPTION_KEY=<openssl rand -base64 32>
N8N_HOST=n8n.tudominio.com
```

---

## 3. WhatsApp Abstraction Layer

### 3.1 Arquitectura

```
n8n → POST /api/whatsapp/send → dashboard route → Evolution API (hoy)
                                                   → Meta BSP (futuro)
```

### 3.2 Endpoints

Crear en `dashboard/src/app/api/whatsapp/`:

| Endpoint | Método | Propósito | Provider Evolution | Provider Meta |
|---|---|---|---|---|
| `/api/whatsapp/send` | POST | Enviar texto | `POST /message/sendText/{instance}` | `POST /messages` |
| `/api/whatsapp/send-media` | POST | Enviar imagen/media | `POST /message/sendMedia/{instance}` | `POST /messages` con media |
| `/api/whatsapp/status/:instance` | GET | Verificar conexión | `GET /instance/connectionState/{instance}` | `GET /phone-numbers` |
| `/api/whatsapp/instance/create` | POST | Crear instancia | `POST /instance/create` | N/A (BSP maneja) |
| `/api/whatsapp/instance/qr/:instance` | GET | Obtener QR | `GET /instance/qr/{instance}` | N/A (BSP maneja) |

### 3.3 Implementación

```typescript
// dashboard/src/lib/whatsapp/provider.ts

export type WhatsAppProvider = "evolution" | "meta";

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  // Evolution
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  // Meta BSP
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaBusinessAccountId?: string;
}

export async function sendText(
  config: WhatsAppConfig,
  to: string,
  text: string,
  instance?: string
): Promise<{ success: boolean; messageId?: string }> {
  switch (config.provider) {
    case "evolution":
      return sendEvolutionText(config, to, text, instance!);
    case "meta":
      return sendMetaText(config, to, text);
  }
}
```

```typescript
// dashboard/src/app/api/whatsapp/send/route.ts

import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { sendText } from "@/lib/whatsapp/provider";

export async function POST(req: Request) {
  const { to, text, instance } = await req.json();
  const config = getWhatsAppConfig();
  const result = await sendText(config, to, text, instance);
  return Response.json(result);
}
```

### 3.4 Configuración

```typescript
// dashboard/src/lib/whatsapp/config.ts

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    provider: (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) || "evolution",
    evolutionApiUrl: process.env.EVOLUTION_API_URL,
    evolutionApiKey: process.env.EVOLUTION_API_KEY,
    metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID,
    metaAccessToken: process.env.META_ACCESS_TOKEN,
  };
}
```

`.env` añade:
```bash
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://evolution.tudominio.com
EVOLUTION_API_KEY=abc123
# META_PHONE_NUMBER_ID=
# META_ACCESS_TOKEN=
```

### 3.5 Migración de Evolution API a Meta BSP

> **⚠️ Advertencia crítica — actualizado Julio 2026:** Si Evolution API usa **Baileys** (protocolo WhatsApp Web no oficial, que es el caso típico), **NO hay migración directa a Meta BSP**. Son protocolos completamente diferentes. El número de teléfono no se puede portar. Se necesita un número nuevo o registrarlo desde cero en Meta. Si Evolution API ya usa Meta Cloud API como provider interno, entonces la migración de BSP es posible (ver abajo).

#### Escenario A: Evolution con Baileys (hoy)
- **No hay migración de número.** El número actual no se puede transferir a Meta.
- Se pierde el histórico de chats.
- Las plantillas deben crearse desde cero en Meta Business Platform.
- Los webhooks deben reconfigurarse completamente.
- **Ganancia:** 99.9% uptime, sin riesgo de baneo (Meta no banea su propio API), sin reconexiones.

#### Escenario B: Evolution con Meta Cloud API (futuro)
1. Crear Meta Business Account verificada.
2. Iniciar Embedded Signup con el BSP elegido (360dialog, Twilio, SendSeven).
3. Período de coexistencia: Meta permite ambos BSPs conectados 24-72h; implementar deduplicación por message ID.
4. Re-enviar plantillas de mensaje para aprobación (no se migran automáticamente; 24-48h).
5. Actualizar webhooks y rotar tokens.
6. Corte: verificar recepción → desconectar BSP anterior → monitorear 48h.

#### Pricing Meta BSP actualizado (Julio 2026)

Meta cambió de pricing por conversación a **pricing por mensaje** el 1 Julio 2025. Colombia:

| Categoría | Costo por mensaje |
|-----------|-------------------|
| Marketing | $0.011 |
| Utility | $0.002 |
| Authentication | $0.002 |
| Service | **Gratis** (ilimitado si el cliente inicia) |

**Beneficio:** 1,000 conversaciones de servicio gratis/mes desde Nov 2024. Las conversaciones iniciadas por el cliente son gratis.

#### BSPs recomendados para Colombia/LATAM

| BSP | Cuota | Markup | Ideal para |
|-----|-------|--------|------------|
| **360dialog** | €49/mes | 0% | Equipos técnicos |
| **Twilio** | $0/mes | ~20% | Multi-canal (SMS+WhatsApp) |
| **SendSeven** | €9/canal/mes | 0% | Startups, costo-efectivo |
| **MessageCloud** | €29/mes | ~10-15% | SMBs, soporte en español |

---

## 4. n8n Queue Mode + Gateway Pattern

> **Requisito obligatorio:** Queue mode requiere **PostgreSQL** como base de datos. SQLite NO es compatible.

### 4.1 Migración de modo regular a queue

Pasos en orden:

1. **Agregar Redis** al docker-compose (config arriba)
2. **Agregar n8n-worker** al docker-compose (2 réplicas iniciales)
3. **Cambiar n8n-main** a `EXECUTIONS_MODE=queue`
4. **Verificar** que todos los workers arrancan y ven la DB
5. **Verificar** que los webhooks existentes siguen funcionando
6. **Monitorear** la cola de Redis las primeras 24h

### 4.2 Sub-workflow overhead y riesgos conocidos

**Overhead real:** ~50-500ms por llamada a sub-workflow (depende del tamaño). El problema principal no es el overhead puro sino:

1. **Validation stall** (Issue #32250, reportado Junio 2026): n8n re-valida el workflow completo en cada ejecución en queue mode. Para 185 nodos: ~48s de stall antes de ejecutar el primer nodo. **No hay caché por versionId.** Esto justifica la regla de <20 nodos por sub-workflow.

2. **Silent data loss en sub-workflows** (Issue #27725, abierto): sub-workflows pueden perder items al retornar datos al padre sin errores visibles. Comportamiento no determinista. **Mitigación:** validar conteo de items post sub-workflow con nodo Code que compare input vs output.

**Mejores prácticas compiladas:**
- Validar inputs explícitamente en el Execute Workflow Trigger del sub-workflow
- Para sub-workflows que retornan datos: implementar nodo de validación de integridad en el padre
- Logging explícito: loguear número de items recibidos y devueltos en cada sub-workflow
- Configurar `removeOnComplete: true` y `removeOnFail: true` en opciones de ejecución para evitar acumulación en Redis

### 4.2 Gateway sub-workflow

Crear workflow `WhatsApp Gateway` con Execute Workflow Trigger:

```
Execute Workflow Trigger (recibe webhook de Evolution API)
  → Code node: extraer instanceName del payload
  → PostgreSQL: SELECT business_id, active FROM businesses WHERE whatsapp_instance = $instanceName
  → IF active=false: Responder 200 vacío (descartar)
  → Switch por business_id:
      1 → Execute Workflow "WhatsApp Bot - Cliente 1"
      2 → Execute Workflow "WhatsApp Bot - Genérico" (current default)
      N → Execute Workflow "WhatsApp Bot - Cliente N"
  → Responder 200 OK
```

> **Importante:** El gateway es SOLO ruteo. No tiene lógica de negocio. Max 5 nodos.
> Si no hay sub-workflow para ese business_id, ejecutar el genérico (fallback).

### 4.3 Sub-workflows target

Cada sub-workflow debe tener **<20 nodos** para evitar el stall de validación en queue mode.

```
WhatsApp Bot - Genérico (plantilla para nuevos clientes)
  ├── Fase 1: Recepción (~4 nodos)
  │   ├── Webhook → Filtro (grupos, vacío, multimedia)
  │   └── Lookup negocio (PostgreSQL)
  ├── Fase 2: Procesamiento (~6 nodos)
  │   ├── Rate limit (50 msg/hora)
  │   ├── Validación horario (short-circuit)
  │   ├── Leer sesión activa (PostgreSQL)
  │   └── Leer slots disponibles (PostgreSQL + generate_series)
  ├── Fase 3: IA (~4 nodos)
  │   ├── Leer historial
  │   ├── HTTP Request a dashboard: GET /api/prompts/:business_id
  │   ├── HTTP Request a dashboard: GET /api/whatsapp/send (abstraction)
  │   └── Guardar historial
  └── Fase 4: Switch de acciones (~4 nodos)
      ├── CITA_CONFIRMADA
      ├── CANCELAR_CITA
      ├── REAGENDAR_CITA
      └── GESTIONAR_CITA
```

### 4.4 Recordatorios (fusionado)

Fusionar los 2 workflows de recordatorios en 1:

```
Recordatorios (cron 8 AM + 3 PM)
  → PostgreSQL: SELECT citas de mañana/próximas 2h
  → Loop por each cita
      → HTTP: POST /api/whatsapp/send (recordatorio personalizado)
```

### 4.5 Inactividad Bot y No-Shows

- **Inactividad Bot**: Mantener pero con límite: max 1 mensaje proactivo cada 24h por número.
- **No-Shows**: Reemplazar cron por SQL programado (pg_cron o trigger al cerrar día).

---

## 5. Prompts fuera de n8n

### 5.1 Estructura de archivos

```
prompts/
├── v1/
│   ├── generic.yaml        # Prompt genérico (default para nuevos clientes)
│   ├── peluqueria.yaml     # Prompt específico para peluquería
│   └── barberia.yaml       # Prompt específico para barbería
├── v2/
│   └── ...
└── CHANGELOG.md
```

```yaml
# prompts/v1/generic.yaml
name: generic-v1
version: 1
created: 2026-07-25
variables:
  - negocioNombre
  - servicios
  - horariosDisponibles
  - sesionContexto
  - historial
  - fechaActual
  - politicaPrivacidadUrl
sections:
  system:
    - role: "Eres el asistente virtual de {{negocioNombre}}"
    - "RESPONDES SOLO en español colombiano (sin voseo)"
    - "NUNCA inventas servicios, horarios o fechas"
  rules:
    - "SOLO puedes ofrecer días/horas que aparezcan en HORARIOS DISPONIBLES"
    - "Si el cliente pide algo fuera de tu alcance: 'No tengo esa información'"
  actions:
    - "CITA_CONFIRMADA|servicio|fecha|hora|profesional"
    - "CANCELAR_CITA|id"
    - "REAGENDAR_CITA|id"
    - "GESTIONAR_CITA: el cliente quiere modificar algo sin cancelar"
  data_protection:
    - "Si el cliente pregunta por sus datos: 'Puedes solicitar la eliminación escribiendo "elimina mis datos"'"
```

### 5.2 Dashboard endpoint

```typescript
// dashboard/src/app/api/prompts/[business_id]/route.ts

export async function GET(
  req: Request,
  { params }: { params: { business_id: string } }
) {
  const promptName = await getBusinessPromptName(parseInt(params.business_id));
  const prompt = await loadPrompt(promptName || "generic");
  
  // Inyectar variables del negocio
  const business = await getBusiness(parseInt(params.business_id));
  const rendered = renderPrompt(prompt, business);
  
  return Response.json({ prompt: rendered, version: prompt.version });
}
```

### 5.3 n8n consume prompt

Reemplazar el jsCode de 22 variables por:

```
HTTP Request: GET /api/prompts/{{$json.business_id}}
  → Almacenar en $json.systemPrompt
  → Usar $json.systemPrompt en el HTTP Request del LLM
```

Esto elimina la dependencia de jsCode. Para cambiar un prompt: editar YAML → commit → deploy. Sin tocar n8n.

---

## 6. Base de datos multi-tenant

### 6.1 Principio: una sola base de datos

No crear una DB por cliente. Todo en la misma PostgreSQL con `business_id` como discriminador.

La DB actual ya usa `business_id` en todas las tablas. No se requieren cambios de schema — solo confirmar que todos los queries lo usan.

### 6.2 Índices para 20-50 clientes

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date
  ON appointments (business_id, fecha);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_business_numero
  ON customers (business_id, numero);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_business_numero
  ON sessions (business_id, numero);

-- Para métricas y dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_estado
  ON appointments (business_id, estado, fecha);
```

### 6.3 Connection pooling

> **⚠️ Actualizado Julio 2026:** n8n v2.x en queue mode tiene problemas con PgBouncer en modo `transaction`. Race condition documentada: ~50% de fallos en workers con transaction pooling. Ver [n8n community #246815](https://community.n8n.io/t/v2-2-4-worker-failed-to-find-data-for-execution-race-condition-in-queue-mode-not-present-in-v1-x/246815). Usar **session pooling** como predeterminado.

Para 20-50 clientes concurrentes, PostgreSQL necesita pool:

```
Servicio: PgBouncer (sidecar en el mismo VPS)
Modo: session (recomendado para n8n queue mode)
Pool size: 20-30 conexiones
```

Config:
```ini
[databases]
n8n = host=localhost port=5432 dbname=n8n
app = host=localhost port=5432 dbname=meyerbot

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
pool_mode = session
default_pool_size = 25
max_client_conn = 100
```

n8n apunta a `localhost:6432` en vez de `localhost:5432`.

**Si se requiere transaction pooling:** solo después de verificar compatibilidad con n8n queue mode. Mitigaciones necesarias:
- `statement_timeout=0` en cadena de conexión
- `max_prepared_statements=0` en PgBouncer
- `EXECUTIONS_DATA_SAVE_WAIT=true` en n8n (si existe)
- Reducir concurrencia de workers a 3

---

## 7. Onboarding automation

### 7.1 Onboarding de nuevo cliente (script)

```bash
# scripts/onboard-client.sh
# Usage: ./onboard-client.sh --name=PeluqueriaXYZ --slug=peluqueria-xyz \
#   --email=admin@xyz.com --password=secure123 --phone=573001234567

# 1. Crear negocio en PostgreSQL
psql $DATABASE_URL -c "
  INSERT INTO businesses (slug, name, whatsapp_instance, owner_number, timezone, active)
  VALUES ('$SLUG', '$NAME', '$SLUG', '$PHONE', 'America/Bogota', true);
"

# 2. Crear instancia en Evolution API
curl -X POST $EVOLUTION_API_URL/instance/create \
  -H "apiKey: $EVOLUTION_API_KEY" \
  -d "{\"instanceName\":\"$SLUG\"}"

# 3. Obtener QR e imprimir
curl $EVOLUTION_API_URL/instance/qr/$SLUG \
  -H "apiKey: $EVOLUTION_API_KEY"

# 4. Crear usuario admin
node scripts/create-user.js \
  --email=$EMAIL --password=$PASSWORD \
  --name=$NAME --business_id=$BUSINESS_ID \
  --role=owner

# 5. Asignar sub-workflow en n8n gateway
# (si es necesario — el gateway puede crear sub-workflow automático)

# 6. Crear prompt inicial (copiar generic.yaml)
cp prompts/v1/generic.yaml prompts/v1/$SLUG.yaml
```

### 7.2 Portal de administración (cuando haya dashboard multi-cliente)

Vista en dashboard: `/admin/clientes` — lista de negocios, estado de conexión WhatsApp, última actividad, usuarios.

---

## 8. Monitoreo

### 8.1 Métricas críticas

| Métrica | Qué detecta | Alerta |
|---|---|---|
| Redis queue depth (`bull:job:count:waiting`) | Workers saturados | >20 por 5 min |
| Worker CPU > 80% | Necesitas mas workers | >80% por 10 min |
| PostgreSQL dead tuples | Autovacuum atrasado | >10% de tabla |
| Evolution API instancias caídas | Session WhatsApp perdida | Cualquiera caída >5 min |
| n8n execution errors rate | Workflow roto | >1% en 1h |
| Sub-workflow item count mismatch | Silent data loss (#27725) | Items input ≠ output en sub-workflow |

### 8.2 Dashboard de monitoreo (Netdata + simple dashboard)

Netdata es gratuito y corre en el mismo VPS con overhead mínimo (~2% CPU, 200 MB RAM):

```bash
docker run -d --name=netdata \
  --pid=host \
  --network=host \
  -v /etc/netdata:/etc/netdata \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  netdata/netdata
```

Netdata muestra: CPU, RAM, disco, red, PostgreSQL queries, Redis, Docker containers.

### 8.3 Logs

```bash
# Centralizar logs de Docker
docker logs n8n-main --tail 100 > /var/log/n8n-main.log
docker logs n8n-worker --tail 100 > /var/log/n8n-worker.log
```

Para producción: usar Loki + Promtail si hay presupuesto, o simplemente Netdata + Docker logs.

---

## 9. Plan de migración por fases

Cada fase es independiente y se puede hacer sin afectar clientes actuales.

### Fase 1: Preparación (1-2 días)
- [ ] Agregar Redis al docker-compose
- [ ] Migrar n8n a queue mode (main + 1 worker)
- [ ] Configurar `EXECUTIONS_DATA_PRUNE`
- [ ] Verificar que los 2 clientes actuales siguen funcionando

### Fase 2: WhatsApp abstraction layer (2-3 días)
- [ ] Crear `/api/whatsapp/send` en dashboard
- [ ] Crear `/api/whatsapp/send-media`
- [ ] Crear sub-workflow "Send Message" en n8n que llama a la API
- [ ] Migrar nodos HTTP de Evolution directo a sub-workflow "Send Message"
- [ ] Verificar que todos los mensajes se envían correctamente

### Fase 3: Gateway + sub-workflows (3-5 días)
- [ ] Crear sub-workflow "WhatsApp Gateway" (Execute Workflow Trigger)
- [ ] Partir el workflow de 50 nodos en sub-workflows de <20 nodos
- [ ] Configurar el gateway para rutear por business_id
- [ ] Probar con cliente actual
- [ ] Agregar segundo worker

### Fase 4: Prompts fuera de n8n (1-2 días)
- [ ] Crear `prompts/v1/generic.yaml` con el prompt actual
- [ ] Crear `/api/prompts/[business_id]` en dashboard
- [ ] Reemplazar jsCode por HTTP Request en n8n
- [ ] Verificar que el output del LLM es idéntico (comparar antes/después)

### Fase 5: Onboarding + monitoreo (1-2 días)
- [ ] Crear script de onboarding
- [ ] Agregar Netdata
- [ ] Agregar índices DB
- [ ] Documentar procedimiento de onboarding

---

## 10. Lo que NO cambia

- **Una sola DB PostgreSQL** — el schema actual ya usa `business_id`
- **Generic over specific** — un workflow parametrizado para todos
- **Polling sobre WebSockets** — correcto para este volumen
- **sessions/conversation_history en PostgreSQL** — se migra a Redis solo si es necesario

## 11. Lo que se agrega

| Componente | Propósito | Crítico para |
|---|---|---|
| Redis | Cola de n8n queue mode | Fase 1 |
| n8n workers | Ejecución paralela de workflows | Fase 1 |
| Dashboard API `/api/whatsapp/*` | Abstracción de proveedor WhatsApp | Fase 2 |
| Sub-workflow Gateway | Ruteo multi-cliente | Fase 3 |
| Sub-workflows <20 nodos | Evitar stall de validación queue mode | Fase 3 |
| `prompts/*.yaml` | Prompts versionados fuera de n8n | Fase 4 |
| `/api/prompts/*` | Endpoint para servir prompts | Fase 4 |
| Script onboarding | Agregar cliente en 1 comando | Fase 5 |
| Netdata | Monitoreo básico | Fase 5 |
| PgBouncer | Connection pooling | Fase 5 |

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| n8n queue mode stall en workflows grandes | Alta | Medio | Mantener sub-workflows <20 nodos |
| Silent data loss en sub-workflows (Issue #27725) | Media | Alto | Validar conteo items post sub-workflow; logging de integridad |
| Evolution API memory leak | Baja | Medio | **Corregido en v2.3.7** (Dic 2025). Usar ≥ v2.3.7 |
| Redis restart pierde cola | Baja | Alto | AOF persistence + `noeviction` |
| Worker OOM | Baja | Medio | Límite de memoria en contenedor |
| Migración a Meta BSP requiere número nuevo (Baileys) | Alta | Alto | Si usan Baileys, NO hay migración de número. Planificar número nuevo |
| Costo Meta BSP mayor al esperado | Media | Medio | Monitorear costo desde día 1. 1,000 conv servicio gratis/mes |
| PgBouncer transaction pooling incompatible con n8n queue | Media | Medio | Usar session pooling en vez de transaction |
