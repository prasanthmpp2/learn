import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenText,
  LogOut,
  MoonStar,
  PencilRuler,
  Plus,
  Search,
  Settings2,
  SunMedium,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AuthUser, ChatSession, ThemeMode } from '../types/app.ts'
import { cn } from '../utils/cn.ts'
import { formatRelativeTime } from '../utils/date.ts'

interface SidebarProps {
  activeChatId: string | null
  chats: ChatSession[]
  mobileOpen: boolean
  onCloseMobile: () => void
  onLogout: () => Promise<void>
  onNewChat: () => void
  onOpenSettings: () => void
  onSelectChat: (chatId: string) => void
  onThemeToggle: () => void
  profile: AuthUser
  search: string
  setSearch: (value: string) => void
  theme: ThemeMode
}

function initialsForProfile(profile: AuthUser) {
  return profile.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Sidebar({
  activeChatId,
  chats,
  mobileOpen,
  onCloseMobile,
  onLogout,
  onNewChat,
  onOpenSettings,
  onSelectChat,
  onThemeToggle,
  profile,
  search,
  setSearch,
  theme,
}: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false)

  const content = (
    <aside className="panel-surface flex h-full w-full max-w-[19rem] flex-col overflow-hidden border-r border-[color:var(--line)] px-4 py-5 lg:sticky lg:top-0 lg:h-screen sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted)]">
            AI Study Assistant
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
            Smarter study sessions
          </h2>
        </div>
        <button
          className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-[color:var(--muted)] transition hover:text-[color:var(--text)] lg:hidden"
          onClick={onCloseMobile}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--accent),var(--sun))] px-4 py-3 font-semibold text-slate-950 transition hover:brightness-105"
        onClick={onNewChat}
        type="button"
      >
        <Plus className="size-4" />
        New Chat
      </button>

      <label className="relative mt-4">
        <Search className="pointer-events-none absolute left-1 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]" />
        <input
          className="w-full border-b border-[color:var(--line)] bg-transparent py-3 pl-8 pr-2 text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search chats"
          value={search}
        />
      </label>

      <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
          <span>Recent chats</span>
          <span>{chats.length}</span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {chats.length === 0 ? (
            <div className="px-1 py-4 text-sm leading-6 text-[color:var(--muted)]">
              Start a fresh chat and the first conversation will appear here.
            </div>
          ) : (
            chats.map((chat) => (
              <motion.button
                key={chat.id}
                className={cn(
                  'w-full rounded-2xl px-4 py-3 text-left transition',
                  activeChatId === chat.id
                    ? 'bg-[rgba(255,255,255,0.07)]'
                    : 'hover:bg-[rgba(255,255,255,0.04)]',
                )}
                onClick={() => {
                  onSelectChat(chat.id)
                  onCloseMobile()
                }}
                type="button"
                whileHover={{ x: 2 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[color:var(--text)]">
                      {chat.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-[color:var(--muted)]">
                      {chat.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    {formatRelativeTime(chat.updatedAt)}
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </div>

        <div className="space-y-2 pt-3">
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                isActive
                  ? 'bg-[rgba(255,255,255,0.07)] text-[color:var(--text)]'
                  : 'text-[color:var(--muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[color:var(--text)]',
              )
            }
            onClick={onCloseMobile}
            to="/notes"
          >
            <BookOpenText className="size-4" />
            Notes
          </NavLink>
        </div>
      </nav>

      <div className="mt-4 border-t border-[color:var(--line)] pt-4">
        <button
          className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-[rgba(255,255,255,0.04)]"
          onClick={() => setProfileOpen((current) => !current)}
          type="button"
        >
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--sun))] font-semibold text-slate-950">
            {initialsForProfile(profile)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[color:var(--text)]">
              {profile.displayName}
            </p>
            <p className="truncate text-xs text-[color:var(--muted)]">{profile.email}</p>
          </div>
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-2 overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <button
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.04)]"
                onClick={onThemeToggle}
                type="button"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <MoonStar className="size-4" />
                  ) : (
                    <SunMedium className="size-4" />
                  )}
                  Theme
                </span>
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  {theme}
                </span>
              </button>

              <button
                className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.04)]"
                onClick={onOpenSettings}
                type="button"
              >
                <Settings2 className="size-4" />
                Settings
              </button>

              <button
                className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.04)]"
                onClick={() => void onLogout()}
                type="button"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-center gap-2 px-3 py-2 text-xs text-[color:var(--muted)]">
          <PencilRuler className="size-3.5" />
          Save answers as notes for quick revision.
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden h-full lg:block">{content}</div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 bg-[rgba(3,10,15,0.5)] backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={onCloseMobile}
            />
            <motion.div
              animate={{ x: 0 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-[21rem] bg-black p-3 sm:p-4 lg:hidden"
              exit={{ x: '-100%' }}
              initial={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
