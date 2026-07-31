"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputV2Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInputV2({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
}: SearchInputV2Props) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zf-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[1rem] border border-zf-border bg-zf-surface py-2.5 pl-9 pr-3 text-sm text-zf-text placeholder-zf-text-muted outline-none transition-shadow focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
      />
    </div>
  )
}
