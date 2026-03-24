import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { StudyPreferences } from '../types/app.ts'

interface SettingsPanelProps {
  onClose: () => void
  onSave: (preferences: StudyPreferences) => Promise<void>
  open: boolean
  preferences: StudyPreferences
}

export function SettingsPanel({
  onClose,
  onSave,
  open,
  preferences,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState(preferences)

  useEffect(() => {
    setDraft(preferences)
  }, [preferences])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSave(draft)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-[rgba(3,10,15,0.46)] backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="panel-strong fixed left-1/2 top-1/2 z-50 flex w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-[32px] p-6"
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            onSubmit={handleSubmit}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Settings
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
                  Tune your study style
                </h2>
              </div>
              <button
                className="rounded-full border border-[color:var(--line)] p-2 text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Theme
              <select
                className="rounded-2xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, theme: event.target.value as StudyPreferences['theme'] }))
                }
                value={draft.theme}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Language
              <input
                className="rounded-2xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, language: event.target.value }))
                }
                placeholder="English, Tamil, bilingual..."
                value={draft.language}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Answer length
              <select
                className="rounded-2xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    answerLength: event.target.value as StudyPreferences['answerLength'],
                  }))
                }
                value={draft.answerLength}
              >
                <option value="brief">Brief</option>
                <option value="balanced">Balanced</option>
                <option value="deep">Deep</option>
              </select>
            </label>

            <button
              className="rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--sun))] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105"
              type="submit"
            >
              Save preferences
            </button>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  )
}
