# Estructura Destino — Feature-First Dashboard

> **Fecha:** Julio 2026
> **Base:** `dashboard/` — Next.js 16 App Router
> **Referencia:** `01-ARCHITECTURAL_AUDIT.md` (diagnóstico)
> **Principio:** Feature-First simplificado — agrupar por dominio de negocio, no por tipo técnico

---

## Árbol completo

```
dashboard/
├── app/                          ← Solo routing (thin)
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                  ← Redirect /login o /dashboard
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx            ← Sidebar + Topbar + BottomNav + Footer
│   │   ├── error.tsx             ← Error boundary global [AGREGAR]
│   │   └── dashboard/
│   │       ├── page.tsx          ← Inicio
│   │       ├── semana/
│   │       │   ├── page.tsx
│   │       │   ├── SemanaClient.tsx  ← Page controller (se queda)
│   │       │   └── bloqueos/page.tsx
│   │       ├── metricas/
│   │       │   └── page.tsx
│   │       ├── mi-horario/page.tsx
│   │       ├── clientes/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── configuracion/page.tsx
│   │       ├── equipo/page.tsx
│   │       ├── auditoria/page.tsx
│   │       ├── help/page.tsx
│   │       └── legal/
│   │           ├── privacidad/page.tsx
│   │           └── terminos/page.tsx
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── webhooks/             ← Entry points externos (se quedan)
│           ├── sync-new/route.ts
│           ├── sync-cancel/route.ts
│           └── sync-reagend/route.ts
│
├── features/                     ← Cada dominio encapsulado
│   ├── appointments/
│   │   ├── actions/
│   │   │   ├── create.ts         ← createAppointment
│   │   │   ├── status.ts         ← updateAppointmentStatus
│   │   │   ├── reschedule.ts     ← rescheduleAppointment
│   │   │   ├── delete.ts         ← deleteAppointment
│   │   │   └── slots.ts          ← getAvailableSlots
│   │   ├── queries/
│   │   │   ├── today.ts          ← getTodayAppointments, getTodayStats
│   │   │   ├── week.ts           ← getWeekAppointments
│   │   │   └── month.ts          ← getAppointmentsByMonth
│   │   ├── api/
│   │   │   ├── month/route.ts
│   │   │   ├── week/route.ts
│   │   │   └── slots/route.ts
│   │   ├── components/
│   │   │   ├── new-appointment-sheet.tsx
│   │   │   ├── reschedule-sheet.tsx
│   │   │   ├── appointment-list.tsx
│   │   │   ├── appointment-actions.tsx
│   │   │   ├── appointment-card.tsx
│   │   │   ├── stats-cards.tsx
│   │   │   ├── day-appointments-sheet.tsx
│   │   │   ├── week-view.tsx
│   │   │   └── calendar-month-view.tsx
│   │   └── types.ts
│   │
│   ├── schedule/                 ← Horarios (negocio + profesional)
│   │   ├── actions/
│   │   │   ├── text.ts           ← updateScheduleText
│   │   │   ├── professional.ts   ← CRUD professional_schedule
│   │   │   └── mi-horario.ts     ← getMiHorarioData
│   │   ├── api/
│   │   │   └── check/route.ts    ← availability check [REFACTOR: usar DAL]
│   │   ├── components/
│   │   │   ├── mi-horario-client.tsx
│   │   │   ├── calendar-view.tsx
│   │   │   ├── day-detail-sheet.tsx
│   │   │   ├── horario-recurrente.tsx   ← Fusionar con horario-client
│   │   │   ├── horario-client.tsx        ← Fusión destino
│   │   │   └── professional-schedule-list.tsx
│   │   └── types.ts
│   │
│   ├── bloqueos/                 ← Excepciones de horario
│   │   ├── actions/
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── conflicts.ts      ← checkConflictosBloqueo
│   │   ├── components/
│   │   │   └── bloqueos-client.tsx
│   │   └── types.ts
│   │
│   ├── services/
│   │   ├── actions/
│   │   │   ├── crud.ts           ← createService, updateService, toggleServiceActive, deleteService
│   │   │   ├── legacy.ts         ← updateServicesText (deprecado)
│   │   │   └── professional.ts   ← getProfessionalServices, setProfessionalServices
│   │   ├── queries/
│   │   │   ├── list.ts           ← getServices, getAllServices
│   │   │   └── single.ts         ← getServiceById, getServiceByName, getServiceDuration, getServicePrice
│   │   ├── lib/
│   │   │   └── parse-services.ts
│   │   ├── components/
│   │   │   ├── servicios-table.tsx
│   │   │   └── servicios-client.tsx
│   │   └── types.ts
│   │
│   ├── team/
│   │   ├── actions/
│   │   │   ├── members.ts        ← CRUD miembros equipo
│   │   │   └── credentials.ts    ← updateMiembroCredenciales
│   │   ├── components/
│   │   │   └── equipo-client.tsx
│   │   └── types.ts
│   │
│   ├── metrics/
│   │   ├── actions/
│   │   │   ├── metricas.ts       ← getMetricas
│   │   │   └── drawer.ts         ← getMetricasDrawer
│   │   ├── api/
│   │   │   └── drawer/route.ts
│   │   ├── components/
│   │   │   ├── metricas-client.tsx
│   │   │   ├── metricas-kpi-card.tsx
│   │   │   ├── metricas-tab-selector.tsx
│   │   │   ├── metricas-chart-ingresos.tsx
│   │   │   ├── metricas-chart-ocupacion.tsx
│   │   │   ├── metricas-chart-servicios.tsx
│   │   │   ├── drawer-ingresos.tsx
│   │   │   ├── drawer-citas-del-dia.tsx
│   │   │   ├── drawer-ocupacion.tsx
│   │   │   ├── drawer-servicio-detalle.tsx
│   │   │   ├── drawer-cancelaciones.tsx
│   │   │   └── drawer-clientes-nuevos.tsx
│   │   └── types.ts
│   │
│   ├── clients/
│   │   ├── actions/
│   │   │   ├── list.ts           ← getClientes, searchClientes
│   │   │   ├── history.ts        ← getHistorialCliente
│   │   │   └── upsert.ts         ← upsertCliente
│   │   ├── components/
│   │   │   ├── clientes-client.tsx
│   │   │   └── cliente-historial-client.tsx
│   │   └── types.ts
│   │
│   └── debug/                    ← Solo dev
│       └── api/config/route.ts
│
├── components/
│   ├── ui/                       ← shadcn primitivas (10 componentes)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   ├── separator.tsx
│   │   └── sonner.tsx
│   │
│   ├── layout/                   ← Layout components
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── footer.tsx
│   │   ├── auto-refresh.tsx
│   │   ├── refresh-button.tsx
│   │   └── redirect-client.tsx
│   │
│   └── shared/                   ← Cross-feature
│       ├── warnings-banner.tsx
│       └── professional-avatar.tsx
│
├── lib/
│   ├── db/
│   │   └── pool.ts               ← pg.Pool singleton
│   ├── auth/                     ← NextAuth instance
│   │   ├── index.ts              ← auth, signIn, signOut, handlers
│   │   └── config.ts             ← authConfig
│   ├── audit/
│   │   ├── index.ts              ← auditar, getAuditLogs
│   │   └── types.ts              ← AuditLogEntry, AuditLogFilters
│   ├── notifications/
│   │   └── whatsapp.ts
│   ├── utils/
│   │   └── cn.ts
│   └── data-access/              ← [AGREGAR] DAL con server-only + zod
│       ├── index.ts
│       └── schemas/
│
├── types/
│   ├── next-auth.d.ts
│   ├── actions.ts                ← ActionResult<T> [AGREGAR]
│   └── common.ts                 ← Tipos compartidos entre features [AGREGAR]
│
├── hooks/                        ← Hooks compartidos [AGREGAR]
│   ├── use-drawer-fetch.ts       ← [AGREGAR] Reemplaza boilerplate de 6 drawers
│   └── ...
│
└── middleware.ts                 ← Se queda
```

