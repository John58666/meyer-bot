# SECURITY_AUDIT.md — meyer-bot

> **Leer al inicio de cada sesión.** Este documento es el reporte maestro de seguridad del proyecto.
> Contiene hallazgos activos, plan de remediación y lineamientos no negociables.
> Última actualización: 6 julio 2026 (auditoría inicial).

---

## ⚠️ Prompt obligatorio para cada sesión nueva

Al iniciar un chat nuevo, los modelos deben recibir este contexto:

```
CONTEXT_OBLIGATORIO:
- Proyecto meyer-bot con clientes REALES en producción (Meyer, Brayan Study).
- Lee docs/SECURITY_AUDIT.md ANTES de proponer cualquier cambio.
- NUNCA hardcodear API keys, tokens, contraseñas o private keys en código o docs.
- Si encuentras un secret en código/docs → reportar inmediatamente, NO commitear.
- Las credenciales van en .env (VPS) o en Bitwarden (backup). NO en git.
- Antes de cualquier commit: verificar que .env y secrets/ no estén incluidos.
- Si necesitas mostrar una key de ejemplo: usa process.env.NOMBRE_VARIABLE.
```

---

## Estado actual — Auditoría inicial (6 julio 2026)

### Escaneos realizados

| Herramienta | Qué detecta | Resultado | Reporte completo |
|---|---|---|---|
| **gitleaks 8.30.1** | Secrets en git history | ⚠️ 8 leaks en history viejo | ver sección "Leaks gitleaks" |
| **npm audit** | Vulnerabilidades en dependencias | ⚠️ 2 vulns moderate | ver sección "npm audit" |
| **hadolint** | Malas prácticas en Dockerfiles | pendiente | TBD |
| **Revisión manual de código** | OWASP Top 10 | pendiente | TBD |

### Working tree actual — LIMPIO ✅

Confirmado con `gitleaks --no-git` sobre `workflows/` y `docs/`:
- `workflows/`: 0 leaks
- `docs/`: 0 leaks (no quedan secrets hardcodeados)
- Todos los leaks están solo en **git history antiguo**, no en archivos actuales.

---

## 🔴 Leaks gitleaks — 8 secrets en git history

**92 commits escaneados. 8 leaks encontrados. Todos en commits anteriores al 1 julio 2026.**

| # | Tipo | Archivo (histórico) | Línea | Commit | Severidad | Estado |
|---|---|---|---|---|---|---|
| 1 | API Key (Evolution API) | `CONTEXT.md` | 263 | `a573d9c` | 🟡 MEDIA | Pendiente rotación |
| 2 | API Key (Evolution API) | `CONTEXT_UPDATED.md` | 235 | `c827b95` | 🟡 MEDIA | Pendiente rotación |
| 3 | Private Key (Google Service Account) | `docs/pendientes-seguridad.md` | 42 | `ff0ad79` | 🔴 CRÍTICA | Pendiente rotación |
| 4 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 434 | `025df4a` | 🔴 CRÍTICA | Pendiente rotación |
| 5 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1292 | `de8fe2a` | 🔴 CRÍTICA | Pendiente rotación |
| 6 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1292 | `526b57c` | 🔴 CRÍTICA | Pendiente rotación |
| 7 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 440 | `089e8bf` | 🔴 CRÍTICA | Pendiente rotación |
| 8 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1291 | `089e8bf` | 🔴 CRÍTICA | Pendiente rotación |

### Valor de los secrets (redacted en este doc)

- **Google Private Key** — Service Account de Google Cloud. Acceso a Calendar API, Drive, etc. 6 apariciones en 4 commits (abril 2026 - mayo 2026).
- **Evolution API Key**: `***REMOVED-EVOLUTION-API-KEY***` — permite enviar mensajes WhatsApp desde el número del negocio. 2 apariciones en 2 commits (junio 2026).

### Ubicación de los secrets (current state)

| Archivo | Estado actual | Acción |
|---|---|---|
| `CONTEXT.md` | Renombrado a `CONTEXT_UPDATED.md` y movido a `docs/` | solo history |
| `CONTEXT_UPDATED.md` (raíz) | Movido a `docs/CONTEXT_UPDATED.md` | solo history |
| `docs/pendientes-seguridad.md` | Borrado del working tree | solo history |
| `workflows/peluqueria-beta.json` | Borrado del working tree | solo history |

---

## ⚠️ npm audit — Vulnerabilidades en dependencias

**Fecha:** 6 julio 2026

