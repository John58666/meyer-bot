# RUNBOOK.md — meyer-bot

> Comandos operacionales. Referencia para deploy, DB, n8n, Evolution API, túnel SSH.

## Deploy estándar
```bash
# Desde Mac
cd ~/Documents/meyer-bot
git add .
git commit -m "tipo: descripción"
git push

# En VPS
ssh root@178.104.27.180
cd /root/meyer-bot/dashboard
git pull
npm run build
pm2 restart meyer-dashboard   # usar pm2 reload cuando haya 10+ clientes
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
NODE_FUNCTION_ALLOW_ENV=GOOGLE_SERVICE_ACCOUNT_EMAIL,GOOGLE_PRIVATE_KEY,EVOLUTION_API_KEY,EVOLUTION_API_URL,OWNER_NUMBER,GEMINI_API_KEY,CEREBRAS_API_KEY,GROQ_API_KEY
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```
⚠️ GOOGLE_PRIVATE_KEY aún presente — pendiente limpiar

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

## MCP en Claude Code (Mac)
- github: HTTP transport, scope user
- postgres: stdio, `postgres-mcp` via `uv tool install`, restricted/read-only
- Config: `~/.claude.json`
- El MCP de postgres requiere tunnel SSH activo antes de usarlo
- Si fallan: no son bloqueantes, Claude Code opera sobre el repo local sin ellos
