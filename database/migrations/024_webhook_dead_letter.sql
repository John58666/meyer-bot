-- Migracion 024: webhook_dead_letter para retry y reconciliacion
CREATE TABLE IF NOT EXISTS webhook_dead_letter (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,       -- 'sync-new', 'sync-cancel', 'sync-reagend'
  appointment_id INTEGER,
  payload JSONB NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 seconds',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_retry
  ON webhook_dead_letter (next_retry_at)
  WHERE attempts < max_attempts;
