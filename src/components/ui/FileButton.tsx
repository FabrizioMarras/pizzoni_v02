import type { ChangeEventHandler, ReactNode } from 'react'
import { cx } from '@/components/ui/button-style'

interface FileButtonProps {
  icon?: ReactNode
  children: ReactNode
  onChange: ChangeEventHandler<HTMLInputElement>
  accept?: string
  capture?: 'user' | 'environment'
  disabled?: boolean
  className?: string
  inputClassName?: string
}

export default function FileButton({
  icon,
  children,
  onChange,
  accept = 'image/*',
  capture,
  disabled,
  className,
  inputClassName,
}: FileButtonProps) {
  return (
    <label
      className={cx(
        'btn-secondary inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5',
        disabled ? 'cursor-not-allowed opacity-70' : '',
        className
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
      <input
        type="file"
        accept={accept}
        capture={capture}
        onChange={onChange}
        disabled={disabled}
        className={cx('hidden', inputClassName)}
      />
    </label>
  )
}
