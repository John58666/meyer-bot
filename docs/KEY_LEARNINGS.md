# KEY_LEARNINGS.md — meyer-bot

> Lecciones técnicas acumuladas. Leer cuando se trabaja con n8n, Next.js, LLMs o infra.

## n8n

- **Bug `==` en campos Expression (n8n 2.10.3):** la UI muestra `=` pero persiste `==` en el JSON, rompiendo URLs. NO se arregla en la UI → exportar JSON, corregir con Python, reimportar.
- **`fetch` no existe en Code nodes** → usar `this.helpers.httpRequest`.
- **`docker compose restart` NO relee `.env`** → usar `docker compose down && docker compose up -d`.
- **Always Output Data** obligatorio en nodos Postgres que pueden devolver 0 filas (Leer Sesión activa, Leer Citas Cliente, Leer Historial).
- **Nombres de nodos** case-sensitive y load-bearing. `AI Agent` tiene ~13 referencias downstream. NO renombrar.
- **`$('Nodo').first()`** en vez de `.item` cuando el nodo anterior devuelve múltiples items.
- **Campos HTTP Request** deben estar en modo Expression (ícono fx activo). URL/headers con UN solo `=`.
- **`$env`** requiere `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` en `.env` del contenedor.
- **Workflow duplicado para testing** antes de tocar el activo — no hay staging en n8n.
- **Filtro de mensajes no-texto:** manejar `audioMessage`, `pttMessage`, `imageMessage`, `videoMessage`, `stickerMessage`, `documentMessage`, `locationMessage`, `liveLocationMessage` — todos o el flujo los ignora silenciosamente.

## LLM / Prompting

- **Post-LLM validation gap:** `Leer Slots Disponibles` (pre-LLM) chequea schedule_exceptions + colisiones correctamente. Pero `Leer Disponibilidad` (post-LLM, verificación antes de insertar) SOLO chequea colisiones de appointments. Si el LLM inventa un día/hora, la verificación no lo ataja. Siempre que haya un paso de verificación post-LLM, debe replicar TODAS las validaciones (excepciones, horario, colisiones).

- **Inconsistencia dashboard vs bot en colisiones:** `getAvailableSlots` del dashboard usa match exacto de hora (`s.filter(s => !booked.has(s))`), mientras el bot usa rango de solapamiento (`s.hora >= a.hora AND s.hora < a.hora + (30 + buffer)`). El dashboard muestra más slots disponibles de los realmente existentes.

- **LLM puede ignorar datos estructurados:** aunque el prompt reciba `horariosDisponibles` con datos correctos, el LLM puede inventar días/horas que no están en la lista. Se necesitan reglas explícitas ("SOLO puedes ofrecer días que aparezcan en HORARIOS DISPONIBLES")

