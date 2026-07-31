# Frontend Reference — meyer-bot

## ¿Qué es este documento?

Es el contrato de diseño del frontend. Aquí se documenta CADA módulo de la plataforma: su contexto, el schema acordado, y una lista de recomendaciones con su estado (aplicadas o pendientes).

El objetivo es que **cualquier agente IA que entre nuevo** entienda qué se diseñó, qué se decidió, qué falta, y por qué — sin necesidad de preguntarte contexto.

## ¿Cómo se construye?

1. **Tú diseñas en Stitch** (o Figma) el UX de cada módulo
2. **Otra IA analiza el diseño** y extrae recomendaciones técnicas para el backend
3. **Yo documento** aquí el resultado: contexto + schema + recomendaciones con estado
4. **Cuando se implementa**, se actualiza el estado y se vincula al código real

## Stack y herramientas

| Herramienta | Uso |
|-------------|-----|
| Stitch / Figma | Diseño UX de cada módulo |
| Lovable o similar | Maquetado HTML/CSS desde el diseño |
| Next.js 16 | Implementación final |
| PostgreSQL 16 | Backend de datos |

## Documentos relacionados

| Documento | Qué contiene |
|-----------|-------------|
| `docs/backend-reference.md` | Schema DB completo, server actions, endpoints, reglas de negocio, auth, auditoría |
| `docs/frontend-reference.md` (este) | Diseño UX, decisiones de frontend, recomendaciones por módulo |
| `docs/reference/RESEARCH.md` | Conclusiones de investigaciones (multi-industria, pagos, escalabilidad, etc.) |

## Cómo leer las recomendaciones

Cada recomendación tiene un estado:

| Estado | Significado |
|--------|-------------|
| ✅ Aplicada | La recomendación ya está implementada en el código actual |
| ✅ Aplicada en diseño | Se acordó en el diseño UX pero **NO está implementada**. Pendiente de codificar. |
| ✅ Diseño aprobado | Diseño UX completo y aprobado. Pendiente de implementar. |
| ✅ Análisis aprobado | Análisis técnico completado. Pendiente de diseño UX. |
| ⏳ Pendiente | Recomendación identificada pero sin decisión de diseño tomada aún |
| 🔵 Futuro | Para cuando haya necesidad (no implementar aún) |

> ⚠️ **Todas las recomendaciones marcadas como "Aplicada en diseño" deben re-validarse al momento de implementar.** El diseño pudo cambiar o pueden haber surgido nuevos casos borde.

## Reglas del documento

1. No mezclar módulos. Cada sección es independiente.
2. Estado visible en cada sección: ✅ Operativo / 🟡 Diseño listo / 🔵 Investigación / ⏳ Pendiente.
3. Contexto + recomendación: cada módulo explica qué problema resuelve y cómo se implementa.
4. Si un cambio afecta múltiples módulos, se documenta en cada uno con referencia cruzada.

---

## 1. Dashboard (`/dashboard`)

### Contexto
Vista base con métricas operativas generales. Construida sin sistema de diseño unificado.

### Estado: ✅ Implementado V2 — `features/dashboard-home/components/`

### Archivos V2
- `features/dashboard-home/components/dashboard-pageV2.tsx` — Range selector (Hoy/Semana/Mes), 4 KPI cards (Ingresos, Citas, Ocupación, Clientes nuevos con trends+sparklines), bar chart recharts, top profesionales, clientes recurrentes/nuevos, heatmap ocupación horaria
- `features/dashboard-home/actionsV2.ts` — getMetricasV2, getOcupacionHeatmapV2
- `app/(dashboard)/dashboard/page.tsx` — server component thin (22 líneas)

### API Contract

#### `getMetricas(businessId, rango, professionalId?, fechaDesdeOverride?, fechaHastaOverride?, compararCon?)`
- **Request**: `(businessId: number, rango: RangoMetricas, professionalId?: number | null, fechaDesdeOverride?: string, fechaHastaOverride?: string, compararCon?: CompararCon)`
- **Response**: `Promise<{ data: MetricasData | null; error: string | null }>`
- **Tipos**: `RangoMetricas = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'custom'`, `CompararCon = 'periodo-anterior' | 'semana-anterior' | 'mes-anterior' | 'ano-anterior'`
- **Acción**: Calcula KPIs (citas, ingresos, ocupación, retención, hora pico, sparklines) con variación vs período anterior. Cache in-memory 15s.

#### `getMetricasDrawer(businessId, tipo, params)`
- **Request**: `(businessId: number, tipo: DrawerTipo, params: { fecha?: string; servicio?: string; professionalId?: number; rango?: RangoMetricas })`
- **Response**: `Promise<{ data: DrawerData | null; error: string | null }>`
- **DrawerTipo**: `'ingresos' | 'citas-del-dia' | 'ocupacion' | 'servicio-detalle' | 'cancelaciones' | 'clientes-nuevos'`
- **Acción**: Datos detallados para cada Drawer del dashboard.
- **Drawer Ingresos**: Query directa a `transactions` (no `appointments` + `buildPriceMap`). JOIN con `customers` + `payment_methods`, agrupado por `created_at::date` DESC. Coincide al centavo con KPI `ingresos` de `getMetricas` (mismo filtro rango + professionalId).

#### `getActiveProfessionals(businessId)`
- **Request**: `(businessId: number)`
- **Response**: `Promise<{ id: number; name: string }[]>`
- **Acción**: Lista profesionales activos para selector de filtro.

### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 1.1 | Sistema de diseño unificado (tokens, colores, tipografía) | ⏳ Pendiente |
| 1.2 | Estados loading/empty/error en todas las vistas | ⏳ Pendiente |
| 1.3 | Responsive 375px / 768px / 1440px | ⏳ Pendiente |
| 1.4 | KPI `ingresos` migrar de `buildPriceMap(appointments)` a `SUM(transactions.total)` con JOIN a `transactions` (misma fuente que Drawer, elimina discrepancia) | ⏳ Pendiente |
| 1.5 | Drawer `ingresos` rediseñado: query directa a `transactions`, filas por ticket real (Ticket#, cliente, total, método pago, fecha), agrupado por `created_at::date` DESC, sync con filtros rango + professionalId | ✅ Implementado |

---

## 2. Agenda (`/dashboard/agenda`)

### Contexto
Dos modos de operación:
- **Vista Calendario**: Navegación semanal por profesional con citas y bloqueos (diseño UX pendiente).
- **Vista Lista / Consola de Despacho**: Timeline mensual con acordeón por días (citas + bloqueos combinados), filtros multi-select (profesionales, servicios, estados, canal), soft delete con toast.

### Estado: ✅ Implementado V2 — `features/agenda/components/`

### Archivos V2
- `features/agenda/components/week-viewV2.tsx` — Grid hora×profesional con navegación diaria, filtro profesional, skeleton/empty/error states, cards de cita por status
- `features/agenda/components/agenda-modalV2.tsx` — Modal 2-tabs: "Nueva Cita" (cliente search, servicio+prencia+duración, slots disponibles) + "Bloquear Horario" (profesional, fecha, rango horas, motivo, notas). Success state con auto-close
- `features/agenda/components/appointment-detail-drawerV2.tsx` — Drawer con detalle de cita + acciones: Completar, Cancelar, Reactivar, Reagendar (inline date/time inputs)
- `features/agenda/actionsV2.ts` — 10 server action wrappers: getWeekAppointmentsV2, getProfessionalsV2, getClientesV2, getServicesV2, getAvailableSlotsV2, createAppointmentV2, updateAppointmentStatusV2, rescheduleAppointmentV2, getBusinessNameV2

### Schema — columnas adicionales
```sql
ALTER TABLE appointments ADD COLUMN payment_status VARCHAR DEFAULT 'pendiente'
  CHECK IN ('pendiente','pagado','cancelado');
ALTER TABLE appointments ADD COLUMN notes TEXT;
ALTER TABLE appointments ADD COLUMN channel VARCHAR DEFAULT 'manual'
  CHECK IN ('manual','online');
ALTER TABLE appointments ADD COLUMN customer_id INT REFERENCES customers(id);

ALTER TABLE schedule_exceptions ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE schedule_exceptions ADD COLUMN is_full_day BOOLEAN DEFAULT TRUE;
ALTER TABLE schedule_exceptions ADD COLUMN end_date DATE;  -- rango multi-día (vacaciones)
```

---

### 2.1 Vista Modal — Pestaña 1: Nueva Cita (izquierda)

#### Payload
```json
{
  "customer_id": 142,
  "service_id": 8,
  "professional_id": 3,
  "date": "2026-07-27",
  "start_time": "10:00:00",
  "payment_status": "pendiente",
  "notes": "Agregar detalles internos de la cita..."
}
```

#### Reglas de negocio
- **Validación disponibilidad**: Antes del INSERT, invocar `getAvailableSlots()` y verificar que `start_time` esté libre. Cruzar horario del profesional, citas previas y `schedule_exceptions` (incluyendo `deleted_at IS NULL`).
- **Snapshot inmutable**: `SELECT price, duration_minutes FROM services WHERE id = service_id` → almacenar en `appointments.price_at_booking` y `appointments.duration_at_booking`.
- **Relación con customers**: Usar `customer_id` FK (no `nombre`+`numero` sueltos). Si no existe, upsert en `customers` antes del INSERT.

---

### 2.2 Vista Modal — Pestaña 2: Bloquear Horario (derecha)

#### Payload
```json
{
  "professional_id": null,
  "start_date": "2026-07-27",
  "end_date": "2026-07-27",
  "is_full_day": true,
  "start_time": "11:00:00",
  "end_time": "12:00:00",
  "reason": "Almuerzo",
  "notes": "Pausa para almuerzo programada"
}
```

#### Reglas de negocio
- **Validación 409**: `SELECT COUNT(*) FROM appointments WHERE fecha BETWEEN start_date AND end_date AND estado IN ('Pendiente','Confirmada') AND (professional_id = $prof OR professional_id IS NULL)`. Si > 0, rebotar con 409 + conteo.
- **Batch INSERT**: Generar array de fechas en servidor, usar `unnest($1::date[])` para INSERT único.
- **Rango multi-día**: Si `start_date != end_date`, generar todas las fechas del rango.
- **full_day**: Si `is_full_day = true`, `start_time`/`end_time` son NULL.

---

### 2.3 Vista Lista — Consola de Despacho Mensual

#### Acordeón por días (server-side on-demand)
Dos endpoints separados para evitar cargar el mes completo:

#### `getMonthSummary(year, month)`
- **Request**: `(businessId: number, year: number, month: number)`
- **Response**: `Array<{ date: string; active_appointments: number; pending_appointments: number; confirmed_appointments: number; total_blocks: number }>`
- **Acción**: Resumen ligero con métricas de ocupación por día. Sin filas detalladas.

#### `getDayDetail(date)`
- **Request**: `(businessId: number, date: string, professionalIds?: number[], serviceIds?: number[], paymentStatuses?: string[], channels?: string[], status?: string)`
- **Response**: `Array<AppointmentRow | BlockRow>` — timeline combinado
- **Acción**: `UNION ALL` entre `appointments` y `schedule_exceptions` ordenado por `start_time ASC`. Filtros opcionales multi-select (arreglos). Ambos filtran `deleted_at IS NULL`.

#### `deleteBloqueo(id)` — soft delete con undo
- **Request**: `(id: number, businessId: number)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: `UPDATE schedule_exceptions SET deleted_at = NOW() WHERE id = $1`. No DELETE físico.
- **UX**: Frontend aplica Optimistic UI con toast 5s + botón "Deshacer". Si no se deshace, confirma.

---

### API Contract — endpoints existentes actualizados

#### `createAppointment(data)` — **actualizado**
- **Request**: `(data: { customer_id: number; service_id: number; professional_id: number; date: string; start_time: string; payment_status?: string; notes?: string; channel?: string })`
- **Response**: `Promise<{ success: true; appointmentId: number } | { error: string; conflict?: true } | { error: '409'; conflictCount: number }>`
- **Acción**: Snapshot `price_at_booking`+`duration_at_booking` desde `services`. Valida disponibilidad vía `getAvailableSlots()`. Upsert `customers` si no existe por `customer_id`. Revalida rutas.

#### `createBloqueosBatch(data)` — **actualizado**
- **Request**: `(data: { businessId: number; professionalId?: number | null; start_date: string; end_date: string; is_full_day: boolean; start_time?: string; end_time?: string; reason?: string; notes?: string })`
- **Response**: `Promise<{ ok: true } | { error: '409'; conflictCount: number } | { error: string }>`
- **Acción**: Valida 409 contra citas Pendiente/Confirmada en el rango. Genera array de fechas entre `start_date` y `end_date`. INSERT batch con `unnest`.

#### `getAvailableSlots(businessId, fecha, professionalId?)`
- Sin cambios. Ya incluye validación contra `schedule_exceptions` (con `deleted_at IS NULL`).

#### `getTodayAppointments`, `getWeekAppointments`, `getAppointmentsByMonth`
- Sin cambios estructurales. Eventualmente reemplazables por `getDayDetail` + `getMonthSummary`.

### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 2.1 | Vista calendario por profesional con navegación semanal | ⏳ Pendiente |
| 2.2 | Snapshot `price_at_booking` + `duration_at_booking` desde `services` al crear cita | ✅ Análisis aprobado |
| 2.3 | `ALTER TABLE` para `payment_status`, `notes`, `channel`, `customer_id` en appointments | ✅ Diseño aprobado |
| 2.4 | `ALTER TABLE` para `deleted_at`, `is_full_day`, `end_date` en schedule_exceptions | ✅ Diseño aprobado |
| 2.5 | Vista Lista mensual con acordeón: `getMonthSummary` + `getDayDetail` (UNION ALL) | ✅ Diseño aprobado |
| 2.6 | Soft delete en schedule_exceptions (`deleted_at = NOW()`) con toast 5s undo | ✅ Diseño aprobado |
| 2.7 | Payload unificado `createAppointment` con `customer_id`, `service_id`, snapshot obligatorio | ✅ Diseño aprobado |
| 2.8 | Payload `createBloqueosBatch` con rango fechas, full_day, batch unnest, validación 409 | ✅ Diseño aprobado |
| 2.9 | Filtros multi-select: `professionalIds`, `serviceIds`, `paymentStatuses`, `channels`, `status` | ✅ Diseño aprobado |
| 2.10 | Vista Calendario (semanal) — diseño UX pendiente | ⏳ Pendiente |

---

## 3. Clientes / CRM (`/dashboard/clientes`)

### Contexto
Tabla de alta densidad de clientes. Panel expandible derecho (Drawer) con datos del cliente, acceso directo a WhatsApp y Notas Técnicas / Fórmulas Químicas de Color.

### Estado: 🟡 Plan V2 listo — `docs/refactoring-v2/02-clientes.md`

### Schema de respaldo
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

### API Contract

#### `getClientes(businessId, search?, professionalId?)`
- **Request**: `(businessId: number, search?: string, professionalId?: number | null)`
- **Response**: `Promise<{ clientes: Cliente[]; error: string | null }>`
- **Cliente**: `{ id, numero, nombre, total_visitas, ultima_visita, primera_visita, ultimo_servicio }`
- **Acción**: Busca por `ILIKE` en nombre/número. Profesional filtra solo clientes con citas atendidas por él.

#### `getClienteHistorial(businessId, clienteId)`
- **Request**: `(businessId: number, clienteId: number)`
- **Response**: `Promise<{ cliente: Omit<Cliente, "ultimo_servicio"> | null; historial: ClienteHistorialItem[]; error: string | null }>`
- **ClienteHistorialItem**: `{ id, fecha, hora, servicio, estado }`
- **Acción**: Trae datos del cliente + últimas 50 citas. Busca por `numero` (no `id`).

### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 3.1 | Drawer derecho con datos, WhatsApp directo y notas técnicas | ⏳ Pendiente |
| 3.2 | Tabla de alta densidad con búsqueda por nombre/número | ⏳ Pendiente |

---

## 4. Caja / POS (`/dashboard/caja`)

### Contexto
Layout de pantalla dividida 60/40 para cierres de caja y ventas al paso. Es el módulo más complejo porque integra servicios, productos, IVA, propinas, comisiones y métodos de pago.

### Estado: ✅ Demo visual V2 — `features/caja/components/`

### Archivos V2
- `features/caja/components/pos-layoutV2.tsx` — Orquestador 60/40, carga servicios+productos+métodos pago
- `features/caja/components/pos-catalogV2.tsx` — Panel izquierdo: tabs Servicios/Productos, grid de items
- `features/caja/components/pos-cartV2.tsx` — Panel derecho: carrito con IVA, métodos pago, "Cobrar" → success
- `features/caja/actionsV2.ts` — Wrappers: getCatalogServicesV2, getCatalogProductsV2, getPaymentMethodsV2
- `app/(dashboard)/dashboard/caja/page.tsx` — Ruta nueva

**Nota**: Versión demo visual. No persiste transacciones. Para habilitar persistencia: migration 023 (`transactions` + `transaction_items`) + `createTransactionV2`.

### Layout

**Panel Izquierdo (60%): Carrito**
- Precarga servicios de la cita usando `price_at_booking` y `duration_at_booking`
- Buscador rápido de productos (tabla `products`) para venta cruzada
- Calcula subtotal en tiempo real

**Panel Derecho (40%): Desglose**
- Desglose de IVA (cálculo inverso: Neto + IVA = Total)
- Selector dinámico de métodos de pago (toggle desde `payment_methods`)
- Campo de propina (libre de IVA y comisiones)
- Botón "Cobrar" que ejecuta la transacción

### Schema

```sql
transactions (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  appointment_id INT REFERENCES appointments(id),
  subtotal NUMERIC(12,2) NOT NULL,
  iva_monto NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  propina NUMERIC(12,2) DEFAULT 0,
  payment_method_id INT REFERENCES payment_methods(id),
  tipo_documento VARCHAR(20) DEFAULT 'boleta',
  detalle_fiscal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INT REFERENCES transactions(id),
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('service', 'product')),
  item_id INT,
  name VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  iva_percentage NUMERIC(5,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0
)

payment_methods (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  name VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cash', 'card', 'transfer', 'digital')),
  instructions JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Lógica de comisión en el POS — Cálculo Inmutable

```
SI professional_services.commission_percentage NO ES NULL:
    → usar ese valor (override específico para este servicio-profesional)
SINO:
    → usar professionals.comision_servicio_pct (porcentaje global del profesional)
```

La comisión se calcula sobre `price_at_booking` (snapshot congelado al agendar), NO sobre el precio actual del catálogo:

```sql
SELECT
  COALESCE(ps.commission_percentage, p.comision_servicio_pct) AS pct,
  a.price_at_booking AS base_price,
  ROUND(a.price_at_booking * COALESCE(ps.commission_percentage, p.comision_servicio_pct) / 100, 2) AS commission_amount
FROM appointments a
JOIN professional_services ps ON ps.service_id = $item_id AND ps.professional_id = a.professional_id
JOIN professionals p ON p.id = a.professional_id
WHERE a.id = $appointment_id AND $item_type = 'service';
```

El resultado se inyecta en `transaction_items.commission_amount` como valor inmutable y libre de IVA.

### Flujo de la transacción completa (en una sola transacción SQL)

```sql
BEGIN;

-- 1. INSERT cabecera de transacción
INSERT INTO transactions (business_id, appointment_id, subtotal, iva_monto, total, propina, payment_method_id, tipo_documento)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- 2. INSERT items + calcular comisiones + descontar stock
FOR EACH item IN transaction_items:
  INSERT INTO transaction_items (transaction_id, item_type, item_id, name, quantity, unit_price, iva_percentage, commission_amount)
  VALUES ($transactionId, $item_type, $item_id, $name, $quantity, $unit_price, $iva_pct, $commission_amount);

  IF item_type = 'product':
    UPDATE products SET current_stock = current_stock - $quantity
    WHERE id = $item_id AND business_id = $business_id;
    -- Validar: current_stock >= $quantity (rechazar si stock insuficiente)
  END IF;

-- 3. Cierre de cita integrado (si appointment_id presente)
IF $appointment_id IS NOT NULL:
  UPDATE appointments SET estado = 'Completada', updated_at = NOW()
  WHERE id = $appointment_id AND business_id = $business_id;
END IF;

COMMIT;
```

### Cálculo de IVA (inverso)
- `iva_included = true`: precio incluye IVA → neto = total / (1 + iva%/100), iva = total - neto
- `iva_included = false`: precio no incluye IVA → neto = subtotal, iva = subtotal * iva%/100

### Flujo post-cobro (aprobado en Stitch)

Al recibir la confirmación exitosa de `createTransaction`:

1. **Pantalla de Éxito** — overlay/modal con resumen de la venta: total, método de pago, items, propina
2. **Botón "Imprimir Comprobante"** → dispara GET a `/api/caja/imprimir?transactionId=X`
3. **Botón "Volver a la Caja / Nueva Venta"** → resetea el estado local del carrito (asíncrono) y vuelve al layout 60/40 inicial

### Endpoint de impresión — `/api/caja/imprimir`

**`GET /api/caja/imprimir?transactionId={id}&businessId={id}`**

- **Response**: `Promise<{ ok: true; texto: string } | { error: string }>`
- **`texto`**: Plain text estructurado para impresora térmica POS (ancho 48 columnas aprox):

```
╔════════════════════════════════════════════╗
║           ZYVENSHOP — BARBERÍA            ║
║           Calle 123 #45-67                ║
║           Tel: 300 123 4567              ║
╠════════════════════════════════════════════╣
║  TICKET DE VENTA  #TX-2407               ║
║  FECHA: 28/07/2026   HORA: 15:30         ║
╠════════════════════════════════════════════╣
║  Corte Caballero             1  x $35.000 ║
║  Champú Matizador            2  x $18.000 ║
╠════════════════════════════════════════════╣
║  SUBTOTAL:                     $71.000    ║
║  IVA (19%):                    $11.343    ║
║  PROPINA:                      $5.000     ║
╠════════════════════════════════════════════╣
║  TOTAL:                        $87.343    ║
╠════════════════════════════════════════════╣
║  MÉTODO DE PAGO:   Tarjeta Débito        ║
║  CLIENTE:          Juan Pérez            ║
║  ATENDIÓ:          Camila                ║
╠════════════════════════════════════════════╣
║  ¡Gracias por tu visita!                  ║
╚════════════════════════════════════════════╝
```

- **Acción**: Query a `transactions` + `transaction_items` + `payment_methods` + `appointments` (si existe). Formatea en texto monoespaciado apto para ESC/POS.

### Reset de interfaz — "Volver a la Caja / Nueva Venta"

El botón dispara una Server Action o callback que:
1. Limpia el estado local del carrito (`resetCart()` asíncrono via `useActionState` o similar)
2. Reinicia `selectedAppointment` a `null`
3. Vuelve el layout a su estado neutro (panel izquierdo vacío, panel derecho con valores en 0)
4. Revalida `revalidatePath('/dashboard/caja')`

### API Contract

#### `createTransaction(data)` — controlador financiero
- **Request**: `(data: { businessId: number; appointmentId?: number | null; items: TransactionItemInput[]; paymentMethodId: number; propina?: number; tipoDocumento?: string })`
- **TransactionItemInput**: `{ itemType: 'service' | 'product'; itemId: number; name: string; quantity: number; unitPrice: number; ivaPercentage: number }`
- **Response**: `Promise<{ ok: true; transactionId: number } | { error: string; conflict?: string }>`
- **Acción**: Una sola transacción SQL que:
  1. INSERT `transactions` con subtotal, IVA, total, propina
  2. INSERT `transaction_items` por cada item
  3. Calcula commission_amount usando cascade `COALESCE(ps.commission_percentage, p.comision_servicio_pct)` sobre `price_at_booking` (servicios) o 0 (productos)
  4. Descuenta `products.current_stock -= quantity` para cada item de tipo `product` (rechaza si stock insuficiente)
  5. Si `appointmentId` presente: UPDATE `appointments SET estado = 'Completada'`

#### `getPaymentMethods(businessId)`
- **Request**: `(businessId: number)`
- **Response**: `Promise<PaymentMethod[]>` — `{ id, name, tipo, instructions, is_active, created_at }`
- **Acción**: Lista métodos de pago del negocio. POS filtra `is_active = true`.

### Recomendaciones
| # | Recomendación | Estado | Ref |
|---|---------------|--------|-----|
| 4.1 | Layout 60/40 con carrito a la izquierda y desglose a la derecha | ✅ Diseño aprobado | — |
| 4.2 | Precargar servicios desde appointment usando price_at_booking | ✅ Diseño aprobado | Sección 5.1 |
| 4.3 | Buscador rápido de productos dentro del carrito | ✅ Diseño aprobado | Sección 6 |
| 4.4 | Selector dinámico de métodos de pago desde payment_methods.active | ✅ Diseño aprobado | Sección 5.4 |
| 4.5 | Propina libre de IVA y comisiones | ✅ Diseño aprobado | — |
| 4.6 | Cálculo inverso de IVA en backend | ✅ Aplicada | — |
| 4.7 | Comisión precalculada e inmutable sobre price_at_booking | ✅ Diseño aprobado | — |
| 4.8 | Cierre de cita integrado: cambiar estado a Completada en misma transacción | ✅ Diseño aprobado | — |
| 4.9 | Descuento de stock manual: restar quantity de products.current_stock por cada item product | ✅ Diseño aprobado | — |
| 4.10 | Validación stock insuficiente antes de descontar | ✅ Diseño aprobado | — |
| 4.11 | Endpoint `/api/caja/imprimir` que devuelve texto plano térmico (ESC/POS) | ✅ Diseño aprobado | — |
| 4.12 | Reset asíncrono del carrito al presionar "Volver a la Caja / Nueva Venta" | ✅ Diseño aprobado | — |
| 4.13 | Pantalla de éxito post-cobro con resumen de venta y botones de acción | ✅ Diseño aprobado | — |

---

## 5. Configuración (`/dashboard/configuracion`)

### Contexto
Módulo central que agrupa las secciones administrativas. Usa un menú de sub-pestañas horizontales en la parte superior.

### Layout
Sub-pestañas: `Perfil del Negocio` | `Servicios & Precios` | `Equipo & Roles` | `Horarios & Bloqueos` | `Métodos de Pago` | `Auditoría`

---

### 5.0 Perfil del Negocio (`/dashboard/configuracion/perfil`)

#### Contexto
Configuración general del establecimiento (datos fiscales, moneda, logotipo, reglas de agenda). Diseño UX congelado y aprobado en Stitch — formato de tarjetas claro.

#### Estado: ✅ Diseño aprobado — pendiente de implementar

#### Schema — Nuevas columnas en `businesses`
```sql
ALTER TABLE businesses ADD COLUMN tax_id VARCHAR;                         -- NIT / RUT
ALTER TABLE businesses ADD COLUMN currency VARCHAR DEFAULT 'COP';         -- moneda base
ALTER TABLE businesses ADD COLUMN allow_flexible_staff_hours BOOLEAN DEFAULT TRUE;
ALTER TABLE businesses ADD COLUMN min_booking_notice_hours INT DEFAULT 24;
ALTER TABLE businesses ADD COLUMN logo_url TEXT;                          -- NULL = fallback a iniciales del nombre
```

#### Reglas de negocio

**A. tax_id (identificador fiscal)**
- Sanitización: `.trim()` + eliminar espacios internos al guardar.
- Se usa en JOIN de `transactions` para estampar en Facturas legales de la Caja POS.

**B. allow_flexible_staff_hours (flag)**
- Cuando `FALSE` (OFF): `getAvailableSlots()` / `generateSlots()` debe bloquear disponibilidad de TODOS los profesionales en días donde `businesses.schedule_text` marque cerrado. Anula cualquier horario individual del profesional.
- Cuando `TRUE` (ON): comportamiento actual — el profesional puede abrir en días que el negocio cierra (vía horario individual en `professional_schedule`).
- Inyectar en `getAvailableSlots` (actions.ts:1839) como filtro adicional: si `allow_flexible_staff_hours = false` y el día está cerrado en `schedule_text`, retornar `[]`.

**C. logo_url (logotipo)**
- Botón ✏️ Cambiar Logo → endpoint de subida de archivos en Next.js 16.
- Imagen almacenada en VPS o bucket externo; la DB guarda solo la URL pública.
- Si `logo_url IS NULL` → frontend pinta iniciales del nombre del negocio (ej: "M" para "Maison Du Cheveux").

**D. currency (moneda)**
- Almacena símbolo o código ISO (`COP`, `USD`, etc.).
- Leído por Caja POS y Dashboard Analítico para normalizar símbolos monetarios.

#### API Contract

#### `updateBusinessProfile(businessId, data)` *(nuevo)*
- **Request**: `(businessId: number, data: { tax_id?: string; currency?: string; allow_flexible_staff_hours?: boolean; min_booking_notice_hours?: number; logo_url?: string | null; name?: string })`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: `UPDATE businesses SET ... WHERE id = $1` (una sola query). Sanitiza `tax_id` con `.trim()`. Si `logo_url` es `null`, setea `NULL`.
- **UX feedback**: Botón de guardar con estado ⏳ → ✔️ Cambios Guardados.

#### `uploadBusinessLogo(businessId, file)` *(nuevo)*
- **Request**: `(businessId: number, file: FormData)` — multipart
- **Response**: `Promise<{ url: string } | { error: string }>`
- **Acción**: Sube archivo a VPS/bucket, retorna URL pública. No persiste en DB — el frontend llama `updateBusinessProfile` con la URL.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.0.1 | ALTER TABLE businesses: tax_id, currency, allow_flexible_staff_hours, min_booking_notice_hours, logo_url — ejecutar antes del POS | ✅ Diseño aprobado |
| 5.0.2 | Inyectar `allow_flexible_staff_hours` en `getAvailableSlots()` como filtro de día cerrado | ✅ Diseño aprobado |
| 5.0.3 | Subida de logo a VPS/bucket + almacenar solo URL en DB | ✅ Diseño aprobado |
| 5.0.4 | Fallback a iniciales del nombre si logo_url IS NULL | ✅ Diseño aprobado |
| 5.0.5 | Sanitización de tax_id (.trim) en updateBusinessProfile | ✅ Diseño aprobado |
| 5.0.6 | Estado loading + check verde en botón de guardar | ✅ Diseño aprobado |
| 5.0.7 | Sincronizar currency con POS y Dashboard para símbolos monetarios | ⏳ Pendiente |

---

### 5.1 Servicios & Precios (`/dashboard/configuracion/servicios`)

#### Contexto
Catálogo de servicios organizado por categorías. Modal de dos pestañas: Información General y Profesionales/Comisiones.

#### Estado: ✅ Diseño completo aprobado — pendiente de implementar

#### Schema objetivo
```sql
services (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  name VARCHAR(255) NOT NULL,
  category TEXT DEFAULT '',
  duration_minutes INT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  iva_included BOOLEAN DEFAULT TRUE,
  iva_percentage NUMERIC(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

professional_services (
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  professional_id INT REFERENCES professionals(id),
  is_active BOOLEAN DEFAULT TRUE,
  commission_percentage NUMERIC(5,2) DEFAULT NULL,
  PRIMARY KEY (service_id, professional_id)
)
```

#### Pestaña 1 — Información General
Campos: name, category, duration_minutes, price, iva_included (flag), iva_percentage

#### Pestaña 2 — Profesionales / Comisiones
Lista de profesionales del negocio. Cada uno con:
- Toggle `is_active` (atiende o no este servicio)
- Campo `commission_percentage` (override, opcional — si vacío hereda del perfil global)

#### JSON de envío (Frontend → API)
```json
{
  "name": "Tinte Cabello Largo",
  "category": "Color & Tratamientos",
  "duration_minutes": 120,
  "price": 120000.00,
  "iva_included": true,
  "iva_percentage": 19.00,
  "professionals": [
    { "professional_id": 1, "is_active": true, "commission_percentage": 40.00 },
    { "professional_id": 2, "is_active": true, "commission_percentage": 35.00 },
    { "professional_id": 3, "is_active": false, "commission_percentage": null }
  ]
}
```

#### Transacción en cascada
```
BEGIN;
  INSERT INTO services (...) VALUES (...) RETURNING id;
  FOR EACH professional WHERE is_active = true:
    INSERT INTO professional_services (...) VALUES (...);
  -- is_active = false: NO se inserta fila
COMMIT;
```
En edición: DELETE + INSERT de professional_services dentro de la misma transacción.

#### Sincronización con agenda
Al guardar, `generateSlots()` asimila el nuevo `service_id` y `duration_minutes`. El servicio queda disponible para agendarse inmediatamente.

#### Snapshots (price_at_booking / duration_at_booking) — PRIORIDAD ALTA
Migración mandatoria para integridad financiera del módulo Caja POS:
```sql
ALTER TABLE appointments ADD COLUMN price_at_booking NUMERIC(12,2);
ALTER TABLE appointments ADD COLUMN duration_at_booking INT;
```
**Ejecutar de inmediato** antes de cualquier implementación del POS. El controlador `createAppointment()` debe capturar los valores vigentes de `services.price` y `services.duration_minutes` en el instante exacto del agendamiento, blindando contra cambios futuros en el catálogo.

#### API Contract

#### `getServices(businessId)`
- **Request**: `(businessId: number)`
- **Response**: `Promise<ServiceRow[]>` — solo `active = true`
- **ServiceRow**: `{ id, business_id, name, price, duration_minutes, active }`

#### `getAllServices(businessId)`
- **Request**: `(businessId: number)`
- **Response**: `Promise<ServiceRow[]>` — todos (activos e inactivos)

#### `createService(data)`
- **Request**: `(data: ServiceInput)` — `{ name, price, duration_minutes }`
- **Response**: `Promise<{ ok: true; id: number } | { error: string }>`
- **Reglas**: Requiere owner/admin. Valida duplicado por nombre. `duration_minutes` entre 15 y 480.

#### `updateService(serviceId, data)`
- **Request**: `(serviceId: number, data: ServiceInput)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Verifica pertenencia al negocio, valida duplicado excluyendo自身.

#### `toggleServiceActive(serviceId, active)`
- **Request**: `(serviceId: number, active: boolean)`
- **Response**: `Promise<{ ok: true } | { error: string }>`

#### `deleteService(serviceId)`
- **Request**: `(serviceId: number)`
- **Response**: `Promise<{ ok: true } | { error: string }>`

#### `updateServices(data)` — reemplazo masivo
- **Request**: `(data: { businessId: number; servicios: Array<{ nombre: string; precio: number; duracion: number }> })`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: DELETE + INSERT de todos los servicios en transacción. Sincroniza `services_text`.

#### `getProfessionalServices(businessId, professionalId)`
- **Request**: `(businessId: number, professionalId: number)`
- **Response**: `Promise<number[]>` — array de `service_id`

#### `setProfessionalServices(professionalId, serviceIds)`
- **Request**: `(professionalId: number, serviceIds: number[])`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: DELETE + INSERT de `professional_services`. Permite al propio profesional editar.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.1.1 | Modal de dos pestañas (Info General + Profesionales/Comisiones) | ✅ Diseño aprobado |
| 5.1.2 | Payload unificado: service + professionals[] en una petición | ✅ Diseño aprobado |
| 5.1.3 | Transacción cascada con DELETE+INSERT en edición | ✅ Diseño aprobado |
| 5.1.4 | `is_active = false` no genera fila en professional_services | ✅ Diseño aprobado |
| 5.1.5 | `ON DELETE CASCADE` en FK de professional_services | ✅ Diseño aprobado |
| 5.1.6 | Migración `ALTER TABLE` para `price_at_booking` y `duration_at_booking` — ejecutar antes del POS | ✅ Diseño aprobado |
| 5.1.7 | Capturar snapshot desde `services` al crear cita (en `createAppointment`) | ✅ Diseño aprobado |

---

### 5.2 Equipo & Roles (`/dashboard/configuracion/equipo`)

#### Contexto
Gestión del personal. Al editar un profesional se incluye su **Horario Individual** (herencia visual del COALESCE: si no tiene horario propio, muestra el del negocio).

#### Estado: ✅ Implementado V2 — `features/config-team/components/`

#### Archivos V2
- `features/config-team/components/team-listV2.tsx` — tabla miembros + menú 3-puntos (Editar Permisos, Configurar Turno, Eliminar) + detalle expandible con schedule editor inline + modal confirmación eliminación con cancelación citas futuras
- `features/config-team/components/team-member-modalV2.tsx` — modal crear miembro (ModalV2 + form validación client-side)
- `features/config-team/components/team-permissions-modalV2.tsx` — modal editar permisos (role radio + checkboxes servicios asignados)
- `features/config-team/components/team-schedule-editorV2.tsx` — editor horario inline (toggle heredar/custom + grid semanal open/close)
- `features/equipo-roles/components/employee-detail-modalV2.tsx` — modal detalle de profesional con Perfil, Horario, Estadísticas (completadas, cancelación%, ingresos), Servicios asignados, Reseñas de clientes (★)
- `features/equipo-roles/actionsV2.ts` — getEmployeeStatsV2, getEmployeeReviewsV2
- `database/migrations/021_reviews.sql` — tabla reviews (rating 1-5, comment, FK a customers/appointments)
- `features/config-team/actionsV2.ts` — 13 server actions: CRUD equipo, permisos, horarios, servicios
- `lib/actions.ts` — `deleteTeamMember()` soft-delete

#### Schema
```sql
professionals (
  id BIGINT PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  comision_servicio_pct INTEGER DEFAULT NULL,   -- % comisión servicios
  comision_producto_pct INTEGER DEFAULT NULL,   -- % comisión productos
  created_at TIMESTAMPTZ DEFAULT NOW()
)

professional_schedule (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  professional_id INT REFERENCES professionals(id),
  schedule_text JSONB NOT NULL,  -- {"0":{"open":9,"close":19}}
  UNIQUE (business_id, professional_id)
)
```

#### Horario Individual (herencia)
```
SI professional_schedule.schedule_text NO ES NULL → usar ese horario
SINO → heredar businesses.schedule_text (horario general del negocio)
```

#### Decisiones de horario
- Múltiples rangos por día: `generateSlots()` recibe `Array<{open, close}>`
- Profesional puede abrir en día que negocio cierra (flag `allow_flexible_staff_hours`)
- Al guardar horario, validar citas existentes fuera del nuevo rango (409 + conteo)

#### API Contract

#### `getEquipo(businessId)`
- **Request**: `(businessId: number)`
- **Response**: `Promise<{ miembros: MiembroEquipo[]; error: string | null }>`
- **MiembroEquipo**: `{ id, email, name, role, active, professional_id, professional_name, created_at }`

#### `createMiembroEquipo(data)`
- **Request**: `(data: { businessId: number; email: string; password: string; name: string; role: 'admin' | 'profesional' })`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Reglas**: Solo owner. Valida plan (`max_professionals`/`max_admins`). Crea fila en `professionals` si es `profesional`. Usa transacción DB.

#### `toggleMiembroActivo(userId, businessId, active)`
- **Request**: `(userId: number, businessId: number, active: boolean)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Actualiza `users.active` + `professionals.active` en transacción.

#### `updateMiembroRole(userId, businessId, role)`
- **Request**: `(userId: number, businessId: number, role: 'admin' | 'profesional')`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Si se promueve a `profesional` sin `professional_id`, lo crea.

#### `updateMiembroCredenciales(data)`
- **Request**: `(data: { userId: number; businessId: number; name: string; email: string; password?: string })`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Actualiza nombre/email/password. Sincroniza `professionals.name`.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.2.1 | Refactorizar `generateSlots()` para recibir `ranges: Array<{open, close}>` | ✅ Aplicada en diseño |
| 5.2.2 | Herencia visual del COALESCE en el editor de horario | ✅ Implementado (team-schedule-editorV2) |
| 5.2.3 | Validación 409 al cambiar horario con citas fuera del nuevo rango | ✅ Aplicada en diseño |
| 5.2.4 | Campos comision_servicio_pct y comision_producto_pct en ficha del profesional | ⏳ Pendiente |

---

### 5.3 Horarios & Bloqueos (`/dashboard/configuracion/horarios`)

#### Contexto
Sub-sección dividida en dos sub-pestañas laterales: **Días Festivos** (izquierda) y **Gestión de Bloqueos y Vacaciones** (derecha). Diseño UX congelado y aprobado en Stitch.

#### Estado: ✅ Implementado V2 — `features/config-schedule/components/`

#### Archivos V2
- `features/config-schedule/components/business-schedule-editorV2.tsx` — editor horario semanal del negocio con toggle por día, selectores de hora, skeleton/empty/error states, save con feedback
- `features/config-schedule/components/schedule-blocksV2.tsx` — tabla de bloqueos con filtros (búsqueda, tipo, profesional), modal crear bloqueo con tipo (cierre total/horario especial), delete con loading state
- `features/config-schedule/actionsV2.ts` — server actions: getBusinessScheduleV2, saveBusinessScheduleV2, getBloqueosV2, createBloqueoV2, deleteBloqueoV2, updateBloqueoV2, getProfessionalsV2, checkBloqueoConflictosV2, cancelAppsAndNotifyV2, getBusinessRawScheduleV2

#### Unificación del endpoint de bloqueos
El frontend usa un **único disparador** (`createBloqueosBatch`) para registrar excepciones en `schedule_exceptions`:
- **Global** (todo el local): `professional_id = NULL` — registrado desde el formulario del botón centralizado
- **Por empleado**: guarda su `professional_id` correspondiente

#### Sub-pestaña Izquierda — Días Festivos
- Tarjeta informativa que lista feriados anuales
- **GET** filtrado: `WHERE professional_id IS NULL AND tipo = 'cerrado_anual'`

#### Sub-pestaña Derecha — Gestión de Bloqueos y Vacaciones
- Tabla de alta densidad que lista cronológicamente todos los bloqueos del equipo
- Botón "+ Nuevo Bloqueo" que dispara `createBloqueosBatch()` (endpoint por lotes)
- **GET** filtrado: `WHERE professional_id IS NOT NULL`

#### Schema
```sql
schedule_exceptions (
  id BIGINT PK,
  business_id INTEGER NOT NULL,
  professional_id BIGINT NULL,         -- NULL = todo el negocio / festivo global
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL CHECK IN ('cerrado','horario_especial','cerrado_anual'),
  hora_inicio TIME NULL,
  hora_fin TIME NULL,
  motivo TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                     -- soft delete (para toast undo)
  is_full_day BOOLEAN DEFAULT TRUE,
  end_date DATE,                              -- rango multi-día (vacaciones)
  CHECK (tipo = 'cerrado' OR tipo = 'cerrado_anual' OR (hora_inicio NOT NULL AND hora_fin NOT NULL))
)

> Las columnas `deleted_at`, `is_full_day` y `end_date` se sincronizan con la sección 2.4 (Agenda — soft delete, rango fechas, full_day).

#### Endpoints

**`createBloqueo()`** (`actions.ts:1033`): ❌ Unused para el nuevo flujo. Reemplazado por `createBloqueosBatch()`.

**`createBloqueosBatch()`** — nuevo endpoint que reemplaza `createBloqueo()`:
```ts
// 1. Validación 409 — citas Pendiente/Confirmada en el rango
const { rows: [{ count }] } = await pool.query(
  `SELECT COUNT(*) FROM appointments
   WHERE business_id = $1 AND fecha = ANY($2::date[])
     AND estado IN ('Pendiente', 'Confirmada')
     AND ($3::bigint IS NULL OR professional_id = $3)`,
  [businessId, fechas, professionalId]
)
if (parseInt(count) > 0)
  return { error: '409', conflictCount: parseInt(count) }

// 2. INSERT batch con unnest
await pool.query(
  `INSERT INTO schedule_exceptions (business_id, professional_id, fecha, tipo, hora_inicio, hora_fin, motivo)
   SELECT $1, $2, unnest($3::date[]), $4, $5, $6, $7`,
  [businessId, professionalId, fechas, tipo, horaInicio, horaFin, motivo]
)
```

#### API Contract

#### `getBloqueos(businessId, professionalId?, viewAll?)`
- **Request**: `(businessId: number, professionalId?: number | null, viewAll?: boolean)`
- **Response**: `Promise<BloqueoRow[]>` — `{ id, fecha, tipo, hora_inicio, hora_fin, motivo, professional_id, professional_name? }`
- **Acción**: Owner/admin usa `viewAll=true` para la tabla de Gestión. Profesional ve solo sus bloqueos. Filtra `fecha >= today`.

#### `createBloqueosBatch(data)` — reemplaza `createBloqueo()`
- **Request**: `(data: { businessId: number; professionalId?: number | null; fechas: string[]; tipo: 'cerrado' | 'horario_especial'; hora_inicio?: string; hora_fin?: string; motivo?: string })`
- **Response**: `Promise<{ ok: true } | { error: '409'; conflictCount: number } | { error: string }>`
- **Reglas**: Valida cada fecha ≥ today. Valida citas Pendiente/Confirmada en el rango por profesional (o global si `professional_id IS NULL`) antes del INSERT. Si hay conflictos, rebota con 409 + conteo. Usa `unnest($1::date[])` para batch eficiente.

#### `deleteBloqueo(id, businessId)`
- **Request**: `(id: number, businessId: number)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Reglas**: Profesional solo borra sus propios bloqueos.

#### `updateBloqueo(data)`
- **Request**: `(data: { id: number; businessId: number; fecha: string; tipo; hora_inicio?; hora_fin?; motivo?; professionalId? })`
- **Response**: `Promise<{ ok: true } | { error: string }>`

#### `updateScheduleText(businessId, schedule)`
- **Request**: `(businessId: number, schedule: ScheduleData)` — `ScheduleData = Record<string, { open: number; close: number }>`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Actualiza `businesses.schedule_text`. Valida rangos (0-23 open, 1-24 close, close > open).

#### `getProfessionalSchedule(businessId, professionalId)`
- **Request**: `(businessId: number, professionalId: number)`
- **Response**: `Promise<ScheduleData | null>` — COALESCE `professional_schedule` → `businesses.schedule_text`

#### `updateProfessionalSchedule(businessId, professionalId, schedule)`
- **Request**: `(businessId: number, professionalId: number, schedule: ScheduleData)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: INSERT ON CONFLICT en `professional_schedule`. Owner/admin o propio profesional.

#### `deleteProfessionalSchedule(businessId, professionalId)`
- **Request**: `(businessId: number, professionalId: number)`
- **Response**: `Promise<{ ok: true } | { error: string }>`
- **Acción**: Elimina horario personalizado → restaura herencia del negocio.

#### `checkConflictosBloqueo(businessId, fecha, professionalId?)`
- **Request**: `(businessId: number, fecha: string, professionalId?: number | null)`
- **Response**: `Promise<CitaConflicto[]>` — `{ id, hora, servicio, nombre, numero, professional_name, estado }`
- **Acción**: Citas no canceladas en la fecha, para mostrar modal 409 antes de forzar bloqueo.

#### `cancelAppointmentsAndNotify(businessId, appointmentIds, motivo?)`
- **Request**: `(businessId: number, appointmentIds: number[], motivo?: string)`
- **Response**: `Promise<{ ok: true; canceladas: number; resultados: Array<{ id: number; ok: boolean; error?: string }> } | { error: string }>`
- **Acción**: Cancela citas + notifica por WhatsApp al cliente y al dueño. Se invoca después de confirmación del usuario ante 409.

#### `getMiHorarioData(businessId, role, professionalId)`
- **Request**: `(businessId: number, role: string, professionalId: number | null)`
- **Response**: `Promise<{ success: true; view: 'professional' | 'ownerAdmin'; businessSchedule: ScheduleData; schedule?: ScheduleData | null; bloqueos: BloqueoRow[]; profesionales?: ProfesionalConHorario[] } | { success: false; error: string }>`
- **Acción**: Datos unificados para vista de horario. Owner/admin ve todos los profesionales.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.3.1 | Sub-pestaña izquierda: Días Festivos con GET filtrado `professional_id IS NULL AND tipo = 'cerrado_anual'` | ✅ Diseño aprobado |
| 5.3.2 | Sub-pestaña derecha: Gestión de Bloqueos con GET filtrado `professional_id IS NOT NULL` | ✅ Diseño aprobado |
| 5.3.3 | `createBloqueosBatch()` reemplaza `createBloqueo()` con un solo endpoint unificado | ✅ Diseño aprobado |
| 5.3.4 | Validación 409 antes del INSERT batch: contar citas Pendiente/Confirmada por fecha y profesional | ✅ Diseño aprobado |
| 5.3.5 | Modal de confirmación con conteo de citas al recibir 409, con opción "Forzar bloqueo" | ✅ Diseño aprobado |
| 5.3.6 | Agregar `tipo = 'cerrado_anual'` al CHECK de `schedule_exceptions` | ✅ Análisis aprobado |

---

### 5.4 Métodos de Pago (`/dashboard/configuracion/pagos`)

#### Contexto
Cuadrícula de tarjetas de control (Toggle Cards) para encender/apagar métodos de pago y configurar instrucciones de transferencias/billeteras digitales.

#### Estado: 🟡 Schema acordado — pendiente de implementar

#### Schema
```sql
payment_methods (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  name VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cash', 'card', 'transfer', 'digital')),
  instructions JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### API Contract

**Nota:** Sin server actions dedicadas aún. Se usa consulta directa SQL desde el frontend vía Server Components o se implementarán acciones pendientes.

#### `getPaymentMethods(businessId)` *(pendiente)*
- **Request**: `(businessId: number)`
- **Response esperada**: `Promise<PaymentMethod[]>` — `{ id, name, tipo, instructions, is_active, created_at }`
- **Acción**: Lista métodos del negocio. El POS solo muestra `is_active = true`.

#### `togglePaymentMethod(id, businessId, is_active)` *(pendiente)*
- **Request**: `(id: number, businessId: number, is_active: boolean)`
- **Response esperada**: `Promise<{ ok: true } | { error: string }>`
- **Regla propuesta**: Si `tipo = 'digital'` y `is_active = true`, validar que `instructions` no esté vacío.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.4.1 | Toggle Cards para activar/desactivar métodos | ⏳ Pendiente |
| 5.4.2 | Validar instructions no vacío si tipo='digital' antes de activar | ✅ Aplicada |
| 5.4.3 | JSONB en instructions para soportar Stripe/PayPal futuro | ✅ Aplicada |

---

### 5.5 Auditoría (`/dashboard/configuracion/auditoria`)

#### Contexto
Consola de seguridad inmutable (solo inserts, solo lectura). Registra cambios operativos y financieros sospechosos como modificaciones de precios en caja o descuentos manuales.

#### Estado: ✅ Implementado V2 — `features/config-audit/components/`

#### Archivos V2
- `features/config-audit/components/audit-listV2.tsx` — filtros avanzados (acción, usuario, fechas), vista expandible inline por fila, colores semánticos por tipo de acción, paginación server-side con URL params
- `features/config-audit/actionsV2.ts` — `getAuditLogsV2()`, `getAuditUsersV2()`, `getAuditProfessionalsV2()`

#### Schema (existente en backend)
```sql
audit_log (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  user_id INT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### API Contract

Las funciones están en `dashboard/lib/audit.ts`.

#### `getAuditLogs(businessId, filters)`
- **Request**: `(businessId: number, filters: { accion?: string; userId?: number; desde?: string; hasta?: string; page: number })`
- **Response**: `Promise<{ entries: AuditLogEntry[]; total: number; pages: number }>`
- **AuditLogEntry**: `{ id, business_id, user_id, accion, entidad, entidad_id, detalle, ip_address, created_at, user_name }`
- **Acción**: Paginado (20 items/página). Filtros por acción, usuario, rango de fechas.

#### `auditar(businessId, userId, accion, entidad, entidadId, detalle)` — función interna
- **Request**: `(businessId: number, userId: number | null, accion: AuditAccion, entidad: AuditEntidad, entidadId: number | null, detalle: Record<string, unknown> | null)`
- **Response**: `Promise<void>` (fire & forget, no revierte si falla)
- **Tipos**: `AuditAccion = 'create_appointment' | 'cancel_appointment' | 'complete_appointment' | 'reactivate_appointment' | 'reschedule_appointment' | 'create_bloqueo' | 'delete_bloqueo' | 'update_bloqueo' | 'create_miembro' | 'toggle_miembro' | 'update_role' | 'update_services' | 'update_professional_schedule' | 'delete_professional_schedule'`
- **Acción**: Inserta en `audit_log` con `ip_address` desde headers.

#### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 5.5.1 | Tabla de solo lectura con filtros por acción, usuario y fecha | ✅ Implementado (audit-listV2) |
| 5.5.2 | Exportable a CSV | ⏳ Pendiente |

---

## 6. Productos / Inventario

### Contexto
Para multi-industria. Peluquerías venden champús (retail), clínicas usan insumos sin cobrar al cliente (supply). Accesible desde el buscador rápido de Caja y desde gestión directa.

### Estado: ✅ Implementado V2 — `features/inventory/components/`

### Archivos V2
- `features/inventory/components/product-catalogV2.tsx` — 3 stat cards + search + filtro tipo + tabla con stock badges + paginación + toggle/delete
- `features/inventory/components/product-modalV2.tsx` — Modal create/edit con tipo radio (Venta Directa/Insumo), IVA y Precio deshabilitados en Insumo
- `features/inventory/actionsV2.ts` — 5 server actions con lógica supply (sale_price=null, iva=false, iva%=0)
- `database/migrations/022_products.sql` — CREATE TABLE products
- `app/(dashboard)/dashboard/inventario/page.tsx` — Nueva ruta

### Schema
```sql
products (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  sku VARCHAR(50) NULL,
  name VARCHAR(255) NOT NULL,
  category TEXT NULL,
  product_type VARCHAR(50) DEFAULT 'retail',  -- 'retail' | 'supply'
  cost_price NUMERIC(12,2) NOT NULL,
  sale_price NUMERIC(12,2) NULL,
  current_stock INT DEFAULT 0,
  min_stock_alert INT DEFAULT 5,
  iva_included BOOLEAN DEFAULT TRUE,
  iva_percentage NUMERIC(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### API Contract

**Nota:** Sin server actions implementadas aún. Los siguientes contratos son objetivo de diseño.

#### `getProducts(businessId, search?, type?)` *(pendiente)*
- **Request**: `(businessId: number, search?: string, type?: 'retail' | 'supply')`
- **Response esperada**: `Promise<Product[]>` — `{ id, sku, name, category, product_type, cost_price, sale_price, current_stock, min_stock_alert, iva_included, iva_percentage, active }`

#### `createProduct(data)` *(pendiente)*
- **Request**: `(data: ProductInput)`
- **Response esperada**: `Promise<{ ok: true; id: number } | { error: string }>`

#### `updateProduct(id, data)` *(pendiente)*
- **Request**: `(id: number, data: ProductInput)`
- **Response esperada**: `Promise<{ ok: true } | { error: string }>`

### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 6.1 | CRUD con tabla + drawer | ⏳ Pendiente |
| 6.2 | Búsqueda por nombre/SKU | ⏳ Pendiente |
| 6.3 | KPI "Valor Inventario": `SUM(cost_price * current_stock)` | ✅ Aplicada en diseño |
| 6.4 | KPI "Stock Bajo": `COUNT(*) WHERE current_stock <= min_stock_alert` | ✅ Aplicada en diseño |
| 6.5 | Paginación: LIMIT 10 OFFSET X | ✅ Aplicada en diseño |
| 6.6 | `sale_price`: NULL si product_type='supply', obligatorio si 'retail' | ✅ Aplicada en diseño |
| 6.7 | Si product_type='supply': forzar iva_included=false, iva_percentage=0 | ✅ Aplicada en diseño |
| 6.8 | Stock se descuenta vía checkout, no ajuste manual | ✅ Aplicada |
| 6.9 | Buscador rápido integrado en Caja (panel izquierdo) | ⏳ Pendiente |

---

## 7. Membresías / Planes (Futuro)

### Contexto
Para gimnasios, estudios de yoga, escuelas. Cliente compra un plan con créditos, al agendar se descuenta uno.

### Estado: 🔵 Investigación — no implementar aún

### Recomendaciones
| # | Recomendación | Estado |
|---|---------------|--------|
| 7.1 | No diseñar ni implementar aún | ✅ Aplicada |
| 7.2 | Considerar espacio en ficha del cliente para créditos/planes | ⏳ Pendiente |

---

## Apéndice: Mapa de Routes

| Ruta | Módulo | Estado |
|------|--------|--------|
| `/dashboard` | Dashboard — métricas operativas | ✅ Operativo |
| `/dashboard/agenda` | Agenda — calendario por profesional + bloqueo rápido | 🔵 Pendiente UX |
| `/dashboard/clientes` | Clientes / CRM — tabla + drawer con notas técnicas | 🔵 Pendiente UX |
| `/dashboard/caja` | Caja / POS — layout 60/40 + impresión térmica + flujo post-cobro | ✅ Diseño aprobado |
| `/dashboard/configuracion/perfil` | Perfil del Negocio — datos fiscales, moneda, logo, reglas agenda | ✅ Diseño aprobado |
| `/dashboard/configuracion/servicios` | Servicios & Precios — catálogo + modal dos pestañas | ✅ Diseño completo |
| `/dashboard/configuracion/equipo` | Equipo & Roles — personal + horario individual | 🟡 Diseño parcial |
| `/dashboard/configuracion/horarios` | Horarios & Bloqueos — Días Festivos + Gestión de Bloqueos | ✅ Diseño aprobado |
| `/dashboard/configuracion/pagos` | Métodos de Pago — toggle cards | 🟡 Schema listo |
| `/dashboard/configuracion/auditoria` | Auditoría — log inmutable de solo lectura | 🔵 Pendiente UX |
| — | Productos / Inventario — CRUD + buscador en Caja | 🟡 Schema listo |
| — | Membresías / Planes | 🔵 Futuro |

---

> **Flujo de trabajo:** Stitch (diseño UX) → Lovable o similar (maquetado HTML/CSS) → este documento se actualiza → implementación en Next.js.
> **Versión:** Julio 2026 — Basado en el layout de 5 módulos principales con sub-pestañas en Configuración.
