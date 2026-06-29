# ARCHITECTURE.md — meyer-bot

> Decisiones de arquitectura, schema DB, principios no negociables, diseño pendiente.
> Actualizar cuando se tome una decisión arquitectónica nueva.

## Schema DB completo

```sql
businesses (id, slug, name, whatsapp_instance, owner_number, timezone, active,
            multi_professional, services_text, prompt_name, schedule_text)

appointments (id, business_id, professional_id, fecha, hora, nombre, servicio,
              numero, estado, calendar_event_id, created_at, updated_at)

users (id, email, password_hash, name, business_id, role, active,
       last_login_at, created_at, updated_at, professional_id)
-- professional_id agregado en migración 005 (Sprint 7). Nullable.

professionals (id, business_id, name, active, created_at, updated_at)

sessions (id, business_id, numero, accion, citas JSONB, expires_at, created_at)  -- TTL 30 min

customers (id, business_id, numero, nombre, genero, preferred_professional_id,
           notas, primera_visita, ultima_visita, total_visitas, created_at, updated_at)

schedule_exceptions (id, business_id, professional_id, fecha, tipo,
                     hora_inicio, hora_fin, motivo, created_at)

conversation_history (business_id, numero, messages JSONB, updated_at, expires_at)  -- TTL 2h
                     -- PK/UNIQUE (business_id, numero)
```

### Notas de schema
- `schedule_text` JSONB: `{"0":{"open":10,"close":17},"1":{"open":9,"close":19},...}`. Clave = día semana 0-6 (domingo=0). Día sin clave = cerrado. Portable a Redis.
- `services_text` formato: `"Nombre $precio, Nombre2 $precio2"`. Coma como separador. **La coma NO se usa en nombres de servicios.** Parseado en dashboard con split+regex. A futuro: tabla `services` normalizada.
- `professional_id` en `users`: nullable. NULL = dueño/admin (ve todo). Con valor = barbero (ve solo lo suyo).
- `schedule_exceptions`: `professional_id IS NULL` = bloqueo del negocio completo. `professional_id = N` = bloqueo del barbero N. El SQL del bot filtra `professional_id IS NULL` hasta implementar multi-barbero.
- `schedule_exceptions.tipo = 'horario_especial'`: define el rango en que el negocio **ABRE** ese día (no el rango bloqueado). Los slots fuera de ese rango quedan excluidos.

## Principios no negociables
- **Una sola DB PostgreSQL** — Supabase+Vercel rechazado por DB separadas.
- **Polling sobre WebSockets** — correcto para el volumen actual.
- **Generic over specific** — un workflow parametrizado para todos los negocios.
- **Diseño portable** — cada decisión considera migración futura a Node.js+BullMQ+Redis.
- **Tres horizontes** — funciona hoy / sobrevive migración / no expone errores al cliente.
- **sessions/conversation_history en PostgreSQL** — misma interfaz que Redis; se reemplaza sin cambiar lógica de negocio.
- **No construir sin aprobación** — diseñar y aprobar antes de ejecutar.
- **Migraciones siempre aditivas y backwards-compatible** — agregar columnas nullable, nunca borrar en producción activa. Código nuevo funciona con columna nueva; código viejo la ignora. Ejecutar migración ANTES del deploy del código.

## Arquitectura del Workflow Genérico ("WhatsApp Bot - Genérico", ACTIVO)

### Fase 1: Recepción y Filtrado
1. **Webhook** → path `whatsapp-bot`, recibe todos los negocios
2. **Filtro Inicial** → descarta grupos (@g.us) y mensajes vacíos
3. **Lookup Negocio** → SELECT en businesses por `$json.body.instance`
4. **¿Negocio Existe?** → descarta instancias no registradas

### Fase 2: Procesamiento
5. **Procesar Mensaje** → filtro fromMe, filtro multimedia (audio/imagen/video/sticker/doc/ubicación responde mensaje amable y corta), rate limit 50msg/hora, fechas, validación horario, numeroLimpio
6. **Leer Sesión activa** → lee `sessions` activas (Always Output Data ON)
7. **Leer Slots Disponibles** → generate_series con schedule_text JSONB; slots cada **30 minutos** (`hora_close_last_min = close * 60 - 30`); filtra slots pasados; JOIN con `schedule_exceptions` para días cerrados y horarios especiales (`professional_id IS NULL`).
8. **Formatear Disponibilidad** → agrupa slots + inyecta sesionContexto con fecha/hora PRECALCULADAS

