'use client'

import { CalendarClock, Ban, Users } from 'lucide-react'

interface SummaryCardsProps {
  proximosBloqueos: number
  bloqueosActivos: number
  totalProfesionales: number
}

const cards = [
  {
    key: 'proximos',
    icon: CalendarClock,
    label: 'Próximos bloqueos',
    color: 'text-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning)]/10',
  },
  {
    key: 'activos',
    icon: Ban,
    label: 'Bloqueos activos',
    color: 'text-[var(--color-danger)]',
    bg: 'bg-[var(--color-danger)]/10',
  },
  {
    key: 'profesionales',
    icon: Users,
    label: 'Profesionales',
    color: 'text-[var(--color-accent)]',
    bg: 'bg-[var(--color-accent)]/10',
  },
] as const

export function SummaryCards({ proximosBloqueos, bloqueosActivos, totalProfesionales }: SummaryCardsProps) {
  const values: Record<string, number> = {
    proximos: proximosBloqueos,
    activos: bloqueosActivos,
    profesionales: totalProfesionales,
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4 flex items-start gap-3"
          >
            <div className={`${card.bg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-white">{values[card.key]}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{card.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
