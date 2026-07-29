# Plan: Caja / POS (Módulo 03)

> 2 diseños Stitch: pantalla POS 60/40 + checkout exitoso.

## Contexto

Punto de venta para cobrar servicios y productos. Layout 60/40: izquierda (catálogo) + derecha (carrito/resumen).

## Dependencias

- Servicios (catálogo de servicios)
- Inventario (productos)
- Clientes (para asociar venta)
- Config: Métodos de Pago
- **Backend**: `createSale()` — **NO EXISTE**. Este módulo requiere crear server actions nuevas en `features/caja/actionsV2.ts` con acceso VPS.
- **⚠️ Backend gaps**: No hay `getProducts()`, `getPaymentMethods()`, `createSale()`, `getSales()`. Todo hay que crearlo.

## Stitch Exports

| Archivo | Contenido |
|---------|-----------|
| `pos_60_40_view.html` | POS con catálogo a la izquierda, carrito a la derecha |
| `successful_checkout.html` | Pantalla de éxito post-pago |

## Componentes V2

### 1. `features/caja/components/pos-layoutV2.tsx`
- **Diseño**: `pos_60_40_view.html`
- Layout 60/40 grid responsivo (en mobile: catálogo arriba, carrito abajo)
- Header con nombre del negocio, empleado actual, caja abierta/cerrada

### 2. `features/caja/components/pos-catalogV2.tsx`
- Panel izquierdo: categorías (tabs/pills) + grid de servicios/productos
- Cada item: nombre, precio, duración (si es servicio), stock (si es producto)
- Click agrega al carrito

### 3. `features/caja/components/pos-cartV2.tsx`
- Panel derecho: items agregados con cantidad, precio unitario, subtotal
- Selector de cliente (opcional)
- Total general
- Botón "Cobrar" → abre checkout

### 4. `features/caja/components/pos-checkoutV2.tsx`
- Modal/resumen de pago: métodos de pago (efectivo, tarjeta, transferencia, etc.)
- Desglose: subtotal, descuento (si aplica), total
- Input de efectivo recibido (si método es efectivo) para calcular cambio

### 5. `features/caja/components/checkout-successV2.tsx`
- **Diseño**: `successful_checkout.html`
- Pantalla de éxito: check animation, resumen venta, opciones: Nueva Venta, Ticket, Cerrar

## Reglas

- No hardcodear métodos de pago — leer de server action
- Cálculo de cambio en tiempo real si método es efectivo
- Ticket se genera del lado del servidor (no implementar PDF ahora)
- Mobile: catálogo se vuelve scroll vertical, carrito es sheet deslizable