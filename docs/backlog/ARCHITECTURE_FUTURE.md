# ARCHITECTURE_FUTURE.md — Plan de escalabilidad meyer-bot

> **Propósito:** Este documento describe cuándo y cómo migrar la arquitectura a medida que crece el número de negocios y el volumen de datos. Cubre DB, WhatsApp, n8n, y dashboard.
> **Estado:** Arquitectura actual (Stage 1) operativa. Leer antes de tomar decisiones de infraestructura.
> **Última actualización:** 11 julio 2026

---

## 1. Estimación de crecimiento por tipo de negocio

La plataforma NO es solo para peluquerías — funciona para cualquier negocio de citas. El volumen varía drásticamente según el tipo:

| Tipo negocio | Citas/día (1 prof) | Citas/día (5 prof) | Citas/mes (5 prof) | Mensajes WhatsApp/día |
|---|---|---|---|---|
| Barbería / Peluquería | 15-30 | 75-150 | 2,250-4,500 | 60-300 |
| Salón full-service | 20-40 | 100-200 | 3,000-6,000 | 80-400 |
| Clínica dental / médica | 15-30 | 75-150 | 2,250-4,500 | 60-300 |
| Medspa / estética | 10-25 | 50-125 | 1,500-3,750 | 40-250 |
| Spa / bienestar | 8-20 | 40-100 | 1,200-3,000 | 32-200 |
| **Fitness / gimnasio** | **50-100 (clases)** | **100-300** | **3,000-9,000** | **100-600** |
| Centro de uñas | 15-35 | 75-175 | 2,250-5,250 | 60-350 |
| Consultoría / coaching | 4-10 | 20-50 | 600-1,500 | 16-100 |

> **⚠️ El peor caso:** Un fitness studio con 5 profesionales + clases grupales puede generar **~350 transacciones/día** — el equivalente a **7 peluquerías**. Monitorear volumen real, no conteo de negocios.

### Volumen de datos en DB

| Métrica | 10 peluquerías | 10 negocios mixtos | 30 mixtos | 100 mixtos |
|---------|---------------|--------------------|-----------|------------|
| Citas/mes | ~12,000 | ~30,000 | ~90,000 | ~300,000 |
| Citas/año | ~144k | ~360k | ~1M | ~3.6M |
| Mensajes WhatsApp/mes | ~36,000 | ~90,000 | ~270,000 | ~900,000 |
| Filas audit_log/mes | ~5,000 | ~12,000 | ~36,000 | ~120,000 |
| Clientes totales | ~2,000 | ~5,000 | ~15,000 | ~50,000 |

---

## 2. Línea base (Stage 1) — Arquitectura actual

### Qué tenemos hoy
- **VPS Hetzner:** 2 vCPU, 3.7GB RAM, 38GB disco ($~8-10/mes)
- **PostgreSQL 16 Alpine** (Docker) — DB única
- **n8n 2.10.3** (Docker) — orquestador de workflows
- **Evolution API v2.3.7** (Docker) — conexión WhatsApp
- **Dashboard Next.js 16** (PM2) — en host, no en Docker
- **nginx 1.24.0** — proxy inverso

### Capacidad máxima estimada (Stage 1)
| Componente | Capacidad | Cuello de botella |
|------------|-----------|-------------------|
| PostgreSQL | ~30 negocios / ~500k citas | CPU en queries pesadas |
| n8n | ~20-30 negocios (~5 ejecuciones/min) | RAM + CPU en高峰 |
| Evolution API | ~20-30 instancias | RAM (cada instancia ~50-100MB) |
| Dashboard PM2 | ~30 usuarios concurrentes | RAM (build + runtime) |
| **VPS completo** | **~20-30 negocios mixtos** | **RAM (3.7GB)** |

### Hitpoints actuales (julio 2026)

| Recurso | Uso actual | Threshold alerta |
|---------|-----------|------------------|
| RAM | ~20% (0.74GB) | >80% (2.96GB) |
| Disco | 46% (17.5GB) | >80% (30.4GB) |
| CPU | <5% avg | >60% sostenido |
| PostgreSQL connections | ~5-8 | >50 |

---

## 3. Escalabilidad de WhatsApp (Evolution API)

