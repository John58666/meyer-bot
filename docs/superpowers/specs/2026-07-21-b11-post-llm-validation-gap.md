# B11 — Post-LLM Validation Gap

> Fecha: 2026-07-21
> Status: Aprobado para implementación

## Problema

El flujo del bot tiene DOS verificaciones de disponibilidad. La primera (`Leer Slots Disponibles`, pre-LLM) es correcta e incluye todas las validaciones. La segunda (`Leer Disponibilidad`, post-LLM) SOLO chequea colisiones de appointments — NO valida contra `schedule_exceptions` (cerrado, horario_especial), `schedule_text`, ni fecha/hora contra el presente.

Si el LLM inventa un día/hora que no estaba en `disponibilidad`, la verificación post-LLM no lo ataja.

## Solución

### PASO 1 — Query de `Leer Disponibilidad`

Cambiar de `SELECT COUNT(*)` simple a `WITH + UNION ALL` que suma filas por cada validación fallida. `total > 0` = no disponible. Validaciones:

1. **Colisión de appointments** (existente, se mantiene)
2. **Día sin horario** — día no tiene entrada en `schedule_text`
3. **Día cerrado** — `schedule_exceptions` con `tipo = 'cerrado'`
4. **Hora fuera de rango** — si existe `horario_especial`, validar contra ese rango; si no, contra `schedule_text`
5. **Fecha/hora en pasado** — comparado con `(NOW() AT TIME ZONE 'America/Bogota')`

### PASO 2 — Reglas en prompt del AI Agent

Tres reglas:

1. **`horariosDisponibles`**: "SOLO puedes ofrecer días y horas que aparezcan EXACTAMENTE en HORARIOS DISPONIBLES. Si un día u hora no está en esa lista, no existe para ti."
2. **`agendamiento` paso 5 (AM/PM)**: "Si TODOS los horarios disponibles de ESE día están en PM (2:00 PM, 3:00 PM...), NO preguntes AM o PM — asume PM automáticamente"
3. **`agendamiento` paso 2 (profesional)**: "Si el cliente dice que no sabe qué profesional elegir, MUÉSTRALE la lista numerada: 1. Camila\n2. Cristian..."

## Archivos a modificar

- `workflows/WhatsApp Bot - Genérico.json` — nodo [8] `Leer Disponibilidad` (PostgreSQL query), nodo [33] `AI Agent` (jsCode)

## No modificar

- Ningún otro nodo
- Dashboard
- DB
- Otros archivos
