import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenCheck, Sparkles } from 'lucide-react'

interface TypingPlaceholderProps {
  detail?: string
  label?: string
}

const THINKING_STAGES = ['Reading your question', 'Connecting the key ideas', 'Writing a clear explanation']

export function TypingPlaceholder({
  detail = 'A clear, study-ready response is on its way.',
  label = 'Building your answer',
}: TypingPlaceholderProps) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => (current + 1) % THINKING_STAGES.length), 1500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="message-row message-row--assistant flex items-start gap-3" role="status" aria-live="polite" aria-busy="true">
      <div className="study-orbit mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <motion.div animate={{ rotate: 360 }} className="study-orbit__ring" transition={{ duration: 5, ease: 'linear', repeat: Number.POSITIVE_INFINITY }} />
        <BookOpenCheck className="relative z-10 size-5 text-[color:var(--accent)]" aria-hidden="true" />
        <motion.span animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.45, 1, 0.45] }} className="study-orbit__spark" transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }} />
      </div>
      <div className="study-thinking-card panel-strong min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]"><Sparkles className="size-3" /> Study signal</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text)]">{label}</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{detail}</p>
          </div>
          <div className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[10px] font-medium text-[color:var(--muted)]">
            <motion.span key={stage} animate={{ opacity: 1, y: 0 }} className="block" initial={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>{THINKING_STAGES[stage]}</motion.span>
          </div>
        </div>
        <div className="study-signal-track mt-4" aria-hidden="true">
          <motion.div animate={{ x: ['-35%', '120%'] }} className="study-signal-track__beam" transition={{ duration: 1.7, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }} />
        </div>
        <div className="mt-4 space-y-2.5" aria-hidden="true"><div className="typing-skeleton w-[88%]" /><div className="typing-skeleton w-[66%]" /></div>
      </div>
    </div>
  )
}
