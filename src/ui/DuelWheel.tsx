/**
 * DuelWheel — a small RPS-5 pentagram wheel used when two commits land on
 * the same seat. Displays all five identities arranged in a regular pentagon
 * with directed arrows drawn from the BEATS table, and highlights the two
 * clashing identities so the player can see at a glance who wins and why.
 *
 * The wheel appears as a translucent overlay for ~1.5s and self-dismisses
 * via `onDone()` so the caller can chain the reveal flow.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'

import { BEATS, type DuelOutcome } from '../game/rps5.ts'
import type { Identity } from '../game/types.ts'

type Props = {
  my: Identity
  opponent: Identity
  outcome: DuelOutcome
  onDone: () => void
  /** How long the wheel stays on screen before auto-dismissing. */
  durationMs?: number
}

const IDENTITY_ORDER: Identity[] = [
  'Royalty',
  'Thief',
  'Scholar',
  'Hunter',
  'Mystic',
]

const IDENTITY_EMOJI: Record<Identity, string> = {
  Royalty: '👑',
  Thief: '🗡',
  Scholar: '📚',
  Hunter: '🏹',
  Mystic: '🔮',
}

const IDENTITY_LABEL_KR: Record<Identity, string> = {
  Royalty: '왕족',
  Thief: '도둑',
  Scholar: '학자',
  Hunter: '사냥꾼',
  Mystic: '신비주의자',
}

// Layout: pentagon centered at (100, 100) with radius 68 inside a 200x200 svg.
const R = 68
const CX = 100
const CY = 100

/** Compute vertex position for an identity, starting straight up (12 o'clock). */
function vertexOf(identity: Identity): { x: number; y: number; angle: number } {
  const i = IDENTITY_ORDER.indexOf(identity)
  // Start at -90deg (top) and go clockwise.
  const angle = (-90 + (360 / 5) * i) * (Math.PI / 180)
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), angle }
}

/** Shrink a vertex point toward the center so arrows don't overlap emoji. */
function shrink(from: { x: number; y: number }, amount: number) {
  const dx = CX - from.x
  const dy = CY - from.y
  const len = Math.hypot(dx, dy) || 1
  return { x: from.x + (dx / len) * amount, y: from.y + (dy / len) * amount }
}

export function DuelWheel({ my, opponent, outcome, onDone, durationMs = 1500 }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), durationMs)
    return () => clearTimeout(t)
  }, [onDone, durationMs])

  // All beat edges (winner → loser) for the pentagram lines.
  const edges = useMemo(() => {
    const out: Array<{ from: Identity; to: Identity; hot: boolean }> = []
    for (const winner of IDENTITY_ORDER) {
      for (const loser of BEATS[winner]) {
        const hot =
          outcome !== 'alliance' &&
          ((outcome === 'a' && winner === my && loser === opponent) ||
            (outcome === 'b' && winner === opponent && loser === my))
        out.push({ from: winner, to: loser, hot })
      }
    }
    return out
  }, [my, opponent, outcome])

  const outcomeLabel =
    outcome === 'alliance'
      ? `동맹 — 같은 정체 (${IDENTITY_LABEL_KR[my]})`
      : outcome === 'a'
        ? `승리 — ${IDENTITY_LABEL_KR[my]} ▶ ${IDENTITY_LABEL_KR[opponent]}`
        : `패배 — ${IDENTITY_LABEL_KR[opponent]} ▶ ${IDENTITY_LABEL_KR[my]}`

  return (
    <AnimatePresence>
      <motion.div
        key="duel-wheel"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        data-testid="duel-wheel"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(139,58,74,0.35), transparent 70%)',
          }}
        />
        <div className="relative w-[240px] flex flex-col items-center">
          <svg viewBox="0 0 200 200" width="220" height="220">
            {/* Halo */}
            <defs>
              <radialGradient id="wheelHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e8d5b7" stopOpacity="0.35" />
                <stop offset="80%" stopColor="#8b3a4a" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#8b3a4a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={R + 22} fill="url(#wheelHalo)" />
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="#e8d5b7"
              strokeOpacity="0.35"
              strokeWidth="0.7"
              strokeDasharray="2 3"
            />

            {/* Beat edges */}
            {edges.map((e, i) => {
              const a = shrink(vertexOf(e.from), 14)
              const b = shrink(vertexOf(e.to), 14)
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={e.hot ? '#f0c8a8' : '#e8d5b7'}
                  strokeOpacity={e.hot ? 0.95 : 0.22}
                  strokeWidth={e.hot ? 1.8 : 0.7}
                />
              )
            })}

            {/* Nodes */}
            {IDENTITY_ORDER.map((id) => {
              const v = vertexOf(id)
              const isMine = id === my
              const isOpp = id === opponent
              const isClash = isMine || isOpp
              return (
                <g key={id}>
                  <motion.circle
                    cx={v.x}
                    cy={v.y}
                    r={isClash ? 18 : 14}
                    fill={
                      isClash
                        ? outcome === 'alliance'
                          ? '#a68ba8'
                          : (outcome === 'a' && isMine) ||
                              (outcome === 'b' && isOpp)
                            ? '#e8d5b7'
                            : '#8b3a4a'
                        : '#1a1220'
                    }
                    stroke={isClash ? '#f0c8a8' : '#c48b6e'}
                    strokeOpacity={isClash ? 0.95 : 0.4}
                    strokeWidth={isClash ? 1.6 : 0.6}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.05, type: 'spring' }}
                  />
                  <text
                    x={v.x}
                    y={v.y + 5}
                    textAnchor="middle"
                    fontSize="14"
                    className="select-none"
                  >
                    {IDENTITY_EMOJI[id]}
                  </text>
                </g>
              )
            })}

            {/* Central sigil */}
            <text
              x={CX}
              y={CY + 5}
              textAnchor="middle"
              fill="#e8d5b7"
              fontSize="16"
              fontFamily="Cinzel, Georgia, serif"
              opacity="0.7"
            >
              ✦
            </text>
          </svg>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-2 px-3 py-1.5 rounded-md
                       bg-black/50 border border-gold-soft/40
                       font-serif italic text-[12px] text-parch-cream text-center
                       shadow-gold-glow"
          >
            {outcomeLabel}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DuelWheel
