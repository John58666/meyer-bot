# RUNBOOK.md — meyer-bot

> Comandos operacionales. Referencia para deploy, DB, n8n, Evolution API, túnel SSH.

## Deploy estándar
```bash
# Desde Mac
cd ~/Documents/meyer-bot
git add .
git commit -m "tipo: descripción"
git push                          # ejecuta .githooks/pre-push (smoke test B6)

# En VPS
ssh root@178.104.27.180
cd /root/meyer-bot/dashboard
git pull
npm run build
pm2 restart meyer-dashboard   # usar pm2 reload cuando haya 10+ clientes
```

## Setup inicial (primera vez que clonas el repo)
```bash
git clone https://github.com/John58666/meyer-bot.git
cd meyer-bot
bash scripts/setup-hooks.sh       # configura .githooks/ como hooks de git
```

## PM2
```bash
pm2 list                          # ver estado
pm2 logs meyer-dashboard          # ver logs
pm2 restart meyer-dashboard       # reiniciar (downtime ~30-60s)
pm2 reload meyer-dashboard        # zero-downtime (usar cuando haya 10+ clientes)
pm2 status                        # resumen
```

## PostgreSQL
```bash
# Entrar a psql
docker exec -it meyer_postgres psql -U meyer_user -d meyer_db

# Comandos útiles dentro de psql
\dt                               # listar tablas
\q                                # salir
\d appointments                   # describir tabla

# Verificar password en runtime (más fiable que leer .env)
docker exec meyer_postgres env | grep POSTGRES

# Tunnel SSH desde Mac (para desarrollo local)
ssh -f -N -L 5432:localhost:5432 root@178.104.27.180
kill $(lsof -t -i:5432)           # cerrar tunnel
```

## Queries útiles
```sql
-- Ver negocios activos
SELECT id, name, whatsapp_instance, active FROM businesses;

-- Corregir services_text de un negocio
UPDATE businesses SET services_text = 'Nombre $precio, Nombre2 $precio2' WHERE id = N;

-- Corregir name de un negocio
UPDATE businesses SET name = 'Nombre correcto' WHERE id = N;

-- Ver citas de hoy (Bogotá)
SELECT * FROM appointments 
WHERE fecha = (NOW() AT TIME ZONE 'America/Bogota')::date
ORDER BY hora;

-- Ver sesiones activas
SELECT * FROM sessions WHERE expires_at > NOW();

-- Limpiar historial conversacional expirado
DELETE FROM conversation_history WHERE expires_at < NOW();
```

## Docker
```bash
docker ps                         # ver contenedores
docker logs n8n-n8n-1            # logs de n8n
docker logs meyer_postgres        # logs de postgres

# IMPORTANTE: restart NO relee .env
docker compose down && docker compose up -d   # para releer .env
docker compose restart            # NO usar si cambiaste variables
```

## n8n
- URL: https://n8n.zyvenshop.com
- Contenedor: `n8n-n8n-1`
- Config: `/root/n8n/.env`
- **Estrategia de cambio seguro en workflow:**
  1. Duplicar workflow activo → "TEST - WhatsApp Bot"
  2. Probar en instancia negocio-prueba (business_id=2)
  3. Copiar cambios al workflow real
  4. Exportar JSON antes de tocar → rollback = reimportar JSON anterior

## Evolution API
- Manager UI: `http://178.104.27.180:8080/manager` (con apikey)
- Webhook: `POST /webhook/set/{instance}` (PUT retorna 404)
- Body webhook: `{"webhook": {"url": "https://n8n.zyvenshop.com/webhook/whatsapp-bot", "enabled": true}}`
- API key: en `/root/n8n/.env` como `EVOLUTION_API_KEY`
- Conexión QR: usar el manager UI, el QR expira en ~20 segundos

## Variables de entorno

### VPS — /root/n8n/.env
```
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=http://178.104.27.180:8080
OWNER_NUMBER=573142556322
POSTGRES_PASSWORD=...
GEMINI_API_KEY=...
CEREBRAS_API_KEY=...
GROQ_API_KEY=...
DASHBOARD_URL=http://host.docker.internal:3001
WEBHOOK_SECRET=...
NODE_FUNCTION_ALLOW_ENV=GOOGLE_SERVICE_ACCOUNT_EMAIL,GOOGLE_PRIVATE_KEY,EVOLUTION_API_KEY,EVOLUTION_API_URL,OWNER_NUMBER,GEMINI_API_KEY,CEREBRAS_API_KEY,GROQ_API_KEY,DASHBOARD_URL,WEBHOOK_SECRET
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```
⚠️ GOOGLE_PRIVATE_KEY aún presente — pendiente limpiar
⚠️ `DASHBOARD_URL` usa `host.docker.internal` porque n8n corre en Docker y el dashboard como PM2 en el host. Configurado via `extra_hosts` en docker-compose.
⚠️ `NODE_FUNCTION_ALLOW_ENV` debe incluir `DASHBOARD_URL,WEBHOOK_SECRET` para que los nodos Code/HTTP del workflow puedan acceder a estas variables.

