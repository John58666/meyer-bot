# SECURITY_AUDIT.md — meyer-bot

> **Leer al inicio de cada sesión.** Este documento es el reporte maestro de seguridad del proyecto.
> Contiene hallazgos activos, plan de remediación y lineamientos no negociables.
> Última actualización: 10 julio 2026 (sesión 3 — Evolution API restaurado, SSH rotado, git push realizado, Fase 3 y Fase 4 completadas).

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

- [x] **Evolution API restaurado (10 julio 2026)** ✅
      - **Causa raíz encontrada**: reboot del VPS ~29h antes. Contenedores `evolution-api`, `evolution-postgres`, `evolution-redis` no tenían `restart policy` (a diferencia de n8n/postgres que sí la tienen).
      - **Fix aplicado**: `docker update --restart unless-stopped` en los 3 contenedores + `docker start` en orden (postgres → redis → api). `docker-compose.yaml` actualizado con `restart: unless-stopped` para persistir el fix (backup del compose guardado).
      - **Verificado**: ambas instancias (`peluqueria-beta`, `brayan-study`) reconectadas a WhatsApp sin necesidad de reescanear QR (no se recremicaron contenedores, se preservó la sesión).
      - ⚠️ **Nuevo hallazgo**: `evolution-postgres` y `evolution-redis` **no tienen volumen persistente** — los datos viven en el filesystem del contenedor. Si el contenedor se elimina (`docker rm`), se pierde la sesión de WhatsApp y config de instancias. **Pendiente**: agregar volumen nombrado.
      - ⚠️ **Nuevo hallazgo**: `docker-compose.yaml` de Evolution API tiene `API_KEY`, `AUTHENTICATION_API_KEY` y `POSTGRES_PASSWORD=password` **hardcodeados en texto plano** (no solo en git history — vivo en el VPS). No se migró a `.env` todavía por riesgo de recrear contenedores sin volumen (perdería sesión WhatsApp). **Pendiente para cuando se haga mantenimiento con downtime planeado.**

- [ ] **Rotar Evolution API Key** — DESBLOQUEADO (Evolution API corriendo), pendiente ejecutar
      1. Evolution API manager UI (`http://178.104.27.180:8080/manager`) — acceso ahora solo vía localhost/túnel SSH (puerto cerrado al público, ver Fase 3)
      2. Ir a Settings → API Keys
      3. Generar nueva API key
      4. Revocar la vieja (ya removida de docs/workflows, pero **sigue activa en el VPS** — rotarla es la única forma de invalidarla realmente)
      5. Copiar la nueva key
      6. Guardar en Bitwarden como Secure Note nueva
      7. Actualizar `/root/n8n/.env` del VPS: `EVOLUTION_API_KEY=<nueva>` y `/root/evolution-api/docker-compose.yaml` (`API_KEY`, `AUTHENTICATION_API_KEY`)
      8. En n8n UI → nodos que usan `apikey` cambiar a la nueva (modo Expression: `={{ $env.EVOLUTION_API_KEY }}`)
      9. Recrear evolution-api: requiere downtime — planificar con el dueño (riesgo de perder sesión WhatsApp si no hay volumen — ver hallazgo arriba)

### Pendiente como feature futura

- [ ] **Integración Google Calendar en el dashboard** (no Sprint actual)
      - Cuando se implemente, crear nueva key en la Service Account conservada
      - OAuth flow recomendado (no Service Account JSON) para usuarios que conecten su propio Google Calendar
      - Documentar en `docs/ARCHITECTURE.md` cuando se diseñe

### Fase 3 — Hardening del VPS (COMPLETADA ✅ — 10 julio 2026)

- [x] **Firewall: cerrar puerto 8080 de Evolution API al público** ✅
      - `ufw` ya tenía regla `8080 ALLOW Anywhere` → cambiada a `8080 ALLOW 127.0.0.1`.
      - ⚠️ **Hallazgo**: Docker bypasea UFW (inserta reglas iptables con prioridad mayor). Solución real: regla en chain `DOCKER-USER`: `iptables -A DOCKER-USER -i eth0 -p tcp --dport 8080 -j DROP` (bloquea tráfico externo por `eth0`; tráfico desde localhost/Docker bridge no pasa por `eth0`, así que n8n sigue funcionando).
      - Persistida con `iptables-persistent` (`/etc/iptables/rules.v4`), sobrevive reinicios.
      - **Verificado desde fuera (Mac)**: `curl http://178.104.27.180:8080` → timeout/`HTTP 000`. Bloqueado correctamente.
      - `docker-compose.yaml` de Evolution API actualizado a `127.0.0.1:8080:8080` (aplicará cuando se recree el contenedor).

- [x] **Cambiar password débil de meyer_user** ✅
      1. Password nueva (26 caracteres) generada y aplicada: `ALTER USER meyer_user WITH PASSWORD '...'`.
      2. Guardada en Bitwarden por el dueño.
      3. Actualizado `/root/meyer-bot/dashboard/.env.local` (VPS) y `~/Documents/meyer-bot/dashboard/.env.local` (Mac).
      4. Actualizado `/root/n8n/.env` (VPS) — `POSTGRES_PASSWORD` (solo aplica si se recrea el contenedor `meyer_postgres` desde cero; no afecta el runtime actual).
      5. `pm2 restart meyer-dashboard` — verificado HTTP 200 en `/login` + query exitosa a `businesses` con la nueva password.
      6. ⚠️ **Hallazgo importante**: los workflows de n8n (bot WhatsApp) usan una **credencial cifrada en el vault interno de n8n** (`Postgres account`, id `AkRs7Kx5gs6JnVMz`), **no leen `POSTGRES_PASSWORD` desde `.env`**. Esta credencial fue actualizada manualmente por el dueño en la UI de n8n (`http://178.104.27.180:5678` → Credentials → Postgres account) tras el cambio de password.

