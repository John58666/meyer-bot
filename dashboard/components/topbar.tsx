"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Home, Calendar, BarChart2, Users, Settings, UserCog } from "lucide-react";

const bottomNavItems = [
  { icon: Home,      href: "/dashboard",          label: "Inicio"   },
  { icon: Calendar,  href: "/dashboard/semana",   label: "Agenda"   },
  { icon: BarChart2, href: "/dashboard/metricas", label: "Métricas" },
  { icon: Users,     href: "/dashboard/clientes", label: "Clientes" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[56px] bg-[var(--bg-sidebar)] border-t border-[var(--border-subtle)] flex items-center justify-around z-40 sm:hidden">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${
              isActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <item.icon size={22} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

interface TopbarProps {
  user: {
    name: string;
    email: string;
    businessName: string;
  };
  role: string;
}

export function Topbar({ user, role }: TopbarProps) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-[var(--color-accent)] text-lg">✂️</span>
        <span className="text-white font-bold text-lg leading-tight">{user.businessName}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <button className="focus:outline-none">
            <Avatar className="h-8 w-8 border-2 border-[var(--color-accent)] cursor-pointer">
              <AvatarFallback className="bg-[var(--bg-card)] text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[var(--bg-card)] border-[var(--border-subtle)] text-white min-w-[180px]"
        >
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{user.businessName}</p>
          </div>
          {role !== "profesional" && (
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/configuracion')}
              className="sm:hidden cursor-pointer focus:bg-white/5"
            >
              <Settings size={16} className="mr-2" />
              Configuración
            </DropdownMenuItem>
          )}
          {role === "owner" && (
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/equipo')}
              className="sm:hidden cursor-pointer focus:bg-white/5"
            >
              <UserCog size={16} className="mr-2" />
              Equipo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[var(--color-danger)] cursor-pointer focus:text-[var(--color-danger)] focus:bg-white/5"
          >
            <LogOut size={16} className="mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
