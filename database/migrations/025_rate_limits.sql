-- Migracion 025: rate_limits table (reemplaza $getWorkflowStaticData no thread-safe)
-- Cada fila = un usuario en un negocio. Ventana de 1 hora, maximo 50 requests.
-- UNIQUE constraint garantiza atomicidad en multi-worker.

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  numero TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON rate_limits (window_start)
  WHERE window_start + INTERVAL '1 hour' < NOW();

-- Cleanup viejo: eliminar ventanas expiradas periodicamente
-- Se puede ejecutar en cada request o via pg_cron