- **Instrucciones fuertes** ("OBLIGATORIO", "ÚNICAMENTE", "NUNCA") necesarias para que el LLM use datos de PostgreSQL sobre sus suposiciones.
- **Salida estructurada** (`CITA_CONFIRMADA|servicio|fecha|hora`) > prompting libre para acciones accionables.
- **El normalizador devuelve SOLO el código** si hay match — no mezclar código + texto en un turno.
- **Jerga colombiana** debe enumerarse explícitamente en el prompt. El modelo no la maneja sin ejemplos.
- **Fechas y días de semana** deben precomputarse en JavaScript antes de inyectarlos al prompt. Los modelos los calculan mal desde ISO dates.
- **Short-circuit fuera de horario** antes del LLM: ahorra tokens y es más fiable.
- **Scope off-topic en system prompt** suficiente para volumen bajo (2-10 negocios).
- **Groq llama-3.3-70b y Cerebras llama-3.3-70b** deprecados → migrados a gpt-oss-120b.
- **Servicios nuevos no reflejados en bot:** al guardar desde dashboard, el bot puede usar services_text anterior. Investigar si es orden en system prompt (servicios al fondo → LLM los ignora) o timing del lookup. Fix probable: mover bloque de servicios al inicio del system prompt.
- **Modularización de prompts en n8n:** un template literal monolítico de ~900 tokens puede dividirse en 22 variables con nombre y reensamblarse con output idéntico. El espaciado entre secciones debe preservarse exactamente (`\n\n` vs `\n\n\n` vs `\n`). Usar Python para extracción programática de secciones es más fiable que copiar manualmente.
- **Python para cirugía de jsCode en n8n:** `json.loads()` → extraer secciones por markers → modificar → `json.dumps()` permite cirugía exacta de prompts embebidos en JSON de n8n sin riesgo de corrupción de quoting.
- **Verificación de reconstrucción antes de aplicar:** diff entre el prompt original y el reconstruido desde variables garantiza output idéntico. Sin esto, cambios invisibles de espaciado pueden alterar comportamiento del LLM.
- **Emojis U+1F464 vs U+1F9D1 en búsquedas de string:** `👤` (BUST IN SILHOUETTE) y `🧑` (PERSON) tienen code points diferentes. Al hacer string replacement en Python, usar `\U0001f464` no `\U0001f469\u200d\U0001f4bb` — el emoji real en el código JS determina el match.
- **AM/PM directo desde PostgreSQL es más fiable que formateo JS:** `to_char(hora, 'HH12:MI AM')` produce "10:00 AM" correctamente. Cualquier `.replace()` posterior puede introducir inconsistencia entre secciones del prompt.
- **Dual data pass para LLM con límite de visualización:** pasar `disponibilidad` (truncada, 8 slots) + `disponibilidadCompleta` (todos los slots) permite al LLM mostrar resultados comprimidos por defecto y expandir cuando el cliente pide más, sin desperdiciar tokens en cada turno.
- **Español colombiano neutro para prompts de agendamiento:** el prompt debe especificar explícitamente "no vos", listar palabras colombianas y prohibir modismos rioplatenses. Sin instrucción explícita, los LLMs tienden a argentino/voseo por defecto en español latinoamericano.
- **Ley 1581 integrada en prompt:** respuesta genérica sobre protección de datos se implementa como sección en el prompt con template `${d.politicaPrivacidadUrl || 'placeholder'}`. La URL se pasa desde el business lookup en el flujo del bot.

- **Nunca instruir al LLM a tratar números como índices de lista:** El prompt original decía "Si dice solo un número, es la posición en el listado" en reagendar PASO 3. Esto causó que "3" se interpretara como posición 3 (10:00 AM) en vez de 3 PM. La regla correcta: números del 1 al 12 son HORAS, solo frases como "la primera", "la opción 1" son posiciones.

- **Reagendamiento necesita confirmación explícita igual que agendamiento:** El flujo de reagendar no tenía paso de confirmación — emitía REAGENDAR_CITA inmediatamente después de elegir hora. Se agregó PASO 4 con resumen y pregunta "¿Confirmamos el reagendamiento?" siguiendo el mismo patrón que agendamiento.

## Dashboard / Frontend

