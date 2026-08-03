import Link from "next/link"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  ShoppingCart,
  Settings,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard/semana", icon: CalendarDays, label: "Agenda", allRoles: true },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes", allRoles: true },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", allRoles: true },
  { href: "/dashboard/configuracion", icon: Settings, label: "Configuración", allRoles: true },
  { href: "/dashboard/caja", icon: ShoppingCart, label: "Caja", allRoles: false },
  { href: "/dashboard/inventario", icon: Package, label: "Inventario", allRoles: false },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", allRoles: true },
  { href: "/dashboard/configuracion", icon: Settings, label: "Configuración", allRoles: true },
]

export function SidebarV2({ isOwnerOrAdmin }: { isOwnerOrAdmin: boolean }) {
  const visibleItems = NAV_ITEMS.filter(item => item.allRoles || isOwnerOrAdmin)

  return (
    <>
      <aside className="fixed bottom-0 left-0 z-50 flex h-14 w-full items-center justify-around border-t border-zf-border/40 bg-zf-surface pb-[env(safe-area-inset-bottom,0.5rem)] lg:bottom-auto lg:top-0 lg:h-full lg:w-16 lg:flex-col lg:justify-start lg:gap-1 lg:border-r lg:border-t-0 lg:py-4">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-zf-text-muted transition-all hover:bg-zinc-100/50 hover:text-zinc-700 lg:h-12 lg:w-12"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none lg:hidden">{item.label}</span>
          </Link>
        ))}
      </aside>
    </>
  )
}
