# Plan: Clientes — CRM (Módulo 02)

> 2 diseños Stitch: tabla de clientes + drawer de detalle con historial.

## Contexto

Lista de clientes del negocio con búsqueda, historial de visitas y datos de contacto. CRM ligero.

## Dependencias

- Agenda (para mostrar historial de citas del cliente)
- **Backend real**: `getClientes(businessId, search?, professionalId?)`, `getClienteHistorial(businessId, clienteId)` — ambas en `lib/actions.ts`. No existen acciones de crear/actualizar cliente en el backend actual.

## Stitch Exports

| Archivo | Contenido |
|---------|-----------|
| `clients_table_with_search_view.html` | Tabla con búsqueda + filtros + lista de clientes |
| `client_detail_drawer.html` | Drawer lateral con info + historial de citas |

## Componentes V2

### 1. `features/clients/components/client-tableV2.tsx`
- **Reemplaza**: tabla actual de clientes
- **Diseño**: `clients_table_with_search_view.html`
- **Props**: `{ clients: Client[], onSelect: (client) => void }`
- **Busca en tiempo real** (debounce 300ms) por nombre/teléfono/email
- **Columnas**: Nombre, Teléfono, Email, Última visita, Total gastado, Acciones
- **Estados**: loading (skeleton rows), empty ("No hay clientes"), error (toast)

### 2. `features/clients/components/client-detail-drawerV2.tsx`
- **Diseño**: `client_detail_drawer.html`
- **Props**: `{ open: boolean, onClose: () => void, clientId: string }`
- **Contenido**: Avatar/nombre, teléfono, email, dirección, notas. Sección "Historial de citas" (últimas N visitas con fecha, servicio, empleado, total). Botones: Editar, Nueva Cita.

### 3. `features/clients/components/parts/client-formV2.tsx`
- Formulario reutilizable para crear/editar cliente
- Campos: nombre, teléfono, email, dirección, notas, mascota (nombre, raza, edad)

### 4. `features/clients/components/parts/client-historyV2.tsx`
- Sub-componente del drawer. Lista de citas pasadas del cliente.

## Reglas

- Búsqueda client-side si son < 500 registros, server-side si más
- El historial debe ordenarse por fecha descendente
- Los datos de mascota son opcionales pero visibles si existen