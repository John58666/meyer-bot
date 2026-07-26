# mi-horario UX Redesign — Research & Recommendations

> **Propósito:** Capturar feedback post-deploy del usuario, investigación de patrones UX en scheduling/booking, y propuesta de rediseño para próxima sesión.
> **Fecha:** 2026-07-25
> **Estado:** Investigación completa — listo para implementar

---

## Prioridades acordadas

1. **UX Mi horario (rediseño)** — la vista principal necesita reorganización
2. **Lógica servicios vs horario** — sincronización entre duración de servicios y disponibilidad
3. **Responsive** — mobile/tablet
4. **Bug "+ Agregar bloqueo"** — trigger no funciona
5. **Investigación general** — docs adicionales

---

## Problemas UX identificados (post-deploy)

### P1. Información dispersa
El usuario reporta que la info está "scattered" — cards con información diferente, drawer en grid, calendario en bloqueos, todo mezclado. No hay una vista unificada que responda "¿qué está pasando con mi horario?"

**Componentes involucrados:**
- `summary-cards.tsx` — 3 cards (próximos bloqueos, activos, profesionales)
- `grid-profesionales.tsx` — tabla profesional x día + drawer lateral
- `calendario-bloqueos.tsx` — calendario mensual + lista de bloqueos

### P2. Redundancia drawer/calendario
El drawer en `grid-profesionales` y el `calendario-bloqueos` muestran la misma info de bloqueos. El usuario nota que es duplicado.

### P3. "+ Agregar bloqueo" trigger no funciona
El SheetTrigger del `bottom-sheet-bloqueo.tsx` puede no estar recibiendo el click correctamente (posible pointer-events, z-index, o el trigger está dentro de un DropdownMenu.Item que no propaga el click).

### P4. No responsive
Los componentes no se adaptan bien a mobile/tablet. El grid en particular es problemático.

### P5. Doble camino "cerrar día / agregar bloqueo"
El calendario-bloqueos y el grid-profesionales tienen cada uno su propio botón/acción para cerrar día y agregar bloqueo. El usuario prefiere una sola fuente.

### P6. Días bloqueados sin resumen visual
Cuando un día tiene bloqueos (cerrado completo o parcial), no hay una card o indicador visual que resuma "qué pasó ese día".

---

## Investigación UX — Scheduling & Booking Patterns

### Calendly / Acuity / Square

Estos sistemas comparten un patrón común para gestionar disponibilidad:

1. **Service-level duration drives availability** — cada servicio tiene su duración, el sistema calcula slots automáticamente basado en: duración del servicio + horario laboral + disponibilidad del profesional + excepciones
2. **Color-coded calendar** — days with blocks/availability changes are visually distinct
3. **Click-to-detail** — clicking a day opens a panel with full detail for that day
4. **Clean separation:** schedule (recurring) vs exceptions (one-off blocks)

### Interlinked (Booking Exceptions)

Sistema de gestión de excepciones de reserva. Patrones clave:

1. **Red = fully blocked day** — no appointments possible
2. **Yellow/Amber = partially blocked** — some hours available, some blocked
3. **Drawer on click** — shows: date, regular hours, appointments, exception details, management controls
4. **Clean visual hierarchy:** calendar overview → click → detail panel
5. **Exception types:** full-day closure, time-range block, limited availability

### shadcn Schedule Manager

Data Table approach for schedule overview:
1. **Employee assignment** with time slots per day
2. **Coverage tracking** — who's working when, who's off
3. **Conflict detection** — overlapping assignments

### Scheduling UX Best Practices

| Principio | Aplicación en mi-horario |
|-----------|-------------------------|
| **Reduce clicks** — mínimo de pasos para acción común | Cada acción (bloquear día, ver excepciones) debería ser 1-2 clicks |
| **Fast scanning** — resumen visible sin interacción | Estado del día (abierto/cerrado/parcial) visible en el calendario |
| **Color = information** — rojo/amarillo/verde comunica estado | 🔴 Cerrado, 🟡 Parcial, ✅ Abierto |
| **Role-based views** — profesional ve solo su horario, admin ve todo | Ya implementado, mantener |
| **Cards > Tables** para información operativa | Considerar reemplazar grid por cards en ciertos contextos |
| **Mobile-optimized** — drawer/bottom-sheet en mobile | Sheet nativo responsive ya listo |
| **Progressive disclosure** — primero resumen, luego detalle | Calendario general → click → detalle del día |

