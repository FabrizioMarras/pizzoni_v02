interface MemberIdentityProps {
  name?: string | null
  email?: string | null
  emoji?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md'
  className?: string
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function MemberIdentity({
  name,
  email,
  emoji,
  avatarUrl,
  size = 'sm',
  className,
}: MemberIdentityProps) {
  const label = name?.trim() || email?.trim() || 'Membro'
  const iconSize = size === 'md' ? 'h-8 w-8 text-base' : 'h-6 w-6 text-sm'
  const normalizedAvatarUrl = avatarUrl?.trim() ?? ''

  return (
    <span className={joinClasses('inline-flex items-center gap-2', className)}>
      <span className={joinClasses('relative inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.7)]', iconSize)}>
        <span className={joinClasses('inline-flex items-center justify-center rounded-full', iconSize)}>
          {emoji?.trim() || '🍕'}
        </span>
        {normalizedAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={normalizedAvatarUrl}
            alt={label}
            className={joinClasses('absolute inset-0 rounded-full object-cover', iconSize)}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </span>
      <span>{label}</span>
    </span>
  )
}
