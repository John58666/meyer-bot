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

- **Instrucciones fuertes** ("OBLIGATORIO", "ÚNICAMENTE", "NUNCA") necesarias para que el LLM use datos de PostgreSQL sobre sus suposiciones.
- **Salida estructurada** (`CITA_CONFIRMADA|servicio|fecha|hora`) > prompting libre para acciones accionables.
- **El normalizador devuelve SOLO el código** si hay match — no mezclar código + texto en un turno.
- **Jerga colombiana** debe enumerarse explícitamente en el prompt. El modelo no la maneja sin ejemplos.
- **Fechas y días de semana** deben precomputarse en JavaScript antes de inyectarlos al prompt. Los modelos los calculan mal desde ISO dates.
- **Short-circuit fuera de horario** antes del LLM: ahorra tokens y es más fiable.
- **Scope off-topic en system prompt** suficiente para volumen bajo (2-10 negocios).
- **Groq llama-3.3-70b y Cerebras llama-3.3-70b** deprecados → migrados a gpt-oss-120b.
- **Servicios nuevos no reflejados en bot:** al guardar desde dashboard, el bot puede usar services_text anterior. Investigar si es orden en system prompt (servicios al fondo → LLM los ignora) o timing del lookup. Fix probable: mover bloque de servicios al inicio del system prompt.

## Dashboard / Frontend

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

## Git

- **Antes de commitear:** `git diff --staged --name-only` para confirmar exactamente qué archivos van.
- **Archivos temporales** (FIX_*.md, etc.) no van al repo — eliminar antes del commit.
- **Commits desde Mac únicamente, nunca desde VPS.**
