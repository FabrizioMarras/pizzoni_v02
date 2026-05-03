import Link from 'next/link'
import type { LinkProps } from 'next/link'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { buttonBaseClass, buttonVariantClass, cx, type ButtonVariant } from '@/components/ui/button-style'

interface ButtonLinkProps extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  variant?: ButtonVariant
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  iconClassName?: string
}

export default function ButtonLink({
  variant = 'unstyled',
  className,
  icon,
  iconPosition = 'left',
  iconClassName,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cx(buttonBaseClass, buttonVariantClass[variant], className)} {...props}>
      {icon && iconPosition === 'left' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
      {children}
      {icon && iconPosition === 'right' ? <span className={cx('shrink-0', iconClassName)}>{icon}</span> : null}
    </Link>
  )
}
