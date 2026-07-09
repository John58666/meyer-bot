# SECURITY_AUDIT.md — meyer-bot

> **Leer al inicio de cada sesión.** Este documento es el reporte maestro de seguridad del proyecto.
> Contiene hallazgos activos, plan de remediación y lineamientos no negociables.
> Última actualización: 9 julio 2026 (sesión 2 — VPS diagnosticado vía SSH, Evolution API caído, audit_log iniciado).

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
| **hadolint** | Malas prácticas en Dockerfiles | Pendiente | TBD |
| **Revisión manual de código** | OWASP Top 10 | Pendiente | TBD |

### Diagnóstico VPS (9 julio 2026 - vía SSH)

| Verificación | Resultado |
|---|---|
| **Contenedores activos** | `n8n-n8n-1` (Up 22h) + `meyer_postgres` (Up 22h) |
| **System load** | 0.02 / 20% RAM / 46% disco |
| **Evolución API en puerto 8080** | ❌ **Nada escuchando.** Container evolution-api no está corriendo. |
| **Manager HTTP en localhost:8080** | Retorna HTTP 000 (sin respuesta) |
| **SSH desde Mac** | ✅ Funciona con password |
| **Puerto 22 abierto** | ✅ |
| **UFW/iptables** | Pendiente revisar |

**Conclusión**: **Evolution API está caído/removido**. El puerto 8080 no tiene nada. Desde el VPS local tampoco responde. Habrá que reinstalar/reiniciar el contenedor de Evolution API para rotar la key.

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
| 3 | Private Key (Google Service Account) | `docs/pendientes-seguridad.md` | 42 | `ff0ad79` | 🔴 CRÍTICA | ✅ Revocada |
| 4 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 434 | `025df4a` | 🔴 CRÍTICA | ✅ Revocada |
| 5 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1292 | `de8fe2a` | 🔴 CRÍTICA | ✅ Revocada |
| 6 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1292 | `526b57c` | 🔴 CRÍTICA | ✅ Revocada |
| 7 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 440 | `089e8bf` | 🔴 CRÍTICA | ✅ Revocada |
| 8 | Private Key (Google Service Account) | `workflows/peluqueria-beta.json` | 1291 | `089e8bf` | 🔴 CRÍTICA | ✅ Revocada |

### Valor de los secrets (redacted en este doc)

- **Google Private Key** — Service Account de Google Cloud. Acceso a Calendar API, Drive, etc. 6 apariciones en 4 commits (abril 2026 - mayo 2026). **⚠️ Estado: REVOCADA** desde Google Cloud Console (6 julio 2026). La key en el git history ya no es válida, pero permanece físicamente hasta la limpieza del history (Fase 4).
- **Evolution API Key**: `***REMOVED-EVOLUTION-API-KEY***` — permite enviar mensajes WhatsApp desde el número del negocio. 2 apariciones en 2 commits (junio 2026). **⚠️ Pendiente rotación**.

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

- [x] **Google Private Key — Revocada ✅**
      - **Acción TÚ**: key inabilitada desde Google Cloud Console (6 julio 2026).
      - **Service Account conservada** para integración Google Calendar futura.
      - **Acción YO (working tree)**: ✅ `database/migrate-from-sheets.js` movido a `database/archive/` (commit `3643d6c`)
      - ⚠️ La key vieja sigue en el git history pero **ya no es válida** — acceso mitigado.

- [ ] **Rotar Evolution API Key** — BLOQUEADO ⛔
      - **Problema diagnosticado (9 julio 2026 vía SSH)**: Evolution API no está corriendo en el VPS.
      - `docker ps` muestra solo 2 contenedores: `n8n-n8n-1` + `meyer_postgres`. Evolution API ausente.
      - Puerto 8080 no responde ni desde localhost ni desde fuera.
      - **Acción necesaria previa**: Verificar si el contenedor evolution-api existe pero está detenido (`docker ps -a`), o si hubo migración/movida.
      - **Workflow creado**: `workflows/rotar-evolution-api-key.json` para regenerar key cuando Evolution API esté activo.
      - **Instrucciones detalladas** en sección "Rotación Evolution API Key" abajo.

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

## 🔄 Session Continuation (9 julio 2026)

