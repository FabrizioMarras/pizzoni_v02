export interface PlaceSuggestion {
  id: string
  name: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  mapsUri: string | null
  photoName: string | null
}

interface SearchPlacesParams {
  query: string
  latitude?: number
  longitude?: number
}

export async function searchPlaces(params: SearchPlacesParams): Promise<PlaceSuggestion[]> {
  const response = await fetch('/api/places/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const payload = (await response.json()) as { places?: PlaceSuggestion[]; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Ricerca pizzerie non disponibile.')
  }

  return payload.places ?? []
}

export async function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocalizzazione non supportata dal browser.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error('Permesso geolocalizzazione negato o non disponibile.')),
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  })
}
