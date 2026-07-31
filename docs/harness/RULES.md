# RULES.md — The Ratchet

> Reglas permanentes. Cada error que se corrige agrega una regla aquí.
> El harness garantiza: nunca el mismo error dos veces.

## Formato
```
AAAA-MM-DD — Título corto
  Contexto: qué pasó (1-2 líneas)
  Regla: qué hacer para prevenirlo
```

---

## Reglas activas

### n8n

- `==` en campos Expression de HTTP Request: la UI muestra `=` pero persiste `==` en el JSON. Corregir en JSON exportado, no en UI.
- `docker compose restart` NO relee `.env` — usar `docker compose down && docker compose up -d`.
- Always Output Data ON en nodos Postgres que pueden devolver 0 filas.
- Nombres de nodos son load-bearing. No renombrar sin verificar referencias downstream.
- `fetch` no existe en Code nodes — usar `this.helpers.httpRequest`.
- Code node intermedio elimina campos no incluidos en output. Referenciar nodo Postgres directamente con `$('SQLNode').item.json.field` si necesitas datos que el Code node no pasa.
- Workflow duplicado para testing antes de tocar el activo.
- SQL de n8n no verificable via API REST — verificar visualmente en UI.

### LLM / Prompting

- Post-LLM validation debe replicar TODAS las validaciones (excepciones, horario, colisiones), no solo colisiones.
- LLM puede ignorar datos estructurados — usar instrucciones fuertes (OBLIGATORIO, NUNCA).
- Fechas y días de semana deben precomputarse en JS antes de inyectarlos al prompt.
- Short-circuit fuera de horario antes del LLM — ahorra tokens y es más fiable.
- Nunca instruir al LLM a tratar números como índices de lista (1-12 = horas, no posiciones).
- Reagendamiento necesita confirmación explícita igual que agendamiento.
- Español colombiano neutro: especificar "no vos", listar palabras colombianas, prohibir modismos rioplatenses.
- Post-LLM neutralización (rewrite de output) NUNCA debe guardar la frase neutralizada en el historial — guardar el output REAL del LLM (`rawOriginal`), o el LLM imita su propio historial y la frase se perpetúa (bucle de envenenamiento).
- Cuando un output del bot se repite consistentemente pese a los fixes: sospechar historial envenenado en DB antes que regex/neutralizadores. Verificar `conversation_history.messages` del número afectado.
- **Lazy loading de slots**: NUNCA inyectar todos los slots del horizonte completo al prompt del LLM (90 días = 10386 slots = ~313KB, inviable). Usar vista compacta con rangos por profesional + detalle hora por hora solo de los primeros N días. Para días lejanos, el LLM emite un código (`MOSTRAR_SLOTS\|DD/MM/YYYY`) y un flujo paralelo consulta y envía los slots de esa fecha específica.
- **Historial override en flujo MOSTRAR_SLOTS**: el AI Agent guarda el código en el historial (rawOriginal). El flujo paralelo del Switch debe sobrescribir el historial con el texto real mostrado al cliente (INSERT ON CONFLICT DO UPDATE) para que el siguiente turno del LLM vea los slots que se le enviaron, no el código interno.
- **Formateador de rangos**: siempre validar horas con funciones `horaAMin`/`minAHora` que preserven 2 dígitos en minutos (no regex de reemplazo que produzca "9:0 AM"). Rangos contiguos se agrupan: `🟢 9:00 AM - 6:30 PM`. Si múltiples profesionales comparten el mismo rango, usar `N profesionales: 🟢 ...` en vez de listar cada uno.
- **Switch con regla nueva + fallback extra**: al añadir una regla a un Switch n8n con `fallbackOutput: "extra"`, el fallback se desplaza al siguiente índice. Mover manualmente la conexión del nodo fallback al nuevo índice (ej. Respuesta Normal de main[4] a main[5]).
- **Code node con 2 salidas**: retornar `[[{json}],[{json}]]` para 2 outputs. Cada array interno es una salida. Usar para ramas paralelas (enviar mensaje + guardar historial simultáneamente).
- **n8n API auth login**: `POST /rest/login` con `{email, password}` → cookie de sesión. NO usa API key. Backoff exponencial en 429. Re-login en 401.
- **Scripts de prueba DB**: `pg` no resuelve módulos desde `/tmp`. Copiar scripts `.mjs` al directorio del proyecto (`/Users/johnanderprietogarzon/Documents/meyer-bot/`) y borrar tras ejecutar.

### PostgreSQL

- `CURRENT_DATE` depende del timezone de la DB (usualmente UTC). Usar `(NOW() AT TIME ZONE 'America/Bogota')::date`.
- Migraciones siempre aditivas: agregar columnas nullable, nunca borrar en producción activa.
- Ejecutar migración ANTES del deploy de código nuevo.
- Tener SQL de rollback listo antes de ejecutar cualquier migración.
- `pg` driver auto-parsea JSON columns. No hacer `JSON.parse()` sobre objetos.

### Dashboard / Next.js

- Route groups `(nombre)` NO aparecen en la URL. `revalidatePath("/dashboard/semana")` es correcto.
- Una sola instancia de NextAuth: `@/auth`. No crear segunda.
- `services_text` no está en el JWT — fetch desde DB en cada server component.
- `params` en Next.js 16 App Router es `Promise` — siempre `await params`.
- Page components NO deben tener `max-w` ni `mx-auto` — el `<main>` del layout maneja espaciado.
- Server actions desde `"use client"` necesitan try/catch o el componente queda en loading forever.
- COALESCE para per-professional schedules: `COALESCE(ps.schedule_text, b.schedule_text)`.
- BottomNav/Sidebar breakpoints: usar `lg` (1024px), no `sm` (640px). iPhone landscape mide 812-932px — `sm` deja al usuario sin navegación.
- Cuando un contenedor con `onClick` tiene un botón dentro, usar `e.stopPropagation()` en el botón para evitar que el click se propague al contenedor.

