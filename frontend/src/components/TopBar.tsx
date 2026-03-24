import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download,
  Menu,
  MoreHorizontal,
  PencilLine,
  Share2,
  Trash2,
} from 'lucide-react'
import type { ChatSession } from '../types/app.ts'

interface TopBarProps {
  chat: ChatSession | null
  onDeleteChat: () => Promise<void>
  onExport: () => void
  onOpenSidebar: () => void
  onRenameChat: (title: string) => Promise<void>
  onShare: () => Promise<void>
}

export function TopBar({
  chat,
  onDeleteChat,
  onExport,
  onOpenSidebar,
  onRenameChat,
  onShare,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const requestRename = async () => {
    setMenuOpen(false)
    const nextTitle = window.prompt('Rename this chat', chat?.title ?? 'AI Study Assistant')
    if (!nextTitle?.trim()) {
      return
    }

    await onRenameChat(nextTitle.trim())
  }

  const requestDelete = async () => {
    setMenuOpen(false)
    const confirmed = window.confirm('Delete this chat and all of its messages?')
    if (!confirmed) {
      return
    }

    await onDeleteChat()
  }

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] bg-[rgba(0,0,0,0.88)] px-1 py-4 backdrop-blur-xl sm:px-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-[color:var(--muted)] transition hover:text-[color:var(--text)] lg:hidden"
          onClick={onOpenSidebar}
          type="button"
        >
          <Menu className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted)]">
            Study workspace
          </p>
          <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-[color:var(--text)]">
            {chat?.title ?? 'AI Study Assistant'}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          className="hidden items-center gap-2 rounded-full bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.08)] sm:flex"
          onClick={onShare}
          type="button"
        >
          <Share2 className="size-4" />
          Share
        </button>

        <button
          className="rounded-full bg-[rgba(255,255,255,0.04)] p-2.5 text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.08)]"
          onClick={onExport}
          title="Export chat as PDF"
          type="button"
        >
          <Download className="size-4" />
        </button>

        <div className="relative">
          <button
            className="rounded-full bg-[rgba(255,255,255,0.04)] p-2.5 text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.08)]"
            onClick={() => setMenuOpen((current) => !current)}
            title="Chat actions"
            type="button"
          >
            <MoreHorizontal className="size-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="panel-strong absolute right-0 top-12 z-20 flex w-48 flex-col rounded-2xl p-2"
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                initial={{ opacity: 0, scale: 0.98, y: -8 }}
              >
                <button
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:var(--text)] transition hover:bg-white/5"
                  onClick={() => void requestRename()}
                  type="button"
                >
                  <PencilLine className="size-4" />
                  Rename chat
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[color:var(--text)] transition hover:bg-white/5"
                  onClick={onExport}
                  type="button"
                >
                  <Download className="size-4" />
                  Export PDF
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#ffb59b] transition hover:bg-[rgba(255,181,155,0.08)]"
                  onClick={() => void requestDelete()}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Delete chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