Si este chat se corta o inicia una nueva sesión, el modelo debe:

### Reglas de trabajo (no negociables)

1. **Nunca tocar producción sin preguntar** — preguntar antes de cualquier cambio que afecte VPS, DB, o clientes.
2. **Trabajo en conjunto** — actuar como ingeniero/arquitecto con criterio, pero siempre validar con el dueño antes de ejecutar cambios destructivos.
3. **Actualizar .MD** — solo cuando el dueño lo solicite. No sobrescribir docs sin aprobación.
4. **Usar MCPs + skills disponibles** — n8n-mcp, github-mcp, filesystem-mcp, fetch, memory, y skills (Web Security, code-review, db-sculptor, etc.)
5. **Fixes activos** — ver backlog en CONTEXT_UPDATED.md. No aplicar fixes sin preguntar.
6. **FIX_RESPONSIVE.md** — archivo trackeado en el repo, pero el fix ya está aplicado (commit `3c9c8eb`). Archivo pendiente de eliminar según convención (no va al repo). Preguntar antes de borrarlo.

### Estado actual

| Item | Estado | Detalle |
|---|---|---|
| **Commits pendientes de push** | ⚠️ 5 commits locales sin push | `4a302ef`, `2596311`, `3643d6c`, `c3b0e59`, `e3f7b8c` |
| **Google Private Key** | ✅ Revocada | Inutilizada desde Google Cloud Console (6 jul 2026) |
| **npm audit fix** | ✅ Aplicado local | Commit `4a302ef` — NO deployado al VPS |
| **migrate-from-sheets.js** | ✅ Archivado | Movido a `database/archive/` (commit `3643d6c`) |
| **Evolution API** | ❌ **No corre en VPS** | Puerto 8080 sin respuesta. `docker ps` no lo muestra. |
| **VPS contenedores activos** | Solo `n8n-n8n-1` + `meyer_postgres` | Verificado vía SSH 9 julio 2026 |
| **SSH Mac → VPS** | ✅ Funciona con password | Password compartida en session anterior (NO guardar en .md). **Urgente rotar.** |
| **Bitwarden** | ✅ Setup completado | 3 Secure Notes creadas |
| **Workflow rotación Evolution** | ✅ Creado | `workflows/rotar-evolution-api-key.json` — NO ejecutado |
| **FIX_RESPONSIVE aplicado** | ✅ | Commit `3c9c8eb`. Archivo `FIX_RESPONSIVE.md` pendiente de limpieza. |
| **Sprint actual** | Sprint 12 planificado (multi-profesional) | Ver backlog en `docs/CONTEXT_UPDATED.md` |

### 🔴 Pendiente PRÓXIMA SESIÓN

**1. Rotar Evolution API Key** — BLOQUEADO ⛔
- Evolution API no está corriendo en VPS
- Diagnosticar con `docker ps -a` y `docker logs` (desde VPS vía SSH)
- Si no existe el contenedor → reinstalar Evolution API
- Después rotar key con workflow `rotar-evolution-api-key.json`

**2. Password SSH** — La password actual está comprometida (compartida en chat)
- **Urgente**: cambiar password SSH del VPS y guardar en Bitwarden
- O configurar `ssh-copy-id` con la key `id_ed25519` para acceso sin password

**3. Hacer git push de commits locales**

**4. Continuar Fase 3 — Hardening VPS**
- Firewall (ufw/iptables) para Evolution API
- Cambiar password meyer_user PostgreSQL

**5. Limpiar git history con filter-repo (Fase 4)**

**6. Sprint 12** — Multi-profesional completo (cuando Fases 2-4 estén resueltas)

### Log de SSH exitoso (9 julio 2026)

```
Sistema: Ubuntu 24.04.4 LTS | 2 vCPU | 3.7GB RAM | 38GB disco
System load: 0.02 | RAM: 20% | Disco: 46% usado
Contenedores: n8n-n8n-1 (Up 22h) + meyer_postgres (Up 22h)
Puerto 8080: NADA escuchando. Container evolution-api AUSENTE.
SSH password: compartida en sesión anterior (rotar urgente)
```

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
| 9 julio 2026 | VPS diagnosticado vía SSH: Evolution API caído, solo 2 contenedores activos. Session continuation agregado. |
