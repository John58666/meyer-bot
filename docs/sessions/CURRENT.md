# CURRENT.md — Contexto de sesión actual

> **Propósito:** Contexto detallado de lo que se está haciendo AHORA.
> **SE REEMPLAZA completo** al empezar una nueva sesión.
> **Fecha:** 25 julio 2026
> **Sesión:** Implementación Mi Horario + Configuración — COMPLETADO

---

## Objetivo de esta sesión

Implementar el spec refinado de `/dashboard/mi-horario` y refactor `/dashboard/configuracion`.

---

## Archivos creados (8 nuevos)

| Archivo | Descripción |
|---------|-------------|
| `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx` | Server component: auth, fetch data según rol, renderiza MiHorarioClient |
| `dashboard/components/horario/mi-horario-client.tsx` | Client orchestrator: switchea entre vista profesional (2-column) y owner/admin (summary + grid) |
| `dashboard/components/horario/horario-recurrente.tsx` | Editor horario semanal: toggle días con ToggleRight/Left, selects de hora open/close |
| `dashboard/components/horario/calendario-bloqueos.tsx` | Calendario mensual navegable con colores (🔴 cerrado, 🟡 especial), lista de bloqueos, delete |
| `dashboard/components/horario/bottom-sheet-bloqueo.tsx` | Bottom sheet para crear bloqueos con tipo (cerrado/especial), fecha, horas, motivo, conflict warnings |
| `dashboard/components/horario/summary-cards.tsx` | 3 cards de resumen (próximos bloqueos, bloqueos activos, profesionales) |
| `dashboard/components/horario/grid-profesionales.tsx` | Grid owner/admin con tabla (profesional + 7 días), drawer por profesional, menú inline en celdas, bulk "cerrar día" |
| `dashboard/components/configuracion/servicios-table.tsx` | Data Table con nombre/precio/duración + Sheet drawer para crear/editar + delete |

## Archivos modificados (3 existentes)

| Archivo | Cambio |
|---------|--------|
| `dashboard/components/sidebar.tsx` | Import Clock, agregado navItem "Mi horario" entre Métricas y Clientes |
| `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` | Eliminados HorarioClient + ProfessionalScheduleList. Solo consulta services_text. Usa ServiciosTable |
| `dashboard/lib/actions.ts` | 3 nuevas funciones: `getMiHorarioData`, `checkConflictosBloqueo`, `updateServices` |

## Decisiones técnicas tomadas

### Discriminated union en getMiHorarioData
Se usa `success: true/false` como discriminante (no `view`), para que TypeScript nille correctamente tras el early return en page.tsx.

### Bottom sheet vs Modal
Se usa shadcn Sheet con `side="bottom"` (ya disponible en el codebase). Para mobile se adapta solo (el Sheet ya es responsive).

### Servicios: Data Table + Sheet
Se reemplazó el textarea de servicios-client.tsx con una tabla HTML + Sheet drawer. El `services_text` legacy se genera automáticamente al guardar via `updateServices`.

### Conflict warnings en bloqueos
El flujo: usuario crea bloqueo → submit → server check si hay citas en esa fecha para ese profesional → si hay, se muestra warning con opción "Bloquear de todas formas" → segundo submit con forceOverride=true.

## Dependencias existentes reutilizadas
- `HorarioClient` (en configuracion) — NO se eliminó del codebase por si otros componentes lo usan. Solo se quitó de la page.
- `getBloqueos`, `createBloqueo`, `deleteBloqueo` — existentes en actions.ts
- `getProfessionalSchedule`, `updateProfessionalSchedule`, `getAllProfessionalSchedules` — existentes
- `Button`, `Sheet`, `Card` — shadcn components ya instalados

## Build verification
- `npm run build` → ✅ Compiled successfully
- ✅ TypeScript check passed
- ✅ 26 rutas generadas (incluye `/dashboard/mi-horario`)
- 0 errores, 0 warnings (excepto middleware deprecation del proyecto)

## Pendiente para próxima sesión
- Desplegar a VPS y probar en entorno real
- Bugs abiertos: B1 (createAppointment sin validar exceptions), B2 (fetchOcupacion), servicios no reflejados, branding Meyer
- Fase 2-6 escalabilidad
