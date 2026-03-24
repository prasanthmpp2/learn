import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, WandSparkles } from 'lucide-react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../api/client.ts'
import { ChatComposer } from '../components/ChatComposer.tsx'
import { ChatMessage } from '../components/ChatMessage.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { TypingPlaceholder } from '../components/TypingPlaceholder.tsx'
import { useAuth } from '../contexts/useAuth.ts'
import { usePreferences } from '../contexts/usePreferences.ts'
import { useAutoScroll } from '../hooks/useAutoScroll.ts'
import type { AppLayoutContextValue } from '../layouts/AppLayout.tsx'
import type { ApiAuth, ChatMessage as ChatMessageModel, ChatSession } from '../types/app.ts'
import { exportChatToPdf } from '../utils/exportPdf.ts'

function getQuestionForAssistantMessage(
  messages: ChatMessageModel[],
  assistantMessageId: string,
) {
  const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId)
  if (assistantIndex <= 0) {
    return 'Study summary'
  }

  const previousUserMessage = [...messages.slice(0, assistantIndex)]
    .reverse()
    .find((message) => message.role === 'user')

  return previousUserMessage?.content ?? 'Study summary'
}

export function ChatPage() {
  const navigate = useNavigate()
  const { chatId } = useParams()
  const {
    chats,
    deleteChat,
    notes,
    renameChat,
    saveNote,
    submitFeedback,
    toggleSidebar,
    upsertChat,
  } = useOutletContext<AppLayoutContextValue>()
  const { demoMode, getToken, user } = useAuth()
  const { preferences } = usePreferences()
  const [composerValue, setComposerValue] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessageModel[]>([])
  const scrollRef = useAutoScroll<HTMLDivElement>(`${messages.length}-${isSending}`)
  const abortControllerRef = useRef<AbortController | null>(null)

  const buildAuth = useCallback(async (): Promise<ApiAuth> => ({
    demoUserId: demoMode ? user?.uid ?? null : null,
    displayName: user?.displayName,
    email: user?.email,
    token: await getToken(),
  }), [demoMode, getToken, user?.displayName, user?.email, user?.uid])

  useEffect(() => {
    const activeChat = chats.find((chat) => chat.id === chatId) ?? null
    setCurrentChat(activeChat)
  }, [chatId, chats])

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setCurrentChat(null)
      setError(null)
      return
    }

    let active = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      setError(null)
      try {
        const auth = await buildAuth()
        const response = await api.getMessages(auth, chatId)
        if (!active) {
          return
        }

        setCurrentChat(response.chat)
        setMessages(response.messages)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Could not load this chat.')
      } finally {
        if (active) {
          setIsLoadingMessages(false)
        }
      }
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [buildAuth, chatId])

  const lastAssistantMessageId = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === 'assistant')?.id ?? null,
    [messages],
  )

  const sendMessage = async (message: string, regenerate = false) => {
    setIsSending(true)
    setError(null)
    abortControllerRef.current = new AbortController()

    try {
      const auth = await buildAuth()
      const response = await api.ask(
        auth,
        {
          chatId: chatId ?? null,
          history: messages.slice(-10).map((item) => ({
            content: item.content,
            role: item.role,
          })),
          message,
          preferences,
          regenerate,
        },
        abortControllerRef.current.signal,
      )

      setMessages(response.messages)
      setCurrentChat(response.chat)
      upsertChat(response.chat)
      setComposerValue('')

      if (chatId !== response.chat.id) {
        navigate(`/chats/${response.chat.id}`, { replace: !chatId })
      }
    } catch (sendError) {
      if ((sendError as Error).name !== 'AbortError') {
        setError(sendError instanceof Error ? sendError.message : 'Could not send your message.')
      }
    } finally {
      setIsSending(false)
      abortControllerRef.current = null
    }
  }

  const handleSend = async () => {
    const message = composerValue.trim()
    if (!message) {
      return
    }

    await sendMessage(message)
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsSending(false)
  }

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    window.setTimeout(() => setCopiedMessageId(null), 1600)
  }

  const handleSaveNote = async (messageId: string) => {
    const assistantMessage = messages.find((message) => message.id === messageId)
    if (!assistantMessage) {
      return
    }

    await saveNote({
      answer: assistantMessage.content,
      chatId: currentChat?.id,
      messageId,
      question: getQuestionForAssistantMessage(messages, messageId),
    })
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike' | null) => {
    const updated = await submitFeedback(messageId, feedback)
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? updated : message)),
    )
  }

  const handleRegenerate = async (messageId: string) => {
    const question = getQuestionForAssistantMessage(messages, messageId)
    await sendMessage(question, true)
  }

  const shareConversation = async () => {
    const shareText = messages
      .map((message) => `${message.role === 'assistant' ? 'AI' : 'You'}:\n${message.content}`)
      .join('\n\n')

    if (navigator.share) {
      await navigator.share({
        text: shareText,
        title: currentChat?.title ?? 'AI Study Assistant',
      })
      return
    }

    await exportChatToPdf(currentChat, messages)
  }

  const suggestions = [
    'Explain photosynthesis like I am 15 and add a quick table.',
    'Turn these lecture notes into revision bullets and flashcards.',
    'Quiz me on the last topic we discussed using medium difficulty.',
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="mx-auto w-full max-w-5xl shrink-0">
        <TopBar
          chat={currentChat}
          onDeleteChat={async () => {
            if (!currentChat) {
              return
            }

            await deleteChat(currentChat.id)
          }}
          onExport={() => void exportChatToPdf(currentChat, messages)}
          onOpenSidebar={toggleSidebar}
          onRenameChat={async (title) => {
            if (!currentChat) {
              return
            }

            const nextChat = await renameChat(currentChat.id, title)
            setCurrentChat(nextChat)
          }}
          onShare={shareConversation}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="mx-auto w-full max-w-5xl space-y-4 px-1 pb-4 pt-4 sm:px-2 sm:pb-6">
            <TypingPlaceholder />
            <TypingPlaceholder />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-1 py-12 text-center sm:px-2">
            <div className="flex size-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--accent),var(--sun))] text-slate-950 shadow-[0_20px_60px_rgba(82,246,213,0.22)]">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text)]">
              Study with a context-aware AI workspace
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-[color:var(--muted)] sm:text-base">
              Ask a new question, upload lecture text, or pull a saved note into this chat.
              Answers are structured to be easy to revise later.
            </p>

            <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-3">
              {suggestions.map((suggestion) => (
                <motion.button
                  key={suggestion}
                  className="rounded-[24px] bg-[rgba(255,255,255,0.04)] p-4 text-sm leading-7 text-[color:var(--text)] transition hover:bg-[rgba(255,255,255,0.07)]"
                  onClick={() => setComposerValue(suggestion)}
                  type="button"
                  whileHover={{ y: -3 }}
                >
                  <WandSparkles className="mb-3 size-4 text-[color:var(--accent)]" />
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-1 pb-4 pt-4 sm:px-2 sm:pb-6">
            {messages.map((message) => (
              <ChatMessage
                copiedMessageId={copiedMessageId}
                isLastAssistantMessage={message.id === lastAssistantMessageId}
                key={message.id}
                message={message}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onRegenerate={handleRegenerate}
                onSaveNote={handleSaveNote}
              />
            ))}
            {isSending && <TypingPlaceholder />}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto w-full max-w-5xl rounded-2xl bg-[rgba(255,181,155,0.1)] px-4 py-3 text-sm text-[#ffc9b7]">
          {error}
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl shrink-0">
        <ChatComposer
          disabled={!user}
          isSending={isSending}
          notes={notes}
          onChange={setComposerValue}
          onSend={() => void handleSend()}
          onStop={handleStop}
          value={composerValue}
        />
      </div>
    </div>
  )
}