---

## Mapeo 1:1 archivo actual → destino

### `lib/` → distribución

| Actual | Destino | Notas |
|--------|---------|-------|
| `lib/actions.ts` (2,138 líneas) | `features/*/actions/*.ts` | Partir en 6 dominios. Ver sección "Partir actions.ts" |
| `lib/appointments.ts` | `features/appointments/queries/` | Queries de solo lectura |
| `lib/services.ts` | `features/services/actions/` + `features/services/queries/` | Separar CRUD de queries |
| `lib/audit.ts` | `lib/audit/index.ts` | Infraestructura cross-feature |
| `lib/audit-types.ts` | `lib/audit/types.ts` | |
| `lib/whatsapp.ts` | `lib/notifications/whatsapp.ts` | |
| `lib/utils.ts` | `lib/utils/cn.ts` | |
| `lib/parse-services.ts` | `features/services/lib/parse-services.ts` | Parser legacy del dominio |
| `lib/auth.ts` | Eliminar | Re-export innecesario — importar directo de `@/auth` |
| `lib/auth.config.ts` | Eliminar | Re-export innecesario |
| `lib/db.ts` | `lib/db/pool.ts` | |

### `components/` → distribución

| Actual | Destino | Notas |
|--------|---------|-------|
| `components/ui/*` (10) | `components/ui/` | Se quedan |
| `components/sidebar.tsx` | `components/layout/sidebar.tsx` | |
| `components/topbar.tsx` | `components/layout/topbar.tsx` | |
| `components/footer.tsx` | `components/layout/footer.tsx` | |
| `components/auto-refresh.tsx` | `components/layout/auto-refresh.tsx` | |
| `components/refresh-button.tsx` | `components/layout/refresh-button.tsx` | |
| `components/redirect-client.tsx` | `components/layout/redirect-client.tsx` | |
| `components/new-appointment-sheet.tsx` | `features/appointments/components/` | |
| `components/reschedule-sheet.tsx` | `features/appointments/components/` | |
| `components/appointment-list.tsx` | `features/appointments/components/` | |
| `components/appointment-actions.tsx` | `features/appointments/components/` | |
| `components/appointment-card.tsx` | `features/appointments/components/` | |
| `components/stats-cards.tsx` | `features/appointments/components/` | |
| `components/day-appointments-sheet.tsx` | `features/appointments/components/` | |
| `components/week-view.tsx` | `features/appointments/components/` | |
| `components/calendar-month-view.tsx` | `features/appointments/components/` | |
| `components/warnings-banner.tsx` | `components/shared/warnings-banner.tsx` | Cross-feature |
| `components/horario/mi-horario-client.tsx` | `features/schedule/components/` | |
| `components/horario/calendar-view.tsx` | `features/schedule/components/` | |
| `components/horario/day-detail-sheet.tsx` | `features/schedule/components/` | |
| `components/horario/horario-recurrente.tsx` | `features/schedule/components/horario-recurrente.tsx` | Fusionar con horario-client |
| `components/horario/professional-avatar.tsx` | `components/shared/professional-avatar.tsx` | Cross-feature |
| `components/configuracion/horario-client.tsx` | `features/schedule/components/horario-client.tsx` | Fusión destino |
| `components/configuracion/professional-schedule-list.tsx` | `features/schedule/components/` | |
| `components/configuracion/servicios-client.tsx` | `features/services/components/` | |
| `components/configuracion/servicios-table.tsx` | `features/services/components/` | |
| `components/bloqueos/bloqueos-client.tsx` | `features/bloqueos/components/` | |
| `components/metricas/metricas-client.tsx` | `features/metrics/components/` | |
| `components/metricas/metricas-kpi-card.tsx` | `features/metrics/components/` | |
| `components/metricas/metricas-tab-selector.tsx` | `features/metrics/components/` | |
| `components/metricas/metricas-chart-ingresos.tsx` | `features/metrics/components/` | |
| `components/metricas/metricas-chart-ocupacion.tsx` | `features/metrics/components/` | |
| `components/metricas/metricas-chart-servicios.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-ingresos.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-citas-del-dia.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-ocupacion.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-servicio-detalle.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-cancelaciones.tsx` | `features/metrics/components/` | |
| `components/metricas/drawer-clientes-nuevos.tsx` | `features/metrics/components/` | |
| `components/clientes/clientes-client.tsx` | `features/clients/components/` | |
| `components/clientes/cliente-historial-client.tsx` | `features/clients/components/` | |
| `components/auditoria/auditoria-client.tsx` | `features/audit/components/` | |
| `components/equipo/equipo-client.tsx` | `features/team/components/` | |

