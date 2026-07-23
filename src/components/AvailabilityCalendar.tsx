'use client'

import { useMemo, useState } from 'react'
import { FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp } from 'react-icons/fi'
import Button from '@/components/ui/Button'
import { formatDateLabel } from '@/lib/date-format'
import type { EventAvailabilityVote, EventDateOption } from '@/lib/data/event-votes-client'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTH_LABELS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const TOP_DATES_COLLAPSED_COUNT = 3

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface MonthGridProps {
  year: number
  month: number
  todayIso: string
  optionByDate: Map<string, EventDateOption>
  votersByOptionId: Map<string, EventAvailabilityVote[]>
  userId: string
  onToggleDate: (date: string, existingOptionId: string | undefined, hasMyVote: boolean) => void
}

function MonthGrid({ year, month, todayIso, optionByDate, votersByOptionId, userId, onToggleDate }: MonthGridProps) {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const leadingBlanks = (firstWeekday + 6) % 7

  const cells: Array<{ day: number; iso: string; isWeekend: boolean } | null> = []
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay()
    cells.push({ day, iso: toIsoDate(year, month, day), isWeekend: weekday === 0 || weekday === 6 })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 border-b border-[var(--panel-border)] pb-2 text-center text-[10px] font-bold tracking-wider text-[var(--ink-soft)] uppercase">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} />

          const option = optionByDate.get(cell.iso)
          const voters = option ? votersByOptionId.get(option.id) ?? [] : []
          const mine = voters.some((vote) => vote.user_id === userId)
          const isPast = cell.iso < todayIso
          const isToday = cell.iso === todayIso

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={isPast}
              onClick={() => onToggleDate(cell.iso, option?.id, mine)}
              className={`relative aspect-square rounded-xl text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                mine
                  ? 'bg-[var(--olive)] text-white shadow-[0_4px_12px_rgba(var(--olive-rgb),0.35)]'
                  : voters.length > 0
                    ? 'bg-[rgba(var(--olive-rgb),0.16)] text-[var(--olive)] hover:-translate-y-0.5 hover:bg-[rgba(var(--olive-rgb),0.24)]'
                    : `bg-[var(--surface-solid)] hover:-translate-y-0.5 hover:bg-[rgba(var(--olive-rgb),0.08)] hover:shadow-[0_4px_10px_rgba(var(--ink-rgb),0.14)] ${
                        cell.isWeekend ? 'text-[var(--terracotta)]' : 'text-[var(--ink)]'
                      }`
              } ${isToday && !mine ? 'ring-1 ring-inset ring-[var(--terracotta)]' : ''}`}
            >
              {cell.day}
              {voters.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--surface-solid)] bg-[var(--terracotta)] px-1 text-[9px] leading-none font-semibold text-white shadow-sm">
                  {voters.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AvailabilityCalendarProps {
  dateChoices: EventDateOption[]
  availabilityVotes: EventAvailabilityVote[]
  userId: string
  canFinalize: boolean
  onToggleDate: (date: string, existingOptionId: string | undefined, hasMyVote: boolean) => void
  onFinalize: (optionId: string) => void
}

export default function AvailabilityCalendar({
  dateChoices,
  availabilityVotes,
  userId,
  canFinalize,
  onToggleDate,
  onFinalize,
}: AvailabilityCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showAllDates, setShowAllDates] = useState(false)

  const optionByDate = useMemo(() => {
    const map = new Map<string, EventDateOption>()
    dateChoices.forEach((option) => map.set(option.option_date, option))
    return map
  }, [dateChoices])

  const votersByOptionId = useMemo(() => {
    const map = new Map<string, EventAvailabilityVote[]>()
    availabilityVotes
      .filter((vote) => vote.availability === 'available')
      .forEach((vote) => {
        const list = map.get(vote.date_option_id) ?? []
        list.push(vote)
        map.set(vote.date_option_id, list)
      })
    return map
  }, [availabilityVotes])

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const goToPreviousMonth = () => {
    if (isCurrentMonth) return
    if (viewMonth === 0) {
      setViewYear((year) => year - 1)
      setViewMonth(11)
    } else {
      setViewMonth((month) => month - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1)
      setViewMonth(0)
    } else {
      setViewMonth((month) => month + 1)
    }
  }

  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear

  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())

  const rankedDates = useMemo(
    () =>
      dateChoices
        .map((option) => ({ option, voters: votersByOptionId.get(option.id) ?? [] }))
        .filter((entry) => entry.voters.length > 0)
        .sort((a, b) => b.voters.length - a.voters.length || a.option.option_date.localeCompare(b.option.option_date)),
    [dateChoices, votersByOptionId]
  )

  return (
    <div className="space-y-4">
      <div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="surface-card p-3">
            <div className="mb-4 flex items-center justify-between">
              <Button
                type="button"
                onClick={goToPreviousMonth}
                disabled={isCurrentMonth}
                variant="unstyled"
                className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] p-2 text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:border-[var(--terracotta)] hover:text-[var(--terracotta)] disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:border-[var(--panel-border)] disabled:hover:text-[var(--ink)]"
                icon={<FiChevronLeft className="h-4 w-4" />}
              />
              <div className="[font-family:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
                {MONTH_LABELS[viewMonth]} <span className="font-normal text-[var(--ink-soft)]">{viewYear}</span>
              </div>
              <Button
                type="button"
                onClick={goToNextMonth}
                variant="unstyled"
                className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] p-2 text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:border-[var(--terracotta)] hover:text-[var(--terracotta)] md:invisible"
                icon={<FiChevronRight className="h-4 w-4" />}
              />
            </div>
            <MonthGrid
              year={viewYear}
              month={viewMonth}
              todayIso={todayIso}
              optionByDate={optionByDate}
              votersByOptionId={votersByOptionId}
              userId={userId}
              onToggleDate={onToggleDate}
            />
          </div>
          <div className="surface-card hidden p-3 md:block">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-block h-8 w-8" aria-hidden="true" />
              <div className="[font-family:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
                {MONTH_LABELS[secondMonth]} <span className="font-normal text-[var(--ink-soft)]">{secondYear}</span>
              </div>
              <Button
                type="button"
                onClick={goToNextMonth}
                variant="unstyled"
                className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] p-2 text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]"
                icon={<FiChevronRight className="h-4 w-4" />}
              />
            </div>
            <MonthGrid
              year={secondYear}
              month={secondMonth}
              todayIso={todayIso}
              optionByDate={optionByDate}
              votersByOptionId={votersByOptionId}
              userId={userId}
              onToggleDate={onToggleDate}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--ink)]">Date più votate</p>
        {rankedDates.length === 0 && <p className="text-xs text-[var(--ink-soft)]">Nessuna data ancora selezionata.</p>}
        {(showAllDates ? rankedDates : rankedDates.slice(0, TOP_DATES_COLLAPSED_COUNT)).map(({ option, voters }) => (
          <div key={option.id} className="rounded-xl bg-[var(--surface-soft)] p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--ink)]">{formatDateLabel(`${option.option_date}T12:00:00`)}</span>
              <span className="text-xs text-[var(--ink-soft)]">{voters.length} disponibili</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {voters.map((vote) => (
                <span key={vote.id} className="inline-flex items-center gap-1 rounded-full bg-[rgba(var(--olive-rgb),0.12)] px-2 py-0.5 text-xs text-[var(--olive)]">
                  {vote.voter?.pizza_emoji && <span>{vote.voter.pizza_emoji}</span>}
                  <span>{vote.voter?.name ?? 'Utente'}</span>
                </span>
              ))}
            </div>
            {canFinalize && (
              <div className="mt-2">
                <Button type="button" onClick={() => onFinalize(option.id)} variant="primary" className="px-3 py-1 text-xs" icon={<FiCheck className="h-3.5 w-3.5" />}>
                  Conferma data evento
                </Button>
              </div>
            )}
          </div>
        ))}
        {rankedDates.length > TOP_DATES_COLLAPSED_COUNT && (
          <Button
            type="button"
            onClick={() => setShowAllDates((current) => !current)}
            variant="unstyled"
            className="text-xs text-[var(--ink-soft)]"
            icon={showAllDates ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />}
            iconPosition="right"
          >
            {showAllDates ? 'Mostra meno' : `Mostra tutte (${rankedDates.length})`}
          </Button>
        )}
      </div>
    </div>
  )
}
