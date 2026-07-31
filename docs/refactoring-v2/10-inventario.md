# Plan: Inventario (Módulo 9)

> Completado ✅ — 38 líneas originales → implementación completa con backend + UI.

## Contexto

Inventario de productos para venta en Caja y control de stock. Dos tipos: Venta Directa (retail) e Insumo (supply). Sin código legacy — todo creado desde cero incluyendo tabla DB.

## Implementado

### Migration 022 (`database/migrations/022_products.sql`)
```sql
CREATE TABLE products (
  id, business_id, sku, name, description, category,
  product_type CHECK ('retail','supply'), cost_price, sale_price,
  current_stock, min_stock_alert, iva_included, iva_percentage,
  supplier, active, created_at, updated_at
)
```
Columnas extra vs schema original: `description`, `supplier` (requeridas por diseño Stitch).

### Server actions (`features/inventory/actionsV2.ts`)

| Acción | Lógica de negocio |
|--------|-------------------|
| `getProductsV2(businessId, search?, type?, page?)` | Paginación LIMIT 10, search ILIKE name+sku, filtro tipo. Stats query paralela: total, lowStock, noStock, inventoryValue. |
| `createProductV2(businessId, data)` | **Supply rule**: `sale_price=null`, `iva_included=false`, `iva_percentage=0`. Validación: cost_price ≥ 0. Audita. |
| `updateProductV2(businessId, id, data)` | Ownership check. Misma regla supply. Preserva valores existentes si no se envían. Audita. |
| `toggleProductActiveV2(businessId, id, active)` | Soft toggle con audit. |
| `deleteProductV2(businessId, id)` | Hard delete con ownership check + audit. |

### Componentes

| Componente | Secciones | Estados |
|-----------|-----------|---------|
| `product-catalogV2.tsx` | 3 stat cards (Total, Stock bajo/agotado, Valor inventario), search + filtro tipo, tabla con badges stock, paginación, toggle/delete | Skeleton → Data → Empty → Error |
| `product-modalV2.tsx` | Create/Edit: nombre*, SKU, descripción, categoría, tipo radio (Venta Directa/Insumo), costo*, precio, stock, alerta stock, IVA incluido+%, proveedor | Form → Saving → Success → Error |

### Stock badges
- 🟢 **Disponible**: `current_stock > min_stock_alert`
- 🟡 **Bajo**: `current_stock <= min_stock_alert && current_stock > 0`
- 🔴 **Agotado**: `current_stock <= 0`

### Supply logic (Venta Directa vs Insumo)
- Modal: radio deshabilita Precio Venta + oculta IVA visualmente
- Server: fuerza `sale_price=null`, `iva_included=false`, `iva_percentage=0`
- Tabla: Precio muestra "—", tipo badge "Insumo"

### Auditoría extendida
`lib/audit-types.ts`: +4 acciones (`create_product`, `update_product`, `toggle_product`, `delete_product`) + entidad `product` + labels.

### Ruta nueva
`app/(dashboard)/dashboard/inventario/page.tsx` — server component de 18 líneas.

## Verificación
- `tsc --noEmit` → 0 errores
- `eslint` → 0 problemas
- Bugs corregidos: cost_price=0 permitido, stats sobre total de productos (no solo página actual)

## Archivos
- `database/migrations/022_products.sql`
- `features/inventory/actionsV2.ts`
- `features/inventory/components/product-catalogV2.tsx`
- `features/inventory/components/product-modalV2.tsx`
- `app/(dashboard)/dashboard/inventario/page.tsx`
- `lib/audit-types.ts` (modificado)
