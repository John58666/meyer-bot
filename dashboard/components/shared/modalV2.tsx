"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalV2Props {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function ModalV2({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: ModalV2Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150"
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1rem] bg-zf-surface p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] text-sm text-zf-text outline-none sm:max-w-md data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95 transition-all duration-150",
            className
          )}
        >
          {showCloseButton && (
            <DialogPrimitive.Close className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-zf-text-secondary transition-colors hover:bg-zf-accent-bg">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          )}
          {title && (
            <DialogPrimitive.Title className="text-lg font-semibold text-zf-text pr-8">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="mt-1 text-sm text-zf-text-secondary">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className={cn(title || description ? "mt-4" : "")}>
            {children}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
