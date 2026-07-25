# TEMPLATES.md — Patrones reutilizables

> Templates para tareas recurrentes.

## Bug fix
```
## Diagnóstico
- **Bug**: 
- **Archivo**: 
- **Causa raíz**: 
- **Impacto**: (qué negocios/usuarios afecta)

## Solución propuesta
- **Cambio**: 
- **Archivos a modificar**: 
- **Riesgo**: (producción? DB? multi-tenant?)

## Verificación
- [ ] Probado en local
- [ ] Migración DB (si aplica)
- [ ] Multi-tenant verificado
- [ ] Regla agregada a RULES.md
- [ ] MEMORY.md actualizado
```

## Feature
```
## Feature
- **Qué**: 
- **Por qué**: 
- **Sprint relacionado**: 

## Diseño
- **Cambios en DB**: (migración necesaria? aditiva?)
- **Cambios en bot (n8n)**: 
- **Cambios en dashboard**: 
- **API routes nuevas**: 

## Verificación
- [ ] Backwards-compatible
- [ ] Multi-tenant desde el inicio
- [ ] RBAC considerado
- [ ] Aprobación del usuario
```

## Refactor
```
## Refactor
- **Qué**: 
- **Por qué**: (deuda técnica? performance? preparación para futuro?)
- **Sin cambios de comportamiento**: (verificar)

## Cambios
- **Archivos**: 
- **Patrón nuevo**: 
- **Patrón eliminado**: 

## Verificación
- [ ] Output idéntico antes/después
- [ ] Tests pasan
- [ ] No hay cambios de schema DB
```

## Deploy
```
## Deploy
- **Qué se despliega**: 
- **Cambios incluidos**: 

## Pre-deploy
- [ ] Migración DB ejecutada (si aplica)
- [ ] SQL de rollback listo
- [ ] Cambios probados en local
- [ ] Evaluator revisó el diff
- [ ] Usuario aprobó explícitamente
- [ ] Backups verificados

## Post-deploy
- [ ] `pm2 logs` sin errores
- [ ] Funcionalidad crítica probada (agendar, cancelar, reagendar)
- [ ] Si hay problema → `git revert` disponible
- [ ] MEMORY.md actualizado
```

## Investigación
```
## Investigación
- **Pregunta**: 
- **Por qué se necesita**: 

## Hallazgos
- 

## Conclusión
- 

## Acción requerida
- [ ] Cambio de código?
- [ ] Regla nueva en RULES.md?
- [ ] Documentar en KEY_LEARNINGS.md?
```

## Nueva sesión
```
## [Fecha] — [Objetivo]

### Qué se hizo
- 

### Qué quedó pendiente
- 

### Regla nueva (si aplica)
- 

### Archivos modificados
- 
```
