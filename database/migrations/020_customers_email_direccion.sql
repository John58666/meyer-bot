-- Migration 020: Agregar email y direccion a customers
-- Fecha: 2026-07-31
-- Contexto: Requerido por CRM V2 (Módulo 8 Clientes). Stitch muestra email y direccion en la UI.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS direccion TEXT;

-- Sin índices nuevos porque la búsqueda por email no es un access pattern común.
-- Las queries de CRM buscan por nombre/numero (ILIKE) ya cubiertas.
