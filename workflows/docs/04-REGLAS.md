# 04-REGLAS.md — Cómo Trabajar

> **Para:** saber qué skills cargar, qué reglas seguir, cómo investigar, qué NO hacer.

## 🎯 Skills a cargar según tarea

| Tarea | Skills |
|-------|--------|
| Bug en el bot | `systematic-debugging` → `code-review` |
| Cambio de prompt | `strategy` (7-dimension diagnosis) |
| Investigación (Perplexity/web) | `research` |
| DB / PostgreSQL | `db-sculptor` |
| Dashboard / Next.js | `component-forge` |
| Deploy / Docker | `docker` → `ci-cd` |
| Seguridad | `Web Security` → `auth-architect` |
| Planificación | `brainstorming` → `writing-plans` |
| Antes de cerrar tarea | `verification-before-completion` |

## 📜 The Ratchet — Reglas Permanentes

> Cada error corregido → regla aquí. Nunca el mismo error 2 veces.

### n8n
- `docker compose restart` NO relee `.env` → usar `down && up -d`
- Always Output Data ON en Postgres que pueden devolver 0 filas
- Nombres de nodos load-bearing — NO renombrar sin verificar downstream
- Code node intermedio elimina campos no incluidos en output
- Workflow duplicado para testing antes de tocar el activo
- Postgres typeVersion 2.5 no soporta RETURNING → usar 2.6

### LLM / Prompting
- Post-LLM validation debe replicar TODAS las validaciones (no solo colisiones)
- LLM puede ignorar datos estructurados → usar instrucciones fuertes
- Fechas y días precomputados en JS antes del prompt
- Short-circuit fuera de horario ANTES del LLM → aplicarlo a más reglas
- Neutralizador: guardar `rawOriginal` en historial, no el output reescrito
- **NUNCA agregar reglas al prompt para arreglar bugs** → sacar la regla a código
- **NUNCA usar el LLM como state machine** → código determinístico para routing

### PostgreSQL
- `(NOW() AT TIME ZONE 'America/Bogota')::date` — nunca CURRENT_DATE
- Migraciones aditivas: columnas nullable, nunca borrar en prod
- Ejecutar migración ANTES del deploy
- `pg` driver auto-parsea JSON columns → no JSON.parse() sobre objetos

### Infra / Deploy
- Commits desde Mac, nunca desde VPS
- `npm run build` desde `/root/meyer-bot/dashboard/`
- Sin backups = riesgo existencial

### Seguridad
- NUNCA leer/imprimir `.env` en outputs
- NUNCA hardcodear API keys
- Evolution API expuesta en 0.0.0.0:8080 → pendiente firewall

## 🔬 Protocolo de Investigación

**Cuándo investigar:** antes de implementar cualquier feature nueva o cambio arquitectónico.

**Cómo:**
1. Formular pregunta específica (no genérica)
2. Subir a Perplexity: `workflows/WhatsApp Bot - Genérico restored.json` + `docs/BUG_BACKLOG.md` + `docs/ARCHITECTURE.md`
3. Preguntar: "Compará mi arquitectura contra lo que hacen empresas reales. Sé honesto."
4. Documentar hallazgos en `03-INVESTIGACION.md` (1 párrafo por tema, no más)
5. Actualizar `02-ROADMAP.md` si cambian prioridades

## 🚫 Anti-Patrones

| ❌ No hacer | ✅ Hacer en vez |
|------------|----------------|
| Agregar reglas al prompt para fixear bugs | Mover la regla a código (if/else) |
| Probar cambios directamente en prod | Duplicar workflow → test → merge |
| Múltiples cambios a la vez | 1 cambio → test → confirmar → siguiente |
| `git add -A` sin revisar | `git diff --staged --name-only` primero |
| Asumir que el LLM "va a entender" la regla | Validar output del LLM en código |
| Deploy sin backup del JSON anterior | Exportar JSON antes de cualquier PATCH |

## 🔄 Protocolo de Sesión

**Al INICIAR:**
1. Leer `INICIO.md` (estado actual)
2. Leer `docs/CONTEXT_UPDATED.md` (contexto general)
3. Leer el archivo relevante según tarea (01-05)
4. Cargar skills necesarias

**Al CERRAR:**
1. Actualizar ESTADO AHORA en `INICIO.md`
2. Si se arregló un bug → actualizar `05-BUGS.md` y `01-BOT.md`
3. Si se descubrió algo nuevo → 1 párrafo en `03-INVESTIGACION.md`
4. Actualizar `docs/CONTEXT_UPDATED.md` con resumen de sesión

## 📁 Reglas Anti-Sprawl (evitar dispersion de docs)

| Regla | Razon |
|-------|-------|
| **Todo bug nuevo → `05-BUGS.md`** (1 fila en tabla) | NO crear archivos separados por bug |
| **Limite maximo: 7 archivos en `workflows/docs/`** | Si necesitas un 8vo, elimina o mergea uno existente |
| **Si un bug necesita mas de 2 lineas** → seccion en `docs/BUG_BACKLOG.md` + link desde `05-BUGS.md` | Separar quick-ref de deep-dive |
| **Investigation findings → `03-INVESTIGACION.md`** (1 parrafo por tema) | NO crear "investigacion-ronda4.md" |
| **Nuevas reglas → `04-REGLAS.md`** | NO crear "reglas-v2.md" |
| **Nuevas fases → `02-ROADMAP.md`** | NO crear "roadmap-v2.md" |
| **Archivos originales de Perplexity → marcar `📦 ARCHIVADO`** si ya estan resumidos en `03-INVESTIGACION.md` | Evitar que un agente lea 3 fuentes distintas para lo mismo |
