# HANDOFF — Refactor V2 Inicio

## Estado Actual

**Sesión**: Planificación completa del refactor UI V2.
**Modo**: Plans written, implementation NOT started.
**Contexto**: El agente que escribió esto ya no está disponible. Leer este doc + INDEX.md para continuar.

## Credenciales VPS

Archivo: `secrets/vps-credentials.env` (gitignored, seguro)
```
Host: 178.104.27.180
User: root
Pass: (en el archivo)
```

Usar para crear server actions de módulos con backend gap (Caja, Inventario, Pagos).

## Instrucciones para el próximo agente

1. LEER `docs/refactoring-v2/INDEX.md` completo primero
2. LEER el módulo que toque implementar
3. NO implementar nada de backend sin acceso VPS confirmado
4. Seguir orden de módulos del INDEX.md
5. Recordar: `className="dark"` en layout — V2 usan colores hardcodeados (Zero-Friction pastel)
6. Workflow n8n correcto: **"WhatsApp Bot - Genérico restored"** — es el principal. Hay otros pero no usarlos.
7. No tocar: `/api/webhooks/sync-*`, `middleware.ts`, nombres de nodos n8n, RETURNING de queries SQL

## Qué se hizo

1. Se leyeron y analizaron los 20 diseños HTML de Stitch
2. Se mapearon los diseños a los módulos existentes del dashboard
3. Se identificaron los dos sistemas de diseño: "Zero-Friction" y "Grooming Pro"
4. Se definió la estrategia V2 paralela (nunca tocar originales)
5. Se escribieron **13 plan docs** en `docs/refactoring-v2/`

## Docs Creados

| Archivo | Contenido |
|---------|-----------|
| `INDEX.md` | Master plan: reglas, design system, estructura carpetas, icon mapping, orden módulos |
| `01-agenda.md` | 5 componentes V2: calendario semanal + modales/sheets/drawers |
| `02-clientes.md` | 4 componentes V2: tabla + drawer + historial + formulario |
| `03-caja.md` | 5 componentes V2: POS 60/40 + carrito + checkout + éxito |
| `04-config-perfil.md` | Perfil negocio |
| `05-config-servicios.md` | Servicios con modal 2 pestañas |
| `06-config-equipo.md` | Lista empleados |
| `07-config-horarios.md` | Horarios por sub-pestañas + bloqueos |
| `08-config-pagos.md` | Toggle cards métodos pago |
| `09-config-auditoria.md` | Auditoría con filtros |
| `10-inventario.md` | Catálogo + modal producto |
| `11-dashboard.md` | Dashboard con payroll + comisiones |
| `12-equipo-roles.md` | Modal detalle empleado |

## Hallazgos Clave (de auditoría de código)

1. **Dark → Light theme**: El dashboard actual es **dark-only** (`app/layout.tsx` línea 24 forza `className="dark"`). Los diseños Stitch son **light/warm**. Las V2 deben usar clases CSS inline con los grooming tokens en lugar de cambiar el tema global.
2. **Icon mapping**: Stitch usa Material Symbols. El proyecto usa lucide-react. Tabla completa en INDEX.md.
3. **Tailwind v4**: Sin JS config, todo via `@theme` en CSS.
4. **shadcn/ui style**: `base-nova`.
5. **Server actions reales vs asumidas**: Ver sección "Hallazgos de Auditoría" en INDEX.md. Varias acciones no existen aún.
6. **Backend gaps**: Inventario, Caja/POS, Pagos NO TIENEN backend. Requieren crear server actions nuevas con acceso VPS.
7. **Duplicación WeekView**: Existe `components/week-view.tsx` Y `app/(dashboard)/semana/SemanaClient.tsx` que duplican el calendario. Unificar en V2.
8. **Tipos dispersos**: No hay `lib/types.ts`. Los tipos están en `lib/appointments.ts`, `lib/services.ts`, `lib/audit-types.ts`, `lib/actions.ts`.

## Target de Diseño

**Zero-Friction** (pastel, `#F97316` primary). Confirmado por el usuario. NO Grooming Pro.

## Próximo Paso

Implementar Fase 0: Componentes compartidos (shared components en INDEX.md). Luego empezar con módulos independientes (Config: Perfil, Servicios, Equipo, etc.).

## Secuencia Recomendada

```
Fase 0: Shared Components (page-shellV2, stat-cardV2, empty-stateV2, search-inputV2, 
         badgeV2, modalV2, drawerV2, sheetV2)

Fase 1: Módulos sin dependencias (paralelo):
  - Config: Perfil Negocio
  - Config: Servicios
  - Config: Métodos Pago  
  - Config: Equipo
  - Config: Auditoría

Fase 2: Módulos con dependencias:
  - Config: Horarios (necesita Equipo)
  - Agenda (necesita Servicios + Equipo + Horarios)
  - Clientes (necesita Agenda)
  - Inventario

Fase 3: Módulos complejos:
  - Caja/POS (necesita Servicios + Clientes + Inventario + Pagos)

Fase 4: Final:
  - Dashboard Home (necesita todos los módulos)
  - Equipo Roles (necesita Equipo)
```

## Bugs Conocidos (sin tocar)

Del BUG_BACKLOG.md original. No trabajar en bugs ahora — solo UI refactor.

## Reglas

Ver `docs/harness/RULES.md` y `docs/refactoring-v2/INDEX.md` (Golden Rules).