### `app/api/` → distribución

| Actual | Destino | Notas |
|--------|---------|-------|
| `api/appointments/month/route.ts` | `features/appointments/api/month/route.ts` | |
| `api/appointments/week/route.ts` | `features/appointments/api/week/route.ts` | |
| `api/appointments/slots/route.ts` | `features/appointments/api/slots/route.ts` | |
| `api/availability/check/route.ts` | `features/schedule/api/check/route.ts` | Refactorizar para usar DAL |
| `api/debug/config/route.ts` | `features/debug/api/config/route.ts` | |
| `dashboard/metricas/api/drawer/route.ts` | `features/metrics/api/drawer/route.ts` | |
| `api/webhooks/*` | Se quedan en `app/api/webhooks/` | Entry points externos |
| `api/auth/[...nextauth]/route.ts` | Se queda en `app/api/auth/` | |

### `app/(dashboard)/` routes — páginas

Todas las páginas se quedan en `app/(dashboard)/dashboard/*/page.tsx`.
Solo se mueve la lógica que importan (actions, queries, components).

---

## Cómo partir `actions.ts` (Fase 1)

El monolito de 2,138 líneas se divide en estos archivos sin cambiar lógica:

| Archivo nuevo | Funciones que contiene |
|---|---|
| `features/appointments/actions/create.ts` | createAppointment |
| `features/appointments/actions/status.ts` | updateAppointmentStatus |
| `features/appointments/actions/reschedule.ts` | rescheduleAppointment, cancelAppointmentsAndNotify |
| `features/appointments/actions/delete.ts` | deleteAppointment |
| `features/appointments/actions/slots.ts` | getAvailableSlots, getActiveProfessionals |
| `features/schedule/actions/text.ts` | updateScheduleText |
| `features/schedule/actions/professional.ts` | updateProfessionalSchedule, deleteProfessionalSchedule, getProfessionalSchedule, getAllProfessionalSchedules |
| `features/schedule/actions/mi-horario.ts` | getMiHorarioData |
| `features/bloqueos/actions/create.ts` | createBloqueo |
| `features/bloqueos/actions/update.ts` | updateBloqueo |
| `features/bloqueos/actions/delete.ts` | deleteBloqueo |
| `features/bloqueos/actions/conflicts.ts` | checkConflictosBloqueo |
| `features/team/actions/members.ts` | createMiembroEquipo, updateMiembroEquipo, desactivarMiembroEquipo, toggleMiembroActivo, updateMiembroRole |
| `features/team/actions/credentials.ts` | updateMiembroCredenciales |
| `features/clients/actions/list.ts` | getClientes, searchClientes |
| `features/clients/actions/history.ts` | getHistorialCliente |
| `features/clients/actions/upsert.ts` | upsertCliente |
| `features/services/actions/crud.ts` | createService, updateService, toggleServiceActive, deleteService |
| `features/services/actions/legacy.ts` | updateServicesText |
| `features/services/actions/professional.ts` | setProfessionalServices |
| `features/metrics/actions/metricas.ts` | getMetricas |
| `features/metrics/actions/drawer.ts` | getMetricasDrawer |