- **Extensibility via `onSave` prop pattern:** When a server component (like `HorarioClient`) has a hardcoded server action call (`updateScheduleText`), add an optional `onSave` prop that overrides the default. This lets parent components reuse the same UI for different server actions (e.g., `updateProfessionalSchedule`) without duplicating component code. The pattern: `const result = onSave ? await onSave(schedule) : await defaultAction(id, schedule)`.
- **COALESCE fallback pattern for per-professional schedules:** `COALESCE(ps.schedule_text, b.schedule_text)` in SQL gives each professional their own schedule while falling back to the business default. All 3 data consumers (dashboard server actions, n8n `Leer Slots Disponibles`, n8n `Leer Disponibilidad`) must apply the same COALESCE pattern. The `professional_schedule` table uses `ON CONFLICT (business_id, professional_id) DO UPDATE` — UPSERT, not INSERT+UPDATE.
- **CSS-only > JS state para responsive en Sheet/Dialog.** `useState` + `useEffect` para detectar mobile en 4 componentes Sheet montados simultáneamente provoca re-render cascade (todos flipean `isMobile: false→true`). base-ui Dialog puede renderizar overlays fantasma durante estos re-renders incluso con `open={false}`. Preferir `max-md:!w-[90vw]` sobre `side={isMobile ? 'bottom' : 'right'}`.
- **`data-[side=right]:w-3/4` tiene mayor especificidad CSS que `.w-\[90vw\]`** — necesita `!important` para override.
- **`rgba()` en borders es caro para GPU móvil.** Cada borde semitransparente (`rgba(255,255,255,0.06)`) fuerza una capa de composición GPU separada porque el navegador debe blendear el píxel del borde con el fondo detrás. Con 10-15 instancias visibles simultáneamente (cards + sidebar + topbar + bottom nav + charts), la memoria de composición GPU se satura y produce artefactos de estática/píxeles rotos. Preferir hex sólidos en CSS variables compartidas para borders.
- **Un CSS variable bien ubicado > editar N archivos.** Cambiar `--border-subtle` de rgba a hex en `globals.css` arregla todos los componentes simultáneamente (cards, nav, charts, sidebar) sin tocar cada archivo individual.
- **`backface-visibility: hidden` no arregla saturación de composición GPU.** El problema no es transición CSS sino cantidad de capas que el GPU debe componer. Eliminar la fuente de composición (`rgba` borders) es más efectivo que parchar síntomas.
- **Animaciones recharts (`animationDuration`, `animationBegin`) fuerzan repaint SVG en cada frame en móvil.** Desactivar con `isAnimationActive={false}` reduce trabajo de GPU significativamente.
- **Heatmap grid cells con rgba también saturan composición GPU.** backgroundColor con rgba en cada celda de grid crea capas de composición individuales. Aplicar hex sólido pre-multiplicado sobre el fondo conocido.
- **Pre-multiplicación de color:** para simular transparencia rgba sobre fondo fijo (ej: `#1A1A1A`), calcular `rgb(base + alpha*(color - base))` y usar hex resultante. Cero capas GPU, visualmente idéntico.
- **`h-48` fijo se ve comprimido en tablet.** Preferir `min-h-48` para estados vacíos/error.
- **`truncate` (Tailwind) = `overflow-hidden` + `text-overflow: ellipsis` + `white-space: nowrap`.** Útil para labels largos en cards con `uppercase tracking-wide` donde el texto puede desbordar en mobile.
- **`transition-all` es agresivo en móvil.** Preferir `transition-colors`, `transition-opacity`, etc. cuando solo se necesita animar propiedades específicas. `transition-all` obliga al browser a preparar capas para animar cualquier propiedad, incluso cuando no cambia.

## Next.js / Dashboard

- **Route groups** `(nombre)` NO aparecen en la URL. `app/(dashboard)/dashboard/semana/page.tsx` → URL `/dashboard/semana`. NO confundir al escribir `revalidatePath`.
- **`revalidatePath("/dashboard/semana")`** ES CORRECTO. NO cambiar a `/semana`.
- **NextAuth v5 con dos instancias** rompe la sesión silenciosamente. Una sola instancia canónica: `@/auth`.
- **`services_text`** no está en el JWT — fetcharlo desde DB en cada page server component.
- **bcryptjs** sobre bcrypt (pure JS, sin compilación nativa). **AUTH_SECRET** no NEXTAUTH_SECRET en NextAuth v5. **saltRounds=12** (igual que `create-user.js`).
- **`professional_id` en queries:** diseñar con filtro opcional `AND ($n::int IS NULL OR professional_id = $n)` desde el inicio. Owner/admin → NULL → ve todo. Profesional → su ID → ve solo lo suyo.
- **RBAC implementado en Sprint 11.** Roles: `owner`, `admin`, `profesional`. `professionalId` en JWT.
- **Conteo de límite de plan:** usar `users WHERE role='profesional' AND active=true`, NO tabla `professionals` — puede tener filas huérfanas de owner/admin.
- **`params` en Next.js 16 App Router** es `Promise<{id: string}>` — siempre `await params` antes de leer propiedades.
- **Page components NO deben tener `max-w` ni `mx-auto`** — el `<main>` del layout maneja el espaciado.
- **`sm:hidden` en Tailwind** oculta en ≥640px, muestra en móvil — patrón correcto para ítems solo móvil.

