"use client"

interface Props {
  top: number
  left: string
  width: string
  height: number
  hora: string
  nombre: string
  servicio: string
  estado: string
  isBlock?: boolean
  motivo?: string
  zIndex?: number
  onClick: () => void
}

const STATUS_STYLE: Record<string, string> = {
  Pendiente:  "bg-amber-50/90 border-l-amber-400 text-amber-950",
  Confirmada: "bg-emerald-50/90 border-l-emerald-500 text-emerald-950",
  Completada: "bg-sky-50/90 border-l-sky-500 text-sky-950",
  Cancelada:  "bg-zinc-100/80 border-l-zinc-300 text-zinc-400 line-through opacity-60",
}

export function AppointmentBlockV2({
  top,
  left,
  width,
  height,
  hora,
  nombre,
  servicio,
  estado,
  isBlock,
  motivo,
  zIndex,
  onClick,
}: Props) {
  if (isBlock) {
    return (
      <div
        onClick={onClick}
        style={{ top: `${top}px`, height: `${height}px`, left, width, zIndex: zIndex ?? 10 }}
        className="absolute z-10 mx-0.5 rounded-md border border-dashed border-zinc-300 bg-zinc-100/60 p-2.5 cursor-pointer overflow-hidden transition-all hover:bg-zinc-200/60 active:scale-[0.99]"
      >
        <span className="text-[10px] font-medium text-zinc-500 block truncate">
          {hora}
        </span>
        <span className="text-[11px] font-medium text-zinc-600 block truncate">
          {motivo || "Bloqueado"}
        </span>
      </div>
    )
  }

  const style = STATUS_STYLE[estado] ?? STATUS_STYLE.Pendiente
  const isCompact = height < 40
  const isCancelled = estado === "Cancelada"

  return (
    <div
      onClick={onClick}
      style={{ top: `${top}px`, height: `${height}px`, left, width, zIndex: zIndex ?? 10 }}
      className={`absolute mx-0.5 rounded-md border-l-4 p-2.5 cursor-pointer overflow-hidden transition-all hover:shadow-md hover:ring-1 hover:ring-zinc-300 active:scale-[0.99] ${style}`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-[10px] font-medium text-zinc-400 leading-tight mb-0.5 truncate">
            {hora}
          </p>
          <p className={`text-xs font-semibold leading-tight truncate ${isCancelled ? "line-through" : ""}`}>
            {nombre}
          </p>
          {!isCompact && (
            <p className={`text-[11px] text-zinc-500 leading-tight truncate mt-0.5 ${isCancelled ? "line-through" : ""}`}>
              {servicio}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
