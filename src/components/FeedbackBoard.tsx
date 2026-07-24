'use client'

import { useMemo, useState } from 'react'
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCheckCircle,
  FiCircle,
  FiEdit2,
  FiList,
  FiMinus,
  FiSend,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import {
  createFeedback,
  deleteAllFeedback,
  deleteFeedback,
  deleteFeedbackMany,
  updateFeedbackContent,
  updateFeedbackStatus,
  type Feedback,
  type FeedbackPriority,
} from '@/lib/data/feedback-client'
import { formatDateTimeLabel } from '@/lib/date-format'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'

interface FeedbackBoardProps {
  initialFeedback: Feedback[]
  userId: string
  isAdmin: boolean
}

type StatusFilter = 'all' | 'todo' | 'done'
type PriorityFilter = 'all' | FeedbackPriority

const PRIORITY_LABEL: Record<FeedbackPriority, string> = { high: 'Alta', mid: 'Media', low: 'Bassa' }

const PRIORITY_BADGE_CLASS: Record<FeedbackPriority, string> = {
  high: 'border-[rgba(var(--priority-high-rgb),0.35)] bg-[rgba(var(--priority-high-rgb),0.14)] text-[rgb(var(--priority-high-rgb))]',
  mid: 'border-[rgba(var(--priority-mid-rgb),0.35)] bg-[rgba(var(--priority-mid-rgb),0.14)] text-[rgb(var(--priority-mid-rgb))]',
  low: 'border-[rgba(var(--priority-low-rgb),0.35)] bg-[rgba(var(--priority-low-rgb),0.14)] text-[rgb(var(--priority-low-rgb))]',
}

const PRIORITY_ACTIVE_CLASS: Record<FeedbackPriority, string> = {
  high: 'border-transparent bg-[rgba(var(--priority-high-rgb),0.9)] text-white',
  mid: 'border-transparent bg-[rgba(var(--priority-mid-rgb),0.9)] text-white',
  low: 'border-transparent bg-[rgba(var(--priority-low-rgb),0.9)] text-white',
}

const PRIORITY_ICON: Record<FeedbackPriority, React.ReactNode> = {
  high: <FiArrowUp className="h-3.5 w-3.5" />,
  mid: <FiMinus className="h-3.5 w-3.5" />,
  low: <FiArrowDown className="h-3.5 w-3.5" />,
}

type DeleteTarget = { kind: 'single'; id: string } | { kind: 'selected' } | { kind: 'all' }

