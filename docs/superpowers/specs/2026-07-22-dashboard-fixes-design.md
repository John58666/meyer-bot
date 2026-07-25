# Dashboard Fixes + Rediseño UX — Design Spec

## Alcance
Corregir bugs críticos del dashboard de Meyer Bot y rediseñar roles/UX para que sea usable por personal no técnico de barbería. Todo sincronizado con el bot n8n.

---

## 1. Bugs a corregir

### Bug 1: createAppointment no valida schedule_exceptions (🔴 Crítico)
- **Archivo**: `dashboard/lib/actions.ts:22-98`
- **Problema**: `createAppointment` revisa colisiones de citas pero NUNCA consulta `schedule_exceptions`.
- La UI (`getAvailableSlots`) SÍ filtra bloqueos correctamente. Pero al guardar, no hay validación → force-override o API directa agenda en día/hora bloqueado.
- **Fix**: Agregar verificación de `schedule_exceptions` antes del INSERT.

### Bug 2: fetchOcupacion ignora schedule_exceptions (🔴 Alto)
- **Archivo**: `dashboard/lib/actions.ts:438-481`
- **Problema**: Calcula total de slots solo desde `schedule_text`. Ignora días con `tipo='cerrado'` y horarios con `tipo='horario_especial'`. La ocupación parece más baja de lo real.
- **Fix**: Al calcular totalSlots, consultar `schedule_exceptions` para restar días cerrados y ajustar horarios especiales.

### Bug 3: Bot n8n — queries de disponibilidad desactualizadas (🔴 Crítico)
- **Archivo**: `database/n8n-queries.sql`
- **Problema**: El bot tiene 2 queries:
  - "Leer Disponibilidad" (post-LLM): solo chequea appointments, NO schedule_exceptions ni schedule_text
  - "Leer Slots Disponibles" (pre-LLM): horario hardcodeado 9-7, 1h slots, no usa schedule_text

### Bug 4: Clientes — Sin detección de duplicados (🟡 Medio)
- **Archivo**: `dashboard/components/clientes/clientes-client.tsx`
- **Problema**: Tabla read-only. Si el bot crea clientes sin upsert, se acumulan duplicados.
- **Fix**: Agregar detección + botón para fusionar.

### Bug 5: Servicios — Editor de filas (🟡 Medio)
- **Archivo**: `dashboard/components/configuracion/servicios-client.tsx`
- **Problema**: Textarea con formato `"Nombre $precio, ..."` confuso.
- **Fix**: Editor por filas con inputs individuales.

---

## 2. Rediseño de roles y sidebar

| Rol | Sidebar |
|-----|---------|
| **Profesional** | Inicio, Agenda, Métricas, Clientes, **Mi horario**, Ayuda |
| **Admin** | + Configuración (Servicios, Horario negocio, Horarios x profesional), **Mi horario**, Auditoría |
| **Owner** | + Equipo |

### Lógica de ruteo
- `/dashboard/mi-horario` → NUEVA ruta, accesible para TODOS los roles. Muestra TU horario personal (días laborales + excepciones).
- `/dashboard/configuracion` → solo admin/owner. Muestra: Servicios, Horario del negocio, Horarios por profesional.
- Sidebar:
  - **Profesional**: Inicio, Agenda, Métricas, Clientes, **Mi horario**, Ayuda
  - **Admin**: + Configuración, Auditoría
  - **Owner**: + Equipo
- Middleware (`auth.config.ts`) actualizado para reflejar estos permisos.

---

## 3. "Mi horario" — Diseño unificado

Una sola página que combina:
1. **Horario recurrente** (qué días y horas trabaja)
2. **Excepciones** (bloqueos por fecha: cerrado o horario especial)
3. **Calendario visual** que muestra el resumen del mes

### Layout Desktop
```
┌────────────────────────────────────────────────────┐
│  MI HORARIO                                         │
│                                                     │
│  ┌─── HORARIO SEMANAL ──────────────────────────┐  │
│  │  Día       | Abre | Cierra                    │  │
│  │  ☑ Lunes   |  9   |   18                      │  │
│  │  ☑ Martes  |  9   |   18                      │  │
│  │  ☐ Miércoles|  —   |   —                      │  │
│  │  ...        |  ... |  ...                     │  │
│  │  [Guardar horario]                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─── EXCEPCIONES ───────────────────────────────┐  │
│  │  📅 Calendario del mes                        │  │
│  │  ┌──┬──┬──┬──┬──┬──┬──┐                      │  │
│  │  │  │  │  │  │🔴│  │  │  ← rojo = cerrado   │  │
│  │  ├──┼──┼──┼──┼──┼──┼──┤                      │  │
│  │  │  │  │  │  │  │🟡│  │  ← amarillo = esp.  │  │
│  │  └──┴──┴──┴──┴──┴──┴──┘                      │  │
│  │  [Lista de bloqueos debajo]                    │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ 15/08 - Vacaciones 🟢 Cerrado         │x │  │  │
│  │  │ 20/08 - 10:00-14:00 🟡 Horario esp.   │x │  │  │
│  │  │ 25/08 - médico 🟢 Cerrado             │x │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │  [+ Agregar excepción]                       │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Layout Mobile (<768px)
- Mismo contenido apilado verticalmente
- Horario semanal con toggles + inputs numéricos
- Calendario en scroll vertical
- Lista de excepciones abajo
- FAB "+" para agregar excepción rápida

### Modal "Agregar excepción"
```
┌──────────────────────────┐
│  Nueva excepción         │
│                          │
│  Fecha: [dd/mm/aaaa]     │
│                          │
│  Tipo:                   │
│  ● Cerrado todo el día   │
│  ○ Horario especial      │
│                          │
│  (si especial)           │
│  Desde: [09:00]          │
│  Hasta: [14:00]          │
│                          │
│  Motivo: [Vacaciones]    │
│                          │
│  [Cancelar] [Guardar]    │
└──────────────────────────┘
```

---

## 4. Lógica unificada de disponibilidad

```sql
-- Pseudocódigo de la lógica a aplicar en dashboard y bot
function obtenerSlotsDisponibles(businessId, fecha, professionalId):
  // 1. Horario base
  horario = professional_schedule[professionalId] ?? businesses.schedule_text

  // 2. Excepciones
  excepcion = schedule_exceptions WHERE business_id, fecha
              AND (professional_id IS NULL OR professional_id = professionalId)

  if excepcion.tipo == 'cerrado':
    return []
  if excepcion.tipo == 'horario_especial':
    horario = excepcion  // override del horario del día

  // 3. Generar slots de 30 min
  slots = generateSlots(horario.open, horario.close)

  // 4. Quitar slots ocupados (appointments no cancelados)
  booked = SELECT hora FROM appointments WHERE business_id, fecha, estado != 'Cancelada'
           AND (professional_id IS NULL OR professional_id = professionalId)
  return slots - booked
