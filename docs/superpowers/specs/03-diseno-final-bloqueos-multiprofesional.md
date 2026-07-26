# Diseño final — Horario y Bloqueos multi-profesional

> **Para el modelo que implemente esto:** este documento es autocontenido. Léelo completo y valida cada punto contra el código y el schema real ANTES de implementar nada. No asumas que otros documentos del repo (`ARCHITECTURE.md`, `CONTEXT_UPDATED.md`, `SPRINTS.md`) reflejan el estado actual — están desactualizados y este documento no depende de ellos. Si algo acá contradice el código real, o el código no coincide con lo que este doc asume, pausa y pide confirmación antes de escribir código.
> Estado: diseño aprobado por el owner del producto para pasar a implementación. Las decisiones de producto (secciones 2-5) ya están tomadas — lo que queda abierto son detalles técnicos de implementación, marcados explícitamente.

---

## 1. Contexto del negocio

SaaS de agendamiento vía WhatsApp para barberías/salones/spas en LATAM. Un negocio puede tener hasta **20 profesionales** según su plan. Tres roles: `owner`, `admin`, `profesional`. Bot conversacional (n8n + WhatsApp) y dashboard web comparten una única base de datos PostgreSQL — no hay paso de "sincronización" separado, el bot lee las mismas tablas en tiempo real.

Esta pantalla ("Mi horario") gestiona dos cosas relacionadas pero distintas:
- **Horario recurrente**: el patrón semanal por defecto (qué días y horas se atiende).
- **Bloqueos/excepciones**: desvíos puntuales de ese patrón (un día cerrado, un horario especial, por negocio o por profesional).

---

## 2. Identificación escalable (hasta 20 profesionales)

**El color deja de ser el identificador primario.** Con 20 profesionales es imposible mantener colores distinguibles a simple vista (el límite práctico ronda 8-10 colores diferenciables). El color pasa a ser refuerzo visual secundario; el identificador real es **avatar con iniciales + nombre en texto**, siempre visible como texto.

- Avatar = iniciales + color de fondo determinístico (hash del nombre/id sobre una paleta ~12 tonos). Colisión de color aceptada — el texto desambigua, no el color.
- Calendario mensual con "Todos" seleccionado: no intentar mostrar 20 colores simultáneos. Un indicador simple (punto + contador si aplica) por día; el detalle se ve al entrar al día o al filtrar por un profesional específico.
- Selector superior "Todos / [profesional]": con más de ~8 profesionales, debe tener búsqueda por nombre, no solo lista scrolleable.
- Lista de bloqueos: agrupar por profesional (secciones colapsables), no lista cronológica plana — una lista plana con 20 profesionales mezclados no es escaneable.

---

## 3. Permisos por rol (tabla final)

| Acción | owner | admin | profesional |
|---|---|---|---|
| Ver bloqueos de todos los profesionales | ✅ | ✅ | ❌ (solo los propios) |
| Crear/editar/eliminar bloqueo de otro profesional | ✅ | ✅ | ❌ |
| Crear/editar/eliminar bloqueo propio | — (no tiene agenda) | — (no tiene agenda) | ✅ |
| Crear bloqueo "Todo el negocio" | ✅ | ✅ | ❌ |
| Editar horario recurrente del negocio | ✅ | ✅ | ❌ |
| Editar horario recurrente propio (override individual) | — | — | ✅ (solo el propio; si el negocio se lo permite, ver sección 4) |

**Regla de UI derivada:** si el usuario logueado es `profesional`, el selector "Todos / [profesional]" no debe existir — su vista ya está implícitamente filtrada a sí mismo. No mostrarle un dropdown con nombres de compañeros que no puede tocar ni necesita ver.

---

## 4. Horario recurrente: patrón base + override opcional

**Decisión:** SÍ se construye, con el patrón "base + override selectivo", no "todos configuran el suyo obligatoriamente". Justificación:

