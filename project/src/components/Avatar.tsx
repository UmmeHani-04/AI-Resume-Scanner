import { useMemo } from 'react'
import { avatarUri } from '../lib/avatar'

interface AvatarProps {
  /** Stable identifier (user id / candidate id). Falls back to the name. */
  seed?: string | null
  name?: string
  size?: number
  ring?: boolean
  className?: string
}

export function Avatar({ seed, name, size = 40, ring = false, className = '' }: AvatarProps) {
  const src = useMemo(() => avatarUri(seed || name || 'guest'), [seed, name])
  return (
    <span className={`avatar-img ${ring ? 'has-ring' : ''} ${className}`} style={{ width: size, height: size }}>
      <img src={src} alt={name ? `${name}'s avatar` : ''} width={size} height={size} draggable={false} />
    </span>
  )
}
