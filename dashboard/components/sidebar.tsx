"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, BarChart2, Users, Settings, HelpCircle, UserCog, ClipboardList } from "lucide-react";

const navItems = [
  { icon: Home,      href: "/dashboard",          label: "Inicio"   },
  { icon: Calendar,  href: "/dashboard/semana",   label: "Agenda"   },
  { icon: BarChart2, href: "/dashboard/metricas", label: "Métricas" },
  { icon: Users,     href: "/dashboard/clientes", label: "Clientes" },
];

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const bottomItems = [
    ...(role !== "profesional"
      ? [
          { icon: Settings, href: "/dashboard/configuracion", label: "Configuración" },
          { icon: ClipboardList, href: "/dashboard/auditoria", label: "Auditoría" },
        ]
      : []),
    ...(role === "owner"
      ? [{ icon: UserCog, href: "/dashboard/equipo", label: "Equipo" }]
      : []),
    { icon: HelpCircle, href: "/dashboard/help", label: "Ayuda" },
  ];

  return (
    <aside className="hidden sm:flex fixed left-0 top-[56px] bottom-0 w-[56px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex-col items-center py-3 z-40 overflow-hidden">
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-10 h-10 flex items-center justify-center rounded-[10px] transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={20} />
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col items-center gap-2">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className="w-10 h-10 flex items-center justify-center rounded-[10px] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <item.icon size={20} />
          </Link>
        ))}
      </div>
    </aside>
  );
}
