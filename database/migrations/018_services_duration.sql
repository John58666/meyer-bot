-- Migration 018: services + professional_services + hora_fin
-- Normalización del texto plano services_text a tabla services.
-- Agrega duración variable y especialidades por profesional.
-- Aditiva, backwards-compatible. Rollback safe.

BEGIN;

-- 1. Services table
CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  price            INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_business
  ON services(business_id);

-- 2. Professional services mapping (especialidades)
CREATE TABLE IF NOT EXISTS professional_services (
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id      INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional
  ON professional_services(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_services_service
  ON professional_services(service_id);

-- 3. Add hora_fin to appointments (para overlap por rango)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS hora_fin TIME;

CREATE INDEX IF NOT EXISTS idx_appointments_range
  ON appointments(business_id, professional_id, fecha, hora, hora_fin)
  WHERE estado <> 'Cancelada';

-- 4. Triggers
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();

COMMIT;