export default function FeedbackBoard({ initialFeedback, userId, isAdmin }: FeedbackBoardProps) {
  const [feedback, setFeedback] = useState<Feedback[]>(initialFeedback)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const counts = useMemo(() => {
    const done = feedback.filter((item) => item.is_done).length
    return {
      all: feedback.length,
      done,
      todo: feedback.length - done,
      high: feedback.filter((item) => item.priority === 'high').length,
      mid: feedback.filter((item) => item.priority === 'mid').length,
      low: feedback.filter((item) => item.priority === 'low').length,
    }
  }, [feedback])

  const filtered = useMemo(() => {
    return feedback.filter((item) => {
      if (statusFilter === 'done' && !item.is_done) return false
      if (statusFilter === 'todo' && item.is_done) return false
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
      return true
    })
  }, [feedback, statusFilter, priorityFilter])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSubmitting(true)
    const { data, error } = await createFeedback(supabase, userId, trimmed)
    setSubmitting(false)

    if (error || !data) {
      toast.error(error?.message ?? 'Errore nel salvataggio del feedback.')
      return
    }

    setFeedback((current) => [data, ...current])
    setContent('')
    toast.success('Feedback inviato.')
  }

  const startEdit = (item: Feedback) => {
    setEditingId(item.id)
    setEditingContent(item.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingContent('')
  }

  const saveEdit = async (id: string) => {
    const trimmed = editingContent.trim()
    if (!trimmed) return

    const { error } = await updateFeedbackContent(supabase, id, trimmed)
    if (error) {
      toast.error(error.message)
      return
    }

    setFeedback((current) => current.map((item) => (item.id === id ? { ...item, content: trimmed } : item)))
    cancelEdit()
  }

  const toggleDone = async (item: Feedback) => {
    const nextIsDone = !item.is_done
    setFeedback((current) => current.map((row) => (row.id === item.id ? { ...row, is_done: nextIsDone } : row)))

    const { error } = await updateFeedbackStatus(supabase, item.id, nextIsDone, item.priority)
    if (error) {
      toast.error(error.message)
      setFeedback((current) => current.map((row) => (row.id === item.id ? { ...row, is_done: item.is_done } : row)))
    }
  }

  const setPriority = async (item: Feedback, priority: FeedbackPriority) => {
    const nextPriority = item.priority === priority ? null : priority
    setFeedback((current) => current.map((row) => (row.id === item.id ? { ...row, priority: nextPriority } : row)))

    const { error } = await updateFeedbackStatus(supabase, item.id, item.is_done, nextPriority)
    if (error) {
      toast.error(error.message)
      setFeedback((current) => current.map((row) => (row.id === item.id ? { ...row, priority: item.priority } : row)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    let result: { error: { message: string } | null }
    if (deleteTarget.kind === 'single') {
      result = await deleteFeedback(supabase, deleteTarget.id)
    } else if (deleteTarget.kind === 'selected') {
      result = await deleteFeedbackMany(supabase, Array.from(selectedIds))
    } else {
      result = await deleteAllFeedback(supabase)
    }

    setDeleting(false)

    if (result.error) {
      toast.error(result.error.message)
      return
    }

    if (deleteTarget.kind === 'single') {
      setFeedback((current) => current.filter((item) => item.id !== deleteTarget.id))
    } else if (deleteTarget.kind === 'selected') {
      setFeedback((current) => current.filter((item) => !selectedIds.has(item.id)))
      setSelectedIds(new Set())
    } else {
      setFeedback([])
      setSelectedIds(new Set())
    }

    toast.success('Feedback eliminato.')
    setDeleteTarget(null)
  }

  const deleteModalCopy = deleteTarget?.kind === 'all'
    ? 'Eliminare tutti i feedback? Questa azione è irreversibile.'
    : deleteTarget?.kind === 'selected'
      ? `Eliminare ${selectedIds.size} feedback selezionati? Questa azione è irreversibile.`
      : 'Eliminare questo feedback? Questa azione è irreversibile.'

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="glass-card space-y-3 p-6">
        <h2 className="text-3xl">Nuovo Feedback</h2>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="field-input"
          rows={3}
          placeholder="Un miglioramento da suggerire o qualcosa che non funziona bene..."
          required
        />
        <Button type="submit" disabled={submitting} variant="primary" className="px-4 py-2 text-sm" icon={<FiSend className="h-4 w-4" />}>
          {submitting ? 'Invio...' : 'Invia Feedback'}
        </Button>
      </form>

      <section className="glass-card space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl">Tutti i Feedback</h2>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                type="button"
                onClick={() => setDeleteTarget({ kind: 'selected' })}
                disabled={selectedIds.size === 0}
                variant="secondary"
                className="px-3 py-1.5"
                icon={<FiTrash2 className="h-3.5 w-3.5" />}
              >
                Elimina selezionati ({selectedIds.size})
              </Button>
              <Button
                type="button"
                onClick={() => setDeleteTarget({ kind: 'all' })}
                disabled={feedback.length === 0}
                variant="secondary"
                className="px-3 py-1.5"
                icon={<FiTrash2 className="h-3.5 w-3.5" />}
              >
                Elimina tutto
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button type="button" onClick={() => setStatusFilter('all')} variant={statusFilter === 'all' ? 'primary' : 'secondary'} className="px-3 py-1.5" icon={<FiList className="h-3.5 w-3.5" />}>
            Tutti ({counts.all})
          </Button>
          <Button type="button" onClick={() => setStatusFilter('todo')} variant={statusFilter === 'todo' ? 'primary' : 'secondary'} className="px-3 py-1.5" icon={<FiCircle className="h-3.5 w-3.5" />}>
            Da fare ({counts.todo})
          </Button>
          <Button type="button" onClick={() => setStatusFilter('done')} variant={statusFilter === 'done' ? 'primary' : 'secondary'} className="px-3 py-1.5" icon={<FiCheckCircle className="h-3.5 w-3.5" />}>
            Fatti ({counts.done})
          </Button>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            aria-label="Filtra per priorità"
            className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-[var(--ink)]"
          >
            <option value="all">{`Ogni priorità (${counts.all})`}</option>
            <option value="high">{`Alta (${counts.high})`}</option>
            <option value="mid">{`Media (${counts.mid})`}</option>
            <option value="low">{`Bassa (${counts.low})`}</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-[var(--ink-soft)]">Nessun feedback in questa vista.</p>}
          {filtered.map((item) => (
            <div key={item.id} className="surface-card flex flex-col gap-3 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Checkbox checked={item.is_done} disabled={!isAdmin} onChange={() => void toggleDone(item)} aria-label="Segna come fatto" />
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="field-input"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => void saveEdit(item.id)} variant="primary" className="px-3 py-1.5 text-xs" icon={<FiCheck className="h-3.5 w-3.5" />}>
                          Salva
                        </Button>
                        <Button type="button" onClick={cancelEdit} variant="secondary" className="px-3 py-1.5 text-xs" icon={<FiX className="h-3.5 w-3.5" />}>
                          Annulla
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${item.is_done ? 'text-[var(--ink-soft)] line-through' : 'text-[var(--ink)]'}`}>{item.content}</p>
                  )}

                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                      <Avatar name={item.author?.name} avatarUrl={item.author?.avatar_url} size="sm" />
                      <span>{item.author?.name ?? 'Utente'}</span>
                      <span>·</span>
                      <span>{formatDateTimeLabel(item.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      {!isAdmin && item.priority && (
                        <span
                          title={PRIORITY_LABEL[item.priority]}
                          aria-label={`Priorità ${PRIORITY_LABEL[item.priority]}`}
                          className={`inline-flex items-center justify-center rounded-full border p-1 ${PRIORITY_BADGE_CLASS[item.priority]}`}
                        >
                          {PRIORITY_ICON[item.priority]}
                        </span>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1">
                          {(['high', 'mid', 'low'] as const).map((priority) => (
                            <Button
                              key={priority}
                              type="button"
                              onClick={() => void setPriority(item, priority)}
                              variant="unstyled"
                              aria-label={`Priorità ${PRIORITY_LABEL[priority]}`}
                              title={PRIORITY_LABEL[priority]}
                              className={`rounded-full border p-1.5 transition ${
                                item.priority === priority
                                  ? PRIORITY_ACTIVE_CLASS[priority]
                                  : 'border-[var(--panel-border)] bg-[var(--surface-strong)] text-[var(--ink)]'
                              }`}
                              icon={PRIORITY_ICON[priority]}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {item.author_id === userId && editingId !== item.id && (
                    <Button
                      type="button"
                      onClick={() => startEdit(item)}
                      variant="secondary"
                      className="p-1.5"
                      aria-label="Modifica feedback"
                      icon={<FiEdit2 className="h-3.5 w-3.5" />}
                    />
                  )}
                  {isAdmin && (
                    <Button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: 'single', id: item.id })}
                      variant="secondary"
                      className="p-1.5"
                      aria-label="Elimina feedback"
                      icon={<FiTrash2 className="h-3.5 w-3.5" />}
                    />
                  )}
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label="Seleziona per eliminazione"
                      className="h-4 w-4 accent-[var(--terracotta)]"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Elimina feedback">
        <p className="text-sm text-[var(--ink)]">{deleteModalCopy}</p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={deleting}
            variant="unstyled"
            className="rounded-full bg-[rgba(var(--terracotta-rgb),0.85)] px-4 py-2 text-sm text-white"
            icon={<FiTrash2 className="h-4 w-4" />}
          >
            {deleting ? 'Eliminazione...' : 'Sì, elimina'}
          </Button>
          <Button type="button" onClick={() => setDeleteTarget(null)} variant="secondary" className="px-4 py-2 text-sm" icon={<FiX className="h-4 w-4" />}>
            Annulla
          </Button>
        </div>
      </Modal>
    </div>
  )
}
