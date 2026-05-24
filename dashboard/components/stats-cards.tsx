import type { TodayStats } from "@/lib/appointments";

interface StatsCardsProps {
  stats: TodayStats;
}

const cards = [
  {
    key: "total" as const,
    label: "Total hoy",
    color: "border-[var(--color-accent)]",
    textColor: "text-[var(--color-accent)]",
  },
  {
    key: "pendientes" as const,
    label: "Pendientes",
    color: "border-[var(--color-warning)]",
    textColor: "text-[var(--color-warning)]",
  },
  {
    key: "completadas" as const,
    label: "Completadas",
    color: "border-[var(--color-success)]",
    textColor: "text-[var(--color-success)]",
  },
  {
    key: "canceladas" as const,
    label: "Canceladas",
    color: "border-[var(--color-danger)]",
    textColor: "text-[var(--color-danger)]",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`bg-[var(--bg-card)] border border-[var(--border-subtle)] border-t-2 ${card.color} rounded-xl p-4`}
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">
            {card.label}
          </p>
          <p className={`text-3xl font-bold ${card.textColor}`}>
            {stats[card.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