## PostgreSQL

- **Timezone:** PostgreSQL corre en UTC. Usar `(NOW() AT TIME ZONE 'America/Bogota')::date`, nunca `CURRENT_DATE`.
- **Apóstrofes en SQL embebido en JS:** escapar con `.replace(/'/g, "''")` antes de interpolación.
- **Migraciones siempre aditivas:** agregar columnas nullable, nunca borrar en producción activa.
- **Ejecutar migración ANTES del deploy de código nuevo.**
- **Tener SQL de rollback listo** antes de ejecutar cualquier migración.
- **Orden para rename de role con CHECK constraint:** (1) ampliar constraint a ambos valores temporalmente, (2) UPDATE datos existentes, (3) cerrar constraint al valor final. Hacerlo en otro orden da error de violación de constraint.
- **Verificar constraint antes de INSERT:** `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'nombre_constraint'`.
- **Datos corruptos en DB** pueden simular bugs de código. Verificar dato en DB antes de asumir bug de lógica.
- **`users_role_check`** constraint historicamente tenía `employee` — eliminado en Sprint 11. Valores actuales: `owner`, `admin`, `profesional`.

## Infra / Deploy

- **`pm2 restart`** tiene downtime ~30-60s. Usar **`pm2 reload`** para zero-downtime cuando haya 10+ clientes.
- **Commits siempre desde Mac, nunca desde VPS.** El VPS solo hace `git pull`.
- **`npm run build` se ejecuta desde `/root/meyer-bot/dashboard/`**, NO desde la raíz del repo.
- **Tunnel SSH:** `ssh -f -N -L 5432:localhost:5432 root@178.104.27.180`. Cerrar con `kill $(lsof -t -i:5432)`.
- **Evolution API expuesta en 0.0.0.0:8080** — pendiente firewall.
- **`lib/auth.config.ts` en `dashboard/lib/` es huérfano** — el middleware importa `./auth.config` (relativo a `dashboard/`). Verificar con `cat middleware.ts | head -3` antes de editar.

## PostgreSQL / JSON columns

- **`pg` driver auto-parsea JSON columns.** Si una columna es tipo `JSON`/`JSONB`, `pg` la devuelve como objeto JavaScript ya parseado. Hacer `JSON.parse()` sobre un objeto lanza error. Usar: `const data = typeof raw === 'string' ? JSON.parse(raw) : raw`.
- **Fechas en PostgreSQL:** `CURRENT_DATE` depende del timezone de la DB (usualmente UTC). Para fecha en Colombia usar `(NOW() AT TIME ZONE 'America/Bogota')::date`.

## Next.js / API Routes

- **`fetch` desde cliente a API route del mismo origen:** las cookies se envían automáticamente. No necesita headers especiales.
- **Server actions importadas desde `"use server"` file:** cuando se llaman desde API route (server-side), funcionan como funciones regulares. No hay transformación especial.
- **`useCallback` con `[]` deps:** captura variables del closure en el momento de creación. Si usas una prop reactive (como `professionalFilter`), el callback tendrá el valor inicial. Solución: incluir la prop en deps o pasarla como argumento.

## n8n / Workflow

- **Workflows exportados no se pueden importar por API si n8n API devuelve 401.** La UI de n8n no tiene autenticación funcional por API con auth básica en esta versión. Solo import manual desde la UI.

## Debugging

- **Cuando un server action o API route devuelve resultado inesperado (ej: array vacío), agregar logs temporales en el servidor.** PM2 logs (`pm2 logs meyer-dashboard`) muestran `console.log` de Node.js.
- **Verificar tipo de dato de columnas PostgreSQL.** Un `JSON` column devuelto por `pg` no es string — verificarlo antes de asumir tipo.
- **Errores silenciosos en `try/catch` pueden ocultar bugs.** Mostrar error al usuario o al menos loguearlo con contexto suficiente.

