# Plan: Clientes — CRM (Módulo 08)

> 2 diseños Stitch: tabla CRM con filtros + modal nuevo cliente. 2 server actions ya existentes. Sin backend gaps.

## Contexto

CRM ligero del negocio. Lista de clientes con búsqueda, visualización de historial de visitas, datos de contacto y creación/edición de clientes. El código legacy actual (`clientes-client.tsx`, 90 líneas) es una tabla simple con búsqueda client-side.

## Dependencias

- Agenda (Módulo 7) — completado. `getClienteHistorial` ya existe y se usa desde el drawer.
- **Backend**: `getClientes(businessId, search?, professionalId?)` y `getClienteHistorial(businessId, clienteId)` en `lib/actions.ts`. Ambas listas.
- **Backend gap**: No existen `createCliente` ni `updateCliente`. Se crearán en `features/clients/actionsV2.ts` con INSERT/UPDATE directo a `customers`.

## Stitch Exports — Análisis

| Diseño | Archivo | Líneas | Contenido |
|--------|---------|:---:|-----------|
| Tabla CRM + historial | `clientes_crm_filtros_historial_expandido/code.html` | 208 | Header con título + search + "Nuevo Cliente" button. Tabla con columnas: Nombre, Teléfono, Última visita, Total visitas. Click expande drawer con historial de citas (fecha, servicio, profesional, estado). WhatsApp icon en cada fila. |
| Modal nuevo cliente | `clientes_modal_nuevo_cliente/code.html` | 286 | Modal con campos: Nombre*, Teléfono*, Email, Dirección, Notas, Mascota (nombre, raza, edad). Footer: Cancelar + "Guardar Cliente". |

## Server Actions Reales

| Necesito | Real | Archivo | ¿Existe? |
|----------|------|---------|:---:|
| Listar clientes | `getClientes(businessId, search?, professionalId?)` | `lib/actions.ts:1387` | ✅ |
| Historial | `getClienteHistorial(businessId, clienteId)` | `lib/actions.ts:1842` | ✅ |
| Crear cliente | **NO EXISTE** | — | ❌ |
| Actualizar cliente | **NO EXISTE** | — | ❌ |

### Tipos existentes

```typescript
// lib/actions.ts
export interface Cliente {
  id: number; numero: string; nombre: string;
  total_visitas: number; ultima_visita: string | null;
  primera_visita: string | null; ultimo_servicio: string | null;
}

export interface ClienteHistorialItem {
  id: number; fecha: string; hora: string;
  servicio: string; estado: string;
}
```

### Schema DB — tabla `customers`

```sql
customers (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  numero VARCHAR(50) NOT NULL,
  nombre VARCHAR(255),
  genero VARCHAR(50) DEFAULT 'desconocido',
  preferred_professional_id BIGINT REFERENCES professionals(id),
  notas TEXT,
  primera_visita DATE,
  ultima_visita DATE,
  total_visitas INTEGER DEFAULT 0,
  UNIQUE (business_id, numero)
)
```

## Código Legacy

### `page.tsx` (30 líneas)
```
Server component → getClientes(businessId, undefined, professionalId) → <ClientesClient clientes={clientes} />
```

### `clientes-client.tsx` (90 líneas)
```
Client component → useState(search) → useMemo(filter client-side) → <input search> + <table>
Columnas: Nombre, Teléfono, Visitas, Última visita, Acción (Ver detalle)
Sin estados: loading/empty/error. Sin historial. Sin modal crear.
```

## Componentes V2 a Crear

### 1. `features/clients/actionsV2.ts` — Server actions (NUEVO)

| Función | Wrappea | Notas |
|---------|---------|-------|
| `getClientesV2(businessId, search?)` | `getClientes` de `lib/actions.ts` | Wrapper con auth |
| `getClienteHistorialV2(businessId, clienteId)` | `getClienteHistorial` de `lib/actions.ts` | Wrapper con auth |
| `createClienteV2(businessId, data)` | Nueva — `pool.query` INSERT | Con validación, upsert en caso de teléfono existente |
| `updateClienteV2(businessId, clienteId, data)` | Nueva — `pool.query` UPDATE | Con validación y auditoría |

### 2. `features/clients/components/client-tableV2.tsx` (NUEVO)

