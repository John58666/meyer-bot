# Auditoría Arquitectónica — Dashboard Frontend

> **Fecha:** Julio 2026
> **Alcance:** `/dashboard/` — Next.js 16 App Router + PostgreSQL 16
> **Método:** Análisis estático de código + investigación web de patrones industria (Next.js SaaS, Fresha, AgendaPro)
> **Contexto:** El proyecto creció rápido (MVP → producción). Ingeniero externo advirtió que "si no se organiza, el SaaS se cae". Este documento cataloga todos los hallazgos.

---

## Resumen Ejecutivo

**22 issues encontrados.** 5 críticos, 6 altos, 7 medios, 4 bajos.

Los 5 críticos comparten una causa raíz: **el proyecto no tuvo una fase de arquitectura.** Creció por acumulación. El resultado: un archivo de 2,138 líneas que es a la vez controlador, servicio y acceso a datos; cero boundaries; lógica duplicada en 3 lugares distintos; y sin validación runtime de nada que venga de la DB.

La prioridad #1 no es introducir patrones nuevos. Es **partir `actions.ts`** sin cambiar su comportamiento. Eso solo ya elimina el riesgo de falla catastrófica. Todo lo demás puede hacerse incremental.

---

## 🔴 CRÍTICO (5) — Causa Falla en Producción

### C1. `actions.ts` — Monolito de 2,138 líneas

**Archivo:** `dashboard/lib/actions.ts`

**Contiene — sin separación alguna:**
- CRUD de citas (createAppointment, updateAppointmentStatus, rescheduleAppointment, deleteAppointment)
- CRUD de servicios (createService, updateService, toggleServiceActive, deleteService, updateServices, updateServicesText, getServices, getAllServices)
- CRUD de equipo (createMiembroEquipo, updateMiembroEquipo, desactivarMiembroEquipo)
- CRUD de horarios (updateScheduleText, updateProfessionalSchedule, deleteProfessionalSchedule, getProfessionalSchedule, getAllProfessionalSchedules)
- CRUD de bloqueos (createBloqueo, updateBloqueo, deleteBloqueo)
- CRUD de clientes (getClientes, searchClientes, getHistorialCliente, upsertCliente)
- Métricas completas (getMetricas 176 líneas, getMetricasDrawer 227 líneas — inline caching, sparklines, drawer switching por if/else)
- Generación de slots (getAvailableSlots)
- Dashboard data (getMiHorarioData)
- Conflict checking inline
- WhatsApp notifications
- Revalidation paths

**Riesgo:** Un error de sintaxis en una función de métricas puede romper `createAppointment`. Un cambio en el import de `pool` puede tumbar todo el archivo. No se puede testear nada de forma aislada.

**Frecuencia de cambio:** Prácticamente cada feature toca este archivo. Es el cuello de botella de todo el equipo.

### C2. `pool.query()` directo en páginas — Sin abstracción

**Archivos:**
- `app/(dashboard)/dashboard/configuracion/page.tsx:17-20` — query directa a `businesses`
- `app/(dashboard)/dashboard/auditoria/page.tsx:42-48` — query directa a audit_log

**Riesgo:** Cambiar el schema de la DB (ej. renombrar columna) rompe páginas en compilación, no en runtime. No hay mocks, no hay tests, no hay validación. La vista está acoplada al storage.

### C3. Lógica de colisión duplicada

- `createAppointment()` en `actions.ts:70-109` — inline: verifica schedule_exceptions + conflictos de hora
- `app/api/availability/check/route.ts` (112 líneas) — **independientemente reimplementa** la misma lógica: schedule JSON parsing, excepciones, conflictos
- `getAvailableSlots()` en `actions.ts:1839-1915` — genera slots con los mismos checks

**Riesgo:** Un bug en la lógica de colisión se corrige en un lugar pero no en los otros. Producción tiene 3 versiones de la misma verdad.

### C4. Cero Error Boundaries en el árbol de React

**No existe** un solo `<ErrorBoundary>` en ningún componente del dashboard.

**Riesgo:** Cualquier throw durante render (un null inesperado, un malformed JSON, un hook condicional) produce **pantalla en blanco** para todo el dashboard. Sin recovery. Sin mensaje al usuario.

**Agravante:** `metricas-client.tsx` tiene hooks condicionales (líneas 542, 548):
```tsx
if (periodo === 'year') {
  const ingresosPorMes = useMemo(() => ...) // Hook condicional → React crash
}
```

### C5. Sin validación runtime de datos DB

