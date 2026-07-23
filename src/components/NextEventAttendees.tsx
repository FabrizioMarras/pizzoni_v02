'use client'

import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import MemberIdentity from '@/components/ui/MemberIdentity'

interface Attendee {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
}

interface NextEventAttendeesProps {
  attendees: Attendee[]
}

export default function NextEventAttendees({ attendees }: NextEventAttendeesProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-(--ink-soft) hover:text-foreground transition-colors"
      >
        Partecipanti ({attendees.length})
        <FiChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-2">
          {attendees.length === 0 ? (
            <p className="text-sm page-subtitle">Nessuno ancora confermato.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {attendees.map((attendee) => (
                <span key={attendee.id} className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs text-foreground">
                  <MemberIdentity
                    name={attendee.name}
                    email={attendee.email}
                    avatarUrl={attendee.avatarUrl}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
