import { auth } from "@/auth"
import { SignOutButton } from "./sign-out-buttonV2"
import { NotificationBell } from "./notification-bell"

export async function TopbarV2() {
  const session = await auth()
  const businessName = session?.user?.businessName ?? "Dashboard"
  const userName = session?.user?.name ?? session?.user?.email ?? "Usuario"
  const businessId = session?.user?.businessId

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zf-border/40 bg-zf-surface px-4 pt-[env(safe-area-inset-top,0px)] lg:left-16">
      <span className="text-sm font-semibold text-zf-text truncate min-w-0 flex-1">{businessName}</span>
      <div className="flex items-center gap-3">
        {businessId != null && <NotificationBell businessId={businessId} />}
        <span className="text-xs text-zf-text-secondary truncate max-w-[80px]">{userName}</span>
        <SignOutButton />
      </div>
    </header>
  )
}