### Cómo funciona hoy
- Cada negocio tiene 1 instancia en Evolution API
- Cada instancia = 1 conexión WebSocket persistente a Meta
- Meta rate limit: ~1000 mensajes/día por número nuevo, se expande con uso
- Cada conversación de agendamiento genera ~5-15 mensajes (ida y vuelta con el bot)

### Thresholds de Evolution API

| Escenario | Señal | Acción |
|-----------|-------|--------|
| **10+ instancias** | RAM de evolution-api >500MB | Migrar evolution-postgres/redis a volúmenes persistentes |
| **20+ instancias** | Evolution-api contenedor lento | Dedicar VPS separado solo para Evolution API |
| **30+ instancias** | Timeouts en webhooks | Migrar a WA Cloud API oficial por cliente |
| **50+ instancias** | Meta rate limits por IP | Load balancing entre múltiples instancias de Evolution |

### WA Cloud API (alternativa escalable)
Evolution API es conveniente pero tiene límites. La ruta de escalado real es **WhatsApp Cloud API**:

| Aspecto | Evolution API | WA Cloud API |
|---------|--------------|-------------|
| Setup | QR scan desde manager | Configurar webhook + token |
| Rate limits | Depende del hardware | 80 msg/seg (escalable) |
| Costo | Gratis (self-hosted) | ~$0.005/msg después de 1k gratis/mes |
| Escalabilidad | Una instancia Docker por negocio | Un webhook para todos |
| Mantenimiento | Tú administras el servidor | Meta administra |
| Migración | Desde aquí | Cuando superes ~30 instancias |

### Costo de mensajes WA Cloud API
- Primeros 1,000 mensajes/mes: **GRATIS** (por número)
- Después: ~$0.005 USD por mensaje
- Ej: 10,000 msgs/mes = ~$45 USD (los primeros 1k gratis, 9k facturados)

---

## 4. Escalabilidad de n8n

### Cómo funciona hoy
- 1 workflow genérico ("WhatsApp Bot - Genérico") maneja todos los negocios
- ~50 nodos por ejecución
- Cada mensaje entrante = 1 ejecución completa del workflow
- Ejecuciones concurrentes: varias (un mensaje por cliente a la vez)

### Thresholds de n8n

| Escenario | Señal | Acción |
|-----------|-------|--------|
| **10+ negocios** | Ejecuciones concurrentes >5 | Monitorear RAM del contenedor n8n |
| **20+ negocios** | CPU de n8n >40% sostenido | Activar modo queue (n8n + Redis) |
| **30+ negocios** | Tiempo de ejecución >10s por mensaje | Migrar a Node.js+BullMQ+Redis |
| **50+ negocios** | n8n ya no da abasto | Workflow Node.js nativo |

### Modo queue de n8n
Para 20-30 negocios, activar el modo queue de n8n distribuye ejecuciones entre múltiples workers:

```bash
# docker-compose agrega Redis + workers
# n8n usa Redis como cola de ejecuciones
# Múltiples contenedores n8n-worker procesan en paralelo
```

### Migración a Node.js+BullMQ+Redis (post-30 negocios)
Ya planificado en backlog. El workflow de n8n se reescribe como worker Node.js:
- BullMQ para cola de mensajes
- Redis para sesiones (ya se usa patrón similar con PostgreSQL)
- Ejecución ~10x más rápida que n8n
- Sin límite de concurrencia práctica

---

## 5. Escalabilidad del Dashboard web

### Cuello de botella actual
`npm run build` consume ~2GB RAM durante 2-3 minutos en el VPS. Durante ese tiempo, PostgreSQL, n8n y PM2 compiten por los 1.7GB restantes.

| Escenario | Problema | Solución |
|-----------|----------|----------|
| Ahora (3 clientes) | Build lento pero aguanta | Build local y subir `.next/` |
| **10+ clientes** | Build + runtime compiten por RAM | **Upgrade VPS urgente** |
| 30+ clientes | Polling 30s multiplicado por N usuarios | Reducir polling a 60s o usar SWR |
| 100+ clientes | Server actions timeout | Read replica o Stage 3 |

