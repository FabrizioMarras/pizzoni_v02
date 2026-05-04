'use client'

import { useId } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import Button from '@/components/ui/Button'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export default function SearchBar({ value, onChange, label, placeholder = 'Cerca...', resultCount, totalCount }: SearchBarProps) {
  const inputId = useId()
  const hasSummary = typeof resultCount === 'number' && typeof totalCount === 'number'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={inputId} className="label-text mb-0">
          {label}
        </label>
        {hasSummary && (
          <span className="text-xs font-semibold text-[var(--ink-soft)]">
            {resultCount} / {totalCount}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="field-input pr-20"
        />
        <FiSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" aria-hidden="true" />
        {value && (
          <Button
            type="button"
            onClick={() => onChange('')}
            variant="unstyled"
            className="absolute right-9 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-[var(--ink-soft)] transition hover:bg-[rgba(178,74,47,0.12)] hover:text-[var(--ink)]"
            icon={<FiX className="h-4 w-4" />}
            aria-label="Cancella ricerca"
          />
        )}
      </div>
    </div>
  )
}
