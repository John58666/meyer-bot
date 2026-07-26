import { getAvatarColor, getInitials, cn } from '@/lib/utils'

interface ProfessionalAvatarProps {
  name: string
  id: number | string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-5 h-5 text-[8px]',
  md: 'w-7 h-7 text-[10px]',
  lg: 'w-9 h-9 text-xs',
}

export function ProfessionalAvatar({ name, id, size = 'md', showName, className }: ProfessionalAvatarProps) {
  const color = getAvatarColor(id)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold shrink-0',
          sizeMap[size],
        )}
        style={{ backgroundColor: color + '25', color }}
      >
        {getInitials(name)}
      </div>
      {showName && <span className="text-xs text-white truncate">{name}</span>}
    </div>
  )
}