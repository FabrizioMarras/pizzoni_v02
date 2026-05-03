export type OneOrMany<T> = T | T[] | null | undefined

export function firstOrNull<T>(value: OneOrMany<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function firstOrThrow<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}
