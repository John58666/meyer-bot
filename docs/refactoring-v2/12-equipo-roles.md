# Plan: Equipo — Roles & Modales (Módulo 12)

> Completado ✅ — 26 líneas originales → implementación completa.

## Contexto

Modal de detalle de empleado integrado en la tabla de equipo (`team-listV2.tsx`). Muestra perfil, horario, estadísticas, servicios asignados y reseñas de clientes.

## Implementado

### Migration 021
`database/migrations/021_reviews.sql` — tabla `reviews` (rating 1-5, comment, FKs a professionals, customers, appointments) + 2 índices.

### Server actions (`features/equipo-roles/actionsV2.ts`)
| Acción | Descripción |
|--------|------------|
| `getEmployeeStatsV2(businessId, professionalId)` | Completadas, canceladas, total, ingresos del mes (JOIN services.price) |
| `getEmployeeReviewsV2(businessId, professionalId)` | Últimas 20 reseñas con nombre del cliente y rating ★ |

### Componente (`features/equipo-roles/components/employee-detail-modalV2.tsx`)

Modal con 5 secciones:
| Sección | Fuente de datos | Estados |
|---------|----------------|---------|
| Perfil | Props (`MiembroEquipo`) | — |
| Estadísticas | `getEmployeeStatsV2` | Skeleton cards → Stats (Completadas, Cancelación%, Ingresos) |
| Horario | `getTeamMemberScheduleV2` (reusado de Módulo 4) | Skeleton → Grid 7 días (Heredado/Personalizado) → "Sin horario" |
| Servicios | `getTeamMemberServicesNamesV2` (reusado de Módulo 4) | Skeleton pills → Badges de servicios → "Sin servicios" |
| Reseñas | `getEmployeeReviewsV2` | Skeleton cards → ★★★★★ + comentarios → "Sin reseñas aún" |

### Integración
- `team-listV2.tsx`: menú de 3-puntos → opción "Ver detalle" → abre modal
- Sin modificar estructura del Módulo 4, solo aditivo

## Verificación
- `tsc --noEmit` → 0 errores
- `eslint` → 0 problemas
- Sin conflictos con código legacy

## Archivos
- `database/migrations/021_reviews.sql`
- `features/equipo-roles/actionsV2.ts`
- `features/equipo-roles/components/employee-detail-modalV2.tsx`
