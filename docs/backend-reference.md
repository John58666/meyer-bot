# Backend Reference — meyer-bot

> Documento unificado de referencia del backend para conectar el frontend.
> Schema DB, server actions, endpoints, reglas de negocio, auth, auditoría, y contrato API.

---

## 1. Database Schema (PostgreSQL 16)

### 1.1 `businesses` — Negocio
```sql
id                integer  PK, autoincrement
slug              varchar(100)  NOT NULL, UNIQUE
name              varchar(255)  NOT NULL
whatsapp_instance varchar(100)  NOT NULL  -- nombre instancia Evolution API
owner_number      varchar(20)   NOT NULL  -- número WhatsApp del dueño
timezone          varchar(50)   DEFAULT 'America/Bogota'
active            boolean       DEFAULT true
multi_professional boolean      NOT NULL DEFAULT false
services_text     text          -- "Nombre $precio, Otro $precio"
prompt_name       text          -- nombre del negocio para system prompt
schedule_text     jsonb         -- {"0":{"open":10,"close":17},"1":{"open":9,"close":19},...}
max_professionals integer       NOT NULL DEFAULT 3  -- límite plan
max_admins        integer       NOT NULL DEFAULT 1  -- límite plan
buffer_minutes    integer       NOT NULL DEFAULT 15  -- usado por n8n, NO por dashboard
created_at        timestamptz   DEFAULT now()
```

### 1.2 `appointments` — Citas
```sql
id                integer  PK, autoincrement
business_id       integer  NOT NULL  FK → businesses.id
fecha             date     NOT NULL
hora              time     NOT NULL  -- solo hora, sin zona horaria
+++ hora_fin      time              -- calculado desde services.duration_minutes + buffer_minutes
nombre            varchar(255)       -- nombre del cliente
servicio          varchar(255) NOT NULL
numero            varchar(50)  NOT NULL  -- WhatsApp del cliente
estado            varchar(50)  DEFAULT 'Pendiente'
                  CHECK IN ('Pendiente','Confirmada','Cancelada','Completada')
professional_id   bigint   FK → professionals.id, nullable
calendar_event_id varchar(255)      -- ID de Google Calendar (si integra)
created_at        timestamptz  DEFAULT now()
updated_at        timestamptz  DEFAULT now()
```

**✅ Migrado Backend v2 (Jul 2026):** `hora_fin`. Sigue sin existir: `notas`, `duracion_modificada`, `descuento`, `servicios_multiples`, `importe_total`, `metodo_pago`, `servicio_id`, `precio`.

### 1.3 `services` — Servicios normalizados (Backend v2)
```sql
id                integer  PK, autoincrement
business_id       integer  NOT NULL  FK → businesses.id
name              text     NOT NULL
price             integer  NOT NULL
duration_minutes  integer  NOT NULL  DEFAULT 30
active            boolean  NOT NULL  DEFAULT true
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
UNIQUE (business_id, name)
Índices: idx_services_business (business_id)
```
✅ Migrado desde `services_text` vía seed. 14 servicios en DB (Peluquería Meyer: 10, Brayan Study: 4).

### 1.4 `professional_services` — Especialidades por profesional (Backend v2)
```sql
professional_id   bigint   NOT NULL  FK → professionals.id ON DELETE CASCADE
service_id        integer  NOT NULL  FK → services.id ON DELETE CASCADE
PRIMARY KEY (professional_id, service_id)
Índices: idx_professional_services_professional (professional_id),
         idx_professional_services_service (service_id)
```
✅ Seed: 72 asignaciones (todos los servicios a todos los profesionales activos).

### 1.5 `users` — Usuarios del dashboard
```sql
id                bigint  PK, generated always as identity
email             text    NOT NULL, UNIQUE (lower(email))
password_hash     text    NOT NULL
name              text    NOT NULL
business_id       integer FK → businesses.id
role              text    NOT NULL DEFAULT 'owner'
                  CHECK IN ('owner','admin','profesional')
active            boolean NOT NULL DEFAULT true
last_login_at     timestamptz
professional_id   integer FK → professionals.id, nullable
created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

### 1.4 `professionals` — Profesionales
```sql
id                bigint  PK, generated always as identity
business_id       integer NOT NULL FK → businesses.id
name              text    NOT NULL
active            boolean NOT NULL DEFAULT true
created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

