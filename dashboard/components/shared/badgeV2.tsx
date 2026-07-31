import { cn } from "@/lib/utils"

interface BadgeV2Props {
  variant?: "success" | "warning" | "error" | "info" | "neutral"
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<NonNullable<BadgeV2Props["variant"]>, string> = {
  success: "bg-zf-success-bg text-zf-success-text",
  warning: "bg-zf-warning-bg text-zf-warning-text",
  error: "bg-zf-error-bg text-zf-error-text",
  info: "bg-zf-accent-bg text-zf-accent-text",
  neutral: "bg-zf-neutral-bg text-zf-text-secondary",
}

export function BadgeV2({ variant = "neutral", children, className }: BadgeV2Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
