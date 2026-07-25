# Dashboard: Mi Horario + Configuración — Design Spec (Refinado)

## Alcance

Refinamiento del diseño de `/dashboard/mi-horario` y `/dashboard/configuracion` acordado el 2026-07-25. Reemplaza secciones del spec `2026-07-22-dashboard-fixes-design.md` con decisiones refinadas.

---

## 0. Investigación — Benchmarking vs sistemas reales

Antes de refinar el diseño, se investigaron sistemas existentes (Setora, Ensar, Acuity, shadcn Leave Tracker, HR dashboards, BellaBooking, Barbercore, Mangomint) para validar y corregir el plan original.

### Lo que el plan original ya tenía bien ✅

| Aspecto | Plan original | Benchmarking |
|---------|--------------|--------------|
| Horario recurrente + excepciones juntos | Sí — misma página (/dashboard/mi-horario) | Todos lo hacen así (Setora, Ensar, Acuity) |
| Calendario mensual con colores | Sí — CalendarioExcepciones (🔴 cerrado, 🟡 esp.) | Coincide con shadcn Leave Tracker, HR dashboards |
| Modal para crear excepción | Sí | Coincide — pero en mobile usan bottom sheet |
| Sidebar con "Mi horario" | Sí, para todos los roles | Coincide |

### Lo que el plan original NO resolvía ❌

| Aspecto | Plan original | Lo que se vio en el benchmarking |
|---------|--------------|----------------------------------|
| Professionals en Configuración | Solo horario recurrente del negocio + lista de profesionales con su schedule | Nadie separa schedule de exceptions. Owner debería ver exceptions de cada profesional |
| Responsive | Solo grid-cols-1 lg:grid-cols-2 | Mínimo. Debería usar bottom sheet en mobile, no modal |
| Navegación de meses | Solo mes actual (hardcodeado) | Debería permitir navegar meses |
| Dashboard overview | No tiene | Los HR dashboards tienen cards con métricas arriba (pendientes, próximos bloqueos) |
| Bloqueos multi-profesional | createBloqueo no soporta owner viendo/creando bloqueos de un profesional específico | Ensar y otros: el owner puede bloquear días para profesionales específicos desde el mismo panel |

### Decisiones derivadas del benchmarking

1. **Layout 2-column** (horario recurrente + calendario excepciones) se mantiene — validado por Setora, Ensar, Acuity
2. **Bottom Sheet en mobile** en vez de modal centrado — validado por patrones mobile-first
3. **Navegación de meses** en el calendario de excepciones
4. **Cards de resumen** arriba (próximos bloqueos, días libres esta semana, bloqueos activos)
5. **Owner puede crear bloqueos para profesionales** desde el grid de mi-horario, no solo desde Configuración
6. **Configuración se simplifica** a solo servicios — schedules migran a mi-horario
7. **Servicios pasan a Data Table + Sheet drawer** con duración como campo nuevo

---

## 1. Sidebar — Navegación

| Rol | Sidebar |
|-----|---------|
| **Profesional** | Inicio, Agenda, Métricas, Clientes, **Mi horario** (Clock), Ayuda |
| **Admin** | + Configuración (Settings), Auditoría |
| **Owner** | + Equipo (UserCog) |

- "Mi horario" (ícono Clock) → accesible para TODOS los roles
- "Configuración" (Settings) → solo owner/admin (servicios + info negocio)
- Dueño/admin ven grid con todos los profesionales en mi-horario
- Profesional ve solo su propio horario + excepciones en mi-horario

---

## 2. `/dashboard/mi-horario` — Página unificada

### Profesional (vista individual)
```
┌─── HORARIO RECURRENTE (left) ───┐  ┌─── CALENDARIO EXCEPCIONES (right) ───┐
│ Día       | Abre | Cierra        │  │  📅 Mes actual                        │
│ ☑ Lunes   |  9   |  18          │  │  [◀]               [▶]                │
│ ☑ Martes  |  9   |  18          │  │  ┌──┬──┬──┬──┬──┬──┬──┐              │
│ ☐ Miércoles|  —  |  —           │  │  │  │  │  │🔴│  │  │  │              │
│ ...                               │  │  └──┴──┴──┴──┴──┴──┴──┘              │
│ [Guardar horario]                │  │  Lista bloqueos abajo                  │
└──────────────────────────────────┘  │  [+ Agregar bloqueo]                  │
                                       └──────────────────────────────────────┘
```
- Click en "+" o en día del calendario → Bottom Sheet para crear/editar bloqueo

