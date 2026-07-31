# Refactor V2 — Master Plan

> UI refactor completo del dashboard usando diseños Stitch. Paralelo V2: nunca tocar originales.

> **⚠️ Path base**: Todo el código del dashboard está en `dashboard/`. `lib/actions.ts` = `dashboard/lib/actions.ts`. `components/` = `dashboard/components/`. `app/` = `dashboard/app/`. Los paths en este doc asumen estar dentro de `dashboard/`.

## Golden Rules

1. **Nunca modificar originales** — cada V2 es un archivo nuevo al lado del original (ej: `week-viewV2.tsx` junto a `week-view.tsx`)
2. **No cambiar imports/rutas existentes** — las rutas actuales (`app/(dashboard)/agenda/page.tsx`) se quedan. Las V2 se montan en rutas paralelas o wraps hasta reemplazar.
3. **No añadir librerías** — solo lo que ya está en `package.json`: lucide-react, recharts, date-fns, sonner, class-variance-authority, tailwind-merge, shadcn/ui
4. **Feature-First** — `features/agenda/components/`, no `components/` plano
5. **Un componente por archivo** — named export. Si tiene sub-componentes, van en `features/agenda/components/parts/`
6. **Thin Components, Fat Server Actions** — los V2 NUNCA contienen lógica de negocio. Solo llaman server actions y renderizan. Validaciones, cálculos, reglas de negocio → todo en server actions o helper functions en `lib/`. **Esto aplica a TODOS los módulos, no solo Agenda.**
7. **Server actions existentes** — leer `lib/actions.ts` primero. No crear nuevas a menos que el módulo lo requiera explícitamente.
8. **No migración DB** — solo UI. Si el backend necesita cambio, documentar en el plan del módulo
9. **Leer antes de escribir** — cada módulo debe leer: frontend-reference.md (UX), stitch HTML (diseño), componentes existentes (implementación actual), server actions reales

### Anti-spaghetti (aplica siempre)

- **No duplicar lógica** — si una validación existe en backend, el frontend NO la repite. Llama a la server action y maneja el error.
- **No copiar código entre módulos** — si dos módulos necesitan lo mismo, crear un shared component o helper en `components/shared/`
- **No mezclar UI con lógica** — componentes solo renderizan. Server actions solo ejecutan reglas. Tipos solo definen contratos.
- **No inventar patrones** — seguir los patrones existentes del proyecto. Si el proyecto usa `date-fns` para fechas, no instalar `dayjs`

### Responsive — Mobile First

Los diseños Stitch son **desktop-first** (1440px+). Los V2 deben ser **mobile-first**: diseñar para móvil primero, expandir a desktop.

| Principio | Regla |
|-----------|-------|
| Mobile first | Construir en `sm:` (640px), luego expandir con `md:`, `lg:`, `xl:` |
| Touch targets | Mínimo 44×44px con 8px de gap entre interactivos |
| No `h-screen` | Usar `min-h-dvh` (evita jump en iOS Safari) |
| BottomNav mobile | Ya existe en el layout actual — mantener |
| Tablas responsive | En mobile: card list en vez de tabla, o scroll horizontal |
| Layout módulo | Una columna en mobile (`grid-cols-1`), expandir en desktop |
| Formularios | Campo completo en mobile, no colapsar labels |
| Sidebar | Ya es responsive (iconos fijos en desktop, BottomNav en mobile) |
| Tipografía fluida | Tailwind `text-sm`/`text-base` ya escala. No fijar px. |
| Container Queries | Tailwind v4 soporta `@container`. Usar para componentes reutilizables. |
| Hover | Solo en desktop. `hover:` no funciona en touch. No requerir hover para acciones críticas. |

**Mobile test**: cada módulo debe probarse a 375px (iPhone) antes de darse por terminado.

**Layout pattern por módulo:**

| Módulo | Desktop | Mobile |
|--------|---------|--------|
| Agenda | Tabla horas×días | Lista vertical de citas del día (scroll) |
| Clientes | Tabla con búsqueda y filtros | Cards apiladas con búsqueda |
| Caja | Split 60/40 (catálogo + carrito) | Catálogo arriba, carrito como sheet |
| Config | Formularios en grid 2 columnas | Formularios 1 columna |
| Dashboard | Grid 2×2 de métricas + charts | Cards apiladas, charts full-width |

