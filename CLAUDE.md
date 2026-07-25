# CLAUDE.md — meyer-bot

## Qué es este proyecto
Bot de WhatsApp con IA para Peluquería Meyer.
Stack: n8n + Evolution API + LLMs (Gemini/Cerebras/Groq).
Plataforma SaaS multi-tenant en construcción para negocios locales.

## SEGURIDAD — CRÍTICO
- NUNCA leer, imprimir ni incluir el contenido de `.env` en ningún output
- NUNCA hardcodear API keys, tokens o contraseñas en el código
- Las credenciales van en `.env` — acceder via variables de entorno
- El archivo JSON de Google Cloud va en `secrets/` — nunca en Git
- Antes de cualquier commit, verificar que `.env` y `secrets/` no estén incluidos
- Si necesitas mostrar una key de ejemplo, usa `process.env.NOMBRE_VARIABLE`

## Estructura del proyecto
- Workflows de n8n exportados en `/workflows`
- Documentación en `/docs` — leer `AGENTS.md` primero para saber qué docs aplicar según tu tarea
- Credenciales de Google en `/secrets` (ignorado por Git)
- Hooks de Git en `.githooks/` — activar con: `git config core.hooksPath .githooks` (o `bash scripts/setup-hooks.sh`)

## Convenciones
- Commits en español o inglés, formato: tipo: descripción
- Tipos: feat, fix, chore, docs

## REGLA GENERAL: Validación antes de implementar
Aplica a **todo**, no solo bugs:

1. **Explicar plan primero.** Antes de escribir código, modificar archivos, o ejecutar comandos que cambien algo: decir qué vas a hacer exactamente
2. **Esperar aprobación.** No implementar hasta que el usuario diga "sí" o "adelante"
3. **Un paso a la vez.** No hacer 3 cambios en paralelo aunque sean independientes. Terminar uno, mostrar resultado, esperar aprobación, seguir.
4. **Si el plan cambia durante la implementación**, detenerse y avisar antes de desviarse.

## PROTOCOLO DE CORRECCIÓN DE BUGS — OBLIGATORIO

Seguir este protocolo ESTRICTAMENTE al trabajar en bugs del backlog (`docs/BUG_BACKLOG.md`):

### 1. Leer el backlog primero
Siempre empezar leyendo `docs/BUG_BACKLOG.md` para conocer el estado actual.

### 2. Un bug a la vez
Nunca trabajar en múltiples bugs simultáneamente. Terminar uno antes de empezar el siguiente.

### 3. Preguntar antes de actuar
Antes de modificar cualquier archivo (workflow, código, prompt, DB):
- Presentar diagnóstico al usuario
- Presentar solución propuesta
- Esperar aprobación explícita

### 4. No comprometer producción
- No desplegar directamente a producción sin aprobación
- No modificar la DB de producción directamente
- No cambiar workflows activos de n8n sin respaldo

### 5. Investigación completa antes de tocar
Cada bug requiere:
- [ ] Leer docs relevantes (docs/, SPRINTS.md, KEY_LEARNINGS.md)
- [ ] Leer código del bot (workflows JSON + queries SQL)
- [ ] Leer código del dashboard (sync endpoints, server actions)
- [ ] Verificar multi-tenant (todos los negocios)
- [ ] Entender causa raíz (no solo síntoma)
- [ ] Presentar diagnóstico antes de proponer fix

### 6. Sincronización bot + dashboard
Todo cambio debe considerar:
- Bot n8n (workflows, queries, prompts)
- Dashboard (server actions, webhooks, API routes)
- DB (migraciones, queries)
- Todos los negocios (multi-tenant, no solo Meyer)

### 7. Documentar al finalizar cada bug
- Actualizar `docs/BUG_BACKLOG.md` con estado completado
- Documentar lecciones en `docs/KEY_LEARNINGS.md`
- Agregar sección al changelog del prompt si aplica

### 8. Subir a GitHub solo cuando se indique
No hacer commit ni push sin instrucción explícita del usuario.

### 9. PROTOCOLO DE CIERRE DE SESIÓN — OBLIGATORIO
Cuando el usuario indique que la sesión termina:

- [ ] Preguntar: "¿Cerramos la sesión?"
- [ ] Actualizar `docs/harness/MEMORY.md` — agregar resumen de lo que se hizo (nunca reemplazar)
- [ ] Actualizar `docs/sessions/HANDOFF.md`:
  - Actualizar frontmatter: `status`, `date`, `next_action`
  - Actualizar tabla 🗂️ Estado de archivos (✅ los modificados, ─ los desactualizados)
  - Escribir resumen de lo que se hizo y qué queda pendiente
- [ ] Si se modificó otro archivo, marcar en la tabla de HANDOFF.md

**Sin excepción.** No cerrar sin dejar handoff. Si no hay cambios, decirlo: "Sin cambios, handoff actual sigue vigente."
