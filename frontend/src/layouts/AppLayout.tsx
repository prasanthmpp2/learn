import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client.ts'
import { SettingsPanel } from '../components/SettingsPanel.tsx'
import { Sidebar } from '../components/Sidebar.tsx'
import { useAuth } from '../contexts/useAuth.ts'
import { usePreferences } from '../contexts/usePreferences.ts'
import type {
  ApiAuth,
  ChatMessage,
  ChatSession,
  FeedbackValue,
  SaveNotePayload,
  StudyNote,
  StudyPreferences,
} from '../types/app.ts'

export interface AppLayoutContextValue {
  chats: ChatSession[]
  deleteChat: (chatId: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  notes: StudyNote[]
  refreshWorkspace: () => Promise<void>
  renameChat: (chatId: string, title: string) => Promise<ChatSession>
  saveNote: (payload: SaveNotePayload) => Promise<StudyNote>
  submitFeedback: (messageId: string, feedback: FeedbackValue) => Promise<ChatMessage>
  toggleSidebar: () => void
  upsertChat: (chat: ChatSession) => void
  workspaceLoading: boolean
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { demoMode, getToken, logout, user } = useAuth()
  const { preferences, updatePreferences } = usePreferences()
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [chats, setChats] = useState<ChatSession[]>([])
  const [notes, setNotes] = useState<StudyNote[]>([])

  const deferredChatSearch = useDeferredValue(chatSearch)
  const activeChatId = location.pathname.startsWith('/chats/')
    ? location.pathname.split('/').at(-1) ?? null
    : null

  const buildAuth = useCallback(async (): Promise<ApiAuth> => ({
    demoUserId: demoMode ? user?.uid ?? null : null,
    displayName: user?.displayName,
    email: user?.email,
    token: await getToken(),
  }), [demoMode, getToken, user?.displayName, user?.email, user?.uid])

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      return
    }

    setWorkspaceLoading(true)
    try {
      const auth = await buildAuth()
      const [chatResponse, noteResponse] = await Promise.all([
        api.getChats(auth),
        api.getNotes(auth),
      ])
      setChats(chatResponse.chats)
      setNotes(noteResponse.notes)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [buildAuth, user])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  const filteredChats = chats.filter((chat) => {
    if (!deferredChatSearch.trim()) {
      return true
    }

    const searchTerm = deferredChatSearch.toLowerCase()
    return (
      chat.title.toLowerCase().includes(searchTerm) ||
      chat.lastMessagePreview.toLowerCase().includes(searchTerm)
    )
  })

  const upsertChat = (nextChat: ChatSession) => {
    setChats((current) => {
      const remaining = current.filter((chat) => chat.id !== nextChat.id)
      return [nextChat, ...remaining].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
    })
  }

  const handleSaveNote = async (payload: SaveNotePayload) => {
    const auth = await buildAuth()
    const response = await api.saveNote(auth, payload)
    setNotes((current) => [response.note, ...current.filter((note) => note.id !== response.note.id)])
    return response.note
  }

  const handleDeleteNote = async (noteId: string) => {
    const auth = await buildAuth()
    await api.deleteNote(auth, noteId)
    setNotes((current) => current.filter((note) => note.id !== noteId))
  }

  const handleDeleteChat = async (chatId: string) => {
    const auth = await buildAuth()
    await api.deleteChat(auth, chatId)
    setChats((current) => current.filter((chat) => chat.id !== chatId))
    if (activeChatId === chatId) {
      navigate('/chats')
    }
  }

  const handleRenameChat = async (chatId: string, title: string) => {
    const auth = await buildAuth()
    const response = await api.renameChat(auth, chatId, title)
    upsertChat(response.chat)
    return response.chat
  }

  const handleFeedback = async (messageId: string, feedback: FeedbackValue) => {
    const auth = await buildAuth()
    const response = await api.setFeedback(auth, messageId, feedback)
    return response.message
  }

  const handlePreferencesSave = async (nextPreferences: StudyPreferences) => {
    updatePreferences(nextPreferences)
    if (!user) {
      return
    }

    try {
      const auth = await buildAuth()
      await api.updatePreferences(auth, nextPreferences)
    } catch {
      // Keep local settings even if the backend is unavailable.
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[color:var(--bg)] px-0 sm:px-4 lg:px-6">
      <div className="relative mx-auto grid h-full max-w-[1520px] gap-0 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
        {user && (
          <Sidebar
            activeChatId={activeChatId}
            chats={filteredChats}
            mobileOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            onLogout={async () => {
              await logout()
              navigate('/auth')
            }}
            onNewChat={() => {
              navigate('/chats')
              setSidebarOpen(false)
            }}
            onOpenSettings={() => {
              setSettingsOpen(true)
              setSidebarOpen(false)
            }}
            onSelectChat={(chatId) => navigate(`/chats/${chatId}`)}
            onThemeToggle={() =>
              updatePreferences({
                theme: preferences.theme === 'dark' ? 'light' : 'dark',
              })
            }
            profile={user}
            search={chatSearch}
            setSearch={setChatSearch}
            theme={preferences.theme}
          />
        )}

        <main className="panel-surface min-w-0 h-full overflow-hidden px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          <Outlet
            context={{
              chats,
              deleteChat: handleDeleteChat,
              deleteNote: handleDeleteNote,
              notes,
              refreshWorkspace,
              renameChat: handleRenameChat,
              saveNote: handleSaveNote,
              submitFeedback: handleFeedback,
              toggleSidebar: () => setSidebarOpen((current) => !current),
              upsertChat,
              workspaceLoading,
            } satisfies AppLayoutContextValue}
          />
        </main>
      </div>

      <SettingsPanel
        onClose={() => setSettingsOpen(false)}
        onSave={handlePreferencesSave}
        open={settingsOpen}
        preferences={preferences}
      />
    </div>
  )
}
