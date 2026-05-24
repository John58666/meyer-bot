"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

interface TopbarProps {
  user: {
    name: string;
    email: string;
  };
}

export function Topbar({ user }: TopbarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-lg ml-1">Meyer</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
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
          className="bg-[var(--bg-card)] border-[var(--border-subtle)] text-white"
        >
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
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