## Stack Confirmado

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, RSC) |
| CSS | Tailwind v4 (CSS `@theme`, sin JS config) |
| Componentes | shadcn/ui `style: "base-nova"` |
| Iconos | lucide-react (NO Material Symbols) |
| Charts | recharts |
| Fechas | date-fns |
| Notificaciones | sonner (toast) |
| Fuente | Inter (via next/font) |
| DB | PostgreSQL 16 (solo lectura, no migrar) |
| Auth | next-auth v5 |
| Estado | Server Components + props. No Redux/Zustand |

## Diseño Objetivo: "Meyer Zero-Friction"

Diseño pastel/warm de Stitch. Fondo crema, naranja suave como primary, sombras ligeras.

### Paleta Pastel (Zero-Friction)

```css
/* Colores Zero-Friction — usar como valores hardcodeados en V2 */
--zf-surface: #ffffff;
--zf-surface-dim: #f9e6de;
--zf-surface-bright: #fff8f6;
--zf-surface-container-low: #fff1eb;
--zf-surface-container: #ffeae1;
--zf-surface-container-high: #fee3d8;
--zf-on-surface: #251913;
--zf-on-surface-variant: #5a4136;

--zf-primary: #9d4300;
--zf-primary-container: #f97316;
--zf-on-primary: #ffffff;
--zf-on-primary-container: #331400;

--zf-secondary: #6b5a4f;
--zf-secondary-container: #fbdbc9;
--zf-tertiary: #9334a7;
--zf-tertiary-container: #f4d7ff;

--zf-error: #ba1a1a;
--zf-error-container: #ffdad6;

--zf-background: #fff8f6;
--zf-on-background: #251913;

--zf-outline: #b7a094;
--zf-outline-variant: #f5ddd3;

--zf-success: #2e7d32;
--zf-warning: #e65100;

/* Sombras suaves estilo Material 3 */
--zf-shadow-card: 0 2px 8px rgba(0,0,0,0.06);
--zf-shadow-elevated: 0 4px 16px rgba(0,0,0,0.08);
--zf-shadow-modal: 0 8px 32px rgba(0,0,0,0.12);
```

### Radio de bordes (del stitch: 16px default)

```css
--zf-radius-sm: 0.5rem;   /* 8px */
--zf-radius-md: 0.75rem;  /* 12px */
--zf-radius-lg: 1rem;     /* 16px — default */
--zf-radius-xl: 1.5rem;   /* 24px */
--zf-radius-full: 9999px; /* pills */
```

> **Importante**: Usar valores hardcodeados en Tailwind (`bg-[#fff8f6]`), no variables CSS. Esto evita conflicto con el tema dark del layout actual (`className="dark"` en `<html>`).

### Tipografía

Inter (ya cargada via next/font). Jerarquía: Heading 1 (2rem/800), Heading 2 (1.5rem/700), Heading 3 (1.25rem/600), Body (0.875rem/400), Caption (0.75rem/400), Label (0.75rem/500, uppercase).

## Icon Mapping (Stitch → lucide-react)

Stitch usa Material Symbols. Traducir al lucide-react más cercano:

| Material Symbol | lucide-react |
|----------------|-------------|
| calendar_month | Calendar |
| add | Plus |
| search | Search |
| chevron_left | ChevronLeft |
| chevron_right | ChevronRight |
| close | X |
| menu | Menu |
| person | User |
| groups | Users |
| settings | Settings |
| edit | Pencil |
| delete | Trash2 |
| check | Check |
| arrow_back | ArrowLeft |
| arrow_forward | ArrowRight |
| more_vert | MoreVertical |
| notifications | Bell |
| home | Home |
| inventory_2 | Package |
| payments | CreditCard |
| receipt_long | Receipt |
| schedule | Clock |
| today | CalendarDays |
| view_week | CalendarRange |
| bar_chart | BarChart3 |
| trending_up | TrendingUp |
| filter_alt | Filter |
| download | Download |
| print | Printer |
| share | Share2 |
| save | Save |
| warning | AlertTriangle |
| error | AlertCircle |
| info | Info |
| done_all | CheckCheck |
| cancel | Ban |
| refresh | RefreshCw |
| search_off | SearchX |
| visibility | Eye |
| visibility_off | EyeOff |
| phone | Phone |
| email | Mail |
| location_on | MapPin |
| attach_money | DollarSign |
| sell | Tag |
| category | Layers |
| qr_code | QrCode |
| scanner | Scan |
| camera_alt | Camera |
| image | Image |
| description | FileText |
| picture_as_pdf | File |
| arrow_drop_down | ChevronDown |
| arrow_drop_up | ChevronUp |
| done | CheckCircle2 |
| pending | Hourglass |
| hourglass_empty | Timer |
| payments | Wallet |
| calculator | Calculator |
| percentage | Percent |
| trending_flat | Minus |
| drag_handle | GripVertical |
| swap_vert | ArrowUpDown |
| unfold_more | ChevronsUpDown |
| radio_button_unchecked | Circle |
| radio_button_checked | CircleDot |
| check_box_outline_blank | Square |
| check_box | CheckSquare |
| star | Star |
| star_border | Star |

> Para encontrar un mapping no listado: busca `lucide-react` en npm. Usa `import { IconName } from "lucide-react"`.

## Estructura de Carpetas V2

```
dashboard/
├── features/
│   ├── agenda/
│   │   ├── components/
│   │   │   ├── week-viewV2.tsx
│   │   │   ├── new-appointment-sheetV2.tsx
│   │   │   ├── edit-appointment-modalV2.tsx
│   │   │   ├── appointment-detail-drawerV2.tsx
│   │   │   ├── event-info-modalV2.tsx
│   │   │   └── parts/
│   │   │       ├── calendar-headerV2.tsx
│   │   │       └── calendar-cellsV2.tsx
│   │   └── index.ts (re-export)
│   ├── clients/
│   │   ├── components/
│   │   │   ├── client-tableV2.tsx
│   │   │   ├── client-detail-drawerV2.tsx
│   │   │   └── parts/
│   │   │       ├── client-historyV2.tsx
│   │   │       └── client-formV2.tsx
│   │   └── index.ts
│   ├── caja/
│   ├── config-business/
│   ├── config-services/
│   ├── config-team/
│   ├── config-schedule/
│   ├── config-payments/
│   ├── config-audit/
│   ├── inventory/
│   ├── dashboard-home/
│   └── equipo-roles/
├── components/shared/     ← Componentes compartidos entre features
│   ├── page-shellV2.tsx   ← Layout de página con header+subtítulo+acciones
│   ├── stat-cardV2.tsx    ← Tarjeta de estadística
│   ├── empty-stateV2.tsx  ← Estado vacío estilizado
│   ├── search-inputV2.tsx ← Input de búsqueda con icono
│   ├── badgeV2.tsx        ← Badge de estado
│   ├── modalV2.tsx        ← Modal base reutilizable
│   ├── drawerV2.tsx       ← Drawer base reutilizable
│   └── sheetV2.tsx        ← Sheet base reutilizable
├── lib/
│   ├── utils.ts           ← cn() de tailwind-merge
│   ├── actions.ts         ← Server actions (no modificar)
│   └── types.ts           ← Tipos compartidos
└── app/(dashboard)/
    ├── agenda/
    │   └── page.tsx       ← Original — puede importar V2
    ├── clientes/
    └── ...
```

## Cómo Leer los Stitch Exports

Los diseños están en `stitch_export/stitch_agenda_weekly_calendar_view/`. Cada módulo tiene:
- `*.html` — diseño exacto con CSS inline y Material Symbols
- `*.png` — screenshot del diseño
- `DESIGN.md` — tokens de diseño (color, tipografía, spacing)

**Flujo para cada componente:**
1. Abrir el `.html` en el navegador o leer su estructura
2. Ver el screenshot `.png` para entender el layout
3. Leer `DESIGN.md` para colores exactos
4. Traducir Material Symbols a lucide-react (ver tabla arriba)
5. Implementar con Tailwind v4 usando los grooming tokens