### 1.5 `professional_schedule` — Horario por profesional (opcional)
```sql
id                integer  PK, autoincrement
business_id       integer NOT NULL FK → businesses.id
professional_id   integer NOT NULL FK → professionals.id
schedule_text     jsonb   NOT NULL  -- mismo formato que businesses.schedule_text
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
UNIQUE (business_id, professional_id)
```

### 1.6 `schedule_exceptions` — Bloqueos / Horarios especiales
```sql
id                bigint  PK, generated always as identity
business_id       integer NOT NULL FK → businesses.id
professional_id   bigint  FK → professionals.id, nullable  -- NULL = todo el negocio
fecha             date    NOT NULL
tipo              text    NOT NULL  CHECK IN ('cerrado','horario_especial')
hora_inicio       time    nullable
hora_fin          time    nullable
motivo            text    nullable
created_at        timestamptz NOT NULL DEFAULT now()
CHECK: (tipo = 'cerrado' OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL))
```

### 1.7 `customers` — Clientes (CRM)
```sql
id                bigint  PK, generated always as identity
business_id       integer NOT NULL FK → businesses.id
numero            text    NOT NULL
nombre            text    nullable
genero            text    DEFAULT 'desconocido'
                  CHECK IN ('masculino','femenino','otro','desconocido')
preferred_professional_id bigint FK → professionals.id, nullable
notas             text    nullable
primera_visita    date    nullable
ultima_visita     date    nullable
total_visitas     integer DEFAULT 0
created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
UNIQUE (business_id, numero)
```

### 1.8 `audit_log` — Auditoría INSERT-only
```sql
id                bigint  PK, autoincrement
business_id       integer NOT NULL FK → businesses.id
user_id           integer FK → users.id, nullable  -- NULL = acción desde WhatsApp
accion            varchar(50)  NOT NULL
entidad           varchar(50)  NOT NULL
entidad_id        integer nullable
detalle           jsonb   nullable
ip_address        varchar(45) nullable  -- IPv4 o IPv6
created_at        timestamptz DEFAULT now()

Índices: (business_id, created_at DESC), (business_id, accion)
```

### 1.9 `sessions` — Sesiones del bot WhatsApp
```sql
id                bigint  PK, generated always as identity
business_id       integer NOT NULL FK → businesses.id
numero            text    NOT NULL
accion            text    NOT NULL  CHECK IN ('cancelar','reagendar')
citas             jsonb   NOT NULL DEFAULT '[]'
expires_at        timestamptz NOT NULL DEFAULT now() + '30 min'
created_at        timestamptz NOT NULL DEFAULT now()
Índice: (business_id, numero, expires_at)
```

### 1.10 `conversation_history` — Historial de conversación del bot
```sql
id                bigint  PK, generated always as identity
business_id       integer NOT NULL FK → businesses.id
numero            text    NOT NULL
messages          jsonb   NOT NULL DEFAULT '[]'
updated_at        timestamptz NOT NULL DEFAULT now()
expires_at        timestamptz NOT NULL DEFAULT now() + '2 hours'
inactividad_estado text   nullable
UNIQUE (business_id, numero)
```

---

## 2. Server Actions (`dashboard/lib/actions.ts`)

Todas las funciones de servidor se importan con `"use server"` y se ejecutan en el servidor.

### 2.1 Citas

| Función | Parámetros | Retorno | Descripción |
|---------|-----------|---------|-------------|
| `createAppointment(formData)` | FormData con nombre, numero, servicio, fecha, hora, forceOverride, professionalId | `{success: true}` o `{error: string}` o `{conflict: true}` | Crea cita con duración variable desde `services.duration_minutes` + 15min buffer. Colisión por rango: `hora < hora_fin_existente AND COALESCE(hora_fin_existente, hora+30min) > hora_propuesta`. Persiste `hora_fin` calculada. |
| `updateAppointmentStatus(id, estado)` | id: number, estado: "Completada"\|"Cancelada"\|"Pendiente" | `{success: true}` o `{error: string}` | Actualiza estado. Profesional solo puede modificar sus propias citas. |
| `rescheduleAppointment(id, fecha, hora)` | id, fecha (YYYY-MM-DD), hora (HH:mm) | `{success: true}` o `{error: string}` | Cambia fecha/hora. Reactiva a Pendiente. Sin validación de colisión. |

