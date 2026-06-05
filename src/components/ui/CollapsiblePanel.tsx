'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { FiChevronDown } from 'react-icons/fi'

interface CollapsiblePanelProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function CollapsiblePanel({ title, children, defaultOpen = false }: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <h2 className="text-3xl">{title}</h2>
        <FiChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--ink-soft)] transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