## Módulos — Orden de Implementación

| # | Módulo | Diseños | Depende de | Archivo Plan | Estado |
|---|--------|---------|-----------|-------------|--------|
| 0 | Shared Components | (base) | Nada | INDEX.md | ✅ Fase 0 |
| 1 | Config: Perfil Negocio | 2 HTML | Nada | `04-config-perfil.md` | ✅ Fase 1 |
| 2 | Config: Servicios | 2 HTML | Nada | `05-config-servicios.md` | ✅ Fase 1 |
| 3 | Config: Métodos Pago | 1 HTML | Nada | `08-config-pagos.md` | ✅ Fase 1 |
| 4 | Config: Equipo | 1 HTML | Nada | `06-config-equipo.md` | ✅ Fase 2 |
| 5 | Config: Auditoría | 1 HTML | Nada | `09-config-auditoria.md` | ✅ Fase 2 |
| 6 | **Config: Horarios** | 2 HTML | Equipo | `07-config-horarios.md` | ✅ Fase 3 |
| 7 | **Agenda** ★ | 5 HTML | Servicios, Equipo, Horarios | `01-agenda.md` | ✅ Fase 4 |
| 8 | **Clientes** | 2 HTML | Agenda (historial) | `02-clientes.md` | ✅ Fase 5 |
| 9 | **Inventario** | 1 HTML | ⚠️ backend gap | `10-inventario.md` | ✅ Fase 8 |
| 10 | **Caja/POS** ★ | 2 HTML | Servicios, Clientes, Inventario, Pagos | `03-caja.md` | ✅ Fase 9 |
| 11 | Dashboard Home | 2 HTML | Todos (datos agregados) | `11-dashboard.md` | ✅ Fase 7 |
| 12 | Equipo Roles Modals | 1 HTML | Equipo | `12-equipo-roles.md` | ✅ Fase 6 |

> **Orden sugerido**: 0 → 1→2→3→4→5 (paralelo) → 6 → 7 → 8 → 12 → 11 → 9 → 10
> **Avance actual**: ¡12/12 módulos completados (100%)! ✅
>
> **Cambio de orden**: Los módulos 12, 11 y 9 se adelantaron por no tener backend gaps. Caja/POS (10) se implementó como versión demo visual (sin persistencia de transacciones).
>
> Los módulos 1-5 no tienen dependencias entre sí — se pueden hacer en paralelo.
>
> **Nota**: Agenda (7) depende de Horarios (6) solo a nivel DATOS (server actions existentes: `getBloqueos`, `getProfessionalSchedule`, `getAvailableSlots`). La UI de Horarios puede implementarse después — Agenda necesita los datos del backend, no la UI de configuración.

## ADVERTENCIA: Hallazgos de Auditoría de Código

### 1. Tema: Dark actual vs Light diseño

El dashboard actual es **dark-only** — `app/layout.tsx` línea 24 forza `className="dark"`. Los diseños Stitch son **light/warm**.

**Estrategia**: Las V2 ignoran el tema global y usan clases CSS inline con los grooming tokens. Esto evita tocar `globals.css` o el layout. Se puede hacer un theme toggle después.

### 2. Duplicación WeekView (bug existente)

Hay **2 implementaciones** del calendario semanal:
- `components/week-view.tsx` — usado en `app/(dashboard)/dashboard/semana/page.tsx`
- `app/(dashboard)/semana/SemanaClient.tsx` — copia duplicada con su propio render (sin usar WeekView)

**V2 debe consolidar esto**: crear `features/agenda/components/week-viewV2.tsx` que reemplace AMBAS.

### 3. Server Actions Reales

Los nombres reales en `lib/actions.ts` DIFIEREN de los asumidos en los plan docs:

