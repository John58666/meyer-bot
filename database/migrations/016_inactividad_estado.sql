-- 016_inactividad_estado.sql
-- Agrega columna para tracking de inactividad proactiva del bot

ALTER TABLE conversation_history
ADD COLUMN IF NOT EXISTS inactividad_estado TEXT DEFAULT NULL;

-- Rollback:
-- ALTER TABLE conversation_history DROP COLUMN IF EXISTS inactividad_estado;