Cada `pool.query<MiTipo>(...)` confía en que la DB devuelva exactamente la forma del tipo TypeScript. **No hay zod, no hay schema validation, no hay sanity checks.**

**Riesgo:** Un cambio de schema (agregar NOT NULL, renombrar columna, cambiar tipo) pasa por compilación sin errores. La primera request que recibe los datos nuevos explota con un `undefined is not a function` sin contexto.

---

## 🟠 ALTO (6) — Deuda Estructural Mayor

### A1. Sin Service Layer / Data Access Layer

Cada componente importa server actions directamente:
```tsx
// En 20+ componentes
import { createBloqueo, deleteBloqueo } from "@/lib/actions"
import { getMetricas } from "@/lib/actions"
import { updateProfessionalSchedule } from "@/lib/actions"
```

No hay capa intermedia. No se puede:
- Mockear para tests
- Cachear respuestas
- Interceptar para logging/auditoría
- Cambiar implementación sin cambiar componentes

### A2. Sin tipo de retorno unificado — 5 patrones distintos

| Patrón | Ejemplo |
|--------|---------|
| `{ success: true } \| { error: string }` | createAppointment, updateAppointmentStatus |
| `{ ok: true } \| { error: string }` | createBloqueo, updateBloqueo |
| `{ data: T \| null, error: string \| null }` | getMetricas |
| `{ clientes: T[], error: string \| null }` | getClientes |
| `{ success: true, view: ... } \| { success: false, error: string }` | getMiHorarioData |

**Problema:** Cada componente que consume una acción debe recordar qué patrón usa. No hay `ActionResult<T>`canónico. Esto produce bugs silenciosos cuando un refactor cambia de `{ok}` a `{success}`.

### A3. `updateServices()` vs `updateServicesText()` — Misma lógica, dos firmas

- `updateServicesText(businessId, servicesText)` — toma string comma-separated
- `updateServices(data)` — toma array estructurado

Ambos hacen **DELETE + re-INSERT** en la tabla `services`. Si se arregla un bug en uno, el otro queda desactualizado. Esto existe porque se agregó el nuevo método sin eliminar el viejo (por compatibilidad con el frontend legacy).

### A4. `HorarioRecurrente` y `HorarioClient` — ~80% duplicación

Ambos componentes tienen:
- `toggleDay()` — idéntico
- `updateHour()` — idéntico
- `hasErrors()` — idéntico
- Save button con success/error — idéntico
- Hour filtering en selects — idéntico

**`HorarioRecurrente` (274 líneas)** es esencialmente `HorarioClient` (164 líneas) + 110 líneas de custom-schedule toggle + confirmation dialog.

Además `ProfessionalScheduleList` (186 líneas, **huérfano — no se renderiza en ninguna página**) envuelve `HorarioClient` para edición por profesional. Hay 3 implementaciones para lo mismo, y una de ellas ni siquiera se usa.

### A5. 6 Drawers de métricas con boilerplate idéntico

| Archivo | Líneas |
|---------|--------|
| `components/metricas/drawer-ingresos.tsx` | ~120 |
| `components/metricas/drawer-citas-del-dia.tsx` | ~110 |
| `components/metricas/drawer-ocupacion.tsx` | ~100 |
| `components/metricas/drawer-servicio-detalle.tsx` | ~90 |
| `components/metricas/drawer-cancelaciones.tsx` | ~100 |
| `components/metricas/drawer-clientes-nuevos.tsx` | ~100 |

Cada uno tiene el mismo patrón:
```tsx
useEffect(() => {
  if (!open) return
  let cancelled = false
  setLoading(true)
  setError(null)
  fetch(...).then(data => { if (!cancelled) setData(data) }).catch(e => { if (!cancelled) ...
}, [open])
```
**~600 líneas totales que podrían ser ~150 con un hook `useDrawerFetch` genérico.**

### A6. `SemanaClient` duplica render de `WeekView`

Cuando se aplica un filtro por profesional, `SemanaClient` **reimplementa su propio render de semana** (líneas 169-232) con los mismos `DAYS_ES`, `MONTHS_ES`, `statusConfig`, `formatHora()`, `getWeekDays()` que ya existen en `WeekView`. Simplemente no reusa el componente.

---

## 🟡 MEDIO (7) — Mantenibilidad

### M1. 14 `useState` en `mi-horario-client.tsx`