| Plan asumía | Real | Dónde |
|------------|------|-------|
| `getAppointments()` | `getWeekAppointments()` | `lib/appointments.ts` |
| `createAppointment(JSON)` | `createAppointment(FormData)` | `lib/actions.ts` |
| `getServices()` | `updateServices()` (solo update masivo) | `lib/actions.ts` |
| `getServiceList()` | Leer `lib/services.ts` → `ServiceRow` | `lib/services.ts` |
| `getClients()` | `getClientes(search?)` | `lib/actions.ts` |
| `getClientHistory()` | `getClienteHistorial()` | `lib/actions.ts` |
| `getTeamMembers()` | `getEquipo()` | `lib/actions.ts` |
| `getPaymentMethods()` | **NO EXISTE** | — |
| `getProducts()` | **NO EXISTE** | — |
| `createSale()` | **NO EXISTE** | — |
| `getAuditLogs()` | Usar `AuditLogFilters` de `lib/audit-types.ts` | `lib/audit-types.ts` |

> **Regla**: Antes de implementar un módulo, leer los archivos de `lib/` para confirmar las server actions. No asumir nombres.

### 4. Backend Gaps (requieren acceso VPS)

Estos módulos NO tienen backend y necesitarán crear nuevas server actions:

| Módulo | Server Actions Faltantes | Prioridad |
|--------|------------------------|-----------|
| Inventario | `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()` | Alta |
| Caja/POS | `createSale()`, `getSales()` | Alta |
| Dashboard Home | `getPayrollData()`, `getCommissionData()` | Media |
>
> **Actualizado Jul 30**: Config: Pagos resuelto — `getPaymentMethods()`, `togglePaymentMethod()` ya existen en `features/config-payments/actionsV2.ts`.

### 5. Tipos Existentes

No hay `lib/types.ts`. Los tipos están dispersos:
- `lib/appointments.ts` → `Appointment`, `WeekAppointment`, `TodayStats`
- `lib/services.ts` → `ServiceRow`, `ServiceInput`
- `lib/audit-types.ts` → `AuditLogEntry`, `AuditLogFilters`
- `lib/actions.ts` → `Cliente`, `ClienteHistorialItem`, `MiembroEquipo`, `MetricasData`, `ScheduleData`

### 6. Rutas Reales

| Ruta | Componente Actual |
|------|------------------|
| `app/(dashboard)/dashboard/semana/` | `page.tsx` usa `WeekView` de `components/week-view` |
| `app/(dashboard)/dashboard/page.tsx` | Dashboard home |
| `app/(dashboard)/dashboard/configuracion/` | Settings: horario, servicios |
| `app/(dashboard)/dashboard/clientes/` | CRM clientes |
| `app/(dashboard)/dashboard/equipo/` | Team management |
| `app/(dashboard)/dashboard/auditoria/` | Audit log |
| `app/(dashboard)/dashboard/metricas/` | Analytics |

## Sobre V2: ¿Duplica carpetas?

Sí, temporalmente. La estructura queda así:

```
components/week-view.tsx           ← ORIGINAL (no tocar)
features/agenda/components/        ← V2 (nuevo)
  week-viewV2.tsx                  ← Reemplazo futuro
```

**No es el doble de documentos**. Los V2 son archivos nuevos en una carpeta paralela (`features/`). Los originales (`components/`) se quedan intactos hasta la Fase 4 (eliminación).

Cuando se migra una página, el import cambia:
```tsx
// Antes
import { WeekView } from "@/components/week-view";

// Después
import { WeekView } from "@/features/agenda/components/week-viewV2";
```

El plan de migración Fase 2→3→4 elimina los originales y renombra los V2. No es permanente.

## QA Checklist (por módulo)

- [ ] Componente renderiza sin errores
- [ ] Coincide visualmente con el screenshot stitch
- [ ] Server action se llama correctamente (si aplica)
- [ ] **No hay lógica de negocio en el componente** — solo llama server actions
- [ ] **No código copiado de otro módulo** — extraer a shared component si se repite
- [ ] **Responsive**: funciona en 375px sin scroll horizontal ni texto cortado
- [ ] **Touch targets**: botones/links ≥ 44×44px en mobile
- [ ] **Estados**: loading → data → empty → error
- [ ] Diseño responsive (mobile first)
- [ ] No rompe ningún import existente
- [ ] No hay Material Symbols — todos traducidos a lucide-react

## Features sin diseño Stitch — ¿Qué hacer?

