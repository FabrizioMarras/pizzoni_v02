'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { FiEdit2, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface EventNotesManagerProps {
  visitId: string
}

interface NoteRow {
  id: string
  visit_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profiles:
    | {
        name: string | null
        pizza_emoji: string | null
        email: string | null
      }
    | {
        name: string | null
        pizza_emoji: string | null
        email: string | null
      }[]
    | null
}

function getFirst<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function EventNotesManager({ visitId }: EventNotesManagerProps) {
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const toast = useToast()

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserId(user.id)
    }

    void loadUser()
  }, [])

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from('visit_notes')
      .select('id, visit_id, user_id, content, created_at, updated_at, profiles(name, pizza_emoji, email)')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      return
    }

    setNotes((data as NoteRow[] | null) ?? [])
  }

  useEffect(() => {
    void loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) {
      toast.error('Non hai effettuato l’accesso.')
      return
    }

    const content = newNote.trim()
    if (!content) {
      toast.warning('Scrivi una nota prima di salvare.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('visit_notes')
      .insert({
        visit_id: visitId,
        user_id: userId,
        content,
      })

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }

    setNewNote('')
    toast.success('Nota aggiunta.')
    void loadNotes()
  }

  const startEditing = (note: NoteRow) => {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  const cancelEditing = () => {
    setEditingNoteId('')
    setEditingContent('')
  }

  const saveEditedNote = async (noteId: string) => {
    const content = editingContent.trim()
    if (!content) {
      toast.warning('La nota non può essere vuota.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('visit_notes')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }

    cancelEditing()
    toast.success('Nota aggiornata.')
    void loadNotes()
  }

  const deleteNote = async (noteId: string) => {
    setSaving(true)
    const { error } = await supabase.from('visit_notes').delete().eq('id', noteId)
    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (editingNoteId === noteId) {
      cancelEditing()
    }

    toast.success('Nota eliminata.')
    void loadNotes()
  }

  if (!userId) return null

  return (
    <section className="glass-card space-y-3 p-6">
      <h2 className="text-3xl">Note Evento</h2>
      <p className="page-subtitle">Ogni membro può aggiungere note. Solo l’autore può modificare o eliminare la propria nota.</p>

      <form onSubmit={addNote} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-[var(--ink)]">Nuova nota</span>
          <textarea
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            className="field-input min-h-[110px]"
            placeholder="Aggiungi dettagli utili per la serata..."
          />
        </label>
        <Button
          type="submit"
          disabled={saving || !newNote.trim()}
          variant="primary"
          className="px-4 py-2 text-sm"
          icon={<FiPlus className="h-4 w-4" />}
        >
          {saving ? 'Salvataggio...' : 'Aggiungi nota'}
        </Button>
      </form>

      <div className="space-y-2">
        {notes.length === 0 && <p className="page-subtitle">Nessuna nota ancora presente.</p>}
        {notes.map((note) => {
          const author = getFirst(note.profiles)
          const isOwner = note.user_id === userId
          const isEditing = editingNoteId === note.id
          const authorLabel = `${author?.pizza_emoji ?? '🍕'} ${author?.name ?? author?.email ?? 'Membro'}`

          return (
            <article key={note.id} className="surface-card space-y-2 px-3 py-3">
              <div className="text-xs text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">{authorLabel}</span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="field-input min-h-[90px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void saveEditedNote(note.id)}
                      disabled={saving || !editingContent.trim()}
                      variant="primary"
                      className="px-3 py-1.5 text-xs"
                      icon={<FiSave className="h-3.5 w-3.5" />}
                    >
                      Salva
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      icon={<FiX className="h-3.5 w-3.5" />}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--ink)]">{note.content}</p>
              )}

              {!isEditing && isOwner && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => startEditing(note)}
                    disabled={saving}
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    icon={<FiEdit2 className="h-3.5 w-3.5" />}
                  >
                    Modifica
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void deleteNote(note.id)}
                    disabled={saving}
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    icon={<FiTrash2 className="h-3.5 w-3.5" />}
                  >
                    Elimina
                  </Button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