### Solución de build (ahora-30 clientes)
```bash
# En Mac (local):
cd ~/Documents/meyer-bot/dashboard
npm run build
tar czf .next.tar.gz .next/
scp .next.tar.gz root@178.104.27.180:/root/meyer-bot/dashboard/
ssh root@178.104.27.180 "cd /root/meyer-bot/dashboard && tar xzf .next.tar.gz && pm2 restart meyer-dashboard"
```

Esto elimina el build en VPS por completo — el VPS solo sirve archivos estáticos.

---

## 6. Monitoreo — Qué instalar HOY

### Instalado HOY (julio 2026): Beszel + Uptime Kuma

Para el VPS actual (3.7GB RAM), estas dos herramientas juntas usan ~65MB:

| Herramienta | RAM | Mide | Alertas |
|------------|-----|------|---------|
| **Beszel** | ~15MB | CPU, RAM, disco, Docker containers, red | Thresholds configurables |
| **Uptime Kuma** | ~50MB | HTTP 200/tiempo de respuesta, SSL expiry | Telegram/WhatsApp |

### Beszel — monitoreo de sistema

Hub central + agente por servidor. Dashboard web con gráficos históricos.

```bash
# En VPS (hub + agent en un docker-compose):
# https://github.com/beszel/beszel
```

Monitorea:
- CPU por core (%, temperatura si disponible)
- RAM (total, usada, swap)
- Disco (%, IOPS)
- Red (ancho de entrada/salida)
- Docker containers individuales
- Alertas configurables por threshold

### Uptime Kuma — monitoreo de servicios

```yaml
# docker-compose fragment
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    ports:
      - "3002:3001"  # no exponer directo, solo vía nginx
    volumes:
      - ./uptime-kuma-data:/app/data
    restart: unless-stopped
```

**Monitores a configurar:**
| Servicio | URL | Frecuencia |
|----------|-----|-----------|
| Dashboard | `https://dashboard.zyvenshop.com` | Cada 60s |
| n8n | `https://n8n.zyvenshop.com` | Cada 60s |
| PostgreSQL | Puerto 5432 TCP | Cada 120s |
| Evolution API | `http://127.0.0.1:8080/manager` | Cada 60s |
| SSL certificates | Dashboard + n8n | Cada 24h |

**Notificaciones:** Telegram (recomendado) o WhatsApp vía bot si algo cae.

### Thresholds de alerta

| Métrica | Warning | Critical | Acción |
|---------|---------|----------|--------|
| CPU | >50% 5min | >80% 5min | Revisar procesos |
| RAM | >70% | >85% | Upgrade VPS o cerrar servicios |
| Disco | >75% | >85% | Limpiar logs/docker |
| Dashboard response | >3s | >10s | Revisar build/server actions |
| n8n response | >5s | >15s | Revisar ejecuciones |
| Evolution API down | — | cualquier caída | Revisar contenedor Docker |
| PostgreSQL connections | >30 | >50 | Revisar pool de conexiones |
| SSL expiry | <30 días | <7 días | Renovar certificado |

---

## 7. Costos estimados por etapa

| Etapa | Clientes | Servicios | Costo/mes aprox | Detalle |
|-------|----------|-----------|-----------------|---------|
| **HOY** | 1-3 | VPS actual | **~$10** | Hetzner 2 vCPU / 3.7GB |
| **Próximo** | 4-10 | Upgrade VPS | **~$25** | Hetzner 4 vCPU / 8GB / 80GB |
| **Crecimiento** | 10-30 | VPS DB + VPS apps | **~$40-50** | 2 servidores (DB + n8n+Evolution) |
| **Escalado** | 30-100 | Stage 2 + WA Cloud | **~$80-120** | 3 servidores + mensajes WA Cloud |
| **Producción** | 100+ | Stage 3 completo | **~$200+** | ClickHouse + load balancer |

### Costo de mensajes WhatsApp (WA Cloud API)
| Clientes | Msgs/mes | Costo WA Cloud/mes |
|----------|----------|-------------------|
| 10 | ~90,000 | **~$445** (9k gratis, 81k facturados) |
| 30 | ~270,000 | **~$1,345** |
| 100 | ~900,000 | **~$4,495** |

> **⚠️ WA Cloud API se vuelve caro rápido.** Para 10+ clientes, vale la pena negociar plan enterprise con Meta o mantener Evolution API híbrido.

