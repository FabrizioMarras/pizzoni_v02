export type ButtonVariant = 'primary' | 'secondary' | 'unstyled'

export const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  unstyled: '',
}

export const buttonBaseClass = 'inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'

export function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ')
}
