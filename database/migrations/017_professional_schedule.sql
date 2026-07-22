-- Migration 017: professional_schedule
-- Per-professional schedule override.
-- Si no hay fila, se usa businesses.schedule_text como fallback.
-- Mismo formato JSONB: {"0":{"open":9,"close":19},...}

CREATE TABLE IF NOT EXISTS professional_schedule (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  schedule_text   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_schedule_business
  ON professional_schedule(business_id);

CREATE INDEX IF NOT EXISTS idx_prof_schedule_professional
  ON professional_schedule(professional_id);

CREATE TRIGGER professional_schedule_updated_at
  BEFORE UPDATE ON professional_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
