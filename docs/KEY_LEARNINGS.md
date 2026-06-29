# KEY_LEARNINGS.md — meyer-bot

> Lecciones técnicas acumuladas. Leer cuando se trabaja con n8n, Next.js, LLMs o infra.

## n8n

- **Bug `==` en campos Expression (n8n 2.10.3):** la UI muestra `=` pero persiste `==` en el JSON, rompiendo URLs. NO se arregla en la UI → exportar JSON, corregir programáticamente con Python (`json` module), reimportar.
- **`fetch` no existe en Code nodes** → usar `this.helpers.httpRequest`.
- **`docker compose restart` NO relee `.env`** → usar `docker compose down && docker compose up -d`.
- **Confirmar variables en runtime:** `docker exec [container] env | grep [VAR]` (más fiable que leer `.env`).
- **Always Output Data** obligatorio en nodos Postgres que pueden devolver 0 filas (Leer Sesión activa, Leer Citas Cliente, Leer Historial).
- **Nombres de nodos** case-sensitive y load-bearing. `AI Agent` tiene ~13 referencias downstream. NO renombrar sin actualizar todas las referencias.
- **`$('Nodo').first()`** en vez de `.item` cuando el nodo anterior devuelve múltiples items.
- **Campos HTTP Request** deben estar en modo Expression (ícono fx activo). URL/headers con UN solo `=`.
- **`$env`** requiere `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` en `.env` del contenedor.
- **Workflow duplicado para testing** antes de tocar el activo — no hay staging en n8n.
- **Filtro de mensajes no-texto:** Evolution API puede traer `audioMessage`, `pttMessage`, `imageMessage`, `videoMessage`, `stickerMessage`, `documentMessage`, `locationMessage`, `liveLocationMessage`. Manejar TODOS o el flujo los ignora silenciosamente. Detectar con `!!msg.audioMessage || !!msg.pttMessage || ...` y responder antes de pasar al LLM.

## LLM / Prompting

- **Instrucciones fuertes** ("OBLIGATORIO", "ÚNICAMENTE", "NUNCA") necesarias para que el LLM use datos de PostgreSQL sobre sus suposiciones.
- **Salida estructurada** (`CITA_CONFIRMADA|servicio|fecha|hora`) > prompting libre para acciones accionables.
- **El normalizador devuelve SOLO el código** si hay match → no se puede mezclar código + texto en un turno. Diseñar flows que preguntan primero, confirman después, emiten código en turno separado.
- **Jerga colombiana** debe enumerarse explícitamente en el prompt. El modelo no la maneja sin ejemplos.
- **Historial conversacional limpio importa:** con historial viejo el modelo "recuerda" datos y salta pasos. Comportamiento esperado, no bug.
- **Fechas y días de semana** deben precomputarse en JavaScript antes de inyectarlos al prompt (`fechaNatural`, `horaAmPm`). Los modelos los calculan mal desde ISO dates.
- **Short-circuit fuera de horario** antes del LLM: ahorra tokens y es más fiable que pedirle al modelo que interprete un booleano.
- **Scope off-topic en system prompt** es suficiente para volumen bajo (2-10 negocios). No construir clasificador separado — el riesgo de falsos positivos con jerga colombiana supera el ahorro de tokens. Costo real de off-topic con Flash-Lite: fracciones de centavo por intercambio.
- **Gemini Flash-Lite precios:** US$0.10/M input, US$0.40/M output. Con context caching, descuento sustancial en system prompt repetido.
- **Groq llama-3.3-70b y Cerebras llama-3.3-70b** deprecados → migrados a gpt-oss-120b.

## Next.js / Dashboard

- **Route groups** `(nombre)` NO aparecen en la URL. Solo las carpetas reales cuentan. `app/(dashboard)/dashboard/semana/page.tsx` → URL `/dashboard/semana`. NO confundir al escribir `revalidatePath`.
- **`revalidatePath("/dashboard/semana")`** ES CORRECTO para esa ruta. NO cambiar a `/semana`.
- **NextAuth v5 con dos instancias** rompe la sesión silenciosamente. Una sola instancia canónica: `@/auth`. `lib/auth.ts` como re-export limpio si se necesita por compatibilidad.
- **`services_text`** no está en el JWT. Fetcharlo desde DB en cada page server component que lo necesite, en paralelo con otras queries (`Promise.all`).
- **bcryptjs** sobre bcrypt (pure JS, sin compilación nativa). **AUTH_SECRET** no NEXTAUTH_SECRET en NextAuth v5.
- **`professional_id` en queries de métricas:** diseñar con filtro opcional `AND (professional_id = Y OR Y IS NULL)` desde el inicio. Dueño → Y=NULL → ve todo. Barbero → Y=su ID. Una sola query, dos vistas.
- **RBAC no existe hoy.** `role` viaja en JWT pero nadie lo lee. Prerrequisito de multi-barbero.

## PostgreSQL

- **Timezone:** PostgreSQL corre en UTC; negocio en Bogotá (UTC-5). Usar `(NOW() AT TIME ZONE 'America/Bogota')::date`, nunca `CURRENT_DATE`.
- **Apóstrofes en SQL embebido en JS:** escapar con `.replace(/'/g, "''")` antes de interpolación.
- **Migraciones siempre aditivas:** agregar columnas nullable, nunca borrar en producción activa. Código nuevo funciona con columna nueva; código viejo la ignora porque es nullable.
- **Ejecutar migración ANTES del deploy de código nuevo.** DB nueva + código viejo debe funcionar.
- **Tener SQL de rollback listo** antes de ejecutar cualquier migración.
- **Datos corruptos en DB** pueden simular bugs de código. Siempre verificar el dato en DB antes de asumir que es un bug de lógica. Ejemplo Sprint 6: `businesses.name = 'Barbería Brayan'` para Meyer causaba título incorrecto que parecía bug de auth.

## Infra / Deploy

- **`pm2 restart`** tiene downtime de ~30-60s. Usar **`pm2 reload`** para zero-downtime cuando haya 10+ clientes.
- **Commits siempre desde Mac, nunca desde VPS.** El VPS solo hace `git pull`.
- **Ramas de feature:** hacer merge a main antes de deployar. Si Claude Code trabaja en rama, `git merge` + `git push` antes de ir al VPS.
- **Evolution API expuesta en 0.0.0.0:8080** — pendiente firewall. Solo debería escuchar en localhost o red interna.
- **meyer_postgres** solo en `127.0.0.1:5432` — correcto.

## Diagnóstico

- **Claude.ai puede equivocarse en diagnósticos.** En Sprint 6, diagnóstico incorrecto de `revalidatePath` que Claude Code siguió sin verificar. Claude Code debe chequear rutas/hechos reales antes de asumir que el diagnóstico es correcto.
- **Errores de autenticación n8n (`password authentication failed`):** la credencial guardada en n8n UI puede no coincidir con la password actual en PostgreSQL. Solución: Settings → Credentials → "Postgres account" → actualizar password → Test connection.
- **Workflow n8n en rama vs. main:** si Claude Code trabajó en una rama feature, el VPS no ve los cambios aunque el branch esté pusheado. Siempre mergear a main antes del deploy.
