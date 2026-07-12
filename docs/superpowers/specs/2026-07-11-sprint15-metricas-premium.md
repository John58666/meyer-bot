# Sprint 15 — Dashboard Métricas Premium

> **Fecha:** 11 julio 2026
> **Proyecto:** meyer-bot
> **Estado:** Implementado y deployado ✅ (12 julio 2026) — 2 responsive bugs corregidos post-deploy (13 julio 2026)

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
| Desktop (>768px) | Grid 3x2 | Full width, padding | Row horizontal | Lateral (sheet desde derecha, max-w-sm=384px) |
| Tablet (640-767px) | Grid 3x2 | Full width, 260px height | Row horizontal | Lateral (sheet desde derecha, max-w-sm=384px) |
| Móvil (<640px) | Scroll horizontal single row | Full width, 180px height | Pills scrolleables | Lateral (sheet desde derecha, 90vw con CSS-only) |

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

## 14. UI/UX Audit Post-Implementation (12 julio 2026)

> Auditoría realizada con `ui-ux-pro-max` skill. Todos los hallazgos implementados en sesiones 10-11.

### 14.1 KPIs — Falta de contexto visual ✅ Implementado

| Issue | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Badges semánticos (TrendingUp/TrendingDown según tipo de métrica) | `metricas-kpi-card.tsx` + `metricas-client.tsx` | 🔴 Alta | ✅ |
| Sparkline SVG inline (60×20px) en KPIs de ingresos, citas, cancelaciones, ocupación | `metricas-kpi-card.tsx` | 🔴 Alta | ✅ |
| Tooltip hover "vs período anterior" con valor actual vs anterior | `metricas-kpi-card.tsx` | 🟡 Media | ✅ |
| Sin skeleton loader — KPIs aparecen de golpe sin transición | — | 🟡 Media | ⏳ No implementado (bajo impacto) |

### 14.2 Filtros por fecha — Implementado ✅

| Feature | Archivo | Prioridad | Estado |
|---------|---------|-----------|--------|
| RangoMetricas extendido: `'trimestre'` + `'custom'` | `lib/actions.ts` | 🔴 Alta | ✅ |
| Botón "Trimestre" en rango selector | `metricas-client.tsx` | 🔴 Alta | ✅ |
| Botón "Personalizar" con icono calendario → inputs date Desde/Hasta + Aplicar | `metricas-client.tsx` | 🔴 Alta | ✅ |
| `calcularRangoFechas()` / `calcularPeriodoAnterior()` extendidos | `lib/actions.ts` | 🔴 Alta | ✅ |
| Cache key extendido con fechas para rangos custom | `lib/actions.ts` | 🟡 Media | ✅ |
| No hay comparación custom ("vs semana pasada", "vs mismo mes 2025") | — | 🟡 Media | ⏳ Futuro |

### 14.3 Charts — Interacción ✅ Implementado

| Issue | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Heatmap: tooltip flotante posicionado con `fixed` + transform | `metricas-chart-ocupacion.tsx` | 🟢 Baja | ✅ |
| Heatmap: indicador hora actual (Bogotá) en color accent | `metricas-chart-ocupacion.tsx` | 🟢 Baja | ✅ |
| Chart ingresos: sin zoom/pan, sin toggle bruto/neto/cantidad (bajo impacto) | — | 🟢 Baja | ⏳ Futuro |
| Barras de servicios: LabelList con formato pesos + animación ease-out 600ms | `metricas-chart-servicios.tsx` | 🟢 Baja | ✅ |
| Drawers: loading/skeleton/error state en los 4 drawers | `drawer-*.tsx` | 🟡 Media | ✅ |

### 14.4 Responsive — KPIs horizontales ✅ Implementado

| Issue | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Pagination dots (6 dots, sm:hidden) con scroll tracking | `metricas-client.tsx` | 🟢 Baja | ✅ |
| Dual container: scroll mobile (sm:hidden) + grid desktop (hidden sm:grid sm:grid-cols-3) | `metricas-client.tsx` | 🟢 Baja | ✅ |
| Charts altura responsive: 180px mobile → 260px desktop (ChartIngresos), min-h 200/280 (ChartServicios) | `metricas-chart-ingresos.tsx`, `metricas-chart-servicios.tsx` | 🟢 Baja | ✅ |

