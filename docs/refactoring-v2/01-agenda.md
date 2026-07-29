# Plan: Agenda (Módulo 01)

> 5 diseños Stitch: Weekly Calendar + Appointment modals. El módulo más complejo del dashboard.

## Contexto

La agenda muestra la semana laboral del negocio con citas de clientes. Incluye:
- Vista semanal con celdas por hora/día
- Creación de cita (sheet lateral)
- Edición de cita (modal)
- Detalle de cita (drawer)
- Información de evento (modal pequeño)

## Dependencias

- Config: Servicios (para lista de servicios en el formulario de cita)
- Config: Equipo (para selector de empleado)
- Config: Horarios (para bloquear slots no disponibles)
- **Backend**: `lib/actions.ts` tiene server actions para CRUD de citas

## Stitch Exports a Leer

| Archivo | Contenido |
|---------|-----------|
| `weekly_calendar_view.html` | Calendario semanal con citas |
| `new_appointment_sheet.html` | Sheet lateral para nueva cita |
| `edit_appointment_modal.html` | Modal de edición de cita |
| `view_appointment_detail_drawer.html` | Drawer de detalle |
| `event_info_modal.html` | Modal pequeño de info rápida |

## Server Actions a Usar

**REALES** (verificadas en `lib/actions.ts` y `lib/appointments.ts`):

| Necesito | Real | Archivo |
|----------|------|---------|
| Citas del día/semana | `getWeekAppointments(businessId, professionalId?)` | `lib/appointments.ts` |
| Crear cita | `createAppointment(FormData)` — **recibe FormData, no JSON** | `lib/actions.ts` |
| Cambiar estado | `updateAppointmentStatus(id, estado)` | `lib/actions.ts` |
| Reprogramar | `rescheduleAppointment(id, fecha, hora)` | `lib/actions.ts` |
| Clientes | `getClientes(businessId, search?)` | `lib/actions.ts` |
| Servicios | Leer `lib/services.ts` — `ServiceRow`, `ServiceInput` | `lib/services.ts` |
| Empleados | `getActiveProfessionals(businessId)` | `lib/actions.ts` |
| Slots disponibles | `getAvailableSlots(businessId, fecha, professionalId?)` | `lib/actions.ts` |
| Historial cliente | `getClienteHistorial(businessId, clienteId)` | `lib/actions.ts` |

> **Importante**: `createAppointment` usa `FormData`. En el V2, el formulario debe construirse como `new FormData()` y pasar los campos con `.append()`.

## ⚠️ Duplicación SemanaClient + Componentes Existentes No Documentados

Además de `components/week-view.tsx`, existe `app/(dashboard)/semana/SemanaClient.tsx` que es un **wrapper Client Component** con:
- Vista de lista de citas (cuando `mode='lista'` con filtro activo) — **lógica duplicada del grid**
- Vista calendario mensual via `CalendarMonthView` (cuando `mode='calendario'`)
- Renderiza `{children}` (el `WeekView`) cuando `mode='lista'` sin filtro

**El V2 debe reemplazar AMBAS implementaciones**. La ruta final unificada será `features/agenda/components/week-viewV2.tsx`.

**Componentes existentes en `components/` que el plan NO cubre pero existen** (evaluar si necesitan V2):
- `reschedule-sheet.tsx` — sheet de reprogramación (flujo: cambiar fecha/hora de cita existente)
- `day-appointments-sheet.tsx` — sheet con lista de citas de un día específico
- `appointment-actions.tsx` — botones de acción (completar, cancelar, reactivar)
- `calendar-month-view.tsx` — vista mensual del calendario

> **Decisión**: Los 4 componentes arriba NO tienen diseño stitch asociado. NO crear V2 para ellos. Mantenerlos funcionalmente como están, pero aplicarles los mismos estilos Zero-Friction (bg, text, border, radius) para que se vean consistentes con el nuevo diseño. Preguntar antes de cambiar su comportamiento o estructura.

## Componentes V2 a Crear

*P0 = crítico, P1 = importante, P2 = nice-to-have*

### 1. [P0] `features/agenda/components/week-viewV2.tsx`
- **Reemplaza**: `components/week-view.tsx`
- **Diseño**: `weekly_calendar_view.html`
- **Props**: `{ businessName: string, weekStart: Date, appointments: Appointment[] }`
- **Estados**: loading (skeleton grid), empty ("No hay citas"), error (toast + retry)
- **Layout**: Tabla con horas en eje Y, días en eje X. Citas como bloques de colores.
- **Header**: Nombre del negocio + fecha actual + flechas navegación + botón "Nueva Cita"
- **Acciones**: Click en slot vacío → abre NewAppointmentSheet. Click en cita → abre AppointmentDetailDrawer.