No todos los features del dashboard actual tienen un diseño correspondiente en Stitch. La regla:

1. **Prioridad**: rebuildear V2 solo los 12 módulos con diseño (tabla de orden)
2. **Después de Fase 1-12**: auditar los features restantes sin diseño:
   - Si **tiene valor real** → skinear con variables `--zf-*` (cambiar el theme del layout, no rebuild)
   - Si **está obsoleto o reemplazado** por un V2 → deprecar y eliminar
3. **Nunca rebuildear sin diseño** — es crear deuda técnica. Sin diseño, no hay V2.

Los features sin diseño heredan las `--zf-*` classes en su contenedor principal para integración visual, sin tocar su lógica interna. Esto aplica a: mi horario, sidebar, topbar, y cualquier módulo no listado en la tabla de orden.

## Migración a Producción

1. **Fase 1** — Crear todos los V2 en `features/`. Las rutas originales no cambian.
2. **Fase 2** — Por cada página, cambiar el import en `app/(dashboard)/[module]/page.tsx` para usar el V2.
3. **Fase 2.5** — Probar en VPS (staging, puerto 3001). Verificar datos reales con el nuevo tema. Probar webhooks n8n no rotos.
4. **Fase 3** — Cuando todo funciona en staging: eliminar archivos originales de `components/` y renombrar V2s (quitar sufijo `V2`).
5. **Fase 4** — Deploy a producción. Monitorear webhooks n8n por 24h.

## Patrones V2 — Aprendidos de Agenda (Módulo 7)

> Aplicar estos patrones en todos los módulos siguientes. Extraídos de la implementación real.

### Server Action Wrapper (forma canónica)

```typescript
"use server"
import { auth } from "@/auth"

export async function xyzV2(businessId: number, ...args) {
  const session = await auth()
  if (!session) return { error: "No autenticado", data: DEFAULT }
  if (session.user.businessId !== businessId) return { error: "No autorizado", data: DEFAULT }

  try {
    const result = await existingLibFunction(businessId, ...args)
    return { data: result }
  } catch {
    return { error: "Error descriptivo", data: DEFAULT }
  }
}
```

**Reglas:**
- Siempre `businessId` como primer param. Verificar ownership vs session.
- Siempre try/catch con error descriptivo + default value del dato.
- Retorno con discriminante: `{ appointments: [] }` + `error` opcional para queries. `{ ok: true } | { error: string }` para mutaciones.
- Wrappear funciones de `lib/`, nunca llamar `pool.query()` directamente desde feature/.
- Nunca `as unknown as`. Usar tipo exacto del return.

### Estructura de feature

```
features/{modulo}/
├── actionsV2.ts          ← Server action wrappers con auth
├── constants.ts           ← DAYS_FULL, MONTHS_ES, STATUS_BADGE, MOTIVOS_BLOQUEO
└── components/
    ├── main-componentV2.tsx
    ├── secondary-componentV2.tsx
    └── tertiary-componentV2.tsx
```

### Componente canónico (5 estados)

```typescript
"use client"
// 1. Imports: react, actionsV2, constants, lucide-react, shared components
// 2. Props: interface (no type)
// 3. Constants module-level
// 4. Component: useState(loading, error, data) → useEffect(loadData) → render por estado

export function MyFeatureV2({ businessId }: Props) {
  // State: loading, error, data, UI state (modalOpen, selectedItem, etc.)
  // loadData with useCallback([businessId, ...filters])
  // useEffect → loadData()  [eslint-disable set-state-in-effect]
  // if (loading) return <Skeleton />
  // if (error) return <ErrorState onRetry={loadData} />
  // if (data.length === 0) return <EmptyState />
  // return <DataView />
}
```

### Colores

| Contexto | Usar |
|----------|------|
| Layout (bg, text, border) | `zf-*` CSS variables via Tailwind: `bg-zf-surface`, `text-zf-text`, `border-zf-border/50` |
| Status badges | STATUS_BADGE hardcodeado de `constants.ts` (Stitch palette) |
| Botones primarios | `bg-zf-primary text-white` |
| Botones secundarios | `border border-zf-border text-zf-text-secondary` |
| Errores | `bg-zf-error-bg text-zf-error-text` |
| Success | `bg-zf-success-bg text-zf-success-text` |
| Skeletons | `bg-zf-border/30 animate-pulse` o `bg-zf-border/20 animate-pulse` |

