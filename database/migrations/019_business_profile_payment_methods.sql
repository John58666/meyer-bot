-- 019: Business Profile columns + Payment Methods table
-- Ejecutar: psql -U meyer_user -d meyer_db -f 019_business_profile_payment_methods.sql

-- ============================================================
-- 1. Nuevas columnas en businesses
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address VARCHAR;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_id VARCHAR;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'COP';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS allow_flexible_staff_hours BOOLEAN DEFAULT TRUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS min_booking_notice_hours INT DEFAULT 24;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================================
-- 2. Payment Methods table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cash', 'card', 'transfer', 'digital')),
  instructions JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_business ON payment_methods(business_id);

-- ============================================================
-- 3. Seed default payment methods for existing businesses
-- ============================================================
INSERT INTO payment_methods (business_id, name, tipo, is_active)
SELECT id, 'Efectivo', 'cash', TRUE FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE business_id = businesses.id AND name = 'Efectivo');

INSERT INTO payment_methods (business_id, name, tipo, is_active)
SELECT id, 'Tarjeta Débito/Crédito', 'card', TRUE FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE business_id = businesses.id AND name = 'Tarjeta Débito/Crédito');

INSERT INTO payment_methods (business_id, name, tipo, is_active)
SELECT id, 'Transferencia', 'transfer', FALSE FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE business_id = businesses.id AND name = 'Transferencia');

INSERT INTO payment_methods (business_id, name, tipo, is_active)
SELECT id, 'Mercado Pago', 'digital', FALSE FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE business_id = businesses.id AND name = 'Mercado Pago');

INSERT INTO payment_methods (business_id, name, tipo, is_active)
SELECT id, 'Otro', 'digital', FALSE FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE business_id = businesses.id AND name = 'Otro');
