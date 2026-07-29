# Plan: Config — Auditoría (Módulo 09)

> 1 diseño Stitch: tabla de auditoría con filtros avanzados.

## Contexto

Registro de todas las acciones del sistema: quién, qué, cuándo. Solo lectura.

## Stitch Export

`advanced_audit_filters_view.html`

## Componentes V2

### 1. `features/config-audit/components/audit-tableV2.tsx`
- Tabla con filtros avanzados: fecha (desde/hasta), usuario, acción (tipo), módulo
- Columnas: Fecha/Hora, Usuario, Acción, Módulo, Detalle, IP
- Paginación server-side (la tabla de auditoría crece rápido)
- Server action: `getAuditLogs(filters, pagination)`

## Reglas
- Siempre paginación server-side — no cargar todo en memoria
- Filtros deben persistir en URL params (para compartir/share)
- Export a CSV opcional (postergar si no está en diseño)