- Si todos los profesionales comparten el mismo patrón semanal y solo varían ocasionalmente → los bloqueos puntuales ya cubren ese caso, un horario propio sería redundante.
- Si un profesional tiene un patrón estructuralmente distinto (ej. medio tiempo, no trabaja domingos nunca) → sin esto, el owner tendría que crear un bloqueo "Cerrado" cada domingo para siempre, lo cual sí es mala UX.

La solución que evita forzar a todos a configurar algo que la mayoría no necesita: **por defecto, cada profesional hereda el horario del negocio. Solo quien tenga un patrón distinto activa un override, una vez, y deja de necesitar bloqueos recurrentes para eso.**

### Modelo de datos propuesto
- Nueva estructura para horario por profesional, análoga al patrón ya usado en `schedule_exceptions.professional_id` (nullable = negocio completo). Ej: tabla `professional_schedule_text` o columna `schedule_text` en `professionals`, **nullable**. `NULL` = hereda `businesses.schedule_text`. Con valor = override completo para ese profesional.
- Regla de fallback: en cualquier query que calcule disponibilidad (dashboard Y bot), primero buscar `professionals.schedule_text`; si es `NULL`, usar `businesses.schedule_text`. Esta regla debe vivir en un solo lugar reutilizado por ambos sistemas — evitar reimplementarla por separado en el dashboard y en el nodo de n8n.

### UI
- Pestaña "Horario semanal" (reemplaza el link oculto actual). Con "Todos" seleccionado, muestra el horario del negocio. Al filtrar por un profesional, muestra su horario efectivo (heredado u override), con badge "Personalizado" en los días que difieran del horario general del negocio — mismo mecanismo que ya se necesitaba para detectar casos tipo "Martes 07:00-20:00" en los datos actuales.
- Botón "Usar horario propio" (toggle) dentro de la vista de un profesional específico — al activarlo, copia el horario del negocio como punto de partida editable; al desactivarlo, vuelve a heredar (con confirmación si ya tenía datos custom, para no perderlos accidentalmente).

---

## 5. Conflicto con citas ya agendadas

Aplica a: crear un bloqueo, cerrar un día, cambiar horario recurrente (negocio o profesional), o desactivar un profesional — cualquier acción que reduzca disponibilidad sobre un rango que ya tiene citas confirmadas o pendientes.

**Patrón estándar de la industria (Acuity, Cal.com, Dynamics 365):** nunca cancelar en silencio. Siempre advertir explícitamente antes de aplicar el cambio, mostrando qué se ve afectado, y requerir confirmación explícita.

### Flujo propuesto
1. Antes de guardar cualquier cambio que se solape con `appointments WHERE estado IN ('Pendiente','Confirmada')` en el rango afectado, el sistema consulta esas citas.
2. Si hay coincidencias, mostrar modal de advertencia:
   > "Este cambio afecta N cita(s) ya agendada(s):
   > • [hora] — [servicio] — [nombre cliente]
   > • ...
   > ¿Deseas cancelarlas y notificar a los clientes, o prefieres elegir otro rango?"
   > Botones: **Cancelar acción** (default/seguro) · **Confirmar y cancelar citas afectadas**
3. Si el owner/admin/profesional confirma:
   - Cada cita afectada pasa a `estado = 'Cancelada'`.
   - Se dispara notificación WhatsApp al cliente por cada cita cancelada, mensaje distinto al de cancelación iniciada por el cliente: algo como *"El negocio tuvo que hacer un ajuste en la agenda. Tu cita de [servicio] del [fecha] a las [hora] fue cancelada. Contáctanos para reagendar 🙏"* — incluir el campo "Motivo" si el usuario lo llenó.
   - Se notifica también al owner/número del negocio con el resumen (cuántas citas, cuáles clientes) — mismo patrón que ya usa "Notificar Dueño" en el flujo de agendamiento.
4. Si cancela la acción, no se guarda el bloqueo/cambio de horario.

### Nota de implementación
Esta notificación es **iniciada por el dashboard, no por una conversación de WhatsApp entrante** — es un caso nuevo: el dashboard necesita poder llamar directamente a Evolution API (mismo endpoint `POST /message/sendText/{instance}` que ya usa n8n) en vez de depender de un workflow disparado por webhook. Requiere que el dashboard tenga acceso a `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` en su propio entorno (`.env.local`), y una función server-side reutilizable para "notificar cancelación por negocio" — separada de la lógica de cancelación iniciada por el cliente que hoy vive en n8n.

