'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: AvatarSize
  className?: string
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function getInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'P'
  return source[0]?.toUpperCase() ?? 'P'
}

const SIZE_CLASSES: Record<AvatarSize, { wrapper: string; image: number; text: string }> = {
  sm: { wrapper: 'h-6 w-6', image: 24, text: 'text-sm' },
  md: { wrapper: 'h-8 w-8', image: 32, text: 'text-base' },
  lg: { wrapper: 'h-14 w-14', image: 56, text: 'text-lg' },
}

export default function Avatar({ name, email, avatarUrl, size = 'sm', className }: AvatarProps) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const { wrapper, image, text } = SIZE_CLASSES[size]
  const label = name?.trim() || email?.trim() || 'Avatar'
  const normalizedAvatarUrl = avatarUrl?.trim() ?? ''
  const showAvatar = normalizedAvatarUrl.length > 0 && !avatarFailed
  const initial = useMemo(() => getInitial(name, email), [name, email])

  if (!showAvatar) {
    return (
      <span
        aria-label={label}
        className={joinClasses(
          'inline-flex items-center justify-center rounded-full bg-[rgba(81,100,58,0.18)] font-semibold text-[var(--olive)]',
          wrapper,
          text,
          className
        )}
      >
        {initial}
      </span>
    )
  }

  return (
    <Image
      src={normalizedAvatarUrl}
      alt={label}
      width={image}
      height={image}
      unoptimized
      className={joinClasses('rounded-full object-cover', wrapper, className)}
      onError={() => setAvatarFailed(true)}
    />
  )
}
