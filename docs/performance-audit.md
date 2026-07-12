# Performance Audit — meyer-bot

> Presupuesto CSS y reglas de performance para el dashboard.
> Creado: 12 julio 2026 — Post-Sprint 15 (GPU glitch fix).

## Reglas obligatorias (no negociables)

### 1. Cero `rgba()` en borders

Usar hex sólido siempre. La variable `--border-subtle: #2A2A2A` y `--border-hover: #3A3A3A` en `globals.css` se aplican a todos los componentes vía CSS variable.

### 2. Cero `rgba()` en background-colors

Si necesitas transparencia en backgrounds, usa una paleta de hex sólidos pre-multiplicados sobre el color base (`--bg-card: #1A1A1A`). NO usar `rgba()` ni `opacity` en elementos que se renderizan en cantidad (grids, listas, celdas).

Referencia de pre-multiplicación sobre fondo #1A1A1A:

| Look deseado | Hex sólido |
|---|---|
| green 80% | `#1A8A4A` |
| green 40% | `#1A5A3A` |
| amber 50% | `#8A7010` |
| gray 10% | `#2A2A2A` |
| gray 20% | `#3A3A3A` |
| red 20% | `#3A1A1A` |

### 3. Cero animaciones SVG en móvil

- `recharts`: siempre `isAnimationActive={false}` en móvil o global.
- `animationDuration`/`animationBegin` forzan repaint GPU en cada frame SVG. Desactivar en todos los componentes que se renderizan en mobile.

### 4. Cero CSS filters en producción

`filter: blur()`, `backdrop-filter`, `drop-shadow()` fuerzan capa de composición GPU. NO usarlos.

## GPU composición — qué evitar

| Feature | Problema | Alternativa |
|---------|----------|-------------|
| `rgba()` in borders | Capa de composición por borde | Hex sólido via CSS variable |
| `rgba()` in backgrounds | Capa de composición por celda | Hex pre-multiplicado |
| `opacity` < 1 | Capa de composición por elemento | Usar hex sólido |
| `filter` / `backdrop-filter` | Capa de composición + blur costoso | No usar |
| `transform: translateZ(0)` | Fuerza capa GPU innecesaria | Solo si hay animación |
| `will-change` | Fuerza capa GPU preventiva | Solo si hay animación |
| recharts `animationDuration` | Repaint SVG en cada frame | `isAnimationActive={false}` |

## ¿Cómo detectar composición GPU excesiva?

1. **Chrome DevTools → Rendering → Layer borders**: si ves bordes naranjas en elementos que no deberían tener capa, hay composición innecesaria.
2. **Performance tab**: grabar scroll en móvil simulado. Buscar "Layer tree" updates frecuentes.
3. **GPU rasterization** en `chrome://gpu`: verificar que "Rasterization" y "Compositing" estén hardware-accelerated.
4. **Samsung Internet / Chrome Android**: `chrome://inspect` para debugging remoto desde Mac.

## Responsive — reglas de altura

| Componente | Mobile (<640px) | Tablet/Desktop |
|---|---|---|
| KPI empty/error states | `min-h-48` | `min-h-48` |
| Chart Ingresos container | `h-[180px]` | `h-[260px]` |
| Chart Servicios container | `min-h-[200px]` | `min-h-[280px]` |
| Drawers | `max-md:!w-[90vw]` | `w-3/4` (shadcn default) |

## Transiciones permitidas

| Propiedad | Ejemplo |
|-----------|---------|
| `background-color` | `transition-colors` |
| `color` | `transition-colors` |
| `opacity` | `transition-opacity` |
| `border-color` | `transition-colors` |

NO usar `transition-all` en componentes que se renderizan en cantidad (cards, listas, celdas de grid).

## Checklist de revisión rápida

Antes de deployar cambios al dashboard:

- [ ] `rgba()` count = 0 en borders
- [ ] `rgba()` count = 0 en backgrounds de elementos renderizados en loop
- [ ] `isAnimationActive={false}` en todos los recharts charts
- [ ] `transition-all` ausente en componentes repetitivos
- [ ] `h-` fijo convertido a `min-h-` o `py-` en estados vacíos
- [ ] `filter`/`backdrop-filter` no introducidos
- [ ] Build exitoso (`npm run build`)
