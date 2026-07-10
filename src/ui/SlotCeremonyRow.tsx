/**
 * SlotCeremonyRow — one row of the Reckoning ceremony walkthrough strip.
 *
 * Layout mirrors mockups/07c-masquerade-reckoning-v3.html:
 *   [ Roman seat badge ] [ Italian/Korean name + card thumbnail ] [ chips + winner tag ]
 *
 * Rows have three visual states, matching the mockup:
 *   - `locked`   : not yet revealed (blurred, "미공개" italics on subtotal)
 *   - `active`   : currently being announced (gold glow, pulse, chips fade in)
 *   - `dim`      : already announced, subtotal shown
 *
 * The parent (ReckoningScene) sequences an index-based cursor that walks I..VIII
 * every ~1.5s, flipping each row's state through locked → active → dim.
 */

import { motion } from 'framer-motion'
import type React from 'react'

import CardPortrait from './CardPortrait.tsx'
import type { Card, Player, SlotState } from '../game/types.ts'
import { SEATS } from '../game/types.ts'

export type SlotRowVisual = 'locked' | 'active' | 'dim'

export type SlotChipKind =
  | 'surface'
  | 'buff'
  | 'event'
  | 'combo'
  | 'identity'
  | 'alliance'
  | 'penalty'

export type SlotChip = {
  kind: SlotChipKind
  label: string
  value: number
}

export type SlotWinnerTag =
  | { kind: 'me'; amount: number }
  | { kind: 'opp'; amount: number; opponentName: string }
  | { kind: 'alliance'; myAmount: number; oppAmount: number; opponentName: string }
  | { kind: 'empty' }

export type SlotCeremonyRowProps = {
  seatIndex: number  // 0..7
  slot: SlotState
  visual: SlotRowVisual
  chips: SlotChip[]
  winner: SlotWinnerTag
  /** Running subtotals to render under the winner tag when dim/active. */
  runningMe: number
  runningOpp: number
}

const chipStyles: Record<SlotChipKind, string> = {
  surface:
    'bg-parch-cream/40 border-gold/40 text-cocoa',
  buff:
    'bg-gold-soft/25 border-gold/60 text-gold',
  event:
    'bg-lavender/25 border-lavender/60 text-lavender-deep',
  combo:
    'bg-canal-blue/25 border-canal-blue/60 text-canal-blue',
  identity:
    'bg-sage/25 border-sage/60 text-sage',
  alliance:
    'bg-lavender/30 border-lavender/70 text-lavender-deep font-bold',
  penalty:
    'bg-rose-deep/25 border-rose-light/60 text-rose-light',
}

