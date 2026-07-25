#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# backup-meyer.sh — Backup diario del VPS meyer-bot
# 
# Backups:
#   1. PostgreSQL (pg_dump formato custom)
#   2. n8n (workflows + credenciales en SQLite)
#   3. .env files (secrets)
#
# Retención: 30 días
# Offsite: rclone a Backblaze B2 (opcional)
#
# Instalación:
#   sudo cp backup-meyer.sh /usr/local/bin/backup-meyer.sh
#   sudo chmod +x /usr/local/bin/backup-meyer.sh
#   sudo crontab -e
#     0 3 * * * /usr/local/bin/backup-meyer.sh >> /var/log/backup-meyer.log 2>&1
# ============================================================

# ---- Configuración ----
BACKUP_DIR="/root/backups/meyer-bot"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
HOST=$(hostname -s)

# Nombres de contenedores (auto-detectar si docker compose está disponible)
PG_CONTAINER="meyer_postgres"

# Detectar nombre del contenedor n8n dinamicamente
if docker ps --format '{{.Names}}' | grep -q '^n8n'; then
  N8N_CONTAINER=$(docker ps --format '{{.Names}}' | grep '^n8n' | head -1)
else
  N8N_CONTAINER="n8n-n8n-1"
fi

# Rutas de .env (VERIFICADAS en VPS — 24 jul 2026)
ENV_FILES=(
  "/root/n8n/.env"
  "/root/meyer-bot/dashboard/.env.local"
)

# Log
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ---- Inicio ----
log "=== Iniciando backup meyer-bot ==="
log "Fecha: $DATE | Host: $HOST"
log "PG container: $PG_CONTAINER | n8n container: $N8N_CONTAINER"

mkdir -p "$BACKUP_DIR"

# ---- 1. PostgreSQL ----
log "Iniciando backup PostgreSQL..."

PG_DUMP_FILE="meyer_${DATE}.dump"
PG_DUMP_PATH="$BACKUP_DIR/$PG_DUMP_FILE"

# Verificar que el contenedor existe y está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  log "ERROR: Contenedor PostgreSQL '$PG_CONTAINER' no está corriendo"
  exit 1
fi

# pg_dump dentro del contenedor, copiar afuera
docker exec "$PG_CONTAINER" pg_dump -U meyer_user -d meyer_db -Fc -f "/tmp/$PG_DUMP_FILE"
docker cp "${PG_CONTAINER}:/tmp/${PG_DUMP_FILE}" "$PG_DUMP_PATH"
docker exec "$PG_CONTAINER" rm "/tmp/${PG_DUMP_FILE}"

# Verificar que el dump no esté vacío
DUMP_SIZE=$(stat -c%s "$PG_DUMP_PATH" 2>/dev/null || stat -f%z "$PG_DUMP_PATH" 2>/dev/null)
if [ "$DUMP_SIZE" -lt 100 ]; then
  log "ERROR: Dump PostgreSQL vacío o muy pequeño (${DUMP_SIZE} bytes)"
  exit 1
fi
log "PostgreSQL dump OK: ${PG_DUMP_PATH} (${DUMP_SIZE} bytes)"

# ---- 2. n8n (SQLite: workflows + credenciales) ----
log "Iniciando backup n8n..."

N8N_BACKUP_FILE="n8n_${DATE}.tar.gz"
N8N_BACKUP_PATH="$BACKUP_DIR/$N8N_BACKUP_FILE"

# Verificar contenedor
if ! docker ps --format '{{.Names}}' | grep -q "^${N8N_CONTAINER}$"; then
  log "WARNING: Contenedor n8n '$N8N_CONTAINER' no está corriendo. Saltando backup n8n."
else
  # Backup del directorio .n8n dentro del contenedor
  docker exec "$N8N_CONTAINER" tar czf "/tmp/${N8N_BACKUP_FILE}" -C /home/node .n8n 2>/dev/null
  docker cp "${N8N_CONTAINER}:/tmp/${N8N_BACKUP_FILE}" "$N8N_BACKUP_PATH"
  docker exec "$N8N_CONTAINER" rm "/tmp/${N8N_BACKUP_FILE}"
  
  N8N_SIZE=$(stat -c%s "$N8N_BACKUP_PATH" 2>/dev/null || stat -f%z "$N8N_BACKUP_PATH" 2>/dev/null)
  log "n8n backup OK: ${N8N_BACKUP_PATH} (${N8N_SIZE} bytes)"
fi

# ---- 3. .env files (secrets) ----
log "Iniciando backup .env files..."

for env_file in "${ENV_FILES[@]}"; do
  if [ -f "$env_file" ]; then
    # Nombre seguro: reemplazar / con _
    SAFE_NAME=$(echo "$env_file" | sed 's|/|_|g' | sed 's|^_||')
    ENV_BACKUP="$BACKUP_DIR/env_${SAFE_NAME}_${DATE}"
    cp "$env_file" "$ENV_BACKUP"
    log ".env backup OK: ${ENV_BACKUP}"
  else
    log "WARNING: $env_file no existe. Saltando."
  fi
done

# ---- 4. Limpieza — borrar backups viejos ----
log "Limpiando backups viejos (> ${RETENTION_DAYS} días)..."

find "$BACKUP_DIR" -name "meyer_*.dump" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "n8n_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "env_*_${DATE}" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# ---- 5. Offsite — rclone a Backblaze B2 (opcional) ----
if command -v rclone &> /dev/null; then
  log "rclone encontrado. Sincronizando a offsite..."
  rclone copy "$BACKUP_DIR" "b2:meyer-bot-backups/${HOST}/" --quiet --transfers 2
  if [ $? -eq 0 ]; then
    log "Offsite sync OK"
  else
    log "ERROR: rclone sync falló"
  fi
else
  log "rclone no instalado. Saltando offsite sync."
  log "Para offsite: instalar rclone y configurar con 'rclone config' (Backblaze B2)"
fi

# ---- 6. Resumen ----
log "=== Backup completado ==="
log "Directorio: $BACKUP_DIR"
log "Archivos generados:"
ls -lh "$BACKUP_DIR"/*${DATE}* 2>/dev/null || true
log "Espacio usado por backups:"
du -sh "$BACKUP_DIR" 2>/dev/null || true
log "=== Fin ==="
