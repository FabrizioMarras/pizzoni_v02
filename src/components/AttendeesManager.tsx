'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AttendeesManagerProps {
  visitId: string
}

interface ProfileInfo {
  id: string
  name: string | null
  pizza_emoji: string | null
  email: string | null
}

interface AttendeeRow {
  id: string
  user_id: string
  profiles: ProfileInfo | ProfileInfo[] | null
}

interface MemberRow {
  id: string
  name: string | null
  pizza_emoji: string | null
  email: string | null
}

function getFirst<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function AttendeesManager({ visitId }: AttendeesManagerProps) {
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [memberToAdd, setMemberToAdd] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setUserId(user.id)

    const [{ data: profileData }, { data: attendeesData }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle<{ is_admin: boolean }>(),
      supabase.from('visit_attendees').select('id, user_id, profiles(id, name, pizza_emoji, email)').eq('visit_id', visitId),
    ])

    const admin = Boolean(profileData?.is_admin)
    setIsAdmin(admin)
    const attendeeRows = (attendeesData as AttendeeRow[] | null) ?? []
    setAttendees(attendeeRows)

    if (admin) {
      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, name, pizza_emoji, email')
        .eq('is_member', true)
        .order('name', { ascending: true })

      const memberRows = (membersData as MemberRow[] | null) ?? []
      setMembers(memberRows)
      const attendeeSet = new Set(attendeeRows.map((row) => row.user_id))
      const firstAvailable = memberRows.find((member) => !attendeeSet.has(member.id))
      setMemberToAdd(firstAvailable?.id ?? '')
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  const attendeeIds = useMemo(() => new Set(attendees.map((attendee) => attendee.user_id)), [attendees])
  const isJoined = attendeeIds.has(userId)

  const joinVisit = async () => {
    if (!userId) return

    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('visit_attendees').insert({
      visit_id: visitId,
      user_id: userId,
    })
    setSubmitting(false)

    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) {
        setMessage('Sei gia tra i partecipanti.')
      } else {
        setMessage(error.message)
      }
      return
    }

    setMessage('Sei stato aggiunto ai partecipanti.')
    void loadData()
  }

  const leaveVisit = async () => {
    if (!userId) return

    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('visit_attendees').delete().eq('visit_id', visitId).eq('user_id', userId)
    setSubmitting(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Hai lasciato la lista partecipanti.')
    void loadData()
  }

  const addMember = async () => {
    if (!memberToAdd) return

    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('visit_attendees').insert({
      visit_id: visitId,
      user_id: memberToAdd,
    })
    setSubmitting(false)

    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) {
        setMessage('Membro gia presente tra i partecipanti.')
      } else {
        setMessage(error.message)
      }
      return
    }

    setMessage('Partecipante aggiunto.')
    void loadData()
  }

  const removeMember = async (targetUserId: string) => {
    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('visit_attendees').delete().eq('visit_id', visitId).eq('user_id', targetUserId)
    setSubmitting(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Partecipante rimosso.')
    void loadData()
  }

  return (
    <section className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">Partecipazione</h2>

      <div className="flex flex-wrap gap-2">
        {!isJoined ? (
          <button type="button" onClick={() => void joinVisit()} disabled={submitting} className="btn-primary px-4 py-2 text-sm">
            Partecipo
          </button>
        ) : (
          <button type="button" onClick={() => void leaveVisit()} disabled={submitting} className="btn-secondary px-4 py-2 text-sm">
            Non partecipo
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-[var(--ink-soft)]">Partecipanti: {attendees.length}</p>
        {attendees.length === 0 && <p className="page-subtitle">Ancora nessun partecipante.</p>}
        {attendees.map((attendee) => {
          const profile = getFirst(attendee.profiles)
          return (
            <div key={attendee.id} className="surface-card flex items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--ink)]">
              <div>
                <span className="font-medium">{profile?.pizza_emoji ?? '🍕'} {profile?.name ?? profile?.email ?? 'Membro'}</span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void removeMember(attendee.user_id)}
                  className="rounded-full bg-[rgba(178,74,47,0.15)] px-3 py-1 text-xs text-[var(--terracotta-deep)]"
                >
                  Rimuovi
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <div className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Gestione admin</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)} className="field-input">
              <option value="">Seleziona membro</option>
              {members.map((member) => (
                <option key={member.id} value={member.id} disabled={attendeeIds.has(member.id)}>
                  {(member.pizza_emoji ?? '🍕') + ' ' + (member.name ?? member.email ?? member.id)}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void addMember()} disabled={!memberToAdd || submitting} className="btn-primary px-4 py-2 text-sm">
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-[var(--ink-soft)]">{message}</p>}
    </section>
  )
}
