import { motion } from 'framer-motion'
import {
  Check,
  Copy,
  NotebookTabs,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage as ChatMessageModel, FeedbackValue } from '../types/app.ts'
import { cn } from '../utils/cn.ts'
import { formatClockTime } from '../utils/date.ts'

interface ChatMessageProps {
  copiedMessageId: string | null
  isLastAssistantMessage: boolean
  message: ChatMessageModel
  onCopy: (content: string, messageId: string) => void
  onFeedback: (messageId: string, feedback: FeedbackValue) => void
  onRegenerate: (messageId: string) => void
  onSaveNote: (messageId: string) => void
}

export function ChatMessage({
  copiedMessageId,
  isLastAssistantMessage,
  message,
  onCopy,
  onFeedback,
  onRegenerate,
  onSaveNote,
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex w-full items-start gap-3 sm:gap-4',
        isAssistant ? 'justify-start' : 'justify-end',
      )}
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      {isAssistant && (
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[rgba(82,246,213,0.14)] text-xs font-semibold text-[color:var(--accent)] sm:size-10 sm:text-sm">
          AI
        </div>
      )}

      <div
        className={cn(
          'min-w-0',
          isAssistant ? 'max-w-[min(100%,46rem)]' : 'max-w-[min(90%,42rem)]',
        )}
      >
        <div
          className={cn(
            'rounded-[26px] border px-4 py-4 sm:rounded-[28px] sm:px-6',
            isAssistant
              ? 'panel-strong border-[color:var(--line)]'
              : 'border-transparent text-white shadow-[0_18px_60px_rgba(7,18,32,0.22)]',
          )}
          style={isAssistant ? undefined : { background: 'var(--user-bubble)' }}
        >
          {isAssistant ? (
            <div className="markdown-content text-sm sm:text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">
              {message.content}
            </p>
          )}
        </div>

        <div
          className={cn(
            'mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]',
            isAssistant ? 'justify-start pl-1' : 'justify-end pr-1',
          )}
        >
          <span>{formatClockTime(message.createdAt)}</span>

          {isAssistant && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                className="rounded-full border border-[color:var(--line)] p-2 transition hover:border-[color:var(--line-strong)] hover:bg-white/5"
                onClick={() => onCopy(message.content, message.id)}
                title="Copy answer"
                type="button"
              >
                {copiedMessageId === message.id ? (
                  <Check className="size-3.5 text-[color:var(--accent)]" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
              <button
                className="rounded-full border border-[color:var(--line)] p-2 transition hover:border-[color:var(--line-strong)] hover:bg-white/5"
                onClick={() => onSaveNote(message.id)}
                title="Save as note"
                type="button"
              >
                <NotebookTabs className="size-3.5" />
              </button>
              <button
                className={cn(
                  'rounded-full border p-2 transition',
                  message.feedback === 'like'
                    ? 'border-[rgba(82,246,213,0.4)] bg-[rgba(82,246,213,0.12)] text-[color:var(--accent)]'
                    : 'border-[color:var(--line)] hover:border-[color:var(--line-strong)] hover:bg-white/5',
                )}
                onClick={() =>
                  onFeedback(message.id, message.feedback === 'like' ? null : 'like')
                }
                title="Like answer"
                type="button"
              >
                <ThumbsUp className="size-3.5" />
              </button>
              <button
                className={cn(
                  'rounded-full border p-2 transition',
                  message.feedback === 'dislike'
                    ? 'border-[rgba(248,195,108,0.38)] bg-[rgba(248,195,108,0.12)] text-[color:var(--sun)]'
                    : 'border-[color:var(--line)] hover:border-[color:var(--line-strong)] hover:bg-white/5',
                )}
                onClick={() =>
                  onFeedback(message.id, message.feedback === 'dislike' ? null : 'dislike')
                }
                title="Dislike answer"
                type="button"
              >
                <ThumbsDown className="size-3.5" />
              </button>
              {isLastAssistantMessage && (
                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-2 transition hover:border-[color:var(--line-strong)] hover:bg-white/5"
                  initial={{ opacity: 0, y: 4 }}
                  onClick={() => onRegenerate(message.id)}
                  title="Regenerate answer"
                  type="button"
                >
                  <RefreshCcw className="size-3.5" />
                  <span>Regenerate</span>
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}