### Fase 3: IA
9. **Leer Historial** → lee `conversation_history` (Always Output Data ON)
10. **AI Agent** (Code node) → short-circuit fuera de horario, system prompt dinámico con scope off-topic, fallback chain multi-LLM, normalización, actualización historial
11. **Guardar Historial** → upsert en `conversation_history`
12. **Wait** → 3 segundos

### Fase 4: Switch de 5 ramas
13. **Switch** → CITA_CONFIRMADA / GESTIONAR_CITA / CANCELAR_CITA / REAGENDAR_CITA / Fallback

### Nodos críticos
- **Leer Sesión activa / Leer Citas Cliente / Leer Historial**: Always Output Data = ON
- **AI Agent**: nombre load-bearing, NO renombrar (~13 referencias downstream)
- **HTTP Request (Confirmar Cancelación)**: contentType raw, body `{{ $json.body }}`, URL/apikey con UN solo `=`
- **Confirmar Reagendamiento**: usa IIFE en bodyParameters — deuda técnica, funciona pero frágil

## Decisiones de arquitectura tomadas

### Dashboard — rutas y navegación
- URL base: `https://dashboard.zyvenshop.com`
- Route group `(dashboard)` es invisible en URLs. `app/(dashboard)/dashboard/semana/page.tsx` → URL `/dashboard/semana`.
- `revalidatePath("/dashboard/semana")` ES CORRECTO. No cambiar a `/semana`.
- **Bottom nav definitivo (4 ítems, no cambiar sin aprobación):**
  - Inicio `/dashboard` ✅
  - Agenda `/dashboard/semana` ✅
  - Métricas `/dashboard/metricas` ✅ Sprint 7
  - Clientes `/dashboard/clientes` (Sprint CRM)

### Auth — instancia única
- Instancia canónica: `@/auth` (dashboard/auth.ts con authorize + JOIN businesses).
- `dashboard/lib/auth.ts` es re-export limpio de `@/auth`. NO crear segunda instancia.
- `services_text` NO está en el JWT — se fetcha desde DB en cada page server component que lo necesite, en paralelo con otras queries.
- JWT contiene: `userId`, `email`, `name`, `businessId`, `businessName`, `multiProfessional`, `role`. **Pendiente Sprint RBAC:** `professionalId` (nullable).

### Métricas (Sprint 7) — decisiones de diseño
- Vista nueva `/dashboard/metricas` (no integrar en Hoy ni en Semana).
- Ingresos = solo citas con estado `Completada`. No inflar con Pendientes.
- Sin métrica de género en MVP — dato no existe hasta implementar upsert de `customers`.
- Queries con filtro `professional_id` opcional desde el inicio: `AND (professional_id = Y OR Y IS NULL)`. Dueño → Y=NULL → ve todo. Barbero → Y=su ID → ve solo lo suyo.
- Exportación CSV incluida (botón en la vista). Sin integración con Excel/Sheets — CSV es universal.
- Parser de precio como función utilitaria compartida: `match(/\$[\d.,]+/)`.

### Bloqueo de agenda — IMPLEMENTADO Sprint 8 ✅
- UI en `/dashboard/semana/bloqueos` — crear y eliminar excepciones (edición en Sprint 9).
- `Leer Slots Disponibles` hace JOIN con `schedule_exceptions WHERE professional_id IS NULL`.
- `tipo = 'cerrado'`: ese día no aparece en disponibilidad.
- `tipo = 'horario_especial'`: ese día solo muestra slots dentro del rango `[hora_inicio, hora_fin)`. Define cuándo ABRE, no qué bloquea.
- Slots cada 30 minutos desde Sprint 8 (antes 1 hora).
- Multi-barbero: cuando se implemente, filtrar por `professional_id` del barbero. El schema ya lo soporta.
- **⚠️ Limitación conocida:** si un `horario_especial` amplía el horario más allá del `schedule_text`, los slots extra no se generan — el `generate_series` parte del horario base. Para MVP (recortes, no ampliaciones) es correcto.

### RBAC — pendiente, prerrequisito de multi-barbero
**Estado actual:** `role` viaja en JWT pero nadie lo lee. Un barbero con login puede hacer todo lo que hace el dueño dentro del mismo negocio.

