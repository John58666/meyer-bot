"use client"

import * as React from "react"
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerV2Props {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function DrawerV2({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: DrawerV2Props) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onClose}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
        <DrawerPrimitive.Popup
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-zf-surface shadow-[0_4px_16px_rgba(0,0,0,0.08)] data-ending-style:translate-x-full data-starting-style:translate-x-full transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center justify-between border-b border-zf-border px-5 py-4">
            <div>
              {title && (
                <DrawerPrimitive.Title className="text-base font-semibold text-zf-text">
                  {title}
                </DrawerPrimitive.Title>
              )}
              {description && (
                <DrawerPrimitive.Description className="mt-0.5 text-sm text-zf-text-secondary">
                  {description}
                </DrawerPrimitive.Description>
              )}
            </div>
            {showCloseButton && (
              <DrawerPrimitive.Close className="flex h-7 w-7 items-center justify-center rounded-full text-zf-text-secondary transition-colors hover:bg-zf-accent-bg">
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DrawerPrimitive.Close>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
