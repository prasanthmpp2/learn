import { motion } from 'framer-motion'

export function TypingPlaceholder() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(82,246,213,0.14)] text-sm font-semibold text-[color:var(--accent)]">
        AI
      </div>
      <div className="panel-strong rounded-[24px] px-5 py-4">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              className="size-2 rounded-full bg-[color:var(--accent)]"
              transition={{
                delay: index * 0.15,
                duration: 0.9,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