```

### Endpoints API (para bot n8n)

```
GET /api/availability/slots?fecha=2026-08-15&professionalId=2
→ { slots: ["09:00", "09:30", "10:00", ...] }

POST /api/availability/check
  { businessId, fecha, hora, professionalId }
→ { available: true/false, reason: "conflict" | "blocked" | "closed" | null }
```

El bot n8n reemplaza sus queries SQL actuales por llamadas a estos endpoints.

---

## 5. UX / Visual

- **Contraste**: Texto principal #E5E5E5 sobre #0A0A0A (fondo), migrar desde #555 actual
- **Tooltips**: Sidebar con tooltips en hover (title ya existe)
- **Touch targets**: 44px mínimo en mobile
- **Skeletons**: Estados de carga en todas las listas
- **Sistema semántico de colores**:
  - 🟢 Verde: éxito, completado, disponible
  - 🟡 Amarillo: advertencia, horario especial
  - 🔴 Rojo: error, cancelado, cerrado
  - 🔵 Morado (accent): acciones principales (mantener branding actual)
- **Estados vacíos**: Ilustraciones + texto claro en listas sin datos
- **Responsive**: Mobile-first con sidebar → bottom nav < sm

---

## 6. Sincronización Bot + Dashboard

### Estado actual (roto)
| Componente | schedule_text | schedule_exceptions | appointments |
|-----------|:---:|:---:|:---:|
| Dashboard getAvailableSlots | ✅ | ✅ | ✅ |
| Dashboard createAppointment | ❌ | ❌ | ✅ (parcial) |
| Bot "Leer Disponibilidad" (post-LLM) | ❌ | ❌ | ✅ |
| Bot "Leer Slots" (pre-LLM) | ❌ ❌ hardcodeado | ❌ | ❌ |

### Estado deseado
| Componente | schedule_text | schedule_exceptions | appointments |
|-----------|:---:|:---:|:---:|
| Dashboard getAvailableSlots | ✅ | ✅ | ✅ |
| Dashboard createAppointment | ✅ | ✅ | ✅ |
| Bot via API /availability/* | ✅ | ✅ | ✅ |

---

## 7. Archivos a modificar

### Dashboard
- `dashboard/lib/actions.ts`
  - createAppointment: agregar validación schedule_exceptions
  - fetchOcupacion: agregar schedule_exceptions al cálculo
  - getAvailableSlots: ya está correcto (no tocar)
- `dashboard/app/api/availability/slots/route.ts` — mantener, ya funciona
- `dashboard/app/api/availability/check/route.ts` — NUEVO endpoint
- `dashboard/components/configuracion/servicios-client.tsx` — rediseñar a editor por filas
- `dashboard/components/clientes/clientes-client.tsx` — agregar detección de duplicados
- `dashboard/components/sidebar.tsx` — actualizar roles
- `dashboard/components/topbar.tsx` — actualizar roles
- `dashboard/auth.config.ts` — actualizar middleware permisos
- `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx` — NUEVA página
- `dashboard/components/horario/mi-horario-client.tsx` — NUEVO componente (tabla horario recurrente + calendario excepciones + modal crear excepción)
- `dashboard/components/horario/calendario-excepciones.tsx` — NUEVO componente (calendario mensual con colores)
- `dashboard/globals.css` — mejorar contraste, token de colores

### Bot n8n
- `database/n8n-queries.sql` — deprecar queries viejas, documentar nuevos endpoints
- Workflow n8n: reemplazar nodos PostgreSQL por llamadas HTTP a /api/availability/*

---

## 8. Orden de implementación

1. **Bug 1: createAppointment + schedule_exceptions** (crítico, pocas líneas)
2. **Bug 3: Bot n8n endpoints API** (crítico, unificar source of truth)
3. **Bug 2: fetchOcupacion** (alto, métricas correctas)
4. **Página "Mi horario"** (rediseño UX + roles)
5. **Bug 4: Servicios editor por filas** (medio)
6. **Bug 5: Clientes duplicados** (medio)
7. **UX finos** (contraste, tooltips, skeletons, responsive)