### Git

- Nunca `git add -A` sin revisar `git status` primero.
- Verificar `git diff --staged --name-only` antes de commitear.
- Archivos temporales (FIX_*.md, etc.) no van al repo.
- Commits desde Mac únicamente. Nunca desde VPS.

### Infra / Deploy

- `pm2 restart` tiene downtime ~30-60s. Para 10+ clientes, usar `pm2 reload`.
- ECONNREFUSED ::1:3001 desde contenedor n8n: usar `host.docker.internal` en vez de `localhost`.
- Docker compose restart no relee .env — usar down + up -d.

### Seguridad

- NUNCA leer/imprimir `.env` en outputs.
- NUNCA hardcodear API keys, tokens.
- Verificar `.env` y `secrets/` antes de cada commit.
- No modificar DB de producción directamente.
- No desplegar a producción sin aprobación explícita.

### Deploy / VPS

- Antes de instalar scripts en VPS: verificar paths reales de .env existentes, contenedores Docker corriendo, y crons existentes. No asumir estructura desde el repo local.
- Nunca borrar scripts/crons viejos al reemplazar — comentar en crontab + respaldar crontab original primero.
- Probar script manualmente en VPS antes de confiar en cron (dump legible, tamaño, archivos generados).

### Harness

- Si un error ocurre y no hay regla para él, agregarla aquí inmediatamente después de corregirlo.
- AGENTS.md es el mapa — leer primero. CLAUDE.md son las reglas — seguir siempre.
- docs/harness/MEMORY.md se actualiza al final de cada sesión.

### V2 Shared Components (Zero-Friction)

- V2 components deben usar clases `zf-*` (bg-zf-surface, text-zf-text, etc.), que referencian variables `--zf-*` definidas en `:root` de globals.css. Esto permite cambiar todo el tema editando un solo archivo.
- Las variables `--zf-*` están aisladas del tema dark (`--bg-primary`, `--text-primary`) — no hay conflicto con `className="dark"` en el layout.
- Interactive V2 components (modal, drawer, sheet) deben usar `@base-ui/react` (Dialog) como base, no Radix UI. El proyecto no tiene Radix instalado.
- V2 shared components van en `dashboard/components/shared/` con sufijo `V2` en el nombre del archivo y del export.
- Todos los V2 components deben pasar typecheck sin errores — verificar antes de dar por terminado.
- Nuevos colores V2: agregar variable `--zf-*` en globals.css + mapeo `--color-zf-*` en `@theme inline`. No hardcodear colores en componentes.

### Refactor / Arquitectura

- Antes de refactorizar: auditar primero (01-ARCHITECTURAL_AUDIT.md), diseñar estructura destino segundo (02-ESTRUCTURA_DESTINO.md), roadmap tercero (03-ROADMAP.md). Cada fase se documenta antes de escribir código.
- Feature-First: componentes van en features/{dominio}/components/. No crear componentes planos en components/ raíz sin carpeta de dominio.
- Al investigar arquitectura de código existente: hacer inventario completo con agente explore antes de proponer cambios.
- Server actions que re-exportan funciones desde `lib/` deben verificar que cada función exportada tenga auth check propio. Si no tiene, crear wrapper con auth + businessId ownership check antes de exportar como server action.
- useEffect fetches de datos iniciales siempre deben tener `.catch()` para evitar que el componente quede en loading eterno si la DB falla.
- Features sin diseño Stitch no se rebuilden en V2. Se skinnean con variables `--zf-*` en el layout para integración visual sin tocar lógica. Sin diseño no hay V2.
- Deploy a producción del refactor V2 solo cuando todas las fases estén completas y aprobadas. No hacer deploy parcial de V2. Migraciones DB pueden ejecutarse por separado si no rompen nada existente.

### V2 Implementación — Patrones canónicos (extraídos de Módulo 7)

- **Server action wrapper**: `"use server"` → `auth()` → `businessId ownership check` → `try/catch` → `return { data, error? }`. Nunca `as unknown as`. Siempre tipo exacto del return.
- **Componente canónico**: `"use client"` → `useState(loading, error, data)` → `useEffect(loadData)` [eslint-disable set-state-in-effect] → `if(loading) return <Skeleton>` → `if(error) return <Error>` → `if(data.length===0) return <Empty>` → `return <Data>`.
- **Colores layout**: `zf-*` CSS variables. **Colores status badges**: hardcodeados Stitch en `constants.ts`. No mezclar.
- **FormData para createAppointment**: `new FormData()` + `.append()` en componente. server action recibe `FormData`.
- **`"error" in result`** para discriminated unions en returns de server actions. No usar `result.error` directamente sin narrowing.
- **Mobile**: grid/table colapsa a card list cuando no es owner/admin o el ancho < 640px. `overflow-x-auto` para tablas anchas.
- **Botones**: `active:scale-[0.97]` siempre. `disabled:opacity-50`. Loading: reemplazar texto con `Loader2 animate-spin`.
- **Props**: `interface Props { ... }` (nunca `type`). Sin `any`. Tipos importados de `lib/` y re-exportados de `actionsV2.ts`.
- **No duplicar**: `formatHora` en `lib/utils.ts`, `DAYS_FULL`/`MONTHS_ES`/`STATUS_BADGE` en `features/{modulo}/constants.ts`.
- **Nunca `fetch()` directo** en componentes — usar server action wrapper en `actionsV2.ts`.
- **Antes de cerrar**: `tsc --noEmit` 0 errores, `eslint features/{modulo}/` 0 warnings/errors. Actualizar MEMORY.md + HANDOFF.md.
