"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-muted transition-colors hover:bg-zf-accent-bg hover:text-zf-error-text"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