### 2. [P1] `features/agenda/components/new-appointment-sheetV2.tsx`
- **Reemplaza**: `components/new-appointment-sheet.tsx`
- **Diseño**: `new_appointment_sheet.html`
- **Props**: `{ open: boolean, onClose: () => void, selectedSlot: { date: Date, hour: string } | null }`
- **Formulario**: Cliente (buscador + crear), Servicio (dropdown con precio), Empleado, Fecha/Hora, Notas
- **Submit**: llama a `createAppointment()`, toast de éxito, refresca calendario

### 4. [P2] `features/agenda/components/edit-appointment-modalV2.tsx`
- **Reemplaza**: `components/edit-appointment-modal.tsx` (si existe)
- **Diseño**: `edit_appointment_modal.html`
- **Props**: `{ open: boolean, onClose: () => void, appointment: Appointment }`
- **Igual que new pero con datos precargados**. Incluye botón "Cancelar Cita".

### 3. [P1] `features/agenda/components/appointment-detail-drawerV2.tsx`
- **Reemplaza**: posiblemente no existe reemplazo exacto
- **Diseño**: `view_appointment_detail_drawer.html`
- **Props**: `{ open: boolean, onClose: () => void, appointment: Appointment }`
- **Contenido**: Info del cliente (nombre, teléfono, email, mascota), servicio, empleado, fecha/hora, precio, estado, notas. Botones: Editar, Cancelar, Cerrar.

### 5. [P2] `features/agenda/components/event-info-modalV2.tsx`
- **Reemplaza**: posiblemente no existe reemplazo exacto
- **Diseño**: `event_info_modal.html`
- **Props**: `{ open: boolean, onClose: () => void, appointment: Appointment }`
- **Mini modal**: info rápida de la cita (cliente, hora, servicio, empleado). Un botón "Ver detalle" que abre el drawer.

### 6. `features/agenda/components/parts/calendar-headerV2.tsx`
- Sub-componente del week-view. Muestra navegación semanal (<< < Hoy > >>).

### 7. `features/agenda/components/parts/calendar-cellsV2.tsx`
- Sub-componente del week-view. Renderiza las celdas de hora/día y las citas.

## Reglas del Módulo

- **No hardcodear horarios** — usar `getActiveProfessionals(businessId)` y datos de professional_schedule desde server actions
- **Las citas tienen colores por empleado o por servicio** — el stitch usa pastel naranja (#F97316)
- **El formulario de cliente debe incluir búsqueda** (no precargar todos los clientes)
- **Mobile**: la vista semanal se vuelve daily en móvil (una columna con scroll vertical)
- **Dragging**: no implementar drag & drop en V1 — solo click para crear/editar
- **Las citas pasadas** deben mostrarse con opacidad reducida (opacity-50)

## ⚠️ Conexión con n8n (NO ROMPER)

La agenda se sincroniza con n8n a través de webhooks. La dirección es **solo n8n→dashboard**:

1. n8n crea cita → `POST /api/webhooks/sync-new` → dashboard refresca vía `revalidatePath`
2. n8n cancela cita → `POST /api/webhooks/sync-cancel`
3. n8n reagenda → `POST /api/webhooks/sync-reagend`

**Workflow principal de n8n**: `"WhatsApp Bot - Genérico restored"`. NO renombrar nodos en n8n (especialmente AI Agent con ~13 referencias downstream).

**El V2 no debe tocar**: los endpoints `/api/webhooks/sync-*`, el `middleware.ts`, ni el RETURNING de las consultas SQL.

**Bloqueos por profesional**: La DB ya maneja esto vía `schedule_exceptions.professional_id`. El V2 solo debe llamar `getBloqueos(businessId, professionalId?, viewAll?)` — la lógica de validación está en el backend y n8n. No duplicar lógica de bloqueos en el frontend.

### Reglas de negocio que el V2 debe RESPETAR (no cambiar)

- `professional_id IS NULL` en bloqueos = afecta a TODOS los profesionales
- `COALESCE(professional_schedule.schedule_text, businesses.schedule_text)` para horarios
- La duración de cita = service.duration_minutes + buffer_minutes (default 15)
- Slots cada 30 minutos, último slot 30 min antes del cierre
- Fechas pasadas: no permitir selección
- `createAppointment` recibe FormData, no JSON
- Inconsistencia conocida: dashboard vs n8n calculan colisiones diferente (el plan no la corrige, solo la documenta)