| # | Paquete | Severidad | Problema | Estado |
|---|---|---|---|---|
| 1 | `hono` (transitive via shadcn) | 🔴 HIGH | Path traversal, CORS wildcard con creds | ✅ Parcheado (commit `4a302ef`) |
| 2 | `js-yaml` (transitive via eslint) | 🟡 MODERATE | DoS cuadrático en merge keys | ✅ Parcheado (commit `4a302ef`) |
| 3 | `@babel/core` (transitive via eslint) | ⚪ LOW | Arbitrary file read via sourceMappingURL | ✅ Parcheado (commit `4a302ef`) |
| 4 | `postcss` (within Next.js) | 🟡 MODERATE | XSS vía `</style>` sin escapar | ❌ Queda — requiere upgrade de Next.js (no `--force`) |

### Acción tomada

- Backup: `dashboard/package-lock.json.bak` (original)
- `npm audit fix` (sin `--force`): 18 paquetes actualizados
- Build local OK (12.4s compile, 13 rutas)
- Commit local: `4a302ef` (NO se ha hecho `git push`)
- **Producción intocada** — el nuevo lockfile se deploya cuando tú decidas

### Notas

- `hono`, `js-yaml`, `@babel/core` son deps de dev tools (shadcn CLI, eslint, build-time). NO se cargan en runtime del dashboard.
- `postcss` viene dentro de Next.js. El fix real es esperar a que Next.js libere versión parcheada. NO aplicar `npm audit fix --force` (bajaría Next a 9.3.3, catastrófico).
- Vulnerabilidad restante solo afecta dev/build time, NO runtime.

---

## 🔴 Problemas de seguridad URGENTES (pre-Sprint 12)

### CRÍTICO — Resolver antes de seguir con Sprint 12

| # | Problema | Origen | Impacto | Estado |
|---|---|---|---|---|
| U1 | **Google Private Key en git history** | gitleaks | Acceso a Google Cloud Service Account | Pendiente rotación |
| U2 | **Evolution API Key en git history** | gitleaks | Envío de WhatsApp no autorizado | Pendiente rotación |
| U3 | **Evolution API expuesta en 0.0.0.0:8080** | CONTEXT_UPDATED.md "Seguridad pendiente" | Accesible desde internet | Pendiente firewall |
| U4 | **Password meyer_user débil en PostgreSQL** | CONTEXT_UPDATED.md "Seguridad pendiente" | Acceso a DB de clientes reales | Pendiente cambio |
| U5 | **GOOGLE_PRIVATE_KEY en .env del VPS** | CONTEXT_UPDATED.md "Seguridad pendiente" | Credencial en servidor remoto | Pendiente migración a secrets manager |

### IMPORTANTE — Resolver antes de Sprint 15 (cumplimiento)

| # | Problema | Impacto |
|---|---|---|
| I1 | Sin aviso de tratamiento de datos personales (Ley 1581 Colombia ya aplica HOY) | Compliance legal |
| I2 | Sin `audit_log` (planificado Sprint 13) | Sin trazabilidad de acciones |
| I3 | Sin rate limiting en auth del dashboard | Brute force posible |
| I4 | JWT sin expiración corta explícita | Sesiones largas |

### DEUDA TÉCNICA — Mejorar cuando se pueda

| # | Problema | Origen |
|---|---|---|
| D1 | Bug `==` en Expression de n8n (varios nodos: Filtro Inicial, Respuesta Normal, Confirmar Reagendamiento) | IMPLEMENTACION_MULTI_LLM.md |
| D2 | Header `"Content-Type "` con espacio al final en `Confirmar Reagendamiento` | IMPLEMENTACION_MULTI_LLM.md |
| D3 | VPS IP expuesta en docs (`178.104.27.180`) | RUNBOOK.md |
| D4 | No existe staging environment | ARCHITECTURE.md |
| D5 | `pm2 restart` tiene downtime 30-60s (usar `pm2 reload` con 10+ clientes) | RUNBOOK.md |
| D6 | `lib/auth.config.ts` huérfano en `dashboard/lib/` | CONTEXT_UPDATED.md fix #9 |

---

## 📋 Plan de remediación

### Fase 1 — Setup y backup (Completado ✅)

- [x] Instalar `gitleaks` y `hadolint` en Mac (vía brew)
- [x] Backup de `package-lock.json`
- [x] `npm audit fix` (no-destructivo, sin `--force`)
- [x] Build local OK
- [x] Commit local de locks parcheado (no deployado)
- [x] Setup Bitwarden free + 3 Secure Notes con backup de keys actuales
- [x] Crear este archivo `docs/SECURITY_AUDIT.md`

