-- 004_conversation_history.sql
-- Memoria conversacional persistente. Reemplaza Simple Memory (volátil en RAM de n8n).
-- 1 fila por (business_id, numero) — se reutiliza vía UPSERT, NO crece por mensaje.

CREATE TABLE IF NOT EXISTS conversation_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id INTEGER     NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  numero      TEXT        NOT NULL,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb
                          CHECK (jsonb_typeof(messages) = 'array'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 hours',
  CONSTRAINT conversation_history_business_numero_key UNIQUE (business_id, numero)
) WITH (fillfactor = 90);

-- Índice para la limpieza de expirados (DELETE ... WHERE expires_at < now()).
CREATE INDEX IF NOT EXISTS conversation_history_expires_at_idx
  ON conversation_history (expires_at);
