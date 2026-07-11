-- Sprint 13: Audit Trail
-- Crea tabla audit_log para trazabilidad de acciones de escritura

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  business_id   INT NOT NULL REFERENCES businesses(id),
  user_id       INT REFERENCES users(id),
  accion        VARCHAR(50) NOT NULL,
  entidad       VARCHAR(50) NOT NULL,
  entidad_id    INT,
  detalle       JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_business
  ON audit_log(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_accion
  ON audit_log(business_id, accion);