## Diagnóstico

- **Claude.ai puede equivocarse en diagnósticos.** Claude Code debe chequear rutas/hechos reales antes de asumir que el diagnóstico es correcto.
- **Errores de autenticación n8n (`password authentication failed`):** la credencial en n8n UI puede no coincidir con la password actual en PostgreSQL. Solución: Settings → Credentials → "Postgres account" → actualizar password → Test connection.
- **Nunca `git add -A` sin revisar `git status` primero** — puede incluir archivos huérfanos (FIX_*.md, package.json raíz, etc.).

## n8n / Docker

- **`ECONNREFUSED ::1:3001`** desde contenedor n8n → `localhost` resuelve a IPv6 `::1` dentro del contenedor. Usar `127.0.0.1` en vez de `localhost`, o mejor `host.docker.internal` con `extra_hosts: - "host.docker.internal:host-gateway"` en compose.
- **`docker compose up -d` es necesario tras cambiar `.env` o compose** — `restart` no relee variables ni configuración de red.
- **Middleware de NextAuth por defecto protege TODAS las rutas** incluyendo `/api/webhooks`. Excluir con `matcher: ["/((?!api/auth|api/webhooks|...).*)"]`.

## Auditoría

- **`revalidatePath` no funciona desde webhook externo** si la ruta está protegida por middleware de auth. El webhook debe hacerlo desde server-side sin pasar por auth.
- **`audit_log` acepta `user_id = NULL`** para acciones originadas desde n8n/WhatsApp (cancelación vía webhook, no-shows automáticos).

## n8n / Database

