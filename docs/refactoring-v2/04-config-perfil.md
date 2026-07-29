# Plan: Config — Perfil del Negocio (Módulo 04)

> 1 diseño Stitch: formulario de datos del negocio.

## Contexto

Configuración básica del negocio: nombre, dirección, teléfono, logo, horario general.

## Stitch Export

`business_profile_config_view.html`

## Componentes V2

### 1. `features/config-business/components/business-profile-formV2.tsx`
- Formulario: nombre, descripción, dirección, teléfono, email, logo (upload), horario general (apertura/cierre)
- Server action: `updateBusinessProfile(data)`

## Reglas
- Logo upload: usar input type=file, mostrar preview. No implementar cloud storage ahora.
- Horario general es el default — los horarios por empleado se configuran en otro módulo