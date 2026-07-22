# Documentación de meyer-bot

Mapa de docs. **NO leas todo** — lee solo lo que corresponde a tu tarea.

---

## 📋 Siempre leer (entrada obligatoria)

| Archivo | Qué contiene |
|---------|-------------|
| `CLAUDE.md` (raíz) | Reglas del proyecto, protocolo de bugs |
| `BUG_BACKLOG.md` | Estado de todos los bugs (leer siempre antes de empezar) |
| `KEY_LEARNINGS.md` | Lecciones técnicas acumuladas |

## 🐛 Cuando trabajas en un bug específico

1. Leer la entrada de ese bug en `BUG_BACKLOG.md`
2. Leer el doc en `docs/fixes/B*.md` correspondiente
3. No leer los otros fixes — solo el que aplica

## 🤖 Cuando trabajas en el prompt (nodo AI Agent)

Leer además:
- `prompt-changelog.md` — versionado del prompt
- `fixes/B6-smoke-test.js` — test estructural (ejecutar post-deploy)

## 🚀 Cuando haces deploy / ops

- `RUNBOOK.md` — procedimientos operativos

## 📅 Cuando planeas features

- `SPRINTS.md` — planificación de sprints
- `ARCHITECTURE.md` — arquitectura actual
- `backlog/ARCHITECTURE_FUTURE.md` — propuestas futuras
- `backlog/SECURITY_AUDIT.md` — auditoría de seguridad
- `backlog/performance-audit.md` — auditoría de rendimiento

---

## Estructura del directorio

```
docs/
├── README.md                       ← Este archivo (mapa de docs)
├── BUG_BACKLOG.md                  ← [SIEMPRE] Bugs activos/completados
├── KEY_LEARNINGS.md                ← [SIEMPRE] Lecciones técnicas
├── RUNBOOK.md                      ← [OPS] Procedimientos operativos
├── ARCHITECTURE.md                 ← [PLAN] Arquitectura actual
├── SPRINTS.md                      ← [PLAN] Sprint planning
├── prompt-changelog.md             ← [PROMPT] Versiones del prompt
├── backlog/                        ← Baja prioridad / planeación futura
│   ├── ARCHITECTURE_FUTURE.md
│   ├── SECURITY_AUDIT.md
│   └── performance-audit.md
└── fixes/                          ← Documentación de bugs
    ├── B1-agendas-independientes-fase1.md
    ├── B2-servicios-ambiguos.md
    ├── B3-confirmacion-agendar-cancelar.md
    ├── B4-hora-incorrecta.md
    ├── B5-contexto-conversacion.md
    ├── B6-backup-pre-modularizacion.md
    └── B6-smoke-test.js
```