### Mobile/Desktop

| Desktop | Mobile (375px) |
|---------|---------------|
| Grid/table multi-columna | Card list vertical |
| Drawer lateral (max-w-sm) | Drawer full-width |
| Modal centrado (max-w-md) | Modal centrado (mismo) |
| Tablas con `overflow-x-auto` | Scroll horizontal si no cabe |

### Interactividad

- Todos los botones: `active:scale-[0.97]` (Emil Kowalski)
- Hover: `transition-all hover:opacity-90` o `hover:bg-zf-accent-bg`
- Disabled: `disabled:opacity-50`
- Loading: reemplazar texto con `<Loader2 className="h-4 w-4 animate-spin" />`

### Anti-patrones (NO hacer)

| ❌ | ✅ |
|----|----|
| `fetch("/api/...")` en componentes | Server action wrapper |
| Lógica de negocio en TSX (validaciones, cálculos) | Server action en `lib/` o `actionsV2.ts` |
| `as unknown as` en returns | Tipo exacto del return |
| Duplicar `formatHora`, `DAYS_FULL`, `STATUS_BADGE` | Importar de `constants.ts` o `lib/utils.ts` |
| `"use server"` en componente | Separar server actions en `actionsV2.ts` |
| Props con `type` | Props con `interface` |
| `any` | Tipo concreto o discriminated union |
| Hardcodear colores de layout | `zf-*` CSS variables |
| Crear server action nueva si ya existe en `lib/` | Wrappear con auth en `actionsV2.ts` |

### Type safety

- Server action returns: `"error" in result` para discriminated unions
- Tipos importados de `lib/*` y re-exportados de `actionsV2.ts`: `export type { WeekAppointment, ServiceRow, Cliente }`
- Props: `interface Props { ... }` (nunca `type Props = { ... }`)
- Estado de drawer/modal: `useState<T | null>(null)`

### Shared components (ya existen)

| Componente | Import | Para |
|-----------|--------|------|
| `ModalV2` | `@/components/shared/modalV2` | Modales centrados |
| `DrawerV2` | `@/components/shared/drawerV2` | Paneles laterales derecho |
| `SheetV2` | `@/components/shared/sheetV2` | Bottom sheets mobile |
| `PageShellV2` | `@/components/shared/page-shellV2` | Layout de página con header |
| `EmptyStateV2` | `@/components/shared/empty-stateV2` | Estado vacío |
| `SearchInputV2` | `@/components/shared/search-inputV2` | Input de búsqueda |
| `BadgeV2` | `@/components/shared/badgeV2` | Badges de estado |
| `StatCardV2` | `@/components/shared/stat-cardV2` | Tarjetas de estadística |

### Verificación antes de cerrar

```bash
cd dashboard && npx tsc --noEmit          # 0 errores
cd dashboard && npx eslint features/{modulo}/ --ext .ts,.tsx  # 0 warnings, 0 errors
```

## Errores Conocidos (The Ratchet)

De `docs/harness/RULES.md`:
- No confiar en nombres de DB en n8n — verificar siempre
- Next.js 16 App Router: no usar `cookies()` en Server Actions
- PostgreSQL: `count(*)` no requiere `group by`
- Las URLs de webhook en n8n workflow tool cambian al renombrar

## Referencias Clave

| Documento | Propósito |
|-----------|-----------|
| `docs/frontend-reference.md` | UX contracts, schemas, recomendaciones (1073 líneas) |
| `docs/backend-reference.md` | Schema DB, server actions, reglas negocio |
| `docs/sessions/HANDOFF.md` | Estado actual de la sesión, bugs, prioridad |
| `docs/harness/MEMORY.md` | Memoria acumulada entre sesiones |
| `docs/harness/RULES.md` | Reglas permanentes del proyecto |
| `stitch_export/` | Diseños HTML + screenshots + DESIGN.md |