# Instrucciones Claude Code — Fix Responsive Mobile

3 fixes puntuales. No instales nada. No toques otros archivos.

---

## Fix 1: `dashboard/components/appointment-list.tsx`

El nombre y servicio se truncan demasiado en móvil porque compiten con el badge y el botón de acciones.

Encuentra este bloque (sección Info):
```tsx
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{apt.nombre}</p>
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {apt.servicio}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {formatPhone(apt.numero)}
              </p>
            </div>
```

Reemplázalo con:
```tsx
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white leading-tight break-words">
                {apt.nombre}
              </p>
              <p className="text-sm text-[var(--text-secondary)] break-words">
                {apt.servicio}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {formatPhone(apt.numero)}
              </p>
            </div>
```

Y en el contenedor principal de cada cita, cambia `items-center` por `items-start`:

Encuentra:
```tsx
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-4"
```

Reemplaza con:
```tsx
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-start gap-3"
```

---

## Fix 2: `dashboard/components/week-view.tsx`

Mismo problema en la vista semana — nombre y servicio truncados.

Encuentra:
```tsx
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {apt.nombre}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {apt.servicio}
                        </p>
                      </div>
```

Reemplaza con:
```tsx
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white break-words leading-tight">
                          {apt.nombre}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] break-words">
                          {apt.servicio}
                        </p>
                      </div>
```

También en week-view.tsx, el mes se trunca porque usa `"short"` implícitamente.

Encuentra el array de meses:
```tsx
const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
```

Reemplaza con:
```tsx
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
```

---

## Fix 3: `dashboard/components/sidebar.tsx`

En móvil el sidebar ocupa espacio lateral innecesario cuando hay poco contenido.
Agrega `z-50` ya está, pero asegura que no haya overflow.

Encuentra:
```tsx
    <aside className="fixed left-0 top-[56px] bottom-0 w-[56px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col items-center py-3 z-40">
```

Reemplaza con:
```tsx
    <aside className="fixed left-0 top-[56px] bottom-0 w-[56px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col items-center py-3 z-40 overflow-hidden">
```

---

## Deploy

Después de los cambios, commitea y despliega:

```bash
cd ~/Documents/meyer-bot
git add dashboard/
git commit -m "fix(dashboard): responsive móvil - nombres completos y mes sin truncar"
git push origin main
```

Luego en el VPS:
```bash
bash /root/deploy-dashboard.sh
```

---

## Verificación

Abre `https://dashboard.zyvenshop.com` desde el celular y confirma:
- Nombres completos en las tarjetas de cita
- Servicios completos
- "mayo" en vez de "may"
