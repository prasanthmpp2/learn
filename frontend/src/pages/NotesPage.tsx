import { useDeferredValue, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenText, Search, Trash2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { AppLayoutContextValue } from '../layouts/AppLayout.tsx'
import { formatRelativeTime } from '../utils/date.ts'

export function NotesPage() {
  const { deleteNote, notes, workspaceLoading } =
    useOutletContext<AppLayoutContextValue>()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const filteredNotes = notes.filter((note) => {
    if (!deferredSearch.trim()) {
      return true
    }

    const searchTerm = deferredSearch.toLowerCase()
    return (
      note.question.toLowerCase().includes(searchTerm) ||
      note.answer.toLowerCase().includes(searchTerm)
    )
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <header className="rounded-[30px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.02)] px-5 py-5 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Notes
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text)]">
              Saved revision notes
            </h1>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
              Keep important answers close, search them quickly, and turn them into future prompts.
            </p>
          </div>

          <label className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              className="w-full rounded-2xl border border-[color:var(--line)] bg-transparent py-3 pl-11 pr-4 text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes"
              value={search}
            />
          </label>
        </div>
      </header>

      {workspaceLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-[30px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)]"
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[30px] border border-dashed border-[color:var(--line)] px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-[24px] bg-[rgba(82,246,213,0.14)] text-[color:var(--accent)]">
            <BookOpenText className="size-7" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.05em] text-[color:var(--text)]">
            No saved notes yet
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)]">
            Save an AI answer from chat and it will show up here as a revision card.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => (
            <motion.article
              key={note.id}
              className="rounded-[30px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] p-5 transition hover:border-[color:var(--line-strong)]"
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    {formatRelativeTime(note.createdAt)}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[color:var(--text)]">
                    {note.question}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-[color:var(--line)] p-2 text-[color:var(--muted)] transition hover:border-[rgba(255,181,155,0.3)] hover:text-[#ffc9b7]"
                  onClick={() => void deleteNote(note.id)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <p className="mt-4 line-clamp-8 text-sm leading-7 text-[color:var(--muted)]">
                {note.answer}
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  )
}
