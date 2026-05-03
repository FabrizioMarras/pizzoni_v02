export const VISIT_NEXT_EVENT_SELECT =
  'id, date, scheduled_at, pizzerias(name, city, location, google_photo_name, custom_image_url), photos(url, is_pizza_of_night), visit_attendees(user_id, profiles(name, avatar_url, email))'

export const VISIT_HISTORY_CARD_SELECT =
  'id, date, scheduled_at, photos(url, is_pizza_of_night), pizzerias(id, name, city, google_photo_name, custom_image_url)'

export const VISIT_EVENTS_PAGE_SELECT =
  'id, date, scheduled_at, pizzerias(id, name, city, location, google_photo_name, custom_image_url), photos(url, is_pizza_of_night), visit_attendees(user_id, profiles(name, avatar_url, email))'
