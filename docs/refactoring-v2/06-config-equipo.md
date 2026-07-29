# Plan: Config — Equipo (Módulo 06)

> 1 diseño Stitch: lista de empleados con roles.

## Contexto

Gestión del equipo: lista de empleados con rol, estado, información de contacto.

## Stitch Export

`team_roles_config_view.html`

## Componentes V2

### 1. `features/config-team/components/team-listV2.tsx`
- Tabla/tarjetas de empleados: foto/avatar, nombre, rol, teléfono, email, estado (activo/inactivo)
- Botones: Añadir Empleado, editar, toggle estado
- Server actions: `getTeamMembers()`, `createTeamMember()`, `updateTeamMember()`, `toggleTeamMemberStatus()`

### 2. `features/config-team/components/team-member-modalV2.tsx`
- Modal formulario: nombre, teléfono, email, rol (dropdown), comisión %, horario (link a módulo horarios)

## Reglas
- Roles: leer de server action (no hardcodear)
- Los horarios se configuran en Módulo 07 (no duplicar aquí)