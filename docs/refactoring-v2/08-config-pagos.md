# Plan: Config — Métodos de Pago (Módulo 08)

> 1 diseño Stitch: toggle cards de métodos de pago.

## Contexto

Activar/desactivar métodos de pago disponibles en Caja.

## Stitch Export

`payment_methods_toggle_cards_view.html`

## ⚠️ Backend Real

**NO EXISTE.** No hay server actions para métodos de pago. El módulo Caja necesita esto.

**Requisito**: Crear `features/config-payments/actionsV2.ts` con:
- `getPaymentMethods(businessId)` → lista de métodos disponibles
- `togglePaymentMethod(id, active)` → activar/desactivar

Necesita acceso VPS para crear tabla `payment_methods` si no existe y server actions.

## Componentes V2

### 1. `features/config-payments/components/payment-methods-listV2.tsx`
- Grid de cards: cada método tiene icono, nombre, toggle on/off
- Métodos típicos: Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia, Mercado Pago, Otro
- Server action: **crear** `togglePaymentMethod()` en `actionsV2.ts`
- No crear/eliminar métodos — solo toggle existentes

## Reglas
- Los iconos de métodos de pago deben ser de lucide-react
- Si el backend no tiene métodos precargados, empezar con defaults: Efectivo, Tarjeta, Transferencia
- Al toggle, persistir en DB inmediatamente