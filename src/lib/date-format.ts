const DATE_TIME_ZONE = 'Europe/Amsterdam'
const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: DATE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATE_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: DATE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const normalized = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T12:00:00Z`)
  }

  const nextDate = new Date(normalized)
  return Number.isNaN(nextDate.getTime()) ? null : nextDate
}

function pickPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? ''
}

export function formatDateLabel(value: string | Date) {
  const date = parseDateValue(value)
  if (!date) return String(value)

  const parts = DATE_PARTS_FORMATTER.formatToParts(date)
  const day = pickPart(parts, 'day')
  const month = pickPart(parts, 'month')
  const year = pickPart(parts, 'year')
  return `${day}/${month}/${year}`
}

export function formatDateTimeLabel(value: string | Date) {
  const date = parseDateValue(value)
  if (!date) return String(value)

  const parts = DATE_TIME_PARTS_FORMATTER.formatToParts(date)
  const day = pickPart(parts, 'day')
  const month = pickPart(parts, 'month')
  const year = pickPart(parts, 'year')
  const hour = pickPart(parts, 'hour')
  const minute = pickPart(parts, 'minute')
  return `${day}/${month}/${year}, ${hour}:${minute}`
}

export function formatIsoDateToItalian(value: string) {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

export function parseItalianDateToIso(value: string) {
  const normalized = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  const match = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseTimeToIso(value: string) {
  const normalized = value.trim()
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}
