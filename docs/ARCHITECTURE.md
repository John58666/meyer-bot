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
- `professional_id` en `users`: nullable. NULL = dueño/admin (ve todo). Con valor = profesional (ve solo lo suyo).
- `schedule_exceptions`: `professional_id IS NULL` = bloqueo del negocio completo. `professional_id = N` = bloqueo del profesional N. El SQL del bot filtra `professional_id IS NULL` hasta implementar multi-profesional.
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

### Dashboard Sync (webhooks)
- 3 endpoints en `/api/webhooks/`: `sync-new`, `sync-cancel`, `sync-reagend`
- Autenticación via header `x-webhook-secret` contra `WEBHOOK_SECRET` del .env
- El workflow envía datos completos desde los RETURNING de los queries PostgreSQL
- `Sync New Dashboard` corre en paralelo a `Construir Mensajes` después de `Insertar Cita`
- `Sync Cancel Dashboard` / `Sync Reagend Dashboard` corren en paralelo a las notificaciones
- Todos registran en `audit_log` con `origen: "whatsapp"` y revalidan `/dashboard` + `/dashboard/semana`
- Excluidos del middleware de NextAuth via patrón `/((?!api/auth|api/webhooks|...))`

## Decisiones de arquitectura tomadas

### Dashboard — rutas y navegación
- URL base: `https://dashboard.zyvenshop.com`
- Route group `(dashboard)` es invisible en URLs. `app/(dashboard)/dashboard/semana/page.tsx` → URL `/dashboard/semana`.
- `revalidatePath("/dashboard/semana")` ES CORRECTO. No cambiar a `/semana`.

### Navegación — arquitectura definitiva
**Bottom nav móvil (4 ítems fijos, no cambiar sin aprobación):**
- Inicio `/dashboard` ✅
- Agenda `/dashboard/semana` ✅
- Métricas `/dashboard/metricas` ✅
- Clientes `/dashboard/clientes` ✅ (404 hasta Sprint CRM)

**Sidebar PC:**
- Nav principal: Inicio, Agenda, Métricas, Clientes
- Bottom: ⚙️ Configuración, ❓ Ayuda

**Configuración:** accesible desde sidebar PC (engranaje) + dropdown avatar en móvil (`sm:hidden`).
**Ayuda:** sidebar PC únicamente. En móvil: dentro de `/dashboard/configuracion`.
**Patrón investigado (Material Design 3, 2026):** bottom nav 3-5 ítems primarios. Config y Ayuda son secundarios → no en bottom nav.

### Auth — instancia única
- Instancia canónica: `@/auth` (dashboard/auth.ts con authorize + JOIN businesses).
- `dashboard/lib/auth.ts` es re-export limpio de `@/auth`. NO crear segunda instancia.
- `services_text` NO está en el JWT — se fetcha desde DB en cada page server component que lo necesite.
- JWT contiene: `userId`, `email`, `name`, `businessId`, `businessName`, `multiProfessional`, `role`. **Pendiente Sprint RBAC:** `professionalId` (nullable).

### Configuración del negocio — `/dashboard/configuracion`
- Primer ítem: Servicios (edición de `services_text` con preview en tiempo real).
- Estructura preparada para crecer: Horarios (`schedule_text`), Datos del negocio, Profesionales (multi-profesional).
- Validación de formato en cliente Y en servidor (`updateServicesText`).
- `services_text` formato estricto: `"Nombre $precio, ..."`. Coma = separador. Sin coma en nombres.

### Métricas (Sprint 7) — decisiones de diseño
- Vista nueva `/dashboard/metricas` (no integrar en Hoy ni en Semana).
- Ingresos = solo citas con estado `Completada`. No inflar con Pendientes.
- Sin métrica de género en MVP — dato no existe hasta implementar upsert de `customers`.
- Queries con filtro `professional_id` opcional desde el inicio: `AND (professional_id = Y OR Y IS NULL)`.
- Parser de precio como función utilitaria compartida: `match(/\$[\d.,]+/)`.

### Bloqueo de agenda — IMPLEMENTADO Sprint 8 ✅
- UI en `/dashboard/semana/bloqueos` — crear, editar inline y eliminar excepciones.
- `Leer Slots Disponibles` hace JOIN con `schedule_exceptions WHERE professional_id IS NULL`.
- `tipo = 'cerrado'`: ese día no aparece en disponibilidad.
- `tipo = 'horario_especial'`: ese día solo muestra slots dentro del rango `[hora_inicio, hora_fin)`. Define cuándo ABRE, no qué bloquea.
- Slots cada 30 minutos desde Sprint 8 (antes 1 hora).
- Multi-profesional: cuando se implemente, filtrar por `professional_id` del profesional. El schema ya lo soporta.
- **⚠️ Limitación conocida:** si un `horario_especial` amplía el horario más allá del `schedule_text`, los slots extra no se generan. Para MVP (recortes) es correcto.

