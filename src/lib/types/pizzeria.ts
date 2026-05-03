export interface PizzeriaVisitPhotoRow {
  url: string
  is_pizza_of_night: boolean
  created_at: string
}

export interface PizzeriaVisitRow {
  id: string
  date: string
  scheduled_at: string | null
  photos: PizzeriaVisitPhotoRow[] | null
}

export interface PizzeriaRow {
  id: string
  name: string
  location: string
  city: string
  google_maps_uri: string | null
  google_photo_name: string | null
  custom_image_url: string | null
  visits: PizzeriaVisitRow[] | null
}

export interface Pizzeria {
  id: string
  name: string
  location: string
  city: string
  google_maps_uri: string | null
  google_photo_name: string | null
  custom_image_url: string | null
  latest_event_photo_url: string | null
  visited: boolean
  visitsCount: number
}
