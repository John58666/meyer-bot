"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function RedirectClient({ to }: { to: string }) {
  const router = useRouter()

  useEffect(() => {
    router.push(to)
  }, [router, to])

  return null
}