- **Code node v2 `displayOptions` requiere `mode` + `language` exacto:** El parámetro `jsCode` tiene `displayOptions` que exigen `mode: 'runOnceForAllItems'` y `language: 'javaScript'` (camelCase, con S mayúscula). Si `language` es `'javascript'` (minúsculas) o `mode` falta, n8n lanza `Could not get parameter` aunque `jsCode` esté en la DB. Siempre inyectar ambos.
- **Editar workflow activo vía SQLite directo:** `workflow_entity.nodes`, `workflow_history.nodes`, `workflow_entity.activeVersionId` deben estar sincronizados. Si solo se cambia `workflow_entity`, n8n puede usar la versión de `workflow_history` referenciada por `activeVersionId`.
- **`versionId` en `workflow_entity`** debe ser un hex string de 32 chars (`os.urandom(16).hex()`). Si no se actualiza, n8n puede ignorar los cambios.
- **`publishedVersionId` en `workflow_published_version`** puede ser NULL si el workflow se activó sin pasar por "Save + Publish". En ese caso, `activeVersionId` apunta directamente a `workflow_history`.
- **`json_set` en SQLite falla con JSON paths array-indexados** (ej: `$[0].parameters.rule`). Usar Python con `json.loads()` → modificar → `json.dumps()` en vez de SQLite JSON functions.
- **Code node en n8n v2.x** usa `jsCode` (no `code`) como nombre de parámetro para JavaScript. Si el parámetro se llama `code`, n8n lanza `Could not get parameter`.
- **Schedule trigger en DB** se almacena como `rule.interval[0]` con `field` y `expression`, NO como `triggerTimes.item[0].mode/value` que es el formato del JSON exportado.
- **`docker compose restart n8n`** es suficiente cuando se cambia la DB — el contenedor vuelve a leer SQLite al arrancar.
- **Verificar DB state con Python** es más fiable que SQLite CLI cuando hay quoting complejo. Copiar script al VPS con `scp` y ejecutar.
- **SQLite WAL mode + Docker:** copiar DB mientras el contenedor n8n está corriendo causa corrupción en WAL mode. Siempre `docker stop n8n-n8n-1` antes de modificar la DB vía Python. Revisar con `PRAGMA integrity_check`.
- **`$input.all()` bug n8n 2.10.3:** en Code node v2, `$input.all()` devuelve `[]` cuando el nodo anterior es PostgreSQL. Workaround: usar `$("PreviousNodeName").all()` con el nombre exacto del nodo.
- **HTTP Request node sobreescribe `$json`:** después de un HTTP Request, todas las propiedades del input se pierden. Para preservarlas: (a) usar `$("SourceNode").item.json.property`, o (b) usar Set/Code node intermedio para guardar datos necesarios antes del HTTP Request.
- **Postgres `executeQuery` en modo default:** ejecuta la query UNA vez para todos los items (`runOnceForAllItems`). Si necesitas ejecutar por item (ej: UPDATE con datos diferentes por fila), establecer `mode: 'runOnceForEachItem'`.
- **Evolution API quoted messages:** cuando el usuario selecciona un mensaje y responde, el payload incluye `data.contextInfo.quotedMessage.conversation`. Usar este campo para dar contexto al LLM sobre a qué está respondiendo.
- **Evolution API botones/listas:** los mensajes de tipo `buttonsResponseMessage` y `listResponseMessage` no tienen campo `conversation` — el texto está en `selectedButtonId` o `selectedDisplayText`. No asumir `conversation` siempre presente.
- **Reaction y protocol messages:** WhatsApp envía `reactionMessage` (👍) y `protocolMessage` (mensaje eliminado) como tipos separados. Ambos deben filtrarse con `return []` temprano para no romper el flujo.
- **Normalización de acentos en JS:** para comparar texto en español sin importar tildes, usar `.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')`. Esto elimina los diacríticos dejando solo los caracteres base.
- **`$("Node").item` en `runOnceForAllItems`:** cuando un nodo ejecuta una vez para todos los items, `$("Node").item` resuelve al item índice 0 de `"Node"`. Para datos multi-item en UPDATE, cambiar a `runOnceForEachItem` para que cada ejecución tenga su propio contexto.
- **Code node intermedio elimina campos del SQL node:** si un Code node (ej: `Filtrar Mañana1`) procesa el output de un Postgres node y solo pasa ciertos campos al output, cualquier campo no incluido se pierde. HTTP node downstream que referencie esos campos con `$json.field` recibirá `undefined`. Solución: incluir explícitamente el campo en el output del Code node, o referenciar el Postgres node directamente con `$('SQLNode').item.json.field`.

## Next.js / Auth

- **Middleware redirect vs client-side nav:** En Next.js con App Router, el middleware corre en client-side navigation (next/link) también. Si el middleware retorna `Response.redirect()`, la navegación se intercepta. Sin embargo, redirects en `authorized` callback de NextAuth v5 beta pueden no funcionar correctamente — verificar siempre con logs si el redirect se ejecuta.
- **`professionalId` en JWT:** El tipo es `number | null` en sesión. El valor PostgreSQL (`u.professional_id`) es integer. En JWT serializado como JSON, se mantiene como número. `Number(professionalId)` con número ya es redundante pero seguro.

## Dashboard

- **Server actions desde `"use client"` components:** Next.js interpone un fetch HTTP para llamar a funciones `"use server"`. Si la build no crea el endpoint correctamente, el fetch falla silenciosamente (el catch en la server action captura el error y retorna `[]`). Verificar que la función exista en los chunks del build output.
- **`useEffect` sin try/catch en server action call:** Si `getAllProfessionalSchedules` lanza error no capturado (ej: fuera del try/catch), la promesa se rechaza, `setLoading(false)` no se ejecuta nunca, y el componente queda en loading forever. Asegurar try/catch alrededor de toda la lógica en server actions.

## Git

- **Antes de commitear:** `git diff --staged --name-only` para confirmar exactamente qué archivos van.
- **Archivos temporales** (FIX_*.md, etc.) no van al repo — eliminar antes del commit.
- **Commits desde Mac únicamente, nunca desde VPS.**
