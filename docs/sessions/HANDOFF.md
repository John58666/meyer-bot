---
status: active
date: 2026-07-26
session: "Items 5 y 6 del spec: query bot sin caché + separar desactivar de citas futuras"
branch: main
next_action: "Bugs backlog: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion ignora exceptions), servicios no reflejados en bot"
---

# HANDOFF.md

> **Leer esto PRIMERO.** Luego: `docs/harness/MEMORY.md` → `docs/harness/RULES.md` → preguntar al usuario qué prioridad atacar.

## Resumen del estado actual

Spec completo de bloqueos multi-profesional (sección 11) **completado al 100%:**

- **Item 5** — Query de selección de profesional en bot sin caché: **verificado.** El nodo "Lookup Negocio" en n8n ya hace `LEFT JOIN professionals p ON p.business_id = b.id AND p.active = true` en cada webhook. Sin caché, sin hardcode.
- **Item 6** — Separar desactivar profesional de gestionar citas futuras: **implementado.** `toggleMiembroActivo` sigue siendo soft-toggle (no toca citas). Al desactivar, si hay citas futuras, aparece modal: "cancelar ahora o dejarlas como están". Reusa `cancelAppointmentsAndNotify` para el flujo de cancelación.

## Prioridades

### P1 — Bugs backlog
1. **B1**: `createAppointment` no valida `schedule_exceptions` — puede agendar en días/horarios bloqueados
2. **B2**: `fetchOcupacion` ignora `schedule_exceptions` — muestra ocupación incorrecta
3. Servicios nuevos no reflejados en el bot (orden en system prompt de n8n)

### P2 — Rotar Evolution API key en VPS

### P3 — Fases 2-6 del spec de escalabilidad (PgBouncer, WhatsApp abstraction layer, gateway, prompts fuera de n8n, onboarding)

## Archivos clave
| Ruta | Propósito |
|------|-----------|
| `docs/superpowers/specs/03-diseno-final-bloqueos-multiprofesional.md` | Spec completo — ✅ todos los items completados |
| `dashboard/lib/actions.ts` | getFutureAppointmentsForProfessional (nuevo) |
| `dashboard/components/equipo/equipo-client.tsx` | Modal post-desactivación con opción de cancelar citas |
| `workflows/WhatsApp Bot - Genérico.json` | Lookup Negocio con p.active = true live |

## Lo que ya existe (no crear desde cero)
- `getFutureAppointmentsForProfessional` en `actions.ts`
- `cancelAppointmentsAndNotify` reutilizado para cancelación masiva
- Modal de confirmación post-desactivación en equipo-client.tsx

## Reglas clave del proyecto (The Ratchet)
- Migraciones DB siempre aditivas. Rollback SQL listo antes.
- Server actions: `success: true/false` como discriminante
- Horario profesional: `COALESCE(ps.schedule_text, b.schedule_text)` — NULL = hereda
- Breakpoints: `lg` (1024px) no `sm` (640px) — landscape mobile
- `stopPropagation()` en botones dentro de contenedores con onClick
- No agregar comentarios al código
- Colores avatar: determinísticos vía hash del id (getAvatarColor), paleta 12 colores
- NUNCA leer/imprimir `.env`. NUNCA hardcodear API keys.

## Lo que NO debe hacer el próximo agente
- No crear archivos nuevos si puede modificar los existentes
- No agregar comentarios al código
- No hardcodear API keys ni tokens
- No modificar DB de producción directamente
- No deployar a producción sin confirmación del usuario
- No asumir que ARCHITECTURE.md refleja el schema actual — validar contra código real

## Al cerrar esta sesión
Actualizar: MEMORY.md (resumen histórico) + HANDOFF.md (estado)