---

## 6. Sincronización dashboard ↔ bot (n8n)

No hay sincronización como proceso separado — una sola base de datos compartida. Lo que sí es un requisito no negociable:

1. **Alta/baja/edición de profesionales:** el flujo de selección de profesional del bot debe consultar `professionals WHERE business_id = X AND active = true` **en cada conversación**, sin caché ni lista hardcodeada en n8n. Un profesional creado o desactivado en el dashboard debe reflejarse en el bot sin tocar el workflow.
2. **Una sola fuente de verdad para disponibilidad:** el cálculo de slots disponibles en el dashboard y en el nodo de n8n deben aplicar exactamente el mismo criterio de filtrado (`professional_id`, `schedule_exceptions`, y el fallback de horario descrito en la sección 4). Un bloqueo creado desde el dashboard debe dejar de ofrecerse en el bot en el siguiente mensaje del cliente, sin demora.
3. **Qué pasa al desactivar un profesional con citas futuras** — ver sección 9, ya diseñado.

---

## 7. Minimalismo e intuitividad

- Texto explicativo corto bajo cada título, no solo el título: ej. "Bloqueos y excepciones — cierra días completos o ajusta el horario para uno o varios profesionales, sin afectar el horario semanal habitual."
- Íconos "(i)" con tooltip donde el significado no sea obvio a primera vista, en particular la diferencia entre "Cerrado por [profesional]" y "Todo el negocio" — es la distinción más importante y la más fácil de malinterpretar.
- Progressive disclosure: con 20 profesionales, todo colapsado por defecto, expandir bajo demanda. No renderizar 20 secciones abiertas de una.
- Empty states amigables ("Sin bloqueos este mes 🎉" en vez de una lista vacía sin contexto).
- Confirmaciones solo donde el costo de un error es alto (borrar bloqueo, cancelar citas) — no abusar de confirmaciones en acciones reversibles o de bajo impacto.

---

## 9. Desactivar un profesional con citas futuras

> **Nota para el modelo que implemente esto:** esta sección viene de investigación externa (Jane App, Zoho Bookings, Wix Bookings, Microsoft Bookings), no de nada ya construido en este proyecto. **Compará esto contra cómo funciona hoy `toggleMiembroActivo` y la tabla `professionals`/`users` en el repo local antes de tocar código** — puede que ya exista una parte de esto o que el comportamiento actual sea distinto al que se describe acá. Si encontrás una diferencia, investigá más a fondo esa parte específica antes de implementar, y flagéala.

### Lo que encontré
Hay consenso entre las plataformas de reservas (Jane, Zoho, Wix, Microsoft Bookings) en un patrón de dos niveles, no uno solo:

- **"Desactivar" (soft) ≠ "Eliminar" (hard).** Desactivar no debería, por sí solo, tocar las citas futuras ya agendadas — solo debería sacar al profesional de la lista de opciones para **citas nuevas**. Zoho explícitamente distingue esto: "Inactive" restringe bookings nuevos sin forzar nada sobre lo existente; "Delete" sí bloquea la acción hasta que resuelvas las citas futuras (cancelarlas o reasignarlas).
- Wix va más lejos: si el profesional eliminado era el único asignado a una cita, esa cita queda "no disponible" — no se cancela sola, hay que resolverla manualmente.
- El patrón que más se repite: **nunca actuar en silencio sobre citas futuras.** Siempre mostrar cuántas hay y dejar que el owner decida qué hacer con ellas, como paso explícito y separado de la desactivación misma.

### Diseño propuesto para este proyecto
Separar dos acciones que hoy podrían estar mezcladas conceptualmente:

