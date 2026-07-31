# Plan: Caja / POS (Módulo 10)

> Completado ✅ — 57 líneas originales → implementación demo visual.

## Contexto

Punto de venta 60/40: panel izquierdo catálogo (servicios + productos), panel derecho carrito con IVA, métodos de pago y cobro. Versión demo visual para inversionista — sin persistencia de transacciones.

## Implementado

### Server actions (`features/caja/actionsV2.ts`)
| Acción | Descripción |
|--------|------------|
| `getCatalogServicesV2(businessId)` | Wrapper de `getServices` (active only) |
| `getCatalogProductsV2(businessId)` | Wrapper de `getProductsV2`, filtra activos con stock > 0 |
| `getPaymentMethodsV2(businessId)` | Wrapper de `getPaymentMethods` (config-payments) |

### Componentes

| Componente | Rol |
|-----------|-----|
| `pos-layoutV2.tsx` | Orquestador: carga datos, maneja carrito en estado local, layout 60/40 responsive |
| `pos-catalogV2.tsx` | Panel izquierdo: tabs Servicios/Productos, grid de items con nombre+precio+duración/stock, click agrega |
| `pos-cartV2.tsx` | Panel derecho: carrito con +/- cantidad, subtotal/IVA 19%/total, selector método pago (íconos), "Cobrar" → success screen → "Nueva Venta" |

### Features
- ✅ Layout 60/40 (desktop: 3fr/2fr grid, mobile: catálogo arriba, carrito abajo)
- ✅ Catálogo conectado a DB real (servicios + productos activos con stock)
- ✅ IVA cálculo inverso (total / 1.19)
- ✅ Métodos de pago con íconos por tipo (cash/card/transfer/digital)
- ✅ Carrito en estado local (quantity +/- , remove, add)
- ✅ Success screen con resumen + botón "Nueva Venta"
- ✅ States: loading (skeleton 60/40) → error → data

### Lo que NO hace (demo visual)
- ❌ Persistir transacciones en DB (requiere migration 023: `transactions` + `transaction_items`)
- ❌ Descontar stock real
- ❌ Cálculo de comisiones por profesional
- ❌ Cierre de cita integrado
- ❌ Impresión de ticket POS

## Verificación
- `tsc --noEmit` → 0 errores
- `eslint` → 0 problemas
- 0 migraciones DB nuevas
- Conectado a `products` (Inventario), `services`, `payment_methods`

## Archivos
- `features/caja/actionsV2.ts`
- `features/caja/components/pos-layoutV2.tsx`
- `features/caja/components/pos-catalogV2.tsx`
- `features/caja/components/pos-cartV2.tsx`
- `app/(dashboard)/dashboard/caja/page.tsx`