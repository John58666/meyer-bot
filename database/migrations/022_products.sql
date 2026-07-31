-- Migration 022: Products table for inventory management
-- Fecha: 2026-07-31
-- Contexto: Módulo 9 Inventario V2. Schema basado en frontend-reference.md §6.

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  sku VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category TEXT,
  product_type VARCHAR(50) DEFAULT 'retail' CHECK (product_type IN ('retail', 'supply')),
  cost_price NUMERIC(12,2) NOT NULL,
  sale_price NUMERIC(12,2),
  current_stock INT DEFAULT 0,
  min_stock_alert INT DEFAULT 5,
  iva_included BOOLEAN DEFAULT TRUE,
  iva_percentage NUMERIC(5,2) DEFAULT 0,
  supplier TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products (business_id, active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (business_id, name);
