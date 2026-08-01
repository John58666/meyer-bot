# Sesión actual — Refactor V2 Dashboard

## Estado
- Iniciada: 2026-07-31
- Última actualización: 2026-07-31 23:59
- Objetivo: Refactor V2 completo (12/12 módulos) + layout + notificaciones
- Estado: ✅ Completado

## Bugs resueltos (B1, B2)
- B1 (createAppointment sin validar exceptions): ✅ Resuelto (commit 4847091)
- B2 (fetchOcupacion ignora exceptions): ✅ Resuelto (commit ad404c3)
- ServiceRow/Cliente/MetricasData ReferenceError: ✅ Resuelto (export type re-exports eliminados)

## Pendiente para próxima sesión
- Limpiar cache browser (Ctrl+Shift+R) al recargar
- Verificar todos los módulos cargan sin errores
- Probar responsive en mobile real

## Bugs confirmados

### Bug 1: Bloqueos — createAppointment no valida schedule_exceptions (✅ Resuelto Jul 25)
- **Archivo**: `dashboard/lib/actions.ts:79-109`
- **Fix aplicado**: Validación de `schedule_exceptions` (cerrado + horario_especial) con filtro por profesional. Commit `4847091`.
- **Nota**: Si `forceOverride=true`, la validación se salta (intencional para forzar citas urgentes).

### Bug 2: Métricas — fetchOcupacion ignora schedule_exceptions (✅ Resuelto Jul 25)
- **Archivo**: `dashboard/lib/actions.ts:527-580`
- **Fix aplicado**: `fetchOcupacion` consulta `schedule_exceptions` en el rango de fechas. Días `cerrado` se excluyen del total. Días `horario_especial` ajustan el conteo de slots. Commit `ad404c3`.

### Bug 3: Clientes — Sin detección de duplicados (🟡 Medio)
- **Archivo**: `dashboard/components/clientes/clientes-client.tsx`
- **Problema**: Tabla de solo lectura con búsqueda. `createAppointment` hace upsert correcto con `ON CONFLICT (business_id, numero)` pero si el bot de WhatsApp crea clientes sin upsert o con formato distinto, se acumulan duplicados
- **Fix**: Agregar detección de duplicados (misma normalización de número, mismo nombre con diferencias menores) + UI para fusionar

### Bug 4: Servicios — Editor de filas vs textarea (🟡 Medio)
- **Archivo**: `dashboard/components/configuracion/servicios-client.tsx`
- **Problema**: Formato `"Nombre $precio, Nombre2 $precio2"` en textarea. Personal no técnico lo encuentra confuso
- **Fix**: Convertir a editor por filas con input de nombre + input de precio + botones agregar/eliminar

### Bug 5: Configuración/Auditoría — GATEO FUNCIONA (✅ Ya corregido)
- **Archivos**: `sidebar.tsx`, `topbar.tsx`, `auth.config.ts`, páginas de config/auditoria
- **Verificado**: El código en VPS tiene todos los gates (sidebar, topbar, middleware, page-level)
- **DB**: Valores de role son `owner`, `admin`, `profesional` — exactamente como el código espera
- **Nota**: Si aún se ve, es porque el usuario de prueba tiene role admin u owner. Probar con user profesional real (Julian, John, Brayan)

### Bug 6: Citas del día — Vista densa sin resumen (🟡 Medio)
- **Archivo**: `dashboard/app/(dashboard)/semana/SemanaClient.tsx`
- **Problema**: Tarjetas planas por día sin resumen ("3 citas hoy"), sin colapsar, sin acciones rápidas
- **Fix**: Agregar cabecera por día con total de citas, acciones rápidas (WhatsApp, llamar, completar)

## UX Issues (Pendientes de aprobación)
- Contraste de texto: #555 sobre #0A0A0A = 2.67:1 (WCAG exige 4.5:1)
- Sidebar solo íconos sin tooltips
- Touch targets 40px en mobile (recomendado 44px)
- Sin skeletons/loading states
- Acento morado sin sistema semántico de colores

## Archivos clave
- `dashboard/lib/actions.ts` (1759 líneas) — todas las server actions
- `dashboard/components/new-appointment-sheet.tsx` — formulario nueva cita
- `dashboard/components/sidebar.tsx` — sidebar con gateo por rol
- `dashboard/components/topbar.tsx` — topbar + dropdown + bottom nav
- `dashboard/auth.config.ts` — middleware de autenticación
- `dashboard/auth.ts` — login con credenciales (NextAuth)
- `dashboard/components/clientes/clientes-client.tsx` — lista de clientes
- `dashboard/components/configuracion/servicios-client.tsx` — editor servicios
- `dashboard/components/bloqueos/bloqueos-client.tsx` — UI de bloqueos
- `dashboard/app/(dashboard)/semana/SemanaClient.tsx` — vista semanal

## Próximo paso
Empezar con Bug 1: Bloqueos. Requiere:
1. Agregar validación de schedule_exceptions en createAppointment
2. Opcional: también validar en `getAvailableSlots` ya está correcto
3. Probar con usuario profesional real