### Fase 2 — Rotación de keys (URGENTE, pre-Sprint 12)

Pre-requisito: Haber completado Fase 1 con backup en Bitwarden.

- [x] **Google Private Key — Decision: revocar key, conservar Service Account**
      - **Contexto**: Las credenciales de Google ya NO se usan en producción. El dashboard tiene su propio calendario. El script one-shot `migrate-from-sheets.js` (única referencia) ya cumplió su función en Sprint 1.
      - **Integración Google Calendar futura**: pendiente como feature/mejora. Si se implementa, se crea nueva key en la misma Service Account conservada.
      - **Acción TÚ (Google Cloud Console)**:
        1. Google Cloud Console → IAM & Admin → Service Accounts
        2. Identificar la service account usada en meyer-bot
        3. Pestaña **Keys**
        4. **REVOCAR** (Delete) la key existente — la del git history queda inservible
        5. **NO crear nueva key** (no se usa en producción)
        6. Conservar la Service Account para uso futuro (Google Calendar integration)
      - **Acción YO (working tree)**: ✅ `database/migrate-from-sheets.js` movido a `database/archive/` (commit pendiente)
      - **Backup**: la key vieja está en Bitwarden Secure Note `meyer-bot — Google Service Account JSON` (solo para referencia histórica; ya revocada no sirve)

- [ ] **Rotar Evolution API Key**
      1. Evolution API manager UI (`http://178.104.27.180:8080/manager`)
      2. Ir a Settings → API Keys
      3. Generar nueva API key
      4. Revocar la vieja (`***REMOVED-EVOLUTION-API-KEY***`)
      5. Copiar la nueva key
      6. Guardar en Bitwarden como Secure Note nueva
      7. Actualizar `/root/n8n/.env` del VPS: `EVOLUTION_API_KEY=<nueva>`
      8. En n8n UI → nodo `Confirmar Cancelación` cambiar header `apikey` a la nueva (modo Expression: `={{ $env.EVOLUTION_API_KEY }}`)
      9. Reiniciar n8n: `docker compose down && docker compose up -d` para releer `.env`

### Pendiente como feature futura

- [ ] **Integración Google Calendar en el dashboard** (no Sprint actual)
      - Cuando se implemente, crear nueva key en la Service Account conservada
      - OAuth flow recomendado (no Service Account JSON) para usuarios que conecten su propio Google Calendar
      - Documentar en `docs/ARCHITECTURE.md` cuando se diseñe

### Fase 3 — Hardening del VPS (URGENTE, pre-Sprint 12)

- [ ] **Firewall: cerrar puerto 8080 de Evolution API al público**
      1. Confirmar con: `sudo ufw status` en el VPS
      2. Denegar acceso externo: `sudo ufw deny 8080/tcp`
      3. Permitir solo localhost: `sudo ufw allow from 127.0.0.1 to any port 8080`
      4. Verificar: `sudo ufw status numbered`

- [ ] **Cambiar password débil de meyer_user**
      1. Generar password fuerte en Bitwarden (24+ caracteres, alphanumeric + symbols)
      2. Guardar en Bitwarden como Secure Note `meyer-bot — Postgres meyer_user password`
      3. SSH al VPS, conectarse a PostgreSQL: `docker exec -it meyer_postgres psql -U postgres`
      4. Cambiar password: `ALTER USER meyer_user WITH PASSWORD 'nueva_password';`
      5. Actualizar `/root/meyer-bot/dashboard/.env.local` en el VPS: `POSTGRES_PASSWORD=...`
      6. Actualizar `~/Documents/meyer-bot/dashboard/.env.local` en Mac
      7. Reiniciar n8n para releer nuevas credenciales: `docker compose down && docker compose up -d`
      8. `pm2 restart meyer-dashboard`

### Fase 4 — Limpieza de git history (Después de Fase 2 y 3)

⚠️ **Requiere validación del usuario paso a paso.** Esta fase reescribe el git history con `git filter-repo` (o BFG). Es destructiva para el historial.

- [ ] Instalar `git-filter-repo`: `brew install git-filter-repo`
- [ ] Backup del repo actual: `cp -R meyer-bot meyer-bot-backup-pre-cleanup`
- [ ] Identificar archivos a purgar del history:
      - `workflows/peluqueria-beta.json`
      - `docs/pendientes-seguridad.md`
      - Strings específicos (la Google Private Key completa, la Evolution API key completa)