export function SlotCeremonyRow(props: SlotCeremonyRowProps): React.JSX.Element {
  const { seatIndex, slot, visual, chips, winner, runningMe, runningOpp } = props
  const seat = SEATS[seatIndex]
  const roman = toRoman(seatIndex + 1)

  const wrapBase =
    'relative grid items-center gap-2 px-2.5 py-2 rounded-md border transition-all duration-300'
  const wrapVariant =
    visual === 'active'
      ? 'border-gold-soft bg-gradient-to-b from-gold-soft/25 to-gold-soft/10'
      : visual === 'dim'
        ? 'border-gold/30 bg-gradient-to-b from-parch-cream/8 to-parch-cream/3 opacity-70'
        : 'border-cocoa/25 bg-gradient-to-b from-cocoa/15 to-cocoa/5 opacity-55'

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        boxShadow:
          visual === 'active'
            ? '0 0 0 2px rgba(232,213,183,0.4), 0 0 22px rgba(232,213,183,0.55)'
            : '0 0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.35 }}
      className={`${wrapBase} ${wrapVariant}`}
      style={{ gridTemplateColumns: '28px 78px 1fr' }}
    >
      {/* Seat badge */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={
            visual === 'active'
              ? 'font-display font-bold text-[16px] text-rose-light leading-none'
              : 'font-display font-bold text-[14px] text-gold-soft/85 leading-none'
          }
          style={
            visual === 'active'
              ? { textShadow: '0 0 8px rgba(232,213,183,0.7)' }
              : undefined
          }
        >
          {roman}
        </div>
        <div className="font-mono text-[6.5px] tracking-[0.14em] text-parch-cream/40 leading-none">
          {visual === 'active' ? '// 지금' : `S·${seatIndex + 1}`}
        </div>
      </div>

      {/* Seat name + card thumb(s) */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-col leading-tight">
          <span className="font-serif italic font-semibold text-[11px] text-parch-cream leading-none whitespace-nowrap overflow-hidden text-ellipsis">
            {seat.italian}
          </span>
          <span className="font-mono text-[7px] tracking-widest text-gold-soft/60 leading-tight">
            {seat.korean}
          </span>
        </div>
        <SlotThumb slot={slot} visual={visual} />
      </div>

      {/* Chips + winner tag */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap gap-1">
          {visual === 'locked' ? (
            <div className="italic font-serif text-[10px] text-parch-cream/40 tracking-wide blur-[1px]">
              미공개 · sotto la maschera
            </div>
          ) : (
            chips.map((chip, i) => (
              <motion.span
                key={`${chip.kind}-${chip.label}-${i}`}
                initial={
                  visual === 'active' ? { opacity: 0, y: 3 } : { opacity: 0.85 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: visual === 'active' ? 0.15 + i * 0.14 : 0,
                  duration: 0.35,
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border font-mono text-[8px] tracking-wide whitespace-nowrap ${chipStyles[chip.kind]}`}
              >
                {chip.value >= 0 ? '+' : ''}
                {chip.value} · {chip.label}
              </motion.span>
            ))
          )}
        </div>

        {/* Winner tag row */}
        <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-gold/25 border-dashed">
          <WinnerTag tag={winner} visual={visual} />
          <div className="font-mono text-[7px] tracking-[0.16em] text-parch-cream/45 uppercase">
            {visual === 'locked'
              ? '// 미공개'
              : `Sum · ${runningMe} / ${runningOpp}`}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────── SlotThumb ── */

function SlotThumb({
  slot,
  visual,
}: {
  slot: SlotState
  visual: SlotRowVisual
}) {
  const blur = visual === 'locked' ? 'blur-[2px] opacity-70' : ''

  if (slot.alliance) {
    return (
      <div className={`relative w-[68px] h-[54px] ${blur}`}>
        <div className="absolute left-0 top-1 rotate-[-6deg]">
          <MiniCard card={slot.alliance.me} owner="me" />
        </div>
        <div className="absolute right-0 top-1 rotate-[6deg] z-10">
          <MiniCard card={slot.alliance.opponent} owner="opponent" />
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-[11px]"
          style={{ filter: 'drop-shadow(0 0 4px rgba(190,160,200,0.85))' }}
        >
          💜
        </div>
      </div>
    )
  }

  if (slot.placement) {
    return (
      <div className={`w-[38px] ${blur}`}>
        <MiniCard
          card={slot.placement.card}
          owner={slot.placement.owner}
        />
      </div>
    )
  }

  // Empty
  return (
    <div
      className={`w-[38px] h-[50px] rounded border border-dashed border-parch-cream/25 flex items-center justify-center ${blur}`}
    >
      <span className="font-mono text-[8px] text-parch-cream/30 tracking-widest">
        ∅
      </span>
    </div>
  )
}

function MiniCard({
  card,
  owner,
}: {
  card: Card
  owner: Player
}) {
  return (
    <div
      className="relative"
      style={{ transform: 'scale(0.72)', transformOrigin: 'top left' }}
    >
      <CardPortrait card={card} size="sm" ownership={owner} />
    </div>
  )
}

/* ─────────────────────────────────────────────── WinnerTag ── */

function WinnerTag({
  tag,
  visual,
}: {
  tag: SlotWinnerTag
  visual: SlotRowVisual
}) {
  if (tag.kind === 'empty') {
    return (
      <span className="font-serif italic text-[10px] text-parch-cream/35">
        빈 자리 · vacante
      </span>
    )
  }

  const emphasis =
    visual === 'active'
      ? 'font-serif italic font-bold text-[12px]'
      : 'font-serif italic font-semibold text-[11px]'

  if (tag.kind === 'me') {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className={`${emphasis} text-gold-soft`}>나</span>
        <span
          className="font-display font-bold text-[13px] text-gold-soft"
          style={{
            textShadow: visual === 'active' ? '0 0 6px rgba(232,213,183,0.7)' : undefined,
          }}
        >
          +{tag.amount}
        </span>
      </span>
    )
  }

  if (tag.kind === 'opp') {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className={`${emphasis} text-silver-soft`}>{tag.opponentName}</span>
        <span className="font-display font-bold text-[13px] text-silver-soft">
          +{tag.amount}
        </span>
      </span>
    )
  }

  // alliance
  return (
    <span className="flex items-baseline gap-1.5 flex-wrap">
      <span className={`${emphasis} text-lavender`}>
        동맹 · 나 / {tag.opponentName}
      </span>
      <span className="font-display font-bold text-[11px] text-lavender">
        +{tag.myAmount} / +{tag.oppAmount}
      </span>
    </span>
  )
}

/* ─────────────────────────────────────────────── util ── */

function toRoman(n: number): string {
  const roman: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV',
    5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII',
  }
  return roman[n] ?? String(n)
}
