/**
 * AllianceHearts — the little "동맹 · ALLEANZA" flourish that appears between
 * two cards on the same seat when a duel resolves as an alliance (same
 * identity on both sides). Two purple hearts + a connecting shimmer + a
 * Cinzel label chip.
 */

import type React from 'react'
import { motion } from 'framer-motion'

export function AllianceHearts(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1 pointer-events-none">
      <div className="flex items-center gap-1">
        <motion.span
          className="text-[16px]"
          style={{ filter: 'drop-shadow(0 0 6px rgba(190,160,200,0.85))' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.35, 1], opacity: [0, 1, 0.95] }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          💜
        </motion.span>
        <motion.span
          className="text-[10px] text-lavender/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          ↔
        </motion.span>
        <motion.span
          className="text-[16px]"
          style={{ filter: 'drop-shadow(0 0 6px rgba(190,160,200,0.85))' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.35, 1], opacity: [0, 1, 0.95] }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          💜
        </motion.span>
      </div>
      <motion.div
        className="font-display font-bold text-[9px] tracking-[0.14em] px-2 py-0.5 rounded-full"
        style={{
          background: 'rgba(166,139,168,0.32)',
          border: '1px solid rgba(190,160,200,0.7)',
          color: '#e6cce8',
          boxShadow: '0 0 10px rgba(190,160,200,0.45)',
          textShadow: '0 1px 2px rgba(0,0,0,0.55)',
          whiteSpace: 'nowrap',
        }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        🤝 ALLEANZA · 동맹
      </motion.div>
    </div>
  )
}