- [ ] Ejecutar `git filter-repo` con replace-text para purgar los secrets
- [ ] Force-push al remote: `git push --force origin main`
- [ ] Avisar a colaboradores (aunque solo hay uno — el owner)
- [ ] Re-ejecutar gitleaks para confirmar 0 leaks

### Fase 5 — Hardening del dashboard (pre-Sprint 15)

- [ ] Rate limiting en `/api/auth` y login endpoint
- [ ] Security headers en nginx (CSP, HSTS, X-Frame-Options)
- [ ] Aviso de tratamiento de datos personales (Ley 1581 Colombia) en bot
- [ ] Audit log (adelantar partes críticas de Sprint 13)

### Fase 6 — Mantención y verificación continua

- [ ] Pre-commit hook con gitleaks (avoid reintroducir secrets)
- [ ] CI/CD: `npm audit` + `gitleaks` en cada PR (cuando se implemente CI/CD)
- [ ] Auditoría trimestral de secrets y permisos

---

## 🛡️ Gestor de secrets

- **Tool elegida**: Bitwarden Cloud Free (zero-knowledge encryption)
- **Uso**: Secure Notes para todos los secrets del proyecto
- **Master password**: NO recuperable. Apuntada offline (papel).
- **Items guardados**:
  - `meyer-bot — Google Service Account JSON`
  - `meyer-bot — Evolution API Key actual`
  - `meyer-bot — Postgres meyer_user password`

### Política de secrets (no negociable)

1. **Todo secret va a Bitwarden PRIMERO**, luego se rota en el sistema.
2. **NUNCA commitear** secrets al repo. Si pasa: rotar key + limpiar history.
3. **.env** del VPS y `secrets/` se mantiene fuera de git (`.gitignore` ya lo hace).
4. **Nuevos secrets** (API keys, passwords, private keys): siempre generar 24+ caracteres alfanuméricos.
5. **Rotación trimestral** de API keys críticas.
6. **Acceso al repo** privado: solo el owner (Johnander) por ahora. Cualquier nuevo colaborador → revisar este doc + onboarding de seguridad.

---

## 🔧 Lineamientos para futuras sesiones (NO negociables)

### Cuando un modelo vaya a tocar el repo

1. **Leer este archivo primero** para conocer el estado de seguridad.
2. **No commitear secrets** al código o docs. Usar siempre `process.env.NOMBRE_VAR` en ejemplos.
3. **Antes de commitear**: `git status` + `git diff --staged --name-only` + `gitleaks detect --source . --redact --no-banner` (si hay tiempo).
4. **Si encuentras un leak**: reportar, NO arreglar sin autorización, NO commitear.
5. **Deploy al VPS**: siempre migración DB ANTES de código. Commits desde Mac, nunca desde VPS.
6. **Cambios en `.env` del VPS**: backup previo + validación de que apps reiniciadas funcionen.

### Skills MCP relevantes para este proyecto

- `Web Security` skill (OWASP Top 10, secure coding)
- `code-review` skill (revisiones de diffs)
- `github-mcp` `run_secret_scanning` (verificar archivos sueltos antes de commit)
- `db-sculptor` skill (si tocas schema — siempre migración aditiva, nunca destructiva)

### Orden de prioridad

1. **URGENTE**: Fase 2 (rotar keys) + Fase 3 (firewall VPS + password DB)
2. **IMPORTANTE**: Fase 4 (limpiar git history)
3. **PRE-SPRINT 12**: completar Fases 2-4
4. **PRE-SPRINT 15**: Fase 5 (hardening dashboard, compliance)
5. **CONTINUO**: Fase 6 (verificación trimestral)

---

## 📌 Referencia rápida de archivos

- `docs/SECURITY_AUDIT.md` — este archivo (leer primero)
- `docs/ARCHITECTURE.md` — schema DB, principios, decisiones arquitectónicas
- `docs/CONTEXT_UPDATED.md` — estado del producto + sprints/fixes pendientes
- `docs/SPRINTS.md` — historial completo Sprint 0-11
- `docs/RUNBOOK.md` — deploy, psql, n8n, Evolution API
- `docs/KEY_LEARNINGS.md` — lecciones técnicas acumuladas

---

## Changelog de este documento

| Fecha | Cambio |
|---|---|
| 6 julio 2026 | Creación: auditoría inicial (gitleaks + npm audit), plan de remediación completo |
