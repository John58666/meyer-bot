-- ============================================================
-- meyer-bot — PostgreSQL schema
-- Multi-tenant desde el inicio: cada negocio es un registro en businesses
-- Migrar: psql -U meyer_user -d meyer_db -f schema.sql
-- ============================================================

-- Extensión para timestamps con timezone
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- businesses
-- Un registro por negocio cliente (Meyer es id=1)
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id               SERIAL PRIMARY KEY,
  slug             VARCHAR(100) UNIQUE NOT NULL,       -- 'meyer', 'barberia-lopez'
  name             VARCHAR(255) NOT NULL,              -- 'Peluquería Meyer'
  whatsapp_instance VARCHAR(100) NOT NULL,             -- 'peluqueria-beta' (Evolution API)
  owner_number     VARCHAR(20) NOT NULL,               -- '573142556322' (sin @s.whatsapp.net)
  timezone         VARCHAR(50) DEFAULT 'America/Bogota',
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- appointments
-- Una fila por cita. business_id es FK a businesses.
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Datos de la cita (separados: fecha DATE + hora TIME para queries eficientes)
  fecha            DATE NOT NULL,                     -- 2026-05-20
  hora             TIME NOT NULL,                     -- 14:00:00

  -- Datos del cliente
  nombre           VARCHAR(255),
  servicio         VARCHAR(255) NOT NULL,
  numero           VARCHAR(50) NOT NULL,              -- '573001234567' (limpio, sin @s.whatsapp.net)

  -- Estado del ciclo de vida
  estado           VARCHAR(50) DEFAULT 'Pendiente'    -- Pendiente | Confirmada | Cancelada | Completada
                   CHECK (estado IN ('Pendiente','Confirmada','Cancelada','Completada')),

  -- Para Google Calendar (futuro)
  calendar_event_id VARCHAR(255),

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Índices — optimizados para los queries reales del workflow
-- ============================================================

-- Query de disponibilidad: SELECT WHERE fecha = X AND business_id = Y AND estado != 'Cancelada'
CREATE INDEX IF NOT EXISTS idx_appt_fecha_business
  ON appointments(fecha, business_id)
  WHERE estado != 'Cancelada';

-- Query de recordatorios: SELECT WHERE fecha = mañana AND estado = 'Pendiente'
CREATE INDEX IF NOT EXISTS idx_appt_recordatorios
  ON appointments(fecha, estado)
  WHERE estado = 'Pendiente';

-- Query de reagendamiento: SELECT WHERE numero = X AND business_id = Y
CREATE INDEX IF NOT EXISTS idx_appt_numero
  ON appointments(numero, business_id);

-- ============================================================
-- Trigger: auto-actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Datos iniciales — Meyer como business_id = 1
-- ============================================================
INSERT INTO businesses (slug, name, whatsapp_instance, owner_number)
VALUES ('meyer', 'Peluquería Meyer', 'peluqueria-beta', '573142556322')
ON CONFLICT (slug) DO NOTHING;
