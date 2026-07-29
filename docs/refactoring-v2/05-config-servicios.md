# Plan: Config — Servicios & Precios (Módulo 05)

> 2 diseños Stitch: lista de servicios + modal de 2 pestañas.

## Contexto

Gestión del catálogo de servicios: lista, crear, editar, eliminar servicios con precio y duración.

## ⚠️ Backend Real

- `updateServices(data)` — **update masivo** (no hay create/delete individual)
- `lib/services.ts` — tipos `ServiceRow`, `ServiceInput`
- El V2 debe llamar `updateServices()` con el array completo tras cada cambio
- Si se necesita CRUD individual, crear nuevas server actions en `features/config-services/actionsV2.ts`

## Stitch Exports

| Archivo | Contenido |
|---------|-----------|
| `services_categorized.html` | Lista de servicios agrupados por categoría |
| `service_modal_add_edit_two_tab.html` | Modal con 2 pestañas: info general + configuración avanzada |

## Componentes V2

### 1. `features/config-services/components/services-listV2.tsx`
- Lista con categorías expandibles/colapsables
- Cada servicio: nombre, duración, precio, estado (activo/inactivo)
- Botones: Añadir Servicio, editar (icono), toggle estado

### 2. `features/config-services/components/service-modalV2.tsx`
- Modal de 2 pestañas:
  - **Tab 1 — Info General**: nombre, categoría, precio, duración, descripción
  - **Tab 2 — Config**: color (para calendario), empleados asignados, comisión, notificaciones
- Server actions: `createService()`, `updateService()`, `toggleServiceStatus()`

## Reglas
- La duración debe tener incrementos de 5 minutos
- El color se usa en el calendario (Agenda) para identificar el servicio
- Categorías: precargadas del servidor. Si no existen, ocultar el grouping.