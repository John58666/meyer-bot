import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_PALETTE = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#8b5cf6', '#06b6d4', '#eab308', '#a855f7',
  '#22c55e', '#f43f5e', '#3b82f6', '#d946ef',
]

function hashId(id: number | string): number {
  const str = String(id)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getAvatarColor(id: number | string): string {
  return AVATAR_PALETTE[hashId(id) % AVATAR_PALETTE.length]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