1. **Desactivar profesional** (`active = false` en `users`/`professionals`, patrón ya existente en el sistema para `businesses.active`): efecto inmediato = deja de aparecer como opción para citas **nuevas**, tanto en el dashboard como en el flujo de selección de profesional del bot. **No cancela ni toca ninguna cita ya agendada.** Esta es la acción rápida y de bajo riesgo — no necesita el flujo de advertencia de la sección 5 porque no afecta nada existente.
2. **Gestionar citas futuras del profesional** (acción separada, ofrecida como paso opcional inmediatamente después de desactivar, con un mensaje tipo: *"[Nombre] tiene N citas futuras agendadas. ¿Quieres cancelarlas ahora o dejarlas como están?"*): si el owner elige cancelarlas, se reutiliza exactamente el flujo de advertencia + cancelación + notificación al cliente ya diseñado en la sección 5 — no es un flujo nuevo, es el mismo aplicado a "todas las citas futuras de este profesional" en vez de "las que chocan con un bloqueo puntual".

Esto evita forzar al owner a resolver todo antes de poder desactivar (fricción innecesaria para el caso común de "este profesional ya no trabaja aquí pero sus citas de esta semana las va a cumplir igual"), sin caer en el otro extremo de cancelar todo en silencio.

## 10. Notificación WhatsApp iniciada desde el dashboard — diseño técnico

> **Nota para el modelo:** confirmá primero si `dashboard/lib/actions.ts` (o donde vivan las server actions) ya tiene algún tipo de llamada saliente a Evolution API, o si hoy el dashboard nunca le habla directo a WhatsApp y todo pasa por n8n. Esto cambia si esto es una función nueva desde cero o una extensión de algo existente.

### Lo que encontré
Confirmé que el patrón estándar para esto en Next.js (App Router) es hacerlo desde una **server action o route handler**, nunca desde el cliente — las server actions ya corren en el servidor, así que leer `EVOLUTION_API_KEY` desde variables de entorno ahí es seguro por diseño (Next.js nunca expone esas variables al bundle del cliente a menos que tengan el prefijo `NEXT_PUBLIC_`). No hace falta un proxy adicional ni una capa extra de infraestructura — es el mismo patrón que ya usa n8n internamente (`this.helpers.httpRequest` con headers de auth), solo que ejecutado desde el server action en vez de un nodo de n8n.

### Diseño propuesto
- Nueva función server-side reutilizable, ej. `lib/whatsapp.ts` con algo como `notificarCancelacionPorNegocio(numero, mensaje)` — hace el mismo `POST /message/sendText/{instance}` que ya usa n8n, con `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` agregados a `dashboard/.env.local` (Mac y VPS) como nuevas variables — **no reutilizar las de n8n directamente si viven en contenedores/procesos separados; verificar si ya son accesibles al proceso del dashboard o si hay que duplicarlas.**
- Se llama desde la server action que ejecuta la cancelación masiva (sección 5 y 9), después de marcar cada cita como `Cancelada` en la misma transacción o inmediatamente después — con manejo de error: si Evolution API falla para un cliente puntual, no debe revertir la cancelación ni bloquear a los demás; loggear el fallo y seguir (mismo principio de "degradación grácil" que ya usa el fallback chain del bot).
- No requiere autenticación adicional de por sí — corre server-side, protegida porque solo la puede invocar una server action ya protegida por sesión de NextAuth (owner/admin, o profesional sobre sus propias citas).

## 11. Resumen de cambios pendientes de implementación

1. Rediseño de identificación (avatar+iniciales, agrupación por profesional) — sección 2.
2. Permisos por rol aplicados a esta pantalla — sección 3.
3. Modelo de datos + UI de horario recurrente con override por profesional — sección 4.
4. Flujo de advertencia + cancelación + notificación al chocar con citas existentes — sección 5.
5. Query de selección de profesional en el bot sin caché (Sprint 12) — sección 6.
6. Separar "desactivar profesional" (soft, no toca citas) de "gestionar sus citas futuras" (reutiliza el flujo de la sección 5) — sección 9.
7. Función server-side `notificarCancelacionPorNegocio` para que el dashboard le hable directo a Evolution API — sección 10.

*Validar cada punto contra el código real antes de escribir. Si algo no coincide con lo que este documento asume, confirmar con el owner antes de proceder.*
