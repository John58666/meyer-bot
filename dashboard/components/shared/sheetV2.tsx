"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetV2Props {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function SheetV2({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: SheetV2Props) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onClose}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
        <SheetPrimitive.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[1.5rem] bg-zf-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)] data-ending-style:translate-y-full data-starting-style:translate-y-full transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center justify-between border-b border-zf-border px-5 py-4">
            <div>
              {title && (
                <SheetPrimitive.Title className="text-base font-semibold text-zf-text">
                  {title}
                </SheetPrimitive.Title>
              )}
              {description && (
                <SheetPrimitive.Description className="mt-0.5 text-sm text-zf-text-secondary">
                  {description}
                </SheetPrimitive.Description>
              )}
            </div>
            {showCloseButton && (
              <SheetPrimitive.Close className="flex h-7 w-7 items-center justify-center rounded-full text-zf-text-secondary transition-colors hover:bg-zf-accent-bg">
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </SheetPrimitive.Close>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </SheetPrimitive.Popup>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}
