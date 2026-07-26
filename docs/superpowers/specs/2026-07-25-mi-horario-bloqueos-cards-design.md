# Mi Horario — Side-by-side layout + Bloqueos Cards

## Objetivo
Reducir el tamaño del calendario en desktop y agregar una lista visual de bloqueos siempre visible (sin depender del Sheet).

## Stack
Next.js 16 · Tailwind CSS · shadcn/ui Sheet

## Layout

### Desktop (≥1024px) — Side-by-side
```
┌─────────────────────────────────────────────────────┐
│  [Select profesional]                               │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  CALENDARIO       │  │  BLOQUEOS · Julio 2026  │ │
│  │  max-w-[380px]    │  │  [Lista][Grid] toggle   │ │
│  │                   │  │                          │ │
│  │  ◀ Julio 2026 ▶   │  │  ┌────────────────────┐  │ │
│  │  Do Lu Ma Mi Ju   │  │  │ 12 Dom Cerrado     │  │ │
│  │  Vi Sa            │  │  │         Día completo│  │ │
│  │  ┌──┬──┬──┬──┐   │  │  └────────────────────┘  │ │
│  │  │  │  │  │ 1│   │  │  ┌────────────────────┐  │ │
│  │  ├──┼──┼──┼──┤   │  │  │ 13 Lun Esp.        │  │ │
│  │  │ 5│ 6│ 7│ 8│   │  │  │    14:00-18:00 ·   │  │ │
│  │  ├──┼──┼──┼──┤   │  │  │    Capacitación    │  │ │
│  │  │12●│13●│14│15●│  │  │  └────────────────────┘  │ │
│  │  └──┴──┴──┴──┘   │  │  ... scroll si hay más    │ │
│  │  ● Cerrado ● Esp.│  │                          │ │
│  │  [Editar horario] │  │  5 bloqueos en julio     │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Mobile (<768px) — Stacked
- Calendario igual que hoy (sin max-w, ocupa todo el ancho)
- Cards de bloqueos debajo del calendario, con scroll
- Sheet sigue existiendo para crear/editar bloqueos al clickear un día

## Componentes

### 1. `calendar-view.tsx` (existe)
- Cambios: sin cambios funcionales, solo CSS
- El contenedor padre le asigna `max-w-[380px]` en desktop

### 2. `bloqueos-list.tsx` (nuevo)
Lista de cards de bloqueos para el mes actual, filtrada por profesional seleccionado.

**Card — diseño:**
```
┌──────────────────────────────────────────────┐
│  [12]  Dom, 12 jul  [Cerrado]          [🗑️] │
│        Día completo                           │
└──────────────────────────────────────────────┘
```
- Borde izquierdo de 3px: `#ef4444` para cerrado, `#f59e0b` para horario_especial
- Número del día en círculo con bg tonal
- Badge de tipo
- Motivo si existe
- Botón de eliminar

**Toggle Lista/Grid:**
- **Lista** (default): cards apiladas verticalmente
- **Grid:** cards en `grid-cols-2` (solo en desktop)

### 3. `mi-horario-client.tsx` (modificar)
- Wrapper flex en desktop: calendario (max-w-[380px]) + cards panel (flex-1)
- En mobile: stacked como hoy
- Pasar filteredBloqueos al nuevo componente
- El Sheet se mantiene solo para crear/editar al clickear un día

## Responsive
| Breakpoint | Layout |
|------------|--------|
| <768px (mobile) | Stacked: calendario full width, cards debajo, Sheet bottom |
| 768-1023px (tablet) | Stacked: calendario max-w 380px centrado, cards debajo |
| ≥1024px (desktop) | Side-by-side: calendario max-w 380px + cards panel |

## Archivos a modificar/crear
| Archivo | Acción |
|---------|--------|
| `components/horario/bloqueos-list.tsx` | Crear — componente de lista de cards |
| `components/horario/mi-horario-client.tsx` | Modificar — agregar layout side-by-side + integrar bloqueos-list |
| `components/horario/calendar-view.tsx` | Sin cambios (solo CSS via contenedor) |
| `components/horario/day-detail-sheet.tsx` | Sin cambios |

## No incluido (fuera de alcance)
- Paginación de bloqueos (solo mes actual)
- Edición inline de cards (solo eliminar, crear va por Sheet)
- Ordenamiento o filtros adicionales
- Exportación
