import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateV2Props {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyStateV2({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateV2Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zf-accent-bg">
          <Icon className="h-6 w-6 text-zf-accent-text" />
        </div>
      )}
      <h3 className="text-base font-semibold text-zf-text">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-zf-text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