### Owner/Admin (grid de todos)
```
┌─── CARDS RESUMEN ─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │Próx bloqueos│ │Días libres│ │Bloqueos  │ │Tasa      │             │
│ │      3    │ │   esta sem │ │ activos  │ │ocupación │             │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PROFESIONALES                    LUN  MAR  MIE  JUE  VIE  SAB  │
│  Juan Pérez       09:00-18:00    [🔴] [🔴] [🔴] [🔴] [🔴] [🔴] │
│  María López      10:00-20:00    [🔴] [🔴] [🔴] [🔴] [🔴] [🔴] │
│  Carlos Ruiz      08:00-17:00    [🔴] [🔴] [🔴] [🔴] [🔴] [🔴] │
└──────────────────────────────────────────────────────────────────┘
```
- **Fila** = profesional (nombre + horario base)
- **Columna** = día de la semana
- **Celda** = bloque horario del profesional ese día
- Click en nombre → **Drawer** con horario recurrente + excepciones de ese profesional
- Click en celda → **Menú inline**: Editar hora / Agregar bloqueo / Cerrar día
- Al crear bloqueo desde una celda: **advertir si hay turnos agendados** en esa fecha para ese profesional
- **"Cerrar día"** → bloquea el día para todos los profesionales (feriados, cierres generales)

### Mobile (<768px)
- Grid → cards apilados por profesional
- Modal de crear bloqueo → Bottom Sheet
- Sidebar → overlay colapsable

---

## 3. `/dashboard/configuracion` — Simplificado

Solo owner/admin. Sin horarios de profesionales.

```
┌─── SERVICIOS ─────────────────────────────────────────────────┐
│                                                  [+ Agregar]  │
│ ┌──────────┬───────┬──────────┬──────────┐                   │
│ │ Servicio │ Precio│ Duración │ Acciones │                   │
│ ├──────────┼───────┼──────────┼──────────┤                   │
│ │ Corte    │ $25K  │ 45 min   │ [✏️][🗑️] │                   │
│ │ Barba    │ $15K  │ 30 min   │ [✏️][🗑️] │                   │
│ │ Corte+Bar│ $35K  │ 60 min   │ [✏️][🗑️] │                   │
│ └──────────┴───────┴──────────┴──────────┘                   │
└──────────────────────────────────────────────────────────────┘
```
- Click en "+ Agregar" o "✏️" → **Sheet (drawer)**:
  ```
  ┌──────────────────┐
  │ Nuevo servicio   │
  │                  │
  │ Nombre: [____]   │
  │ Precio: [____]   │
  │ Duración: [____] │
  │                  │
  │ [Cancelar] [Guardar] │
  └──────────────────┘
  ```
- Sheet en desktop: lateral derecho. En mobile: bottom sheet
- Eliminar: **Confirm dialog** antes de borrar
- El formato `services_text` (legacy) se genera automáticamente al guardar

### Lo que SALE de configuración
- Horario del negocio (`HorarioClient`)
- Horarios por profesional (`ProfessionalScheduleList`)
- → Todo eso pasa a `/dashboard/mi-horario`

---

## 4. Lo que cambia del spec anterior (2026-07-22)

| Aspecto | Spec anterior | Refinado |
|---------|--------------|----------|
| Owner/admin view | Solo lista de profesionales con schedule | Grid tipo BellaBooking: filas=profesionales, columnas=días. Click en celda → inline |
| Modal en mobile | Modal centrado | Bottom Sheet (shadcn Sheet con side="bottom") |
| Calendario excepciones | Solo mes actual sin navegación | Navegación next/prev entre meses |
| Owner bloqueos por profesional | No soportado desde Configuración | Desde grid en mi-horario: click en celda → agregar bloqueo |
| Summary cards | No tiene | Cards arriba: próximos bloqueos, días libres, bloqueos activos |
| Conflict warnings | No tiene | Al crear bloqueo, advertir si hay turnos en esa fecha |
| Bulk actions | No tiene | "Cerrar día" para todos los profesionales |
| Configuración | Servicios + Horario + Horarios x prof | Solo Servicios + info del negocio |
| Servicios editor | Editor por filas simple | Data Table + Sheet drawer para crear/editar |
| Duración en servicios | No incluida | Nuevo campo: Duración (minutos) |

---

## 5. Archivos a crear/modificar

### Nuevos
- `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx` — página server component
- `dashboard/components/horario/mi-horario-client.tsx` — orquestador cliente
- `dashboard/components/horario/grid-profesionales.tsx` — grid owner/admin
- `dashboard/components/horario/horario-recurrente.tsx` — editor horario semanal
- `dashboard/components/horario/calendario-bloqueos.tsx` — calendario + lista bloqueos
- `dashboard/components/horario/bottom-sheet-bloqueo.tsx` — crear/editar bloqueo
- `dashboard/components/horario/summary-cards.tsx` — cards resumen
- `dashboard/components/configuracion/servicios-table.tsx` — reemplaza servicios-client.tsx

### Modificar
- `dashboard/components/sidebar.tsx` — agregar "Mi horario" + Clock icon
- `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx` — quitar HorarioClient + ProfessionalScheduleList
- `dashboard/components/configuracion/servicios-client.tsx` — reemplazar con data table + sheet

### Eliminar de configuración
- Sección "Horarios" (HorarioClient)
- Sección "Horarios por profesional" (ProfessionalScheduleList)
