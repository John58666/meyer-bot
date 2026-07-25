# Task 2 Fix Report — availability/check route

**File:** `dashboard/app/api/availability/check/route.ts`
**Date:** 2026-07-23

## Summary

Applied 4 fixes from reviewer feedback. All changes preserve existing functionality (3 verification steps: schedule_exceptions, schedule_text, appointments) and response format `{ available: boolean, reason?: string }` / `{ error: string }`.

## Fixes Applied

### Issue 1: Numeric time comparison (minutes since midnight)

Added helper function at top of file (after imports):

```typescript
function toMinutes(t: string): number {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + (parts[1] ?? 0)
}
```

Replaced lexicographic string comparisons in two places:

1. **horario_especial check** (lines 44-51): Replaced `horaStr < ex.hora_inicio + ':00'` string comparison with `toMinutes(hora) < toMinutes(ex.hora_inicio)` numeric comparison. Now correctly handles non-zero-padded hours (e.g., "9:00" vs "09:00:00").

2. **schedule_text check** (lines 87-89): Replaced `parseInt(hora.split(':')[0]) + parseInt(hora.split(':')[1]) / 60` (fractional hours) with `toMinutes(hora)` (minutes since midnight). Converted `daySchedule.open` and `daySchedule.close` (integers representing hours) to minutes by multiplying by 60: `daySchedule.open * 60` and `daySchedule.close * 60` for consistent unit comparison.

### Issue 2: Try-catch around JSON.parse(scheduleText)

Wrapped `JSON.parse(scheduleText)` in a try-catch (lines 74-79) returning a 500 with Spanish error message:

```typescript
try {
  schedule = typeof scheduleText === 'string' ? JSON.parse(scheduleText) : scheduleText
} catch {
  return NextResponse.json({ error: 'Error al procesar el horario del negocio' }, { status: 500 })
}
```

Malformed JSON in `schedule_text` column now returns a clear error instead of crashing the route.

### Issue 3: hora format validation

Added regex validation after `!fecha || !hora` check (lines 25-27):

```typescript
if (!/^\d{1,2}:\d{2}$/.test(hora)) {
  return NextResponse.json({ error: 'hora debe tener formato HH:MM' }, { status: 400 })
}
```

Rejects malformed hora values early with a 400 status.

### Issue 4: request.json() moved inside try block

Moved `const { fecha, hora, professionalId } = await request.json()` from outside the try block to inside it (line 19, now within try starting at line 18). Malformed JSON body now triggers the catch handler returning `Error checking availability` instead of Next.js default HTML 500.

Validation (fecha/hora required, hora format) now also happens inside the try block, which is safe since they don't depend on external resources.

## Verification

- **Type check:** `npx tsc --noEmit` from `dashboard/` — passes with no errors.
- **Functionality preserved:** All 3 verification steps intact:
  1. schedule_exceptions (cerrado / horario_especial)
  2. schedule_text (day schedule check)
  3. appointments (conflict check)
- **reason values unchanged:** 'closed', 'special_hours', 'no_schedule', 'closed_day', 'outside_hours', 'conflict'
- **Spanish error messages preserved.**

## Concerns

None. All 4 issues resolved cleanly. The `any` type for `schedule` variable is pre-existing (schedule_text is JSON-column data without a typed schema); keeping it avoids introducing type assertions that could mask runtime shape issues.
