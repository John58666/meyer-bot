// app/(dashboard)/semana/SemanaClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { LayoutList, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CalendarMonthView } from '@/components/calendar-month-view'

type ViewMode = 'lista' | 'calendario'
const STORAGE_KEY = 'meyer-semana-view'

interface SemanaClientProps {
  children: React.ReactNode
  multiProfessional: boolean
  servicesText: string
}

export function SemanaClient({ children, multiProfessional, servicesText }: SemanaClientProps) {
  const [mode, setMode] = useState<ViewMode>('lista')

  // Leer preferencia guardada solo en el cliente (evita hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'lista' || saved === 'calendario') setMode(saved)
  }, [])

  const switchMode = (next: ViewMode) => {
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <div className="space-y-4">
      {/* ── Toggle ── */}
      <div
        role="tablist"
        aria-label="Modo de vista"
        className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1"
      >
        <ToggleButton
          active={mode === 'lista'}
          onClick={() => switchMode('lista')}
          icon={<LayoutList className="h-4 w-4" />}
          label="Lista"
        />
        <ToggleButton
          active={mode === 'calendario'}
          onClick={() => switchMode('calendario')}
          icon={<CalendarDays className="h-4 w-4" />}
          label="Calendario"
        />
      </div>

      {/* ── Contenido ── */}
      {mode === 'lista' ? (
        // Render del children solo cuando está en modo lista.
        // Si los children son Server Components, React los mantiene
        // montados en DOM pero hidden con CSS para no perder el server render.
        <div>{children}</div>
      ) : (
        <CalendarMonthView multiProfessional={multiProfessional} servicesText={servicesText} />
      )}
    </div>
  )
}

// ─── Sub-componente del botón del toggle ──────────────────────────────────────

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5',
        'text-sm font-medium transition-all duration-150',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
