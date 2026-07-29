# Plan: Config — Horarios (Módulo 07)

> 2 diseños Stitch: sub-pestañas de horarios + bloqueos.

## Contexto

Configuración de horarios laborales por empleado y bloqueos (días festivos, vacaciones).

## Stitch Exports

| Archivo | Contenido |
|---------|-----------|
| `working_hours_two_subtabs.html` | Horarios con sub-pestañas por día o empleado |
| `schedule_blocks.html` | Bloqueos de tiempo |

## Componentes V2

### 1. `features/config-schedule/components/schedule-tabsV2.tsx`
- Sub-pestañas: "Por Día" / "Por Empleado"
- Vista "Por Día": día de la semana + horario general + excepciones
- Vista "Por Empleado": selector de empleado + su horario semanal

### 2. `features/config-schedule/components/schedule-blocksV2.tsx`
- Lista de bloqueos: fecha, hora inicio/fin, razón, empleado (o global)
- Modal para crear/editar bloqueo

## Reglas
- Los horarios default vienen del perfil del negocio
- No permitir crear citas en slots bloqueados (validar en frontend + backend)