### RBAC — IMPLEMENTADO Sprint 11-12 ✅
**Estado actual:** Roles `owner`, `admin`, `profesional` operativos. `professionalId` en JWT. Middleware de rutas, filtros server-side, UI condicional.

**Orden de sprints ejecutado:**
1. ✅ Sprint 7: Métricas
2. ✅ Sprint 8: Bloqueos de agenda
3. ✅ Sprint 9: Configuración + Nav
4. ✅ Sprint 11: RBAC (middleware + filtros + UI condicional + equipo)
5. ✅ Sprint 10: CRM (tabla customers + UI clientes)
6. ✅ Sprint 12: Multi-profesional completo

**Modelo de permisos actual:**
| Role | Ve | Puede hacer |
|------|-----|-------------|
| owner | Todo el negocio | Configurar servicios, horarios, profesionales, bloquear cualquier agenda |
| admin | Todo el negocio | Lo mismo excepto gestión de usuarios/equipo |
| profesional | Solo sus citas, clientes y métricas | Marcar completada/cancelada sus citas, bloquear sus propios días |

### Multi-profesional — IMPLEMENTADO Sprint 12 ✅
**Todo completado:**
- ✅ `professionalId` en JWT (Sprint 11)
- ✅ Query de disponibilidad por `professional_id` (`getAvailableSlots`, slots de 30min)
- ✅ Flujo de selección de profesional en el bot (#4: bot pregunta "¿Con qué profesional?")
- ✅ UI de agenda por profesional en dashboard (filtro en SemanaClient + CalendarMonthView)
- ✅ UI de `schedule_exceptions` por profesional (createBloqueo/deleteBloqueo con scope)
- ✅ Métricas por profesional (`getMetricas` con `professionalId` opcional)
- ✅ RBAC server-side: updateServicesText, createBloqueo, createAppointment protegidos
- ✅ Grilla de slots disponibles al agendar desde dashboard (NewAppointmentSheet)
- ✅ Filtro de citas por profesional en vista lista y calendario (SemanaClient)
- ✅ API routes: `/api/appointments/slots`, `/api/appointments/week`

**Cómo funciona el bot multi-profesional (1 número WhatsApp por negocio):**
1. Cliente dice servicio
2. Bot: "¿Con qué profesional quieres agendar?" (lista de profesionales activos del negocio)
3. Cliente elige → disponibilidad de ese profesional
4. Si no elige → bot asigna al primero disponible
5. Cita se guarda con `professional_id` correspondiente

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

### Git — reglas de higiene
- **Nunca `git add -A` sin revisar `git status` primero** — puede incluir archivos huérfanos en la raíz.
- Siempre verificar con `git diff --staged --name-only` antes de commitear.
- Commits desde Mac únicamente. Nunca desde VPS.
- Archivos de documentos temporales (FIX_*.md, etc.) no van al repo — eliminar antes del commit.

### Staging
No existe hoy (VPS sin recursos). Implementar cuando se haga upgrade a 4 vCPU / 8GB.

### n8n — workflow sin staging
1. Duplicar workflow activo con nombre "TEST - WhatsApp Bot"
2. Conectar a instancia de prueba (negocio-prueba, business_id=2)
3. Probar ahí
4. Copiar cambios al workflow real
5. Exportar JSON antes de tocar nada — rollback = reimportar JSON anterior
6. **SQL de n8n no verificable via API REST con auth básica — verificar visualmente en la UI.**

### CRM
- Tabla `customers` ya existe.
- Upsert automático al agendar por WhatsApp: actualiza `ultima_visita`, `total_visitas`, `nombre`.
- UI en dashboard: vista `/dashboard/clientes` — activa el botón del nav que hoy apunta a 404.

### Onboarding de nuevo negocio (proceso manual actual)
1. SQL INSERT en `businesses` con `schedule_text` JSONB y `services_text` en formato `"Nombre $precio, ..."`
2. Evolution API manager: crear instancia con mismo nombre que `whatsapp_instance`
3. Webhook: `POST /webhook/set/{instance}` → `https://n8n.zyvenshop.com/webhook/whatsapp-bot`
4. Conectar número escaneando QR en el manager
5. Crear usuario: `node database/seeds/create-user.js --email=X --password=X --name=X --business_id=N --role=owner`
6. El dueño puede editar servicios desde `/dashboard/configuracion` sin intervención técnica.
