import { useEffect, useRef, useState } from 'react'
import {
  FileUp,
  Mic,
  NotebookPen,
  Paperclip,
  Plus,
  SendHorizonal,
  Square,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { StudyNote } from '../types/app.ts'
import { useVoiceInput } from '../hooks/useVoiceInput.ts'

interface ChatComposerProps {
  disabled?: boolean
  isSending: boolean
  notes: StudyNote[]
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  value: string
}

function isProbablyTextFile(file: File) {
  return (
    file.type.startsWith('text/') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.csv')
  )
}

export function ChatComposer({
  disabled,
  isSending,
  notes,
  onChange,
  onSend,
  onStop,
  value,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput(
    (transcript) => {
      onChange(value ? `${value} ${transcript}` : transcript)
    },
  )

  useEffect(() => {
    if (!textareaRef.current) {
      return
    }

    textareaRef.current.style.height = '0px'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`
  }, [value])

  const onFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setMenuOpen(false)

    if (!isProbablyTextFile(file)) {
      onChange(
        `${value ? `${value}\n\n` : ''}Attached file: ${file.name}\nPlease use the extracted text from this file and help me study it.`,
      )
      event.target.value = ''
      return
    }

    const text = await file.text()
    onChange(
      `${value ? `${value}\n\n` : ''}Here is content from ${file.name}:\n\n${text.slice(0, 8000)}`,
    )
    event.target.value = ''
  }

  const importNote = (note: StudyNote) => {
    setMenuOpen(false)
    onChange(
      `${value ? `${value}\n\n` : ''}Use this saved note as context:\nQuestion: ${note.question}\nAnswer: ${note.answer}`,
    )
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!disabled && value.trim()) {
        onSend()
      }
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
      return
    }

    startListening()
  }

  return (
    <div className="rounded-[28px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.96))] px-3 pb-3 pt-4 backdrop-blur-xl sm:px-4">
      <div className="flex items-end gap-3">
        <div className="relative">
          <button
            className="flex size-11 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.08)]"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <Plus className="size-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="panel-strong absolute bottom-14 left-0 z-20 flex w-[min(78vw,18rem)] flex-col rounded-2xl p-2 sm:w-72"
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
              >
                <button
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:var(--text)] transition hover:bg-white/5"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <FileUp className="size-4" />
                  Upload file
                </button>
                <div className="my-2 h-px bg-[color:var(--line)]" />
                <div className="px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Import note
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="rounded-xl px-3 py-2 text-sm text-[color:var(--muted)]">
                      Save a note first, then import it into a future chat.
                    </div>
                  ) : (
                    notes.slice(0, 5).map((note) => (
                      <button
                        key={note.id}
                        className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:var(--text)] transition hover:bg-white/5"
                        onClick={() => importNote(note)}
                        type="button"
                      >
                        <NotebookPen className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
                        <span className="line-clamp-2">{note.question}</span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1 px-1 py-2">
          <textarea
            className="max-h-60 min-h-[28px] w-full resize-none bg-transparent text-sm leading-7 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)] sm:text-[15px]"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a concept, paste notes, or continue a study thread..."
            ref={textareaRef}
            rows={1}
            value={value}
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <Paperclip className="size-3.5" />
              Enter to send, Shift+Enter for a new line
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isSupported}
                onClick={handleMicClick}
                title={isSupported ? 'Voice input' : 'Voice input not supported'}
                type="button"
              >
                <Mic
                  className={`size-4 ${isListening ? 'text-[color:var(--accent)]' : ''}`}
                />
              </button>

              {isSending ? (
                <button
                  className="flex size-11 items-center justify-center rounded-full bg-[rgba(240,193,94,0.16)] text-[color:var(--sun)] transition hover:brightness-110"
                  onClick={onStop}
                  type="button"
                >
                  <Square className="size-4 fill-current" />
                </button>
              ) : (
                <button
                  className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--sun))] text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || !value.trim()}
                  onClick={onSend}
                  type="button"
                >
                  <SendHorizonal className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        className="hidden"
        accept=".txt,.md,.json,.csv,text/*"
        onChange={onFilePicked}
        ref={fileInputRef}
        type="file"
      />
    </div>
  )
}