### 2.2 Bloqueos de agenda

| Función | Descripción |
|---------|-------------|
| `getBloqueos(businessId, professionalId?, viewAll?)` | Lista bloqueos futuros. viewAll=true trae todos (owner/admin). |
| `createBloqueo(data)` | Crea schedule_exception. Professional auto-asignado si role=profesional. |
| `updateBloqueo(data)` | Edita bloqueo existente. Profesional solo edita los suyos. |
| `deleteBloqueo(id, businessId)` | Elimina bloqueo. Profesional solo borra los suyos. |
| `checkConflictosBloqueo(businessId, fecha, professionalId?)` | Lista citas activas en una fecha (útil antes de bloquear). |
| `cancelAppointmentsAndNotify(businessId, ids, motivo?)` | Cancela citas masivamente + notifica por WhatsApp al cliente y al dueño. |

### 2.3 Horarios

| Función | Descripción |
|---------|-------------|
| `getAvailableSlots(businessId, fecha, professionalId?)` | Genera slots de 30min según schedule_text + schedule_exceptions. Filtra ocupados. |
| `updateScheduleText(businessId, schedule)` | Guarda schedule_text del negocio. Solo owner/admin. |
| `getProfessionalSchedule(businessId, professionalId)` | Retorna horario del profesional (o el del negocio si no tiene custom). |
| `updateProfessionalSchedule(businessId, professionalId, schedule)` | Guarda horario custom del profesional. Upsert en professional_schedule. |
| `deleteProfessionalSchedule(businessId, professionalId)` | Elimina horario custom (vuelve al del negocio). |
| `getAllProfessionalSchedules(businessId)` | Lista todos los profesionales con su schedule. |
| `getMiHorarioData(businessId, role, professionalId)` | Data unificada para la vista Mi Horario. |

### 2.4 Servicios

**Nuevo módulo:** `dashboard/lib/services.ts` — CRUD normalizado con tabla `services`.

| Función | Descripción |
|---------|-------------|
| `getServices(businessId)` | Lista servicios activos de un negocio. |
| `getAllServices(businessId)` | Lista todos (activos + inactivos). |
| `getServiceById(serviceId)` | Servicio individual por ID. |
| `getServiceByName(businessId, name)` | Lookup por nombre (soporta sufijo legacy `$precio`). |
| `getServiceDuration(businessId, serviceName)` | Retorna `duration_minutes` o 30 default. |
| `getServicePrice(businessId, serviceName)` | Retorna precio de un servicio. |
| `buildPriceMap(businessId)` | Retorna `Map<name, price>` con alias legacy (`name $precio`). |
| `createService(data)` | Crea servicio con validación (nombre, precio>0, duración 15-480). |
| `updateService(serviceId, data)` | Edita nombre, precio, duración. |
| `toggleServiceActive(serviceId, active)` | Activa/desactiva sin borrar. |
| `deleteService(serviceId)` | Elimina (cascade professional_services). |
| `getProfessionalServices(businessId, professionalId)` | IDs de servicios que puede dar un profesional. |
| `setProfessionalServices(professionalId, serviceIds[])` | Asigna servicios a un profesional. |
| `canProfessionalProvideService(professionalId, serviceId)` | Verifica si un profesional puede dar un servicio. |
| `updateServicesText(businessId, servicesText)` | Guarda services_text + sincroniza tabla services. Legacy. |
| `updateServices(data)` | Versión moderna: recibe array `{nombre, precio, duracion}` + sincroniza tabla services. |

### 2.5 Métricas

| Función | Descripción |
|---------|-------------|
| `getMetricas(businessId, rango, professionalId?, fechaDesde?, fechaHasta?, compararCon?)` | Métricas completas: citas, ingresos, ocupación, retención, sparklines. Cache 15s in-memory. |
| `getMetricasDrawer(businessId, tipo, params)` | Drawers detallados: ingresos, citas-del-día, ocupación, servicio-detalle, cancelaciones, clientes-nuevos. |

### 2.6 CRM

| Función | Descripción |
|---------|-------------|
| `getClientes(businessId, search?, professionalId?)` | Busca clientes con filtro de búsqueda y profesional. Incluye último servicio. |
| `getClienteHistorial(businessId, clienteId)` | Historial de citas del cliente (últimas 50). |

