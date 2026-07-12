-- Sprint 15: Dashboard Métricas Premium
-- Índice compuesto para cubrir todas las queries de métricas:
-- business_id (multi-tenancy), professional_id (filtro), fecha (rango), estado (filtro)
-- CONCURRENTLY permite crearlo sin downtime en producción

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_metrics
ON appointments (business_id, professional_id, fecha, estado);
