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

  return (
    <span className={joinClasses('inline-flex items-center gap-2', className)}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={label} className={joinClasses('rounded-full object-cover', iconSize)} />
      ) : (
        <span className={joinClasses('inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.7)]', iconSize)}>
          {emoji?.trim() || '🍕'}
        </span>
      )}
      <span>{label}</span>
    </span>
  )
}