### 2.7 Equipo

| Función | Descripción |
|---------|-------------|
| `getEquipo(businessId)` | Lista miembros del equipo. Solo owner. |
| `createMiembroEquipo(data)` | Crea usuario + profesional si role=profesional. Valida límites del plan. |
| `toggleMiembroActivo(userId, businessId, active)` | Activa/desactiva. Sincroniza con professionals.active. |
| `updateMiembroRole(userId, businessId, role)` | Cambia role. Crea professional_id si es necesario. |
| `updateMiembroCredenciales(data)` | Actualiza nombre/email/password de un miembro. |

### 2.8 Otras

| Función | Descripción |
|---------|-------------|
| `getActiveProfessionals(businessId)` | Lista profesionales activos para selector. |
| `getFutureAppointmentsForProfessional(businessId, professionalId)` | Citas futuras Pendiente/Confirmada de un profesional. |

---

## 3. API Endpoints (Next.js Route Handlers)

### 3.1 `GET /api/appointments/slots?fecha=YYYY-MM-DD&professionalId=N`
- Auth requerida (NextAuth)
- Retorna: `{ slots: string[] }` — ej: `["09:00","09:30","10:00",...]`
- Filtra por horario del negocio → schedule_exceptions → citas ocupadas

### 3.2 `GET /api/appointments/week?professionalId=N`
- Auth requerida
- Retorna: `{ appointments: Record<string, Appointment[]> }` agrupado por fecha
- Semana actual (lunes a domingo, timezone Bogotá)

### 3.3 `GET /api/appointments/month?year=2026&month=7&professionalId=N`
- Auth requerida
- Retorna: `{ appointments: AppointmentRow[] }`

### 3.4 Webhooks (para sync desde n8n) — `/api/webhooks/{sync-new,sync-cancel,sync-reagend}`
- Autenticación via header `x-webhook-secret`
- Excluidos del middleware de NextAuth

---

## 4. Auth System

### 4.1 Login
- NextAuth con provider Credentials (email + password)
- Query: `SELECT u.*, b.name AS business_name, b.multi_professional FROM users u JOIN businesses b ... WHERE active = true`
- JWT contiene: `id, email, name, businessId, businessName, multiProfessional, role, professionalId`

### 4.2 Roles
| Role | Alcance |
|------|---------|
| `owner` | Todo el negocio. Configuración, equipo, límites de plan. |
| `admin` | Todo excepto gestión de usuarios/equipo. |
| `profesional` | Solo sus citas, sus clientes, sus métricas. Filtrado server-side. |

### 4.3 Protección server-side
- `createAppointment`: profesional solo agenda para sí mismo (`professionalId` forzado)
- `updateAppointmentStatus`: profesional solo modifica citas con su `professional_id`
- `createBloqueo`/`deleteBloqueo`: profesional solo afecta sus propios bloqueos
- `updateServicesText`/`updateScheduleText`: solo owner/admin
- `createMiembroEquipo`/`toggleMiembroActivo`: solo owner

---

## 5. Sistema de Auditoría

### 5.1 Tipos (`dashboard/lib/audit-types.ts`)

**Acciones:**
| Constante | Label |
|-----------|-------|
| `create_appointment` | Crear cita |
| `cancel_appointment` | Cancelar cita |
| `complete_appointment` | Completar cita |
| `reactivate_appointment` | Reactivar cita |
| `reschedule_appointment` | Reagendar cita |
| `create_bloqueo` | Bloquear agenda |
| `delete_bloqueo` | Eliminar bloqueo |
| `update_bloqueo` | Editar bloqueo |
| `create_miembro` | Crear miembro |
| `toggle_miembro` | Estado miembro |
| `update_role` | Cambiar role |
| `update_services` | Actualizar servicios |
| `update_professional_schedule` | Actualizar horario profesional |
| `delete_professional_schedule` | Restaurar horario profesional |

**Entidades:** `appointment`, `bloqueo`, `user`, `business`, `professional_schedule`

### 5.2 Registro (`dashboard/lib/audit.ts`)
- Función `auditar(businessId, userId, accion, entidad, entidadId, detalle)`
- INSERT-only. Nunca se actualiza ni elimina.
- Captura IP de `x-forwarded-for` automáticamente.

