# Sprint 15 — Dashboard Métricas Premium

> **Fecha:** 11 julio 2026
> **Proyecto:** meyer-bot
> **Estado:** Spec aprobado — pendiente implementación

---

## 1. Resumen

Expandir `/dashboard/metricas` con vistas múltiples (General, Por Profesional, Servicios), KPIs adicionales (ocupación, retención, clientes nuevos vs recurrentes), comparativas temporales (% vs período anterior), charts enriquecidos y drawers de drill-down. Sin cambios de schema — todo sobre tablas existentes (`appointments`, `customers`, `businesses`). Un solo índice nuevo.

---

## 2. Alcance

### Incluye

1. **Vista General** — KPIs expandidos con badges de variación vs período anterior
2. **Vista Por Profesional** — filtro por profesional, métricas filtradas
3. **Vista Servicios** — ranking de servicios por ingresos y cantidad
4. **Comparativas temporales** — cada KPI muestra % de cambio vs período anterior igual
5. **Drawers de drill-down** — 4 drawers que se cargan bajo demanda al hacer click
6. **Responsive** — todo funciona en móvil y desktop
7. **RBAC** — profesional ve solo sus datos, owner/admin ven todo
8. **Multi-negocio** — funciona para cualquier `business_id`

### NO incluye

- Tabla `services` normalizada (sigue parseándose de `services_text`)
- Integración Google Calendar
- Exportación CSV
- IA/predicciones

---

## 3. Stack

- **Next.js 16.2.6** + App Router
- **recharts 3.9.0** — BarChart, Line, BarChart horizontal, heatmap grid
- **PostgreSQL 16** — consultas directas (sin materialized views aún)
- **shadcn/ui Sheet** — drawers de drill-down
- **Tailwind v4** — responsive

---

## 4. Arquitectura

### 4.1 Flujo de datos

```
Page (server component)
  └── auth() → businessId, professionalId, role
  └── getMetricas(businessId, rango, professionalId, vista) → MetricasData
  └── MetricasClient (client component)
        ├── KpiRow (cards con badges de variación)
        ├── TabSelector (General | Profesional | Servicios)
        ├── ChartArea (cambia según vista activa)
        └── Drawers (bajo demanda)
              ├── DrawerIngresos
              ├── DrawerCitasDelDia
              ├── DrawerOcupacion
              └── DrawerServicioDetalle
```

### 4.2 Server actions (todo en `lib/actions.ts`)

#### `getMetricas()` — MODIFICADA

```typescript
export async function getMetricas(
  businessId: number,
  rango: RangoMetricas,
  professionalId?: number | null,
  vista?: 'general' | 'profesional' | 'servicios'
): Promise<MetricasData>
```

Ejecuta en paralelo (`Promise.all`):

1. **Citas período actual** — query existente extendida con:
   - `hora_slot` para heatmap de ocupación
   - `professional_id` para agrupación
   - `numero` para detectar clientes nuevos vs recurrentes

2. **Citas período anterior** — misma query con fechas corridas hacia atrás (misma duración: ej. si rango=semana, 7 días antes)

3. **Slots disponibles del período** — para calcular ocupación (reusa lógica de `getAvailableSlots`)

4. **Clientes nuevos vs recurrentes** — query a `customers` + `appointments`:
   ```sql
   SELECT c.id, c.primera_visita,
          CASE WHEN c.primera_visita >= $fecha_inicio THEN 'nuevo' ELSE 'recurrente' END AS tipo
   FROM customers c
   WHERE c.business_id = $1
     AND EXISTS (SELECT 1 FROM appointments a WHERE a.business_id = $1 AND a.numero = c.numero AND a.fecha BETWEEN $2 AND $3)
   ```

#### `getMetricasDrawer()` — NUEVA

```typescript
export async function getMetricasDrawer(
  businessId: number,
  tipo: 'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle',
  params: { fecha?: string; servicio?: string; professionalId?: number }
): Promise<DrawerData>
```

Se llama al abrir cada drawer. Cada tipo tiene su propia query.

