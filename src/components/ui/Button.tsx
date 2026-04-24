import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'unstyled'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon: ReactNode
  iconPosition?: 'left' | 'right'
  iconClassName?: string
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ')
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  unstyled: '',
}

const baseClass = 'inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className, type = 'button', icon, iconPosition = 'left', iconClassName, children, ...props },
  ref
) {
  return (
    <button ref={ref} type={type} className={cx(baseClass, variantClass[variant], className)} {...props}>
      {iconPosition === 'left' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
      {children}
      {iconPosition === 'right' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
    </button>
  )
})

export default Button
