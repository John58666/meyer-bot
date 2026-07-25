# VPS Backup + Disaster Recovery Plan

> **Propósito:** Estrategia de backups y disaster recovery para el VPS Hetzner.
> **Stack:** PostgreSQL 16 (meyer_db + n8n_db), n8n, Evolution API, Dashboard Next.js
> **Escala actual:** 2 clientes, DB <1GB, 1 VPS (2 vCPU, 3.7GB RAM, 38GB disco)
> **Fecha:** 24 julio 2026

---

## 1. RPO / RTO objetivos

| Métrica | Objetivo actual | A 10+ clientes |
|---------|----------------|----------------|
| RPO (pérdida máxima) | 24 horas | 5 minutos |
| RTO (recuperación) | 2 horas | 30 minutos |

---

## 2. Estrategia recomendada (Tier 1 — pg_dump + offsite)

Para la escala actual, suficiente y simple:

### Diario — pg_dump automático
```bash
#!/bin/bash
# /usr/local/bin/backup-meyer.sh
BACKUP_DIR="/backups/meyer-bot"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker exec meyer_postgres pg_dump -U meyer_user -d meyer_db \
  -Fc -f "/tmp/meyer_$DATE.dump"
docker cp "meyer_postgres:/tmp/meyer_$DATE.dump" "$BACKUP_DIR/"
docker exec meyer_postgres rm "/tmp/meyer_$DATE.dump"

# n8n DB incluida en el pg_dump de arriba (DB n8n_db en el mismo PostgreSQL)
# Export opcional de workflows/credenciales a JSON:
docker exec n8n-n8n-1 n8n export:workflow --all --pretty 2>/dev/null > "$BACKUP_DIR/n8n-workflows_$DATE.json"
docker exec n8n-n8n-1 n8n export:credentials --all --pretty 2>/dev/null > "$BACKUP_DIR/n8n-credentials_$DATE.json"

# Backup dashboard .env (contiene secrets)
cp /root/meyer-bot/dashboard/.env.local "$BACKUP_DIR/env_$DATE.local"

# Limpiar backups locales viejos
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "n8n-*.json" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*.local" -mtime +$RETENTION_DAYS -delete

echo "Backup completado: $DATE"
```

### Offsite — rclone a S3/Backblaze B2
```bash
# Instalar rclone, configurar con Backblaze B2 ($6/TB/mes)
rclone copy /backups/meyer-bot b2:meyer-bot-backups/

# Costo estimado: ~$1-2/mes para 30 días de retención
```

### Cron diario
```bash
# Ejecutar a las 3am
0 3 * * * /usr/local/bin/backup-meyer.sh >> /var/log/backup-meyer.log 2>&1
```

---

## 3. Disaster Recovery — procedimiento

### Si el VPS muere (pérdida total)
```
1. Contratar nuevo VPS Hetzner (misma config)
2. Instalar Docker + nginx
3. Restaurar PostgreSQL:
   docker exec -i meyer_postgres pg_restore -U meyer_user -d meyer_db < backup.dump
4. Restaurar n8n (ya incluido en pg_restore del paso 3 — DB n8n_db)
   Alternativa: crear DB vacía y restaurar:
   docker exec meyer_postgres createdb -U meyer_user n8n_db
   docker exec -i meyer_postgres pg_restore -U meyer_user -d n8n_db < backup_n8n.dump
5. Restaurar .env.local
6. Iniciar servicios: docker compose up -d
7. Verificar: dashboard, n8n, WhatsApp conectado

Tiempo estimado: 1-2 horas
```

### Si la DB se corrompe
```
1. Detener dashboard + n8n
2. Restaurar dump más reciente
3. Verificar integridad
4. Reiniciar servicios

Tiempo estimado: 10-30 minutos
```

---

## 4. A futuro (10+ clientes)

Migrar a Tier 2: pg_basebackup semanal + WAL archiving continuo

Esto permite:
- Point-in-time recovery (restaurar a cualquier minuto)
- RPO de minutos (no 24h)
- Recovery más rápido para DBs grandes

Herramientas:
- pgBackRest (producción, recomendado)
- O WAL-G (más simple, S3 nativo)

Requerimientos: 2-4GB extra de disco para WAL, ~$2-3/mes más de storage S3

---

## 5. Verificación mensual

Agendar recordatorio para:
1. Restaurar backup en local (Mac)
2. Verificar conteo de filas coincide
3. Verificar que n8n export funciona
4. Documentar tiempo real de recuperación

> **⚠️ Backup sin restauración verificada = no es backup.**