- **Reemplaza**: `clientes-client.tsx`
- **Diseño ref**: `clientes_crm_filtros_historial_expandido/code.html`
- **Tipo**: Data-fetching client component
- **Props**: `{ businessId: number, isOwnerOrAdmin: boolean, userProfessionalId: number | null }`
- **States**: loading (skeleton rows) → error (retry) → empty ("No hay clientes") → data (tabla)
- **Features**:
  - Search con debounce 300ms → llama `getClientesV2(businessId, search)`
  - Tabla: Nombre, Teléfono, Última visita (formateada), Visitas, WhatsApp icon, Actions (Ver detalle)
  - Click en fila → abre `ClientDetailDrawerV2`
  - Botón "Nuevo Cliente" → abre `NewClientModalV2`
- **Mobile**: `overflow-x-auto` en tabla, o card list vertical

### 3. `features/clients/components/client-detail-drawerV2.tsx` (NUEVO)

- **Diseño ref**: `clientes_crm_filtros_historial_expandido/code.html` (sección drawer)
- **Tipo**: Composable + data-fetching
- **Props**: `{ open: boolean, onClose: () => void, cliente: Cliente, businessId: number }`
- **States**: loading historial → data → empty historial
- **Contenido**:
  - Header: avatar inicial + nombre + teléfono + badge visitas
  - Info: email, dirección, notas (si existen)
  - Sección "Historial de citas": tabla con fecha, servicio, profesional, estado (badge)
  - Acciones: Editar (abre modal en modo edit), WhatsApp directo
- **Usa**: `getClienteHistorialV2(businessId, cliente.id)`

### 4. `features/clients/components/new-client-modalV2.tsx` (NUEVO)

- **Diseño ref**: `clientes_modal_nuevo_cliente/code.html`
- **Tipo**: Form + mutation
- **Props**: `{ open: boolean, onClose: () => void, businessId: number, onSuccess: () => void, cliente?: Cliente }`
- **Modos**: Create (sin `cliente`) y Edit (con `cliente`)
- **Campos**: Nombre*, Teléfono*, Email, Dirección, Notas, Mascota (nombre, raza, edad) — solo Nombre y Teléfono required
- **States**: form → saving (loading) → success (checkmark + auto-close) → error
- **Usa**: `createClienteV2` o `updateClienteV2` según modo

## Estructura Final

```
features/clients/
├── actionsV2.ts                        (~80 líneas)
├── components/
│   ├── client-tableV2.tsx              (~250 líneas)
│   ├── client-detail-drawerV2.tsx      (~220 líneas)
│   └── new-client-modalV2.tsx          (~200 líneas)
```

## Data Flow

```
page.tsx (server)
  → auth() → businessId, isOwnerOrAdmin, userProfessionalId
  → <ClientTableV2> (client)
       ├── loadData() → getClientesV2(businessId, search)
       ├── Search input → debounce → loadData(search)
       ├── Click "Nuevo Cliente" → NewClientModalV2 (create mode)
       │    └── createClienteV2 → onSuccess → loadData()
       ├── Click fila → ClientDetailDrawerV2
       │    ├── getClienteHistorialV2(businessId, cliente.id)
       │    └── Click "Editar" → NewClientModalV2 (edit mode)
       └── Click WhatsApp → wa.me link
```

## Mobile/Desktop

| Desktop | Mobile |
|---------|--------|
| Tabla completa con 5 columnas | `overflow-x-auto` scroll horizontal |
| Drawer lateral (max-w-sm) | Drawer full-width |
| Modal centrado (max-w-md) | Modal centrado (mismo) |

## Verificación

- `tsc --noEmit` → 0 errores
- `eslint features/clients/` → 0 warnings, 0 errors
- Reutiliza patrones de `docs/refactoring-v2/INDEX.md#patrones-v2`
- Reutiliza shared components: `DrawerV2`, `ModalV2`, `SearchInputV2`
- Colores: layout `zf-*`, badges `STATUS_BADGE` de constants

## Orden de implementación

1. `actionsV2.ts` — crear/actualizar cliente en DB + wrappers
2. `client-tableV2.tsx` — tabla con search + skeleton/empty/error
3. `client-detail-drawerV2.tsx` — drawer con historial
4. `new-client-modalV2.tsx` — modal crear/editar
5. Actualizar `page.tsx` — importar V2
6. Verificar: tsc + lint
7. Actualizar docs