### 5.3 Consulta (`getAuditLogs`)
- Paginación: 20 registros por página
- Filtros: acción, usuario, rango de fechas
- JOIN con `users` para obtener `user_name`

### 5.4 UI (`dashboard/components/auditoria/auditoria-client.tsx`)
- Tabla con columnas: Acción, Usuario, Entidad, Fecha, Detalle (drawer)
- Drawer lateral con detalle completo incluyendo IP
- Paginación numérica
- Filtros: acción (select), usuario (select), desde/hasta (date)
- Estado vacío con icono

### 5.5 Brechas identificadas
- ❌ No hay colores semánticos por tipo de acción
- ❌ No hay módulo de caja/ventas (payments, descuentos, cierre de caja)
- ❌ No hay before/after estructurado en audit (solo JSON genérico)
- ❌ `update_services` se usa también para schedule (inconsistencia menor)

---

### 6.11 Duración variable (Backend v2)
- Cada servicio tiene `duration_minutes` en tabla `services` (default 30).
- Al crear cita: `hora_fin = hora + duration_minutes + buffer_minutes`.
- `buffer_minutes` por negocio (default 15). Sumado como franja de protección post-servicio.
- Si no existe `hora_fin` (citas legacy): `COALESCE(hora_fin, hora + INTERVAL '30 minutes')`.

### 6.12 Colisión por rango (Backend v2)
- Antes: `WHERE hora = $3` (solo mismo minuto exacto, 30min fijos).
- Ahora: overlap por rango `[hora, hora_fin)`:
  ```sql
  AND hora < COALESCE(existing.hora_fin, existing.hora + INTERVAL '30 minutes')
  AND COALESCE(existing.hora_fin, existing.hora + INTERVAL '30 minutes') > proposed.hora
  ```
- Si la hora propuesta cae dentro del rango de cualquier cita existente del mismo profesional → conflicto.

### 6.13 Filtro de especialidades por profesional (Backend v2)
- `professional_services` define qué servicios puede dar cada profesional.
- `generateSlots()` solo retorna profesionales que tienen el servicio en `professional_services`.
- `createAppointment()` valida: `canProfessionalProvideService(professionalId, serviceId)`.
- Si no hay match → `{error: "El profesional seleccionado no ofrece este servicio"}`.

## 6. Reglas de Negocio (Legacy - pre Backend v2)

### 6.1 Duración de citas
- **30 minutos fijos**. No hay columna `duracion` en appointments.
- El frontend asume 30min por slot. El bot genera slots cada 30min.
- `buffer_minutes` = 15 en businesses, usado por n8n en lógica de colisión. **El dashboard NO usa buffer_minutes.**

### 6.2 Sin turnos simultáneos
- Cada profesional tiene un slot exclusivo. No se permiten overlaps.
- `getAvailableSlots` filtra slots ocupados por profesional.
- `createAppointment` verifica colisión antes de insertar.

### 6.3 Sin variaciones por tipo de cabello
- Cada variante es un servicio separado en `services_text`.
- Ej: "Corte caballero $18.000, Corte+barba $22.000" (NO "Corte $20.000 + suplemento pelo largo").

### 6.4 Estados de cita
```
Pendiente → Confirmada → Completada
         → Cancelada
```
- `Pendiente`: recién creada (por dashboard o WhatsApp)
- `Confirmada`: cliente confirmó (vía bot)
- `Completada`: servicio realizado
- `Cancelada`: no disponible para agendar

### 6.5 Profesional auto-asignado
- Si `createAppointment` no recibe `professionalId`, asigna:
  ```sql
  COALESCE($7, (SELECT id FROM professionals WHERE business_id = $1 AND active = true ORDER BY id LIMIT 1))
  ```

### 6.6 CRM — upsert automático
- Al crear cita, hace upsert en `customers`:
  - Si existe el número: actualiza `nombre`, `ultima_visita`, `total_visitas + 1`
  - Si no existe: crea con `primera_visita = NOW()`

### 6.7 Límites de plan (por negocio)
| Recurso | Límite |
|---------|--------|
| Profesionales | `max_professionals` (default 3) |
| Administradores | `max_admins` (default 1) |

