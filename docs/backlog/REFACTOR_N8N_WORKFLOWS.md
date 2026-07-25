# Refactor: Simplificar workflows n8n

> **Propósito:** Reducir los 5 workflows activos a lo mínimo necesario, y optimizar el workflow principal.

## Estado actual (5 workflows activos)

| # | Workflow | Trigger | Nodos | ¿Necesario? |
|---|----------|---------|-------|-------------|
| 1 | WhatsApp Bot - Genérico | Webhook | ~50 | ✅ Core |
| 2 | Recordatorios 24h | Cron 3 PM | ~8 | ✅ |
| 3 | Recordatorios 2h | Cron c/2h | ~8 | ⚠️ Fusionable con #2 |
| 4 | Inactividad Bot | Cron c/5min | ~6 | ❓ Dudoso |
| 5 | No-Shows | Cron 23:59 | ~4 | ⚠️ Reemplazable por SQL |

## Lo que hacen empresas similares

**Proxxa (México):** 1 workflow conversacional + recordatorios en el mismo. Sin workflow de inactividad.

**Achiya (50+ clients, n8n queue mode):**
- 1 **gateway** workflow (~5 nodos): recibe webhook, rutea por cliente
- 1 **sub-workflow** por cliente (~15 nodos): lógica del negocio
- Pattern: `Execute Workflow` node para delegar a sub-workflows
- Recordatorios en workflow separado con Redis queue

**Camilo Ruas (open source, mismo stack):**
- 1 workflow conversacional
- 1 workflow "engine" que genera slots (cron)
- Sin inactividad, sin no-shows

## Propuesta

### Mantener (optimizados):
- **#1 WhatsApp Bot**: partir en sub-workflows (~10-15 nodos c/u)
- **#2 Recordatorios**: fusionar #2 + #3 en uno, cron 8 AM + 3 PM

### Evaluar:
- **#4 Inactividad Bot**: medir cuántos clientes responden. Si <5%, eliminar.
- **#5 No-Shows**: migrar a query SQL + notificación en dashboard al abrir. Ahorra un workflow.

### Gateway pattern (para 20+ clientes):
```
Webhook único → Gateway (rutear por business_id) → Sub-workflow por cliente
```
Hoy es innecesario (2 clientes), pero tenerlo en mente.
