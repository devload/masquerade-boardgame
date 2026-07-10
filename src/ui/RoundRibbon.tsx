/**
 * RoundRibbon — a big ceremonial banner that slides in from the top of the
 * Court whenever a new round begins, pauses briefly, and slides out.
 * Purely decorative; the parent controls when it mounts (via `key={round}`
 * on an <AnimatePresence>).
 */

import { motion } from 'framer-motion'

type Props = {
  roman: string
  subtitle?: string
}

export function RoundRibbon({ roman, subtitle }: Props) {
  return (
    <motion.div
      key={roman}
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
      data-testid="round-ribbon"
    >
      <div
        className="px-10 py-5 rounded-lg text-center
                   bg-gradient-to-b from-lavender-deep/95 to-black/90
                   border border-gold-soft/60 shadow-gold-glow backdrop-blur-md"
      >
        <div className="font-mono text-[9px] tracking-[0.35em] text-gold-soft/70 uppercase">
          Round
        </div>
        <div className="font-display text-parch-cream text-3xl tracking-[0.25em] leading-none mt-1">
          {roman}
        </div>
        {subtitle && (
          <div className="mt-1.5 font-serif italic text-[11px] text-parch-cream/80">
            {subtitle}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default RoundRibbon
