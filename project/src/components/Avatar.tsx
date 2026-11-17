import { useMemo, useState } from 'react'
import { avatarUri } from '../lib/avatar'

interface AvatarProps {
  /** Stable identifier (user id / candidate id). Falls back to the name. */
  seed?: string | null
  name?: string
  gender?: string | null
  photoUrl?: string | null
  size?: number
  ring?: boolean
  className?: string
}

export function Avatar({
  seed,
  name,
  gender,
  photoUrl,
  size = 40,
  ring = false,
  className = '',
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const fallbackSrc = useMemo(
    () => avatarUri(seed || name || 'guest', name, gender),
    [seed, name, gender]
  )

  const displaySrc = !imgFailed && photoUrl ? photoUrl : fallbackSrc

  return (
    <span
      className={`avatar-img ${ring ? 'has-ring' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={displaySrc}
        alt={name ? `${name}'s avatar` : 'Avatar'}
        width={size}
        height={size}
        draggable={false}
        onError={() => setImgFailed(true)}
      />
    </span>
  )
}
