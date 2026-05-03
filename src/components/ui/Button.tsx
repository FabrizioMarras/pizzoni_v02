import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonBaseClass, buttonVariantClass, cx, type ButtonVariant } from '@/components/ui/button-style'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon: ReactNode
  iconPosition?: 'left' | 'right'
  iconClassName?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className, type = 'button', icon, iconPosition = 'left', iconClassName, children, ...props },
  ref
) {
  return (
    <button ref={ref} type={type} className={cx(buttonBaseClass, buttonVariantClass[variant], className)} {...props}>
      {iconPosition === 'left' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
      {children}
      {iconPosition === 'right' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
    </button>
  )
})

export default Button
