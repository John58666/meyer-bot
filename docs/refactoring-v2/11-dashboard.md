# Plan: Dashboard Home (Módulo 11)

> Completado ✅ — 34 líneas originales → implementación completa.

## Contexto

Pantalla principal post-login con resumen de métricas del negocio. Reemplaza el dashboard legacy (StatsCards + AppointmentList de 78 líneas) por un dashboard V2 con KPIs, charts, ranking de profesionales y heatmap de ocupación.

## Implementado

### Server actions (`features/dashboard-home/actionsV2.ts`)
| Acción | Descripción |
|--------|------------|
| `getMetricasV2(businessId, rango, professionalId?)` | Wrapper con auth de `getMetricas` — retorna MetricasData completo |
| `getOcupacionHeatmapV2(businessId, professionalId?, rango?)` | Wrapper de `getMetricasDrawer('ocupacion')` — retorna grid para heatmap |

### Componente (`features/dashboard-home/components/dashboard-pageV2.tsx`)

| Sección | Fuente de datos | Estados |
|---------|----------------|---------|
| Range selector | `useState<RangoMetricas>` | Hoy / Semana / Mes |
| 4 KPI cards | `getMetricas().ingresos, totalCitas, ocupacion, clientesNuevos` + variaciones + sparklines | Con datos / Skeleton |
| Bar chart | `historialPorDia[]` → recharts BarChart | Con datos / "Sin datos" |
| Top profesionales | `profesionales[]` ordenado por ingresos | Con ranking / "Sin profesionales" |
| Clientes | `clientesNuevos` + `clientesRecurrentes` con barra visual | Con datos / "Sin datos" |
| Heatmap ocupación | `getMetricasDrawer('ocupacion')` → grid horas×días coloreado | Solo semana / Skeleton |

### Lo que NO se implementó

| Feature | Motivo |
|---------|--------|
| Payroll/nóminas panel | Sin tabla `payroll` en DB |
| Panel de comisiones | Sin tabla `commissions` en DB |
| Canales de reserva | Sin columna `channel` en `appointments` (documentado para futuro: ALTER TABLE) |

## Verificación
- `tsc --noEmit` → 0 errores
- `eslint` → 0 problemas
- `recharts` ya estaba en package.json
- 0 migraciones DB nuevas
- Profesional ve solo sus métricas (filtro por `professionalId`)

## Archivos
- `features/dashboard-home/actionsV2.ts`
- `features/dashboard-home/components/dashboard-pageV2.tsx`
- `app/(dashboard)/dashboard/page.tsx` (modificado: 78→22 líneas)