---

## Propuesta de rediseño

### Vista unificada: Calendar-centric

Reemplazar la estructura actual de `summary-cards + grid + calendario-bloqueos` por una **vista única centrada en el calendario**:

```
┌─────────────────────────────────────────────┐
│  [Today] [This Week] [This Month]  ← tabs   │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │       Monthly Calendar              │    │
│  │  Mon Tue Wed Thu Fri Sat Sun        │    │
│  │    1   2   3   4   5   6   7        │    │
│  │   🔴  🟡  ✅  ✅  🔴  ✅  ✅       │    │
│  │    8   9  10  11  12  13  14       │    │
│  │   ✅  ✅  🟡  ✅  ✅  🔴  ✅       │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  Click a day → Drawer with:                 │
│  ├─ Date + day name                          │
│  ├─ Status: 🔴 Cerrado / 🟡 Parcial / ✅ Normal│
│  ├─ Regular hours (if any)                   │
│  ├─ Appointments scheduled (if any)          │
│  ├─ Blocks list:                             │
│  │  • 08:00-12:00 — Cerrado por inventario  │
│  │  • 14:00-16:00 — Horario especial        │
│  └─ Actions: [+ Bloquear] [Editar horario]  │
└─────────────────────────────────────────────┘
```

**Principios del diseño:**
- El **calendario es la fuente de verdad** — muestra estado de cada día de un vistazo
- Click en día → drawer con detalle completo (reemplaza al drawer actual de grid y a la lista de bloqueos)
- Sin "Agregar bloqueo" suelto — la acción está en el drawer del día
- Summary cards opcionales/colapsables arriba del calendario

### Responsive

- **Desktop:** calendar + drawer (side panel)
- **Tablet:** calendar (compacto) + sheet (bottom)
- **Mobile:** calendar simplificado + bottom sheet

### Eliminar redundancia

- El drawer en `grid-profesionales` se elimina o se reemplaza con navegación directa al calendario del profesional
- La lista de bloqueos en `calendario-bloqueos` se elimina (el detalle está en el drawer del día)
- `summary-cards.tsx` puede ser colapsable o integrado al header

---

## Implementación plan (próxima sesión)

### Paso 1: Diagnosticar "+ Agregar bloqueo" bug (Prioridad 4)
- Revisar `bottom-sheet-bloqueo.tsx` — probar SheetTrigger con botón standalone fuera del DropdownMenu
- Arreglar trigger si es necesario

### Paso 2: Rediseñar mi-horario (Prioridad 1)
- Crear nuevo componente `horario-calendar-view.tsx` con calendario + drawer de día
- Integrar: calendario mensual con colores por estado del día
- Drawer de día: muestra estado, horas, citas, bloqueos, acciones
- Reemplazar vista actual de owner/admin (grid) por nueva vista calendar
- Mantener vista profesional simplificada
- Eliminar/archivar componentes redundantes

### Paso 3: Responsive (Prioridad 3)
- Calendar debe ser responsive (días más pequeños en mobile)
- Drawer → bottom sheet en mobile
- Probar en viewports 375px, 768px, 1440px

### Paso 4: Sync servicios vs horario (Prioridad 2)
- Revisar `updateServices`: cómo se almacena la duración
- Revisar `getAvailableSlots`: cómo calcula slots vs service duration
- Verificar que `createAppointment` valide contra schedule_exceptions
- Verificar que `fetchOcupacion` considere schedule_exceptions

### Paso 5: Investigación general (Prioridad 5)
- Documentar hallazgos adicionales según sea necesario

---

## Open questions para el diseñador/usuario

1. ¿Vista semanal (7 días) o mensual como default?
2. ¿Profesional debe ver solo su calendario o también el de otros?
3. ¿El "cerrar día" es una acción frecuente o solo ocasional? — Determina si merece botón destacado
4. ¿Preferís tabs o scroll para cambiar entre Today/Week/Month?
5. ¿Los summary cards (próximos bloqueos, activos, profesionales) son útiles o ruido?
6. ¿Color-blind friendly palette? (no asumir rojo/verde como único indicador)

---

## Referencias

- Interlinked booking exceptions: https://interlinked.vercel.app/
- Calendly: https://calendly.com/
- shadcn/ui Schedule: https://ui.shadcn.com/docs/components/data-table
- Square Appointments: https://squareup.com/us/en/appointments
