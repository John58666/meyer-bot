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