### Estrategia para no romper el build

Cada archivo nuevo se crea moviendo funciones.
En `lib/actions.ts` se deja un barrel de re-exports:

```ts
// lib/actions.ts → temporal
export { createAppointment } from '@/features/appointments/actions/create'
export { updateAppointmentStatus } from '@/features/appointments/actions/status'
// ...etc
```

Cuando todos los imports apunten a `@/features/...` directamente, se elimina `lib/actions.ts`.

---

## Lo que cambia vs el estado actual

| Aspecto | Hoy | Destino |
|---------|-----|---------|
| Archivos en `components/` raíz | 53 planos | 11 (solo ui + layout + shared) |
| Archivos en `lib/` | 11 mezclados | 5 directorios con responsabilidad clara |
| Server Actions | 1 archivo (2,138 líneas) | 21 archivos en 6 dominios |
| Queries DB | En `lib/actions.ts` + `lib/appointments.ts` + `lib/services.ts` | Separadas en `queries/` dentro de cada feature |
| API routes | En `app/api/` | En `features/*/api/` (excepto webhooks) |
| Componentes sin dominio | ~20 sin subcarpeta | Todos en su feature correspondiente |
| Cross-feature components | En `components/` raíz | `components/shared/` |
| Hooks | 0 (inline en componentes) | `hooks/` compartidos |
| Types globales | Solo `types/next-auth.d.ts` | `types/actions.ts` + `types/common.ts` |
| DAL | No existe | `lib/data-access/` con server-only + zod |
| Error boundaries | 0 | 1 global en `app/(dashboard)/error.tsx` |

---

## Orden sugerido de implementación

```
Fase 1: Partir actions.ts (sin cambiar lógica)
Fase 2: Separar queries de actions (lib/appointments.ts, lib/services.ts)
Fase 3: Crear features/ y mover componentes
Fase 4: Mover API routes a features/*/api/
Fase 5: Crear DAL y migrar pool.query() directo
Fase 6: Barrel exports + limpieza de archivos temporales
Fase 7: Extraer hooks compartidos
```

Ver `03-ROADMAP.md` para el plan detallado.