### Dashboard VPS — /root/meyer-bot/dashboard/.env.local
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

### Dashboard local Mac — ~/Documents/meyer-bot/dashboard/.env.local
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=meyer_db
POSTGRES_USER=meyer_user
POSTGRES_PASSWORD=...
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Beszel — monitoreo del servidor
- URL: https://monitor.zyvenshop.com
- Admin: `admin@zyvenshop.com` / ver pass en Bitwarden
- Directorio: `/opt/beszel/`
- Stack Docker (hub + agent) en `/opt/beszel/docker-compose.yml`
- Agent conectado vía Unix socket (monitoreo local)
- Mide: CPU, RAM, disco, Docker containers, red, load average
- Alertas configurables en la UI

```bash
# Ver estado
cd /opt/beszel && docker compose ps

# Logs
docker compose logs beszel --tail 20
docker compose logs beszel-agent --tail 20

# Reiniciar
docker compose restart
```

## Uptime Kuma — health checks
- URL: https://status.zyvenshop.com
- Primer ingreso: crear usuario administrador
- Directorio: `/opt/uptime-kuma/`
- Stack Docker en `/opt/uptime-kuma/docker-compose.yml`

```bash
# Ver estado
cd /opt/uptime-kuma && docker compose ps

# Logs
docker compose logs --tail 20
```

**Monitores recomendados a configurar:**
| Servicio | URL | Frecuencia |
|----------|-----|-----------|
| Dashboard | `https://dashboard.zyvenshop.com` | 60s |
| n8n | `https://n8n.zyvenshop.com` | 60s |
| Evolution API | `https://evolution.zyvenshop.com` | 60s |
| PostgreSQL | Puerto 5432 TCP | 120s |
| SSL certs | todos los dominios | 24h |

## Infraestructura VPS
```
CONTAINER            IMAGE                    STATUS    PUERTO
n8n-n8n-1            n8nio/n8n (2.10.3)       Up        5678
meyer_postgres       postgres:16-alpine       Up        127.0.0.1:5432
evolution-api        evolution-api            Up        8080
evolution-postgres   postgres:15              Up        5433
evolution-redis      redis:7-alpine           Up        6379
beszel               henrygd/beszel           Up        127.0.0.1:8090
beszel-agent         henrygd/beszel-agent     Up        (host network)
uptime-kuma          louislam/uptime-kuma     Up        127.0.0.1:3002

System: Ubuntu 24.04.4 LTS | 2 vCPU | 3.7GB RAM | 38GB disco (49% usado)
nginx 1.24.0 — proxies: n8n.zyvenshop.com, dashboard.zyvenshop.com, evolution.zyvenshop.com, monitor.zyvenshop.com, status.zyvenshop.com
DNS: Namecheap (zyvenshop.com) — migrar a Cloudflare
```

## Backup & Disaster Recovery

Estrategia **3-2-1**: 3 copias, 2 medios distintos, 1 fuera del sitio.

### 1. PostgreSQL (meyer_db)

```bash
# Backup manual — volcado comprimido
docker exec meyer_postgres pg_dump -U meyer_user -d meyer_db \
  --no-owner --no-acl \
  | gzip > /root/backups/db/meyer_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Restaurar
gunzip -c /root/backups/db/meyer_db_20260722_120000.sql.gz \
  | docker exec -i meyer_postgres psql -U meyer_user -d meyer_db

# Backup automático (script del repo)
# Ver sección "Backup automático con script del repo" abajo
```

**Script del repo (recomendado):** `infrastructure/scripts/backup-meyer.sh` hace todo automáticamente — ver abajo.

### 1b. Backup automático con script del repo (recomendado)

El script `infrastructure/scripts/backup-meyer.sh` automatiza los 3 backups:
1. **PostgreSQL** — `pg_dump -Fc` (formato comprimido)
2. **n8n** — backup incluido en PostgreSQL (DB `n8n_db`, compartida con el mismo `pg_dump`)
3. **.env** — copia de archivos de configuración

**Características:**
- Auto-detección de nombres de contenedores (funciona aunque cambie el project name)
- Verificación de tamaño de dump (falla si dump vacío)
- Retención de 30 días (limpieza automática)
- Offsite opcional vía rclone a Backblaze B2

**Instalación en VPS:**
```bash
# 1. Copiar el script al VPS
scp infrastructure/scripts/backup-meyer.sh root@178.104.27.180:/usr/local/bin/
ssh root@178.104.27.180 chmod +x /usr/local/bin/backup-meyer.sh

# 2. Crear directorio de backups
ssh root@178.104.27.180 mkdir -p /root/backups/meyer-bot

# 3. Probar manualmente (debe ejecutarse sin errores)
ssh root@178.104.27.180 /usr/local/bin/backup-meyer.sh

# 4. Configurar cron — diario a las 3 AM
ssh root@178.104.27.180 crontab -e
#   Agregar: 0 3 * * * /usr/local/bin/backup-meyer.sh >> /var/log/backup-meyer.log 2>&1
```

