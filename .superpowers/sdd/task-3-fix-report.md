# Task 3 Fix Report — `fetchOcupacion` reviewer issues

File: `dashboard/lib/actions.ts` (function `fetchOcupacion`, line ~471)
Date: 2026-07-23

## Issue 1: Minute precision discarded — FIXED

**Before:** Only the hour part of `hora_inicio`/`hora_fin` was parsed via `parseInt(...split(':')[0])`, discarding minutes. For `13:30`–`17:00` it computed `(17-13)*2 = 8` slots instead of the correct `7`.

**After:** Parses both hours and minutes, converts to total minutes, then divides by 30 (slot length) with `Math.floor`:
```typescript
const [oh, om] = ex.hora_inicio.split(':').map(Number);
const [ch, cm] = ex.hora_fin.split(':').map(Number);
const openMin = oh * 60 + (om ?? 0);
const closeMin = ch * 60 + (cm ?? 0);
totalSlots += Math.floor((closeMin - openMin) / 30);
```

## Issue 2: NaN guard on NULL hours — FIXED

**Before:** NULL `hora_inicio`/`hora_fin` (allowed by schema) produced `parseInt(''.split(':')[0])` = `NaN`, corrupting `totalSlots` (NaN poisons all arithmetic).

**After:** Triple guard:
1. Truthy check `ex.hora_inicio && ex.hora_fin` before parsing.
2. `Number.isFinite` check on both parsed values.
3. `closeMin > openMin` sanity check.
4. Fallback: if special hours are invalid/missing, fall back to the regular day schedule (`(daySchedule.close - daySchedule.open) * 2`) instead of contributing 0 slots.

## Issue 3: Professional schedule_text ignored — TODO ADDED (not fixed, pre-existing)

Added TODO comment after the schedule query (line ~477):
```typescript
// TODO: Use COALESCE(ps.schedule_text, b.schedule_text) when professionalId != null
// (pre-existing gap — professional custom schedules not reflected in occupancy)
```

## Verification

- `npx tsc --noEmit` from `dashboard/` — **passed** (no errors).
- Only `fetchOcupacion` modified; no other code touched.

## Scope

Changes limited to the `horario_especial` block in the day iteration loop plus the TODO comment near the schedule query, as instructed.
