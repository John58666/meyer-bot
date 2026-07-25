# Task 2 Report — POST /api/availability/check

## Files Created
- `dashboard/app/api/availability/check/route.ts` — POST endpoint

## Files Modified
- `database/n8n-queries.sql` — Added deprecation header

## Verification
- `npx tsc --noEmit` — **PASS** (no errors)

## Details
The route implements three verification steps in order:
1. **schedule_exceptions**: checks for `cerrado` (immediate rejection) and `horario_especial` (time-bound availability)
2. **schedule_text**: parses JSON schedule for the day of week, validates against open/close times
3. **appointments collision**: checks for non-canceled appointments at the same fecha/hora

All three steps respect `professionalId` scoping when provided. The route returns `{ available: boolean, reason?: string }` or `{ error: string }` with appropriate HTTP status codes.

The n8n-queries.sql file now has a deprecation banner at the top documenting the replacement API endpoints.
