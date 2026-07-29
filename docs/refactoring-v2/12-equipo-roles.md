# Plan: Equipo — Roles & Modales (Módulo 12)

> 1 diseño Stitch: horario heredado + feedback de estado.

## Contexto

Modales de detalle de empleado: horario semanal, feedback de clientes, rendimiento.

## Stitch Export

`inherited_schedule_and_feedback_status.html`

## Componentes V2

### 1. `features/equipo-roles/components/employee-detail-modalV2.tsx`
- Modal completo con:
  - Info del empleado (nombre, rol, contacto)
  - Horario semanal (heredado del módulo 07)
  - Feedback/rating de clientes (estrellas, comentarios recientes)
  - Métricas: citas completadas, puntualidad, ingresos generados

## Reglas
- Feedback es solo lectura en este modal
- Las estrellas deben ser de lucide-react (Star, StarHalf)