---

## 8. Resumen de migración

```
Stage 1 (HOY)
  Todo en 1 VPS (2 vCPU / 3.7GB / 38GB)
  PostgreSQL directo + n8n + Evolution API + Dashboard PM2
  Capacidad: ~20-30 negocios mixtos
  Costo: ~$10/mes
  └── Cuando: RAM >70% o queries >2s o 10+ clientes
       └── Upgrade 1: VPS 4 vCPU / 8GB (~$25/mes)

       └── Cuando: disco >80% o CPU >60% sostenido
            └── Upgrade 2: Separar en 2 VPS
                 VPS1: PostgreSQL + Dashboard (~$15-20/mes)
                 VPS2: n8n + Evolution API (~$15-20/mes)
                 Total: ~$40/mes

            └── Cuando: n8n lento (>10s/ejecución) o 30+ clientes
                 └── Stage 2: Materialized views + n8n queue mode

                 └── Cuando: 30+ instancias Evolution o 100+ clientes
                      └── Stage 3: WA Cloud API + ClickHouse CDC
                           Costo: ~$80-120/mes + mensajes WA
```

### Checklist de migración

- [x] **HOY — Instalar Beszel + Uptime Kuma en VPS** (monitoreo desde ahora) — ✅ instalado 11 julio 2026
- [ ] **Al alcanzar 10 clientes:** Upgrade VPS a 4 vCPU / 8GB (~$25/mes)
- [ ] **Al alcanzar 20 clientes:** Separar servicios en 2 VPS + migrar build a local
- [ ] **Al alcanzar 30 clientes:** Implementar Stage 2 (materialized views + n8n queue)
- [ ] **Al alcanzar 50+ instancias WhatsApp:** Evaluar migración a WA Cloud API
- [ ] **Al alcanzar 100 clientes:** Stage 3 (ClickHouse CDC)
- [ ] **Monitoreo continuo:** Beszel alertas de CPU/RAM/disco + Uptime Kuma health checks

---

## 9. Plan de monitoreo post-instalación

### Semanal (manual, 5 minutos)
```bash
# Script: infrastructure/check-health.sh
echo "=== CONTENEDORES ===" && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=== RECURSOS ===" && docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo "=== DISCO ===" && df -h /
echo "=== RAM ===" && free -h
echo "=== PM2 ===" && pm2 list
echo "=== CITAS EN DB ===" && docker exec meyer_postgres psql -U meyer_user -d meyer_db -c "SELECT COUNT(*) as total_citas, MIN(fecha) as desde, MAX(fecha) as hasta FROM appointments;"
echo "=== QUERIES LENTAS ===" && docker exec meyer_postgres psql -U meyer_user -d meyer_db -c "SELECT query, state, wait_event, query_start FROM pg_stat_activity WHERE state != 'idle' AND query_start < NOW() - INTERVAL '2 seconds';"
```

### Automático (con Beszel + Uptime Kuma)
- Beszel alerta cuando RAM >70%, disco >75%, CPU >50%
- Uptime Kuma notifica a Telegram si cualquier servicio da error HTTP
- Revisar dashboard de Beszel 1-2 veces por semana (toma 30 segundos)

---

## 10. Notas adicionales

- **No hacer over-engineering antes de tiempo.** La arquitectura actual es correcta para la etapa actual. Este documento existe para saber CUÁNDO migrar, no para migrar ya.
- **Monitorear volumen real, no conteo de negocios.** Un fitness studio con clases grupales pesa más que 10 peluquerías. Beszel muestra el uso real.
- **El build de Next.js es el primer problema que vas a encontrar** — solucionarlo con build local + SCP es trivial y evita el upgrade de VPS por varios meses.
- **Cada migración debe ser backwards-compatible.** Stage 1 → Stage 2: ambas rutas de lectura funcionan en paralelo durante una semana.
- **WA Cloud API es caro a escala.** Evaluar modelo híbrido: Evolution API para negocios pequeños + WA Cloud API para grandes.
- **n8n es el límite antes que PostgreSQL.** A ~30 negocios, n8n se satura antes que la DB. La migración a Node.js+BullMQ está planificada en el backlog.