**Offsite (Backblaze B2 — CONFIGURADO ✅):**
- rclone v1.60.1 instalado en VPS
- Bucket `meyer-bot-backups` en B2
- Ruta en B2: `b2:meyer-bot-backups/{hostname}/`
- Sync automático dentro del script `backup-meyer.sh` (sección 5)
- **Costo actual: $0/mes** (<10GB gratis)

```bash
# Verificar backups en B2
rclone ls b2:meyer-bot-backups/

# Restaurar desde B2 a local
rclone copy b2:meyer-bot-backups/n8nserver/ /root/backups/restore/
```

**RPO/RTO:**
| Métrica | Actual |
|---------|--------|
| RPO (pérdida máxima) | 24 horas |
| RTO (recuperación) | 1-2 horas |

### 2. n8n PostgreSQL (workflows + credenciales)

n8n ahora usa PostgreSQL (DB `n8n_db`) en el mismo servidor que la DB de la app.
El backup PostgreSQL del paso 1 ya incluye workflows y credenciales de n8n.

**Export opcional de workflows a JSON** (no reemplaza el backup de DB):
```bash
docker exec n8n-n8n-1 n8n export:workflow --all --pretty 2>/dev/null > /root/backups/n8n-workflows.json
docker exec n8n-n8n-1 n8n export:credentials --all --pretty 2>/dev/null > /root/backups/n8n-credentials.json
```

**⚠️ Importante:** las credenciales exportadas a JSON están cifradas con `N8N_ENCRYPTION_KEY`. Para restaurarlas se necesita la misma key. La key está en `/root/.n8n/config` en el VPS.

### 3. .env y secrets

| Archivo | Dónde está | Cómo respaldar |
|---------|-----------|----------------|
| `/root/n8n/.env` | VPS | Bitwarden (Secure Note) |
| `/root/meyer-bot/dashboard/.env.local` | VPS | Bitwarden (Secure Note) |
| `~/Documents/meyer-bot/dashboard/.env.local` | Mac local | Bitwarden (Secure Note) |
| `~/Documents/meyer-bot/.env` | Mac local | Bitwarden (Secure Note) |
| `~/Documents/meyer-bot/secrets/google-credentials.json` | Mac local | Bitwarden (Secure Note o attachment) |

**Bitwarden:** crear un Secure Note "meyer-bot env" con el contenido de cada `.env` y los secrets. Si `bw` CLI no está instalado, usar la web UI de Bitwarden.

### 4. Infraestructura Docker

```bash
# Backup de docker-compose files
cp /root/meyer-bot/docker-compose.yml /root/backups/infra/
cp /opt/beszel/docker-compose.yml /root/backups/infra/
cp /opt/uptime-kuma/docker-compose.yml /root/backups/infra/

# Lista de imágenes usadas (para recrear sin Docker Hub)
docker images --format "{{.Repository}}:{{.Tag}}" > /root/backups/infra/images_$(date +%Y%m%d).txt
```

### 5. Código y workflows

✅ Ya respaldado en GitHub. Incluye:
- Dashboard completo
- Workflows exportados como JSON (sin credenciales)
- Documentación

### 6. Restauración completa (pérdida total)

Si el VPS y el Mac local se pierden simultáneamente:

1. **Bitwarden** → recuperar `.env` de todos los servicios
2. **GitHub** → clonar repo: `git clone https://github.com/John58666/meyer-bot.git`
3. **VPS nuevo** → aprovisionar Ubuntu + Docker + nginx
4. **PostgreSQL** → restaurar desde backup SQL (paso 1)
5. **n8n PostgreSQL** → restaurar desde backup del paso 1 (`pg_dump`). Si no hay backup: crear DB `n8n_db`, importar workflows desde JSON, reconectar credenciales. La `N8N_ENCRYPTION_KEY` debe ser la misma (está en `/root/.n8n/config` del VPS anterior).
6. **Dashboard** → `npm run build && pm2 start`
7. **Evolution API** → crear instancia y escanear QR desde manager UI

### Checklist periódico (recomendado)

- [ ] **Diario:** backup PostgreSQL automático
- [ ] **Semanal:** verificar que los backups se están generando
- [ ] **Quincenal:** restaurar backup en entorno de prueba
- [ ] **Mensual:** rotar todas las API keys + backup de `.env` a Bitwarden
- [ ] **Post-deploy:** exportar workflow modificado a JSON y pushear a GitHub

## MCP en Claude Code (Mac)
- github: HTTP transport, scope user
- postgres: stdio, `postgres-mcp` via `uv tool install`, restricted/read-only
- Config: `~/.claude.json`
- El MCP de postgres requiere tunnel SSH activo antes de usarlo
- Si fallan: no son bloqueantes, Claude Code opera sobre el repo local sin ellos
