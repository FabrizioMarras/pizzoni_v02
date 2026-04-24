import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  labelClassName?: string
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ')
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, labelClassName, disabled, ...props },
  ref
) {
  return (
    <label className={cx('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', labelClassName)}>
      <input ref={ref} type="checkbox" className="peer sr-only" disabled={disabled} {...props} />
      <span
        className={cx(
          'relative inline-flex h-4 w-4 items-center justify-center rounded-[6px] border transition',
          'border-[rgba(132,92,66,0.45)] bg-white',
          'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)]',
          'peer-checked:border-[var(--terracotta)] peer-checked:[&>svg]:opacity-100',
          className
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="pointer-events-none absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] text-[var(--terracotta)] opacity-0 transition-opacity"
        >
          <path d="M3.5 8.2l2.2 2.2L12.5 4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label ? <span className="text-sm text-[var(--ink)]">{label}</span> : null}
    </label>
  )
})

export default Checkbox