### Fase 4 — Limpieza de git history (COMPLETADA ✅ — 10 julio 2026)

- [x] `git-filter-repo` instalado (`brew install git-filter-repo`)
- [x] Backup del repo: `~/Documents/meyer-bot-backup-pre-cleanup/` (sin `node_modules`/`.next`, con `.git` completo verificado)
- [x] Archivos purgados de **todo** el git history (`--invert-paths`):
      - `workflows/peluqueria-beta.json`
      - `docs/pendientes-seguridad.md`
- [x] String reemplazado en todo el history (`--replace-text`): Evolution API Key → `***REMOVED-EVOLUTION-API-KEY***`
- [x] ⚠️ **Hallazgo durante ejecución**: existía una rama adicional `fix/tab-title` en GitHub no incluida en el plan original — también tenía los mismos leaks. Se detectó, limpió y forzó el push igual que `main`.
- [x] Force-push a ambas ramas: `git push --force origin main` y `git push --force origin fix/tab-title`
- [x] Único colaborador (owner) — no requiere aviso a terceros
- [x] Re-ejecutado gitleaks **desde un clon 100% fresco de GitHub** (no solo local): `no leaks found` en ambas ramas — confirmado
- [x] Remote origin: se removió el PAT (`ghp_...`) que estaba hardcodeado en la URL del remote (`.git/config`); reemplazado por autenticación vía `gh` CLI / macOS Keychain (`gh auth setup-git`)

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

## 🔄 Session Continuation (10 julio 2026 — sesión 3)

### Estado actual (post sesión 3)

| Item | Estado | Detalle |
|---|---|---|
| **Evolution API** | ✅ Restaurado | 3 contenedores `Up`, `restart: unless-stopped` aplicado. WhatsApp reconectado sin re-escanear QR. |
| **Volumen persistente evolution-postgres/redis** | ⚠️ Pendiente | No existe — riesgo de pérdida de sesión si se elimina el contenedor. |
| **Secrets hardcodeados en docker-compose.yaml de Evolution** | ⚠️ Pendiente | `API_KEY`, `POSTGRES_PASSWORD=password` en texto plano en el VPS. Migrar a `.env` cuando se planifique downtime. |
| **Rotar Evolution API Key (la key en sí)** | ⚠️ Pendiente (desbloqueado) | Evolution API ya corre; falta ejecutar la rotación real. |
| **Password SSH root** | ✅ Rotada | Acceso por key `id_ed25519` configurado (`ssh-copy-id`) + password de emergencia rotada y guardada en Bitwarden por el dueño. |
| **Git push commits locales** | ✅ Hecho | 9 commits sincronizados con `origin/main` (incluye 1 commit de rebase con cambio remoto pre-existente). |
| **Fix hardcoded key en workflow antes de push** | ✅ Hecho | `workflows/rotar-evolution-api-key.json` — `oldApiKey` ahora usa variable en vez de string literal. |
| **Firewall puerto 8080** | ✅ Cerrado al público | UFW + iptables `DOCKER-USER`, persistido, verificado desde fuera. |
| **Password meyer_user PostgreSQL** | ✅ Rotada | `.env` actualizados (dashboard Mac+VPS, n8n VPS), `pm2 restart` verificado, credencial de n8n UI actualizada manualmente por el dueño. |
| **Git history limpio** | ✅ Verificado | `git-filter-repo` — 0 leaks confirmado desde clon fresco de GitHub, ambas ramas (`main`, `fix/tab-title`). |
| **PAT hardcodeado en remote URL** | ✅ Removido | Reemplazado por `gh auth setup-git` (Keychain). |
| **GOOGLE_PRIVATE_KEY en .env del VPS** | ⚠️ Pendiente | Key ya revocada (inservible) pero sigue en el `.env` — limpiar cuando se prioricen las fases 5-6. |
| **Sprint actual** | 🟢 Sprint 12 iniciando | Multi-profesional — desbloqueado, todas las fases de seguridad urgentes completas. |

### 🔴 Pendientes para próximas sesiones (no bloqueantes para Sprint 12)

1. Rotar la Evolution API Key real (ya no bloqueado, pero no ejecutado — requiere downtime breve de WhatsApp)
2. Agregar volumen persistente a `evolution-postgres` y `evolution-redis`
3. Migrar secrets hardcodeados del `docker-compose.yaml` de Evolution API a `.env`
4. Limpiar `GOOGLE_PRIVATE_KEY` del `.env` del VPS (key ya revocada, solo limpieza)
5. Fase 5 — hardening dashboard (rate limiting, security headers, compliance Ley 1581) — pre-Sprint 15

---

## 🔄 Session Continuation (9 julio 2026) — histórico, ver sesión 3 arriba para estado vigente

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
| 10 julio 2026 | **Sesión 3 completa**: Evolution API restaurado (causa raíz: sin restart policy tras reboot), SSH rotado (key + password), git push (9 commits) con fix de key hardcodeada previo, Fase 3 completada (firewall + password DB), Fase 4 completada (git history 100% limpio, verificado desde clon fresco). Nuevos hallazgos documentados: sin volumen persistente en evolution-postgres/redis, secrets hardcodeados en compose de Evolution, n8n usa vault interno no `.env` para credencial Postgres. Sprint 12 desbloqueado. |
