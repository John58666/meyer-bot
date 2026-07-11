# Sprint 13 — Audit Trail

**Date:** 2026-07-10
**Project:** meyer-bot
**Status:** Approved

## Motivation

Due diligence / compliance item (I2 in SECURITY_AUDIT.md). Sin trazabilidad de acciones críticas en el sistema no se puede audit谁 quién hizo qué.

## Scope

Auditar **solo operaciones de escritura** en server actions. Sin lecturas, sin exportación, sin gráficos en v1.

## Database — `audit_log` table

```sql
CREATE TABLE audit_log (
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

CREATE INDEX idx_audit_business ON audit_log(business_id, created_at DESC);
CREATE INDEX idx_audit_accion ON audit_log(business_id, accion);
```

### Acciones auditadas

| Server Action | accion | entidad | detalle (JSONB snapshot) |
|---|---|---|---|
| createAppointment | `create_appointment` | `appointment` | nombre, servicio, fecha, hora, professional_id |
| updateAppointmentStatus → Cancelada | `cancel_appointment` | `appointment` | nombre, servicio, fecha, estado_anterior |
| updateAppointmentStatus → Completada | `complete_appointment` | `appointment` | nombre, servicio, fecha |
| updateAppointmentStatus → Pendiente | `reactivate_appointment` | `appointment` | nombre, servicio, fecha |
| rescheduleAppointment | `reschedule_appointment` | `appointment` | fecha_anterior, hora_anterior, fecha_nueva, hora_nueva |
| createBloqueo | `create_bloqueo` | `bloqueo` | fecha, tipo, hora_inicio, hora_fin, motivo |
| deleteBloqueo | `delete_bloqueo` | `bloqueo` | fecha, tipo, motivo |
| createMiembroEquipo | `create_miembro` | `user` | name, email, role, professional_name |
| toggleMiembroActivo | `toggle_miembro` | `user` | name, active |
| updateMiembroRole | `update_role` | `user` | name, role_anterior, role_nuevo |
| updateServicesText | `update_services` | `business` | servicios_length (no guardar texto completo) |

## Backend — Helper functions

### `lib/audit.ts` (new)

- `auditar(businessId, userId, accion, entidad, entidadId, detalle, ipAddress?)` — INSERT into audit_log
- `getAuditLogs(businessId, filters)` — SELECT paginado con LEFT JOIN users
- Filtros: accion, userId, desde, hasta
- Paginaci髇: LIMIT/OFFSET, 20 per page

RBAC: solo `owner` y `admin` pueden llamar `getAuditLogs`. Las llamadas a `auditar()` se insertan en cada action existente sin nueva validaci髇 (ya validada por la action).

## Frontend — `/dashboard/auditoria`

### Page structure

```
app/(dashboard)/dashboard/auditoria/
  page.tsx          ← Server component, llama getAuditLogs con searchParams
  audit-filters.tsx  ← Client component: dropdown acción, dropdown usuario, fechas
  audit-table.tsx    ← Client component: tabla + drawer detalle + paginaci髇
```

### UI mock

- Filters bar: Acción (select), Usuario (select), Desde/Hasta (date inputs)
- Table: columns #, Acción (icon+label), Usuario, Entidad, Fecha
- Click row → Drawer (sheet) con JSONB detalle formateado
- Pagination: prev/next + page numbers
- Empty state: "No hay eventos de auditoría aún"
- Error state: toast Sonner on fetch fail

### Access control

- `owner` y `admin` ven el link en sidebar y pueden acceder
- `profesional` no ve el link, middleware bloquea ruta

## Files to change

| File | Action |
|---|---|
| `database/migrations/013_audit_log.sql` | Create |
| `dashboard/lib/audit.ts` | Create — helper functions |
| `dashboard/lib/actions.ts` | Modify — add `await auditar(...)` in 9 actions |
| `dashboard/app/(dashboard)/dashboard/auditoria/page.tsx` | Create |
| `dashboard/app/(dashboard)/dashboard/auditoria/audit-filters.tsx` | Create |
| `dashboard/app/(dashboard)/dashboard/auditoria/audit-table.tsx` | Create |
| `dashboard/components/sidebar.tsx` | Modify — add "Auditoría" link |

## Out of scope (YAGNI)

- CSV/PDF export
- Activity charts
- READ audit
- Log rotation/archiving
- Real-time notifications
- Delete audit entries
