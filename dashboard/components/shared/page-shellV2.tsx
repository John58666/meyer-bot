import { cn } from "@/lib/utils"

interface PageShellV2Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageShellV2({
  title,
  subtitle,
  actions,
  children,
  className,
}: PageShellV2Props) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zf-text sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zf-text-secondary">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