El componente maneja 14 estados independientes sin reducer, sin context, sin zustand:
```tsx
const [open, setOpen] = useState(false)
const [search, setSearch] = useState('')
const [currentMonth, setCurrentMonth] = useState(...)
const [currentYear, setCurrentYear] = useState(...)
const [selectedProfId, setSelectedProfId] = useState(...)
const [bloqueos, setBloqueos] = useState(...)
const [selectedDate, setSelectedDate] = useState(...)
const [sheetOpen, setSheetOpen] = useState(false)
const [showRecurrente, setShowRecurrente] = useState(false)
const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
const [editBloqueo, setEditBloqueo] = useState(...)
const [expandedSections, setExpandedSections] = useState(...)
```

**Problema:** Imposible razonar sobre estados inválidos (ej. `sheetOpen=true` y `selectedDate=null` al mismo tiempo). Un `useReducer` o mejor, un estado derivado, reduciría esto a la mitad.

### M2. 11 `any` types con eslint-disable

```tsx
// metricas-chart-ingresos.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
```

Todas en componentes de gráficos (metricas-chart-ingresos.tsx, metricas-chart-servicios.tsx). Aquí el tipo `any` es pragmático (Recharts tipa mal), pero debería encapsularse en un wrapper tipado en vez de propagarse.

### M3. Inconsistencia error handling — `throw` vs `return { error }`

Algunas acciones hacen `throw new Error("No autenticado")` (createAppointment). Otras retornan `{ error: "No autenticado" }`. Esto significa que el caller debe saber cuál esperar. Un `throw` no capturado en una Server Action Next.js produce un 500 sin mensaje útil.

### M4. Componentes en ubicaciones incorrectas

- `SemanaClient.tsx` en `app/(dashboard)/semana/` en vez de `components/`
- `drawer/route.ts` en `app/(dashboard)/dashboard/metricas/api/` en vez de `app/api/`
- `new-appointment-sheet.tsx` en `components/` raíz en vez de `components/appointments/`

### M5. `lib/auth.ts` es un re-export sin valor

```tsx
// lib/auth.ts
export { auth, signIn, signOut, handlers } from "@/auth"
```
No agrega lógica, no transforma, no añade tipos. Es indirección pura que confunde sobre qué `auth` importar.

### M6. `AuditLogFilters` definido pero nunca usado

```tsx
// lib/audit-types.ts
export interface AuditLogFilters { ... }
```
No hay import de esto en ningún archivo. Código muerto.

### M7. Funciones fire-and-forget sin `await`

```tsx
updatingServices()  // sin await — el error se traga
auditar()           // sin await — el error se traga
```
Estos efectos secundarios se disparan y olvidan. Si fallan, el error se pierde en el microbundle.

---

## 🟢 BAJO (4) — Cosmético / Preventivo

### B1. `package-lock.json.bak` en la raíz del repo

Archivo residual. Debe eliminarse o agregarse a `.gitignore`.

### B2. Sin tema de diseño definido

Los CSS usan `var(--xxx)` pero no hay un archivo de tokens de diseño (colores, spacing, tipografía). Los valores están dispersos en `globals.css`.

### B3. Sin barrels (index.ts) en lib/

Cada import es una ruta directa a un archivo específico. Esto no es malo per se, pero cuando se muevan archivos en el refactor, los imports se rompen en masa. Introducir barrels gradualmente en los boundaries públicos ayuda.

### B4. Sin Documentación de arquitectura actualizada

- `docs/backend-reference.md` recién actualizado (Backend v2) pero la estructura de carpetas del frontend no está documentada en ningún lado
- No hay un `ARCHITECTURE_FRONTEND.md`
- No hay ADRs (Architecture Decision Records) para decisiones pasadas

---

## Lecciones de la Industria

### De Fresha (modular monolith → microservicios)

Fresha (Shedul) empezó como monolith Rails, migró a Elixir/Phoenix modular monolith, y luego a microservicios. Su lección: **modular monolith first**. Su proyecto "Scalpel" es justamente un conjunto de reglas incrementales para mantener límites limpios sin partir el sistema:

1. **Dominios como carpetas, no como capas** — negocio se organiza por contexto, no por tipo de archivo
2. **Contrato público explícito** — cada módulo tiene una API visible y privada
3. **BD compartida** — permiten joins cross-dominio (como nosotros) pero documentan ownership de cada tabla
4. **Refactor continuo** — no hay "gran rewrite". Se refactoriza en cada sprint

### De Next.js SaaS patterns (múltiples fuentes 2026)

Consenso de ~15 artículos de producción:

| Principio | Lo que hacemos hoy | Lo que deberíamos hacer |
|-----------|-------------------|----------------------|
| Server Actions por dominio | Un `actions.ts` de 2k líneas | `actions/` carpeta, un archivo por dominio |
| Route groups para layouts | Usamos `(dashboard)` ✅ | Bien, mantener |
| Data Access Layer | `pool.query()` en páginas | `lib/data-access/` con `server-only` + zod |
| `api/` solo para webhooks | Tenemos 3 webhooks + availability + debug + month | Mantener. Mover availability check a DAL |
| Feature-first components | Plano: 53 archivos en `components/` | `components/features/` + `components/ui/` |
| Unified return type | 5 patrones | `ActionResult<T>` canónico |
| Error boundaries | 0 | 1 global + 1 por feature |

### De AgendaPro (competidor directo latam)

AgendaPro opera en el mismo espacio (salones de belleza LatAm). Su stack es monolitico (no publican detalles técnicos) pero su USP es **integración**: POS, inventario, comisiones, recordatorios, marketplace. Su distribución de funcionalidad sugiere que nosotros **no deberíamos crecer más sin una estructura clara** — ellos tienen ~10 módulos integrados; nosotros tenemos ~6 y ya estamos en el límite de lo manejable.

---

## Prioridad de Acción

### Inmediato (este sprint)
1. **Partir `actions.ts`** en `lib/actions/appointments.ts`, `services.ts`, `equipo.ts`, `schedule.ts`, `bloqueos.ts`, `clientes.ts`, `metrics/index.ts`, `metrics/metricas.ts`, `metrics/metricas-drawer.ts` — mover funciones, no cambiar lógica
2. **Agregar Error Boundary global** en `app/(dashboard)/error.tsx`
3. **Unificar return types** — crear `ActionResult<T>` y migrar las 7 funciones más usadas

### Corto plazo (próximo sprint)
4. **Extraer Data Access Layer** — `lib/data-access/` con `server-only`, wrapper de pool, zod schemas
5. **Mover availability check** a DAL — eliminar duplicación en route.ts
6. **Fusionar HorarioRecurrente + HorarioClient** — un solo componente reutilizable
7. **Mover componentes a feature folders** — `components/features/appointments/`, `features/schedule/`, `features/team/`, `features/metrics/`

### Mediano plazo
8. **Extraer `useDrawerFetch`** para eliminar boilerplate de 6 drawers
9. **Eliminar `updateServicesText`** — migrar todos los callers a `updateServices`
10. **Tipar componentes Recharts** con wrapper en vez de `any`
11. **Agregar validación runtime con zod** en todas las queries DB crudas

### Largo plazo
12. **Documentar en `ARCHITECTURE_FRONTEND.md`** — estructura de carpetas, patrones, ADRs
13. **Introducir barrel exports** en points de entrada públicos
14. **Migrar estado complejo** (`mi-horario-client.tsx`) a `useReducer` o zustand

---

## Archivos Afectados (lista completa)

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `lib/actions.ts` | 2,138 | C1 — Monolito |
| `lib/db.ts` | ~30 | C5 — Sin validación |
| `components/metricas/metricas-client.tsx` | 703 | A5 — Monolítico |
| `components/horario/mi-horario-client.tsx` | 638 | M1 — 14 useState |
| `components/horario/horario-recurrente.tsx` | 274 | A4 — Duplica HorarioClient |
| `components/configuracion/horario-client.tsx` | 164 | A4 — Duplicado |
| `components/configuracion/professional-schedule-list.tsx` | 186 | A4 — Huérfano |
| `app/api/availability/check/route.ts` | 112 | C3 — Lógica duplicada |
| `app/(dashboard)/semana/SemanaClient.tsx` | ~250 | A6 — Duplica WeekView |
| `components/metricas/metricas-chart-ingresos.tsx` | ~100 | M2 — any types |
| `components/metricas/metricas-chart-servicios.tsx` | ~100 | M2 — any types |
| `lib/auth.ts` | ~5 | M5 — Re-export inútil |
| `lib/audit-types.ts` | ~50 | M6 — Código muerto |
| `components/metricas/drawer-*.tsx` (6 archivos) | ~600 total | A5 — Boilerplate |
| `app/(dashboard)/dashboard/configuracion/page.tsx` | ~20 | C2 — pool.query directo |
| `app/(dashboard)/dashboard/auditoria/page.tsx` | ~50 | C2 — pool.query directo |

---

> **Nota:** Este audit es la foto actual. El roadmap de refactor (`02-PATRONES.md` y `03-ROADMAP.md`) definirá el orden exacto de cada cambio, con la regla de que **ningún refactor debe cambiar comportamiento** — solo mover y reorganizar.
