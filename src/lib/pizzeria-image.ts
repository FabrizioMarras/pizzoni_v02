export const PIZZERIA_PLACEHOLDER_IMAGES = [
  '/placeholders/pizzeria-01.svg',
  '/placeholders/pizzeria-02.svg',
  '/placeholders/pizzeria-03.svg',
  '/placeholders/pizzeria-04.svg',
] as const

function hashSeed(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getPizzeriaPlaceholder(seed: string) {
  const normalized = seed.trim() || 'pizzoni'
  const index = hashSeed(normalized) % PIZZERIA_PLACEHOLDER_IMAGES.length
  return PIZZERIA_PLACEHOLDER_IMAGES[index]
}

interface PizzeriaImageOptions {
  id?: string | null
  name?: string | null
  city?: string | null
  customImageUrl?: string | null
  latestEventPhotoUrl?: string | null
  googlePhotoName?: string | null
  width?: number
}

export function getPizzeriaImageSrc({
  id,
  name,
  city,
  customImageUrl,
  latestEventPhotoUrl,
  googlePhotoName,
  width = 800,
}: PizzeriaImageOptions) {
  if (googlePhotoName && googlePhotoName.trim()) {
    return `/api/places/photo?name=${encodeURIComponent(googlePhotoName)}&w=${width}`
  }

  if (latestEventPhotoUrl && latestEventPhotoUrl.trim()) {
    return latestEventPhotoUrl
  }

  if (customImageUrl && customImageUrl.trim()) {
    return customImageUrl
  }

  const seed = [id ?? '', name ?? '', city ?? ''].join('|')
  return getPizzeriaPlaceholder(seed)
}

interface EventImageOptions extends PizzeriaImageOptions {
  photoOfNightUrl?: string | null
}

export function getEventImageSrc({
  photoOfNightUrl,
  id,
  name,
  city,
  customImageUrl,
  latestEventPhotoUrl,
  googlePhotoName,
  width = 1200,
}: EventImageOptions) {
  if (photoOfNightUrl && photoOfNightUrl.trim()) {
    return photoOfNightUrl
  }

  return getPizzeriaImageSrc({
    id,
    name,
    city,
    customImageUrl,
    latestEventPhotoUrl,
    googlePhotoName,
    width,
  })
}
