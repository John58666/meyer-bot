"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <button
      onClick={handleRefresh}
      title="Actualizar citas"
      className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
    >
      <RefreshCw size={16} className={spinning ? "animate-spin" : ""} />
    </button>
  );
}
