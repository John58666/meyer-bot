-- 005_sprint7.sql
-- Sprint 7: agrega professional_id a users
-- Aditiva, backwards-compatible, nullable = cero impacto en producción actual
-- NOTA: requiere que la tabla professionals exista antes de ejecutar.
-- Si professionals no existe aún, crearla primero o ejecutar la migración de professionals antes.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professionals(id);

CREATE INDEX IF NOT EXISTS idx_users_professional_id
  ON users(professional_id)
  WHERE professional_id IS NOT NULL;