### 6.8 Fechas bloqueadas
- No se pueden bloquear fechas pasadas.
- `horario_especial` define el rango en que el negocio **ABRE** (no que bloquea).
- `cerrado` bloquea el día completo.
- Profesional solo puede bloquear su propia agenda (o `professional_id = NULL` para negocio completo requiere owner/admin).

---

## 7. n8n Integration

### 7.1 Workflows activos (5)
| Workflow | Trigger | Función |
|----------|---------|---------|
| WhatsApp Bot - Genérico | Webhook | Bot conversacional IA multi-propósito |
| Recordatorios 24h - Peluquería Meyer | Cron 15:00 | Recordatorio de cita al día siguiente |
| Recordatorios 2h - Genérico | Cron c/2h | Recordatorio 2h antes |
| Inactividad Bot - Proactivo | Cron c/5min | Detecta conversaciones inactivas |
| No-Shows - Auto Completar | Cron 23:59 | Marca citas del día como Completadas |

### 7.2 Webhooks de sync
- `POST /api/webhooks/sync-new` — cuando n8n crea cita
- `POST /api/webhooks/sync-cancel` — cuando n8n cancela
- `POST /api/webhooks/sync-reagend` — cuando n8n reagenda
- Autenticación: header `x-webhook-secret`
- Registran en audit_log con `origen: "whatsapp"` y revalidan `/dashboard` + `/dashboard/semana`

---

## 8. Contrato API — Aspiracional (para implementar con el frontend)

### 8.1 Crear cita — POST /api/appointments/create
```json
{
  "business_id": 1,
  "fecha": "2026-08-15",
  "hora": "10:30",
  "professional_id": 2,

  "client": {
    "nombre": "Juan Pérez",
    "numero": "573001234567",
    "genero": "masculino",
    "notas": "Prefiere silla cerca de la ventana"
  },

  "servicio": "Corte caballero",
  "duracion_minutos": 30,

  "nota_interna": "Cliente nuevo, recomendado por María",
  "recordatorio": true
}
```

### 8.2 Notas sobre el contrato
- `duracion_minutos` es aspiracional. Hoy el backend fuerza 30min. Requiere migración DB para soportar duración variable.
- No se implementarán servicios múltiples en una misma cita (MVP).
- El `numero` es el identificador único del cliente. Siempre en formato internacional sin `+` (ej: `573001234567`).
- El backend actualmente no acepta JSON directo — solo FormData. El endpoint REST `POST /api/appointments/create` NO existe aún.

---

## 9. Brechas y Limitaciones Conocidas

### 9.1 Backend vs Contrato Aspiracional
| Concepto | Estado actual | Lo que pide el frontend |
|----------|---------------|------------------------|
| Duración | ✅ Variable desde `services.duration_minutes` | Variable por servicio |
| hora_fin | ✅ Existe (calculado + buffer 15min) | Necesario para UI |
| notas/nota_interna | No existe | Necesario |
| Método de pago | No existe | No crítico MVP |
| Importe/descuento | No existe | No crítico MVP |
| Servicios múltiples | No existe | No crítico MVP |
| POST /api/appointments/create | No existe | Necesario |
| buffer_minutes | ✅ Unificado: dashboard + n8n usan mismo buffer | Dashboard debería usarlo |

### 9.2 Sistema de Caja / Ventas
- No existe módulo de payments
- No hay descuentos
- No hay cierre de caja
- Los ingresos se calculan desde la tabla `services` vía `buildPriceMap()` (precio * citas Completadas). Compatibilidad legacy: también funciona si viene de `services_text`.
- Sin columnas de precio por cita (el precio puede cambiar históricamente)

### 9.3 UI
- No hay colores semánticos en auditoría por tipo de acción
- Las vistas de Hoy, Semana, Métricas y Configuración usan estilos independientes (no comparten sistema de diseño unificado)

### 9.4 Varios
- `fetchOcupacion` tiene TODO: usar `COALESCE(ps.schedule_text, b.schedule_text)` cuando professionalId != null (hoy usa siempre el schedule del negocio para el cálculo de ocupación por profesional)
- Middleware de NextAuth excluye webhooks — no hay rate limiting en webhooks
- ~~El bot usa `buffer_minutes` para evitar colisiones cercanas, el dashboard NO~~ ✅ **Resuelto Backend v2:** dashboard y n8n ahora usan el mismo buffer. `hora_fin = hora + duration_minutes + buffer_minutes` se calcula al crear la cita.

