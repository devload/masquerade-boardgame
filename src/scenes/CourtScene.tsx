/**
 * CourtScene — the core in-match screen.
 *
 * Top bar: round (Roman) + phase label. Middle: 8-seat 2x4 grid where the
 * player picks a seat. Bottom: 5-card hand + a fixed COMMIT bar that lights
 * up once both a card and a seat are selected. After confirm, the AI stub
 * commits, the reveal is dispatched, and the store decides where to route.
 */

import { useEffect } from 'react'

import { nextRound } from '../game/match.ts'
import { SEATS } from '../game/types.ts'
import type { SlotState } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'
import { CardFace } from '../ui/CardFace.tsx'
import { NightAmbience } from '../ui/NightAmbience.tsx'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

const IDENTITY_EMOJI = {
  Royalty: '👑',
  Thief: '🗡',
  Scholar: '📚',
  Hunter: '🏹',
  Mystic: '🔮',
} as const

export function CourtScene() {
  const match = useMatchStore((s) => s.match)
  const selectedCardId = useMatchStore((s) => s.selectedCardId)
  const selectedSeat = useMatchStore((s) => s.selectedSeat)
  const selectCard = useMatchStore((s) => s.selectCard)
  const selectSeat = useMatchStore((s) => s.selectSeat)
  const confirmCommit = useMatchStore((s) => s.confirmCommit)
  const playAI = useMatchStore((s) => s.playAIOpponent)
  const revealAndAdvance = useMatchStore((s) => s.revealAndAdvance)

  // Auto-advance once we're in the 'reveal' or 'draw' phases. A short delay
  // gives the human a moment to register the placement animation before the
  // next commit round starts.
  useEffect(() => {
    if (!match) return
    if (match.phase === 'reveal') {
      const t = setTimeout(() => revealAndAdvance(), 500)
      return () => clearTimeout(t)
    }
    if (match.phase === 'draw') {
      // Transition into the next round's commit phase.
      const t = setTimeout(() => {
        const { match: cur } = useMatchStore.getState()
        if (!cur) return
        const advanced = nextRound(cur)
        useMatchStore.setState((s) => {
          s.match = advanced
          if (advanced.phase === 'unmasking') s.scene = 'unmasking'
          else if (advanced.phase === 'reckoning') s.scene = 'reckoning'
        })
      }, 400)
      return () => clearTimeout(t)
    }
    return
  }, [match, revealAndAdvance])

  if (!match) return null

  const myHand = match.players.me.hand
  const bothCommitted = !!match.tempCommits.me && !!match.tempCommits.opponent
  const canCommit =
    match.phase === 'commit' && selectedCardId != null && selectedSeat != null

  const phaseLabel =
    match.phase === 'commit'
      ? 'COMMIT'
      : match.phase === 'reveal'
        ? 'REVEAL'
        : match.phase === 'draw'
          ? 'DRAW'
          : match.phase.toUpperCase()

  const handleCommit = () => {
    confirmCommit()
    // Fire the AI's commit and reveal in the next tick so the domain sees
    // the human's commit already stored.
    setTimeout(() => {
      playAI()
      // If both commits are now present, request the reveal.
      const { match: after } = useMatchStore.getState()
      if (after && after.tempCommits.me && after.tempCommits.opponent) {
        revealAndAdvance()
      }
    }, 0)
  }

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="dim" showFlourishes={false} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[9px] tracking-[0.35em] text-gold-soft/70 uppercase">
            Round
          </span>
          <span className="font-display text-parch-cream text-lg tracking-widest">
            {ROMAN[match.round - 1] || match.round}
          </span>
          <span className="font-mono text-[9px] tracking-[0.25em] text-parch-cream/40">
            /{ROMAN[7]}
          </span>
        </div>
        <div
          className="px-2.5 py-1 rounded-sm border border-gold-soft/30 bg-lavender-deep/40 backdrop-blur-sm
                     font-mono text-[9px] tracking-[0.35em] text-gold-soft/85 uppercase"
        >
          {phaseLabel}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-parch-cream/60">
          <span>나 {myHand.length}</span>
          <span className="text-parch-cream/30">·</span>
          <span>상대 {match.players.opponent.hand.length}</span>
        </div>
      </div>

      {/* Event banner slot (empty for now — R3/R6 to be wired later) */}
      <div className="relative z-10 h-2" />

      {/* Court grid */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-3">
        <div className="grid grid-cols-4 gap-2 w-full max-w-[400px]">
          {match.court.map((slot) => (
            <SeatCell
              key={slot.seat}
              slot={slot}
              selected={selectedSeat === slot.seat}
              canSelect={match.phase === 'commit' && !bothCommitted}
              onSelect={() =>
                selectSeat(selectedSeat === slot.seat ? null : slot.seat)
              }
            />
          ))}
        </div>
      </div>

      {/* Hand */}
      <div className="relative z-10 px-3 pb-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="w-6 h-px bg-gold-soft/30" />
          <span className="font-mono text-[8px] tracking-[0.35em] text-gold-soft/60 uppercase">
            La Mano
          </span>
          <span className="flex-1 h-px bg-gold-soft/15" />
        </div>
        <div className="flex justify-center gap-1.5">
          {myHand.map((card) => (
            <CardFace
              key={card.id}
              card={card}
              size="md"
              selected={selectedCardId === card.id}
              onClick={
                match.phase === 'commit' && !bothCommitted
                  ? () => selectCard(selectedCardId === card.id ? null : card.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Commit action bar */}
      <div className="relative z-10 px-4 pb-safe pb-3 pt-2">
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className={`w-full py-2.5 rounded-md font-display tracking-[0.3em] text-[11px] uppercase
                      border transition-all active:scale-[0.98]
                      ${
                        canCommit
                          ? 'border-gold-soft/70 text-parch-cream bg-gradient-to-b from-gold-soft/25 to-rose-deep/25 shadow-gold-glow'
                          : 'border-parch-cream/10 text-parch-cream/25 bg-black/20 cursor-not-allowed'
                      }`}
        >
          Commit ✦ 봉인
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────── Seat cell ── */

type SeatCellProps = {
  slot: SlotState
  selected: boolean
  canSelect: boolean
  onSelect: () => void
}

function SeatCell({ slot, selected, canSelect, onSelect }: SeatCellProps) {
  const seatMeta = SEATS[slot.seat - 1]
  const isEmpty = !slot.placement && !slot.alliance && !slot.pending
  const clickable = canSelect && isEmpty

  const borderClass = selected
    ? 'border-gold-soft shadow-gold-glow'
    : slot.pending
      ? 'border-rose-deep/70 animate-pulse'
      : slot.alliance
        ? 'border-lavender/70'
        : slot.placement
          ? slot.placement.owner === 'me'
            ? 'border-gold-soft/60'
            : 'border-silver/60'
          : 'border-parch-cream/15'

  return (
    <button
      onClick={clickable ? onSelect : undefined}
      disabled={!clickable}
      className={`relative rounded-md p-1.5 aspect-[2/3] border ${borderClass}
                  bg-black/30 backdrop-blur-sm text-left
                  ${clickable ? 'active:scale-95 transition-transform' : ''}`}
    >
      {/* Header: seat name + bonus */}
      <div className="flex flex-col leading-tight">
        <span className="font-display text-[8px] tracking-[0.15em] text-gold-soft/85 truncate">
          {seatMeta.italian}
        </span>
        <span className="font-serif italic text-[7px] text-parch-cream/50 truncate">
          {seatMeta.korean}
        </span>
      </div>

      {/* Middle: favored identity + bonus */}
      <div className="mt-1 flex items-center justify-between px-0.5">
        <span className="emoji text-[10px]">{IDENTITY_EMOJI[seatMeta.favors]}</span>
        <span className="font-mono text-[8px] text-gold-soft/70">+{seatMeta.bonus}</span>
      </div>

      {/* Slot content */}
      <div className="absolute inset-x-1 bottom-1 h-[54%] flex items-center justify-center">
        {slot.placement && (
          <div className="scale-[0.62]">
            <CardFace card={slot.placement.card} size="md" />
          </div>
        )}
        {slot.alliance && (
          <div className="flex gap-0.5 scale-[0.5]">
            <CardFace card={slot.alliance.me} size="md" />
            <CardFace card={slot.alliance.opponent} size="md" />
          </div>
        )}
        {slot.pending && (
          <div className="text-[9px] font-mono text-rose-light tracking-widest">⚔ ?</div>
        )}
        {isEmpty && (
          <div className="text-[8px] font-serif italic text-parch-cream/25">
            {selected ? '선택됨' : '비어있음'}
          </div>
        )}
      </div>
    </button>
  )
}
