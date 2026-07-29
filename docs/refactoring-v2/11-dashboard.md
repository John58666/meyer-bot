# Plan: Dashboard Home (Módulo 11)

> 2 diseños Stitch: dashboard con nóminas y comisiones.

## Contexto

Pantalla principal post-login con resumen de métricas del negocio: ingresos, citas, clientes nuevos, y panel de nóminas/comisiones.

## Stitch Exports

| Archivo | Contenido |
|---------|-----------|
| `dashboard_home_with_payroll.html` | Dashboard con payroll/nóminas |
| `dashboard_home_commission_rates.html` | Dashboard con comisiones |

## Componentes V2

### 1. `features/dashboard-home/components/dashboard-gridV2.tsx`
- Layout de cards con métricas clave
- Fila superior: Ingresos Hoy, Citas Hoy, Clientes Nuevos (semana), Tasa Ocupación
- Cada card: icono, valor, cambio %, sparkline (opcional)

### 2. `features/dashboard-home/components/payroll-sectionV2.tsx`
- Tabla de nóminas por empleado: nombre, horas trabajadas, comisiones, bonos, total
- Filtro por semana/mes

### 3. `features/dashboard-home/components/commission-sectionV2.tsx`
- Tabla de comisiones: empleado, servicio, comisión %, monto generado
- Charts con recharts (bar chart de ingresos por empleado)

## Reglas
- Métricas en tiempo real del backend (no hardcodear)
- Charts solo con recharts (librería existente)
- Los datos financieros deben formatearse con locale es-CO