### 14.5 Drawers — Estado de carga/error ✅ Implementado

| Issue | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Skeleton (animate-pulse) mientras fetch corre | `drawer-*.tsx` | 🟡 Media | ✅ |
| Estado error con mensaje + botón "Reintentar" | `drawer-*.tsx` | 🟡 Media | ✅ |

### 14.6 Accesibilidad ✅ Implementado

| Issue | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Badges con sr-only ("Mejoró/Empeoró X%") | `metricas-kpi-card.tsx` | 🟡 Media | ✅ |
| Charts envueltos en `<div role="img" aria-label="...">` | `metricas-client.tsx` | 🟡 Media | ✅ |
| Tabs con `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby` | `metricas-tab-selector.tsx`, `metricas-client.tsx` | 🟡 Media | ✅ |
| Select profesional con `aria-label="Filtrar por profesional"` | `metricas-client.tsx` | 🟡 Media | ✅ |

### 14.7 Post-deploy responsive bugs (13 julio 2026)

> Aparecieron 2 bugs tras deploy del UI/UX Audit. Corregidos.

| Bug | Causa raíz | Fix | Commit |
|-----|-----------|-----|--------|
| **KPI grid overflow** — KPIs en scroll horizontal forzado en tablet/desktop (6 cards ~900px en container 768px) | `flex overflow-x-auto` sin `flex-wrap` en sm+ | Dual container: scroll `flex sm:hidden` + grid `hidden sm:grid sm:grid-cols-3` | `7f8a780` |
| **"Pantallitas negras"** — múltiples overlays/backdrops al clickear en General (móvil) | `useState`+`useEffect` para `isMobile` en 4 drawers causa re-render cascade; base-ui Dialog renderiza overlays fantasma | Eliminar `isMobile` de todos los drawers, siempre `side="right"`, CSS-only `max-md:!w-[90vw] max-md:!max-w-[90vw]` | `43751c5` |

---

## 13. Criterios de aceptación

### Core
1. [x] KPIs generales se muestran correctos para Hoy/Semana/Mes
2. [x] Badges de variación vs período anterior aparecen con valor correcto
3. [x] Tabs General / Por Profesional / Servicios cambian el contenido
4. [x] Selector de profesional funciona (owner/admin)
5. [x] Profesional solo ve sus datos, no ve selector ni tab Profesional
6. [x] Charts se renderizan según la vista activa
7. [x] Click en KPI abre drawer con datos correctos
8. [x] Drawers se cierran correctamente
9. [x] Build exitoso sin errores
10. [x] Funciona para business_id=1,2,3 sin cambios

### UI/UX Audit (sesión 10)
11. [x] Sparkline SVG visible en KPIs de ingresos, citas, cancelaciones, ocupación
12. [x] Badges semánticos: TrendingUp/TrendingDown según METRICA_SEMANTICA (↑ingresos bueno, ↑cancelaciones malo)
13. [x] Tooltip hover "vs período anterior" en KPIs clickeables
14. [x] RangoMetricas incluye 'trimestre' + 'custom'
15. [x] Custom date picker con inputs Desde/Hasta + Aplicar
16. [x] Los 4 drawers tienen skeleton loading + error state con Reintentar
17. [x] Tabs con role="tablist", aria-selected, aria-controls, role="tabpanel"
18. [x] Charts con role="img" + aria-label
19. [x] Badges con sr-only ("Mejoró/Empeoró X%")
20. [x] LabelList en barras de servicios + animación ease-out
21. [x] Heatmap tooltip flotante + indicador hora actual
22. [x] Pagination dots en KPIs mobile (<640px)

### Responsive bugs post-deploy (sesión 11)
23. [x] KPIs en grid 3 columnas en tablet/desktop, scroll horizontal solo en móvil (<640px)
24. [x] Charts altura: 180px mobile, 260px desktop (ChartIngresos)
25. [x] Drawers con side="right" siempre, sin overlays fantasma en móvil
26. [x] Drawers 90vw de ancho en móvil (CSS-only, sin JS)
27. [x] Date picker inputs full-width en móvil
28. [x] Sin errores de build ni lint (solo pre-existentes)
