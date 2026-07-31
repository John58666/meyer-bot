import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardV2Props {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
  className?: string
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-zf-success-text" },
  down: { icon: TrendingDown, color: "text-zf-error-text" },
  neutral: { icon: Minus, color: "text-zf-text-secondary" },
}

export function StatCardV2({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: StatCardV2Props) {
  const TrendIcon = trend ? trendConfig[trend].icon : null

  return (
    <div
      className={cn(
        "rounded-[1rem] bg-zf-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zf-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-zf-text">{value}</p>
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zf-accent-bg">
            <Icon className="h-4 w-4 text-zf-accent-text" />
          </div>
        )}
      </div>
      {trend && TrendIcon && (
        <div className="mt-2 flex items-center gap-1">
          <TrendIcon className={cn("h-3.5 w-3.5", trendConfig[trend].color)} />
          {trendLabel && (
            <span className={cn("text-xs font-medium", trendConfig[trend].color)}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
