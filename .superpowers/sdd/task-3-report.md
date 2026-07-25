# Task 3 Report: Corregir fetchOcupacion para incluir schedule_exceptions

## Status
✅ Complete

## Summary
Modified `fetchOcupacion` in `dashboard/lib/actions.ts` (now lines 471-553) to account for `schedule_exceptions`, so days marked closed or with special hours no longer contribute regular full-day slots to `totalSlots`.

## Changes
- After fetching appointments, added a query to `schedule_exceptions` for the same date range with the same `professional_id = $N OR professional_id IS NULL` (or `professional_id IS NULL`) pattern used in `getAvailableSlots`.
- Built an `exMap` keyed by date string (`YYYY-MM-DD`).
- In the day-iteration loop:
  - `tipo === 'cerrado'` → `continue` (skip day, 0 slots).
  - `tipo === 'horario_especial'` → compute slots from exception's `hora_inicio`/`hora_fin` (hours × 2).
  - Otherwise → fall back to the regular weekly schedule.

## Verification
- `npx tsc --noEmit` from `dashboard/`: passed (no output, exit 0).
- Function signature preserved: `async function fetchOcupacion(businessId, fechaDesde, fechaHasta, professionalId?)`.
- Multi-tenant: both the appointments query and the exceptions query filter by `business_id = $1`.
- Field names use `hora_inicio` / `hora_fin` (with 'c'/'n'), not `hora_inio`.

## Affected files
- `dashboard/lib/actions.ts` (lines 471-553)
