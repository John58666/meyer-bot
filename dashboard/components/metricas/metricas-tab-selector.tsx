'use client'

export type VistaMetricas = 'general' | 'profesional' | 'servicios'

interface TabSelectorProps {
  activa: VistaMetricas
  onChange: (vista: VistaMetricas) => void
  role?: string
}

const TABS: { key: VistaMetricas; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'profesional', label: 'Por Profesional' },
  { key: 'servicios', label: 'Servicios' },
]

export function TabSelector({ activa, onChange, role }: TabSelectorProps) {
  const tabs = role === 'profesional'
    ? TABS.filter(t => t.key !== 'profesional')
    : TABS

  return (
    <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activa === tab.key
              ? 'bg-[var(--color-accent,#6366f1)] text-white'
              : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)] hover:text-[var(--text-primary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