**Orden de sprints obligatorio:**
1. ✅ Sprint 7: Métricas (con `professional_id` en users/JWT preparado)
2. ✅ Sprint 8: Bloqueos de agenda
3. Sprint RBAC: middleware de rol + filtros en actions + UI condicional por role
4. Sprint multi-barbero: feature completo

**Sin RBAC no lanzar multi-barbero.**

**Modelo de permisos a implementar:**
| Role | Ve | Puede hacer |
|------|-----|-------------|
| owner | Todo el negocio | Configurar servicios, horarios, profesionales, bloquear cualquier agenda |
| admin | Todo el negocio | Lo mismo excepto configuración de precios/horarios |
| barbero | Solo sus citas y métricas | Marcar completada/cancelada sus citas, bloquear sus propios días |

### Multi-barbero — diseño pendiente
Un negocio con N barberos = N agendas independientes bajo un mismo techo.

**Ya resuelto:** tabla `professionals` ✅ · `professional_id` en `appointments` ✅ · flag `multi_professional` en JWT/UI ✅ · tabla `schedule_exceptions` ✅ · bloqueos por `professional_id` soportados en SQL del bot ✅

**Falta diseñar:**
1. `professionalId` en JWT (columna en `users` ya existe)
2. Query de disponibilidad por `professional_id`
3. Flujo de selección de barbero en el bot (2 turnos extra)
4. UI de agenda por barbero en dashboard
5. UI de `schedule_exceptions` por barbero (el dueño bloquea días de cada barbero; el barbero bloquea los suyos)
6. Métricas por barbero

**Bot multi-barbero (1 número WhatsApp por negocio):**
1. Cliente dice servicio
2. Bot: "¿Tienes barbero de preferencia? Si no, te asigno el primero disponible 😊"
3. Si elige → disponibilidad de ese barbero. Si no → slots donde haya al menos un barbero libre.

### Deploy seguro — protocolo
```
1. Desarrollar en Mac (local con túnel SSH para DB)
2. Probar en local
3. Ejecutar migración DB en VPS (ANTES del deploy de código)
4. git push → git pull VPS → npm run build → pm2 restart meyer-dashboard
5. Verificar en producción
6. Si hay problema → git revert → git push → mismo flujo
```
Cuando haya 10+ clientes: usar `pm2 reload` (zero-downtime) en vez de `pm2 restart`.

### Staging
No existe hoy (VPS sin recursos). Implementar cuando se haga upgrade a 4 vCPU / 8GB.

### n8n — workflow sin staging
Estrategia de cambio seguro:
1. Duplicar workflow activo con nombre "TEST - WhatsApp Bot"
2. Conectar a instancia de prueba (negocio-prueba, business_id=2)
3. Probar ahí
4. Copiar cambios al workflow real
5. Exportar JSON antes de tocar nada — rollback = reimportar JSON anterior
6. **SQL de n8n no verificable via API REST con auth básica — verificar visualmente en la UI.**

### Exportación de datos
- CSV en vista de métricas y futura vista de clientes.
- Sin integración directa con Excel/Sheets/Google por ahora — CSV es universal y sin complejidad.
- Feature aditiva: no modifica tablas, no cambia schema, se agrega en cualquier momento.

### CRM
- Tabla `customers` ya existe.
- Upsert automático al agendar por WhatsApp: actualiza `ultima_visita`, `total_visitas`, `nombre`.
- UI en dashboard: vista de clientes con historial, notas editables, métricas.
- Cuando CRM esté activo, agregar métrica de género (la columna `genero` ya existe en `customers`).

### Onboarding de nuevo negocio (proceso manual actual)
1. SQL INSERT en `businesses` con `schedule_text` JSONB y `services_text` en formato `"Nombre $precio, ..."`
2. Evolution API manager: crear instancia con mismo nombre que `whatsapp_instance`
3. Webhook: `POST /webhook/set/{instance}` → `https://n8n.zyvenshop.com/webhook/whatsapp-bot`
4. Conectar número escaneando QR en el manager
5. Crear usuario: `node database/seeds/create-user.js --email=X --password=X --name=X --business_id=N --role=owner`
6. Título del dashboard, servicios del formulario y UI multi-barbero son automáticos — no requieren código por cliente.
