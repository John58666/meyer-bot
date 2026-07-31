-- Migration 021: Reviews table for employee feedback
-- Fecha: 2026-07-31
-- Contexto: Módulo 12 Equipo Roles — permite registrar reseñas de clientes sobre profesionales.
-- Cada reseña está vinculada a una cita específica (appointment_id) para garantizar autenticidad.

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  professional_id INT NOT NULL REFERENCES professionals(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  appointment_id INT NOT NULL REFERENCES appointments(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews (professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews (business_id);