---

## 10. Estructura de Archivos Relevantes

```
dashboard/
├── auth.ts                          # NextAuth configuración
├── auth.config.ts                   # NextAuth config (rutas, páginas)
├── lib/
│   ├── actions.ts                   # Server actions (2090 líneas)
│   ├── appointments.ts              # Consultas de citas (hoy, semana, mes)
│   ├── audit.ts                     # Sistema de auditoría
│   ├── audit-types.ts               # Tipos + labels de auditoría
│   ├── db.ts                        # Pool de conexión PostgreSQL
│   ├── services.ts                  # CRUD normalizado: services + professional_services
│   └── parse-services.ts            # Parser de services_text a Map<servicio, precio> (legacy)
├── app/
│   ├── api/
│   │   ├── appointments/
│   │   │   ├── slots/route.ts       # GET slots disponibles
│   │   │   ├── week/route.ts        # GET citas semanales
│   │   │   └── month/route.ts       # GET citas mensuales
│   │   └── webhooks/
│   │       ├── sync-new/route.ts    # Webhook n8n → dashboard
│   │       ├── sync-cancel/route.ts
│   │       └── sync-reagend/route.ts
│   └── (dashboard)/
│       └── dashboard/
│           ├── page.tsx             # Hoy
│           ├── semana/page.tsx      # Vista semana
│           ├── metricas/page.tsx    # Métricas
│           ├── clientes/page.tsx    # CRM
│           └── ...
└── components/
    └── auditoria/
        └── auditoria-client.tsx     # UI de auditoría
```

---

## 11. Backend v2 — COMPLETADO (Jul 2026)

✅ **Backend v2 finalizado e implementado.** Duración variable, servicios normalizados, colisión por rango, especialidades por profesional, métricas corregidas.

### Resumen de cambios (18 tareas)

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Tabla `services` (name, price, duration_minutes) | ✅ |
| 2 | Tabla `professional_services` (PK compuesta) | ✅ |
| 3 | Columna `hora_fin` en appointments | ✅ |
| 4 | Seed: migrar servicios desde services_text | ✅ (14 servicios) |
| 5 | Seed: migrar citas con hora_fin | ✅ (169 citas) |
| 6 | `generateSlots()` con duración variable + buffer | ✅ |
| 7 | Colisión por rango en createAppointment | ✅ |
| 8 | `rescheduleAppointment()` recalcula hora_fin | ✅ |
| 9 | `getMetricas()` usa `buildPriceMap(services)` | ✅ |
| 10 | `getMetricasDrawer()` idem | ✅ |
| 11 | `updateServices()` sincroniza con tabla services | ✅ |
| 12 | `dashboard/lib/services.ts` CRUD completo | ✅ |
| 13 | n8n "Leer Slots Disponibles" con hora_fin | ✅ |
| 14 | n8n "Insertar Cita" con hora_fin | ✅ |
| 15 | n8n "Ejecutar Reagendamiento" con hora_fin | ✅ |
| 16 | n8n "Leer Disponibilidad" con colisión por rango | ✅ |
| 17 | UI editor servicios + asignación profesional | Pendiente |
| 18 | UI card cita muestra duración real | Pendiente |

### Migración ejecutada
- **Archivo:** `database/migrations/018_services_duration.sql`
- **Seed:** `database/seeds/migrate-services-duration.js`
- **Dashboard:** build exitoso, restart vía PM2
- **DB verificada:** 14 services, 72 professional_services, 169/169 citas con hora_fin

### n8n workflow
- Workflow activo: `WhatsApp Bot - Genérico restored.json`
- 4 nodos modificados: Insertar Cita, Leer Slots Disponibles, Leer Disponibilidad, Ejecutar Reagendamiento
- Pendiente: importar el workflow actualizado en n8n (acción del usuario)

### Lo que sigue sin hacer
- UI: editor de servicios (duración configurable)
- UI: asignación de servicios a profesionales (checkboxes)
- UI: mostrar duración real en card de cita
- Endpoint REST `POST /api/appointments/create` (sigue aceptando solo FormData)


