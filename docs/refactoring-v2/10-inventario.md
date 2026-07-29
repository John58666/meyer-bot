# Plan: Inventario (Módulo 10)

> 1 diseño Stitch: catálogo de productos + modal de producto.

## Contexto

Inventario de productos para la venta en Caja y para control de stock.

## Stitch Export

`product_catalog_with_add_edit.html`

## ⚠️ Backend Real

**NO EXISTE.** No hay tipos Product ni server actions para productos en el código actual. El módulo Caja tampoco tiene backend de ventas.

**Requisito**: Crear `features/inventory/actionsV2.ts` con:
- `getProducts(businessId)` → productos del negocio
- `createProduct(data)` → nuevo producto
- `updateProduct(id, data)` → editar producto
- `toggleProductStatus(id, active)` → activar/desactivar

Necesita acceso VPS para crear tabla `products` y server actions.

## Componentes V2

### 1. `features/inventory/components/product-catalogV2.tsx`
- Grid/tabla de productos: foto, nombre, categoría, precio, stock, estado
- Búsqueda + filtro por categoría
- Botón "Añadir Producto"

### 2. `features/inventory/components/product-modalV2.tsx`
- Modal formulario: nombre, categoría, precio, costo, stock actual, stock mínimo, descripción, imagen
- Server actions: `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`

## Reglas
- Si stock ≤ stock mínimo, mostrar badge "Stock Bajo" en rojo
- Productos sin stock se muestran pero deshabilitados en Caja