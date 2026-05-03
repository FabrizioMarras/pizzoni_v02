export interface VisitDateFields {
  date: string
  scheduled_at: string | null
}

export function getNowTimestamp(): number {
  return Date.now()
}

export function getVisitTimestamp(visit: VisitDateFields): number {
  if (visit.scheduled_at) return new Date(visit.scheduled_at).getTime()
  return new Date(`${visit.date}T23:59:59`).getTime()
}

export function isUpcomingVisit(visit: VisitDateFields, now = Date.now()): boolean {
  return getVisitTimestamp(visit) > now
}

export function isDoneVisit(visit: VisitDateFields, now = Date.now()): boolean {
  return getVisitTimestamp(visit) <= now
}
