# CURRENT.md — Sesión activa

> **Contexto detallado de lo que se está haciendo AHORA.**
> Se sobrescribe completo cada sesión.

## Sesión: Items 4 y 7 del spec — flujo conflicto + cancelación + notificación WhatsApp

**Fecha:** 2026-07-26
**Branch:** main
**Usuario:** johnanderprietogarzon

## Objetivo

Implementar Item 4 del spec `03-diseno-final-bloqueos-multiprofesional.md`: flujo de advertencia + cancelación + notificación al chocar con citas existentes (sección 5). Incluye Item 7 como prerequisito: función server-side notificarCancelacionPorNegocio (sección 10).

## Lo que se hizo

1. **`dashboard/lib/whatsapp.ts`** (nuevo) — `notificarCancelacionPorNegocio`: server action que llama `POST {EVOLUTION_API_URL}/message/sendText/{instance}` con header `apikey` y body `{ number, text }`
2. **`dashboard/lib/actions.ts`** — `checkConflictosBloqueo` ahora retorna `CitaConflicto[]` (id, hora, servicio, nombre, numero, professional_name, estado). Nueva `cancelAppointmentsAndNotify`: marca Cancelada + audita + notifica WhatsApp a cada cliente + notifica al owner con resumen
3. **`dashboard/components/horario/day-detail-sheet.tsx`** — reemplazado el viejo `conflictCount`/`forceOverride` por `conflictos: CitaConflicto[]`/`confirming`. Modal con lista de citas afectadas (hora, servicio, cliente, profesional) y dos botones: "Cancelar acción" (default) · "Confirmar y cancelar citas"
4. **Env vars** — `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` agregados a `dashboard/.env.local` y `dashboard/.env.example`
5. Build verificado: 26 rutas, 0 errores

## Archivos creados
- `dashboard/lib/whatsapp.ts`

## Archivos modificados
- `dashboard/lib/actions.ts`
- `dashboard/components/horario/day-detail-sheet.tsx`
- `dashboard/.env.local`
- `dashboard/.env.example`
- `docs/sessions/HANDOFF.md` (actualizado)
- `docs/harness/MEMORY.md` (nuevo entry)

## Próximo paso sugerido
Item 5 del spec: query de selección de profesional en bot sin caché.