### 4.3 Índice nuevo

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_metrics
ON appointments (business_id, professional_id, fecha, estado);
```

Cubre todas las queries de métricas. El `CONCURRENTLY` permite crearlo sin downtime.

---

## 5. Layout de la página

```
┌─────────────────────────────────────────────────┐
│  Métricas          [Hoy | Semana | Mes]         │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │ $12,340k │ │ 142 citas│ │  8% can  │ │ 74%  ││
│  │ +15.2% ▲ │ │   -3 ▼   │ │ +2.1% ▲  │ │ occ  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
│  ┌──────────┐ ┌──────────┐                      │
│  │ 68% ret  │ │ 23 new   │                      │
│  │ +5% ▲    │ │ +8 ▲     │                      │
│  └──────────┘ └──────────┘                      │
├─────────────────────────────────────────────────┤
│  [General] [Por Profesional] [Servicios]        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Chart según vista activa               │   │
│  │  (clickeable → drawer)                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Tabla detalle (si aplica)                      │
└─────────────────────────────────────────────────┘
```

### 5.1 Responsive

| Breakpoint | KPIs | Chart | Tabs | Drawers |
|------------|------|-------|------|---------|
| Desktop (>640px) | Grid 3x2 o 4+2 | Full width, padding | Row horizontal | Lateral (sheet desde derecha) |
| Móvil (<640px) | Scroll horizontal single row | Full width, 180px height | Pills scrolleables | Desde abajo (sheet tipo bottom) |

### 5.2 RBAC

| Role | Visible |
|------|---------|
| owner | Todo: General, Profesional (todos), Servicios |
| admin | Todo: igual que owner |
| profesional | Solo General con sus datos. Sin selector de profesional. Tab "Por Profesional" oculto. Sin comparativas entre profesionales. |

---

## 6. Componentes

### 6.1 `metricas-client.tsx` — MODIFICAR

Orquesta todo. Estado interno:
- `vistaActiva: 'general' | 'profesional' | 'servicios'`
- `professionalFilter: number | null`
- `rangoActivo: RangoMetricas` (ya existe)
- `drawerAbierto: { tipo: string, params: object } | null`

### 6.2 `metricas-kpi-card.tsx` — NUEVO

```tsx
interface KpiCardProps {
  label: string;
  valor: string | number;
  variacion?: { valor: number; positiva: boolean } | null;
  icon?: React.ReactNode;
  onClick?: () => void;
}
```

Renderiza el KPI con badge de variación (verde/rojo). `onClick` abre drawer.

### 6.3 `metricas-tab-selector.tsx` — NUEVO

Tabs estilo pills. Oculta "Por Profesional" si `role === 'profesional'`.

### 6.4 Charts

#### `metricas-chart-ingresos.tsx` — NUEVO

**Vista General y Profesional.**
- BarChart con ingresos por día (igual al actual)
- Línea superpuesta (`<Line>`) con el período anterior (gris tenue)
- Tooltip muestra: "Hoy: $540k | Semana pasada: $490k"

#### `metricas-chart-servicios.tsx` — NUEVO

**Vista Servicios.**
- BarChart horizontal con `<Bar dataKey="ingresos" layout="vertical">`
- Cada barra con color distinto
- Eje Y con nombres de servicio

#### `metricas-chart-ocupacion.tsx` — NUEVO

**Drawer de Ocupación.**
- Grid de 7 columnas (días) × N filas (horas)
- Celdas con color según intensidad (verde=lleno, rojo=ocupado, gris=vacío)
- Sin librería extra — celdas `<div>` con `backgroundColor` calculado del ratio

### 6.5 Drawers

Cada drawer es un componente `<Sheet>` de shadcn/ui:

| Componente | Contenido | Query |
|------------|-----------|-------|
| `drawer-ingresos.tsx` | Tabla: Profesional, Servicio, Cantidad, Total $ | Agrupación por profesional + servicio |
| `drawer-citas-del-dia.tsx` | Tabla: Hora, Cliente, Servicio, Profesional, Estado | Citas de una fecha específica |
| `drawer-ocupacion.tsx` | Heatmap grid horas × días | Slots ocupados / slots totales por hora |
| `drawer-servicio-detalle.tsx` | Quién lo hace más + tendencia mensual | Citas agrupadas por profesional + mes |

---

## 7. Métricas detalladas

### 7.1 KPIs — Vista General

| KPI | Fuente | Cálculo |
|-----|--------|---------|
| Ingresos | `appointments.estado = 'Completada'` | `SUM(parsePrice(servicio))` |
| Variación ingresos | Igual query, período anterior | `((actual - anterior) / anterior) * 100` |
| Total citas | `appointments` en rango | `COUNT(*)` |
| Diferencia citas | Período anterior | `actual - anterior` |
| Cancelaciones | `appointments.estado = 'Cancelada'` | `COUNT(*) / total * 100` |
| Ocupación | `getAvailableSlots` + citas realizadas | `citas_realizadas / slots_totales * 100` |
| Clientes nuevos | `customers.primera_visita` en rango | `COUNT(DISTINCT CASE WHEN primera_visita >= inicio THEN numero END)` |
| Retención | Clientes que repitieron en el período | `recurrentes / (nuevos + recurrentes) * 100` |

### 7.2 Vista Por Profesional

- Dropdown con lista de profesionales activos (owner/admin)
- Profesional ve el suyo fijo, sin dropdown
- KPIs filtrados por `professional_id`

### 7.3 Vista Servicios

| Métrica | Cálculo |
|---------|---------|
| Servicio top (ingresos) | `MAX(ingresos_por_servicio)` |
| Servicio top (cantidad) | `MAX(citas_por_servicio)` |
| Ingreso promedio por servicio | `ingresos_totales / servicios_distintos` |
| Ranking | Lista ordenada por ingresos descendente |

---

## 8. Drawers de drill-down

### 8.1 Drawer Ingresos

```
┌──────────────────────────────┐
│  Desglose de Ingresos        │
│  Período: Semana del 7 Jul   │
├──────────────────────────────┤
│  Profesional  │ Servicio │ $ │
│  Carlos       │ Corte    │...│
│  Carlos       │ Barba    │...│
│  Andrés       │ Corte    │...│
│  Andrés       │ Tinte    │...│
├──────────────────────────────┤
│  Total: $12,340,000          │
└──────────────────────────────┘
```

### 8.2 Drawer Citas del Día

Al hacer click en una barra del chart (día específico).

```
┌──────────────────────────────┐
│  Jueves 10 Julio — 12 citas  │
├──────────────────────────────┤
│  Hora   │ Cliente   │ Serv  │
│  9:00   │ Juan P    │ Corte │
│  9:30   │ María L   │ Tinte │
│  ...                         │
└──────────────────────────────┘
```

### 8.3 Drawer Ocupación

Al hacer click en KPI de Ocupación.

Grid de colores: 7 columnas (lun-dom) × horas del negocio. Cada celda:
- Verde oscuro: 80-100% ocupado
- Verde claro: 50-80%
- Amarillo: 20-50%
- Gris: 0-20%

### 8.4 Drawer Servicio Detalle

Al hacer click en un servicio del ranking.

```
┌──────────────────────────────────┐
│  Corte de Cabello                │
├──────────────────────────────────┤
│  Profesional │ Citas │ Ingresos │
│  Carlos      │ 24    │ $480,000 │
│  Andrés      │ 18    │ $360,000 │
├──────────────────────────────────┤
│  [Mini line chart: tendencia     │
│   últimos 3 meses]               │
└──────────────────────────────────┘
```

---

## 9. Migración DB

```sql
-- migrations/015_metrics_index.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_metrics
ON appointments (business_id, professional_id, fecha, estado);
```

Rollback:
```sql
DROP INDEX IF EXISTS idx_appointments_metrics;
```

---

## 10. Orden de implementación

| Paso | Archivos | Depende de |
|------|----------|------------|
| 1. Migración DB | `database/migrations/015_metrics_index.sql` | Nada |
| 2. Server actions | `lib/actions.ts` | Paso 1 |
| 3. KpiCard + TabSelector | `components/metricas/*.tsx` | Nada |
| 4. Chart Ingresos | `components/metricas/metricas-chart-ingresos.tsx` | Paso 2 |
| 5. Vista General completa | `components/metricas/metricas-client.tsx` | Pasos 2-4 |
| 6. Chart Servicios | `components/metricas/metricas-chart-servicios.tsx` | Paso 2 |
| 7. Vista Servicios completa | `metricas-client.tsx` | Pasos 2, 6 |
| 8. Vista Profesional | `metricas-client.tsx` + filtro | Pasos 2-5 |
| 9. Drawer Ingresos | `components/metricas/drawer-ingresos.tsx` | Paso 2 |
| 10. Drawer Citas del Día | `components/metricas/drawer-citas-del-dia.tsx` | Paso 2 |
| 11. Drawer Ocupación | `components/metricas/drawer-ocupacion.tsx` | Paso 2 |
| 12. Drawer Servicio Detalle | `components/metricas/drawer-servicio-detalle.tsx` | Paso 2 |
| 13. PR, build, deploy | — | Todos los anteriores |

---

## 11. Multi-negocio y multi-tenant

Todas las queries filtran por `business_id`. El índice propuesto comienza con `business_id`. No hay datos compartidos entre negocios. Funciona para cualquier negocio existente (Meyer id=1, Prueba id=2, Brayan Study id=3) y futuros sin cambios.

---

## 12. No incluido (futuro)

Ver `docs/ARCHITECTURE_FUTURE.md` (post-sprint) para:
- Materialized views con `pg_cron` para pre-agregación
- ClickHouse/DuckDB para escalar a 30+ clientes
- Exportación CSV
- Revenue leakage detection
- Benchmarking entre negocios (panel admin Johnander)
- Predicciones AI

---

## 13. Criterios de aceptación

1. [ ] KPIs generales se muestran correctos para Hoy/Semana/Mes
2. [ ] Badges de variación vs período anterior aparecen con valor correcto
3. [ ] Tabs General / Por Profesional / Servicios cambian el contenido
4. [ ] Selector de profesional funciona (owner/admin)
5. [ ] Profesional solo ve sus datos, no ve selector ni tab Profesional
6. [ ] Charts se renderizan según la vista activa
7. [ ] Click en KPI abre drawer con datos correctos
8. [ ] Drawers se cierran correctamente
9. [ ] Todo funciona en móvil (<640px viewport)
10. [ ] Build exitoso sin errores
11. [ ] Funciona para business_id=1,2,3 sin cambios
