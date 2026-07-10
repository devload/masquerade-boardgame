/**
 * ReckoningScene — end-of-match ceremony.
 *
 * Five-phase sceneography, sequenced through local phase state + timeouts:
 *
 *   Phase 1 · Overture (~1.5s)
 *     Full backdrop, MEZZANOTTE-style "RECKONING" grand title.
 *
 *   Phase 2 · Walkthrough (~12s = 1.5s × 8)
 *     Sticky rolling scoreboard header (나 / rival) + vertical Seat I..VIII
 *     ceremony strip. A cursor advances every 1.5s, flipping rows from
 *     `locked` → `active` → `dim`. Chips fade in one-by-one on the active row.
 *
 *   Phase 3 · Combo toast (during Phase 2 tail)
 *     A per-player combo tally slides in as a floating card.
 *
 *   Phase 4 · Exile pile (~2.5s)
 *     Exile card fans for both players, `applyRuin()` visual halving if either
 *     hits EXILE_LIMIT, and a rose "몰락 · IL CROLLO" banner.
 *
 *   Phase 5 · Final tally (holds)
 *     Two big Cinzel numbers with a `vs`, winner banner with laurel wreath,
 *     CTA buttons ("다시 도전" / "무도회 돌아가기") + a ghost "결과 공유" button.
 *
 * A "SKIP ▸" button in the top-right jumps straight to Phase 5.
 *
 * Only reads the store (`match`, `brain`, difficulty). Dispatches `startMatch`
 * (with same difficulty) and `resetToLobby` on CTA. No store-shape mutations.
 */

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { RULES } from '../game/match.ts'
import { applyRuin, scorePlayer } from '../game/scoring.ts'
import type {
  Card,
  MatchState,
  Player,
  ScoreBreakdown,
  SlotState,
} from '../game/types.ts'
import { IDENTITY_LABEL, SEATS } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'
import { LaurelWreath } from '../ui/LaurelWreath.tsx'
import { NightAmbience } from '../ui/NightAmbience.tsx'
import { ScoreCounter } from '../ui/ScoreCounter.tsx'
import {
  SlotCeremonyRow,
  type SlotChip,
  type SlotRowVisual,
  type SlotWinnerTag,
} from '../ui/SlotCeremonyRow.tsx'

type CeremonyPhase = 'overture' | 'walkthrough' | 'exile' | 'final'

// Timings (ms)
const OVERTURE_MS = 1500
const PER_SLOT_MS = 1500
const EXILE_MS = 2500

export function ReckoningScene() {
  const match = useMatchStore((s) => s.match)
  const brain = useMatchStore((s) => s.brain)
  const difficulty = useMatchStore((s) => s.difficulty)
  const startMatch = useMatchStore((s) => s.startMatch)
  const resetToLobby = useMatchStore((s) => s.resetToLobby)

  const [phase, setPhase] = useState<CeremonyPhase>('overture')
  /** 0..7 during walkthrough — which slot is being announced right now. */
  const [cursor, setCursor] = useState<number>(0)

  // ── Phase orchestration ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'overture') return
    const t = setTimeout(() => setPhase('walkthrough'), OVERTURE_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'walkthrough') return
    if (cursor >= 8) {
      const t = setTimeout(() => setPhase('exile'), PER_SLOT_MS * 0.6)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCursor((c) => c + 1), PER_SLOT_MS)
    return () => clearTimeout(t)
  }, [phase, cursor])

  useEffect(() => {
    if (phase !== 'exile') return
    const t = setTimeout(() => setPhase('final'), EXILE_MS)
    return () => clearTimeout(t)
  }, [phase])

  const skipToFinal = () => {
    setCursor(8)
    setPhase('final')
  }

  if (!match) {
    return (
      <div className="w-full h-full relative flex items-center justify-center">
        <NightAmbience intensity="full" />
      </div>
    )
  }

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="full" showFlourishes={false} />
      {/* Vignette overlay for cutscene drama */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* Top candle glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 pointer-events-none z-[1] animate-candle-a"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(232,213,183,0.28) 0%, transparent 70%)',
        }}
      />

      {/* Skip button */}
      {phase !== 'final' && (
        <button
          onClick={skipToFinal}
          className="absolute top-4 right-4 z-30 pt-safe
                     px-3 py-1 rounded-full border border-gold-soft/30
                     font-mono text-[9px] tracking-[0.3em] text-gold-soft/60 uppercase
                     hover:text-parch-cream hover:border-gold-soft/60 transition"
        >
          Skip ▸
        </button>
      )}

      <AnimatePresence mode="wait">
        {phase === 'overture' && <OverturePanel key="overture" />}
        {(phase === 'walkthrough' ||
          phase === 'exile' ||
          phase === 'final') && (
          <CeremonyPanel
            key="ceremony"
            match={match}
            phase={phase}
            cursor={cursor}
            opponentName={brain.name}
            onPlayAgain={() => {
              startMatch(undefined, difficulty)
            }}
            onReturnLobby={resetToLobby}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Phase 1 · Overture                                                  */
/* ═══════════════════════════════════════════════════════════════════ */

function OverturePanel() {
  return (
    <motion.div
      key="overture"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-6"
    >
      <div className="flex items-center gap-3 opacity-80">
        <span className="w-10 h-px bg-gold-soft/50" />
        <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/70 uppercase">
          Il Bilancio · Chapter III
        </span>
        <span className="w-10 h-px bg-gold-soft/50" />
      </div>

      <motion.h1
        initial={{ opacity: 0, scale: 0.85, letterSpacing: '0.5em' }}
        animate={{ opacity: 1, scale: 1, letterSpacing: '0.28em' }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="font-display font-bold text-parch-cream text-[38px] leading-none"
        style={{
          textShadow:
            '0 0 32px rgba(232,213,183,0.55), 0 0 60px rgba(244,228,200,0.28), 0 2px 12px rgba(139,58,74,0.5)',
        }}
      >
        RECKONING
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="text-center"
      >
        <div className="font-serif italic text-[15px] text-gold-soft/80 tracking-wide">
          "밤이 저물고, 진실이 밝혀진다."
        </div>
        <div className="mt-3 font-display text-rose-light/70 text-[13px] tracking-widest">
          ✦
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Phases 2 · 3 · 4 · 5 · Ceremony panel                                */
/* ═══════════════════════════════════════════════════════════════════ */

type CeremonyPanelProps = {
  match: MatchState
  phase: 'walkthrough' | 'exile' | 'final'
  cursor: number  // 0..8 (8 = walkthrough finished)
  opponentName: string
  onPlayAgain: () => void
  onReturnLobby: () => void
}

function CeremonyPanel({
  match,
  phase,
  cursor,
  opponentName,
  onPlayAgain,
  onReturnLobby,
}: CeremonyPanelProps) {
  // ── Compute per-slot breakdowns ONCE (memoized) ────────────
  const slotBreakdowns = useMemo(
    () => computeAllSlotBreakdowns(match),
    [match],
  )

  // Total (raw) breakdowns for both players.
  const rawMe = useMemo(() => scorePlayer(match, 'me'), [match])
  const rawOpp = useMemo(() => scorePlayer(match, 'opponent'), [match])

  const meExileCount = match.players.me.exile.length
  const oppExileCount = match.players.opponent.exile.length
  const meRuined = meExileCount >= RULES.EXILE_LIMIT
  const oppRuined = oppExileCount >= RULES.EXILE_LIMIT

  const finalMe = useMemo(() => applyRuin(rawMe, meExileCount), [rawMe, meExileCount])
  const finalOpp = useMemo(
    () => applyRuin(rawOpp, oppExileCount),
    [rawOpp, oppExileCount],
  )

  // Running totals up to `cursor` slots processed.
  // Include exile penalty into breakdown display only in phase >= 'exile'.
  const includeExile = phase !== 'walkthrough'
  const includeCombo = cursor >= 8

  const runningMe = useMemo(
    () => runningTotal(slotBreakdowns, 'me', cursor, includeCombo ? rawMe.combo : 0, includeExile ? rawMe.exile : 0, meRuined && phase === 'final'),
    [slotBreakdowns, cursor, includeCombo, rawMe.combo, includeExile, rawMe.exile, meRuined, phase],
  )
  const runningOpp = useMemo(
    () => runningTotal(slotBreakdowns, 'opponent', cursor, includeCombo ? rawOpp.combo : 0, includeExile ? rawOpp.exile : 0, oppRuined && phase === 'final'),
    [slotBreakdowns, cursor, includeCombo, rawOpp.combo, includeExile, rawOpp.exile, oppRuined, phase],
  )

  // Combo toast: show while cursor is near end of walkthrough (>=6) and until exile phase
  const showComboToast =
    (phase === 'walkthrough' && cursor >= 6) || phase === 'exile'

  return (
    <motion.div
      key="ceremony"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 flex-1 flex flex-col overflow-hidden"
    >
      {/* Grand title (compact for the ceremony panel) */}
      <div className="pt-safe pt-4 px-4 pb-2 text-center flex-shrink-0">
        <div className="flex items-center justify-center gap-2 opacity-70 mb-1">
          <span className="w-6 h-px bg-gold-soft/50" />
          <span className="font-mono text-[8px] tracking-[0.4em] text-gold-soft/70 uppercase">
            Reckoning · Il Verdetto
          </span>
          <span className="w-6 h-px bg-gold-soft/50" />
        </div>
        <h1
          className="font-display font-bold text-parch-cream tracking-[0.24em] text-[18px] leading-none"
          style={{
            textShadow:
              '0 0 18px rgba(232,213,183,0.45), 0 0 34px rgba(244,228,200,0.22)',
          }}
        >
          MEZZANOTTE
        </h1>
      </div>

      {/* Sticky scoreboard header */}
      <div className="px-3 pb-2 flex-shrink-0">
        <ScoreboardHeader
          myScore={runningMe}
          oppScore={runningOpp}
          opponentName={opponentName}
          meRuined={meRuined && phase === 'final'}
          oppRuined={oppRuined && phase === 'final'}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 flex items-center gap-2 mb-2 flex-shrink-0">
        <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/50 to-gold/40" />
        <span className="font-mono text-[7px] tracking-[0.3em] text-gold-soft/60 uppercase">
          Il Conteggio · 자리별 정산
        </span>
        <span className="flex-1 h-px bg-gradient-to-l from-transparent via-gold/50 to-gold/40" />
      </div>

      {/* Scroll region: ceremony strip + exile block + final tally */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 relative">
        {/* Ceremony strip */}
        <div className="flex flex-col gap-1.5">
          {match.court.map((slot, i) => {
            const visual = rowVisualFor(i, cursor)
            const sb = slotBreakdowns[i]
            return (
              <SlotCeremonyRow
                key={i}
                seatIndex={i}
                slot={slot}
                visual={visual}
                chips={sb.chips}
                winner={sb.winner(opponentName)}
                runningMe={sb.runningMeAt}
                runningOpp={sb.runningOppAt}
              />
            )
          })}
        </div>

        {/* Floating combo toast (Phase 3) */}
        <AnimatePresence>
          {showComboToast && (rawMe.combo > 0 || rawOpp.combo > 0) && (
            <ComboToast
              meCombo={rawMe.combo}
              oppCombo={rawOpp.combo}
              opponentName={opponentName}
            />
          )}
        </AnimatePresence>

        {/* Phase 4 · Exile block */}
        <AnimatePresence>
          {(phase === 'exile' || phase === 'final') && (
            <ExileBlock
              meExile={match.players.me.exile}
              oppExile={match.players.opponent.exile}
              meRuined={meRuined}
              oppRuined={oppRuined}
              opponentName={opponentName}
            />
          )}
        </AnimatePresence>

        {/* Phase 5 · Final tally */}
        <AnimatePresence>
          {phase === 'final' && (
            <FinalTally
              me={finalMe}
              opp={finalOpp}
              opponentName={opponentName}
              onPlayAgain={onPlayAgain}
              onReturnLobby={onReturnLobby}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scoreboard header                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

type ScoreboardHeaderProps = {
  myScore: number
  oppScore: number
  opponentName: string
  meRuined: boolean
  oppRuined: boolean
}

function ScoreboardHeader({
  myScore,
  oppScore,
  opponentName,
  meRuined,
  oppRuined,
}: ScoreboardHeaderProps) {
  return (
    <div className="relative flex items-stretch gap-2">
      <PortraitCard
        label="나"
        role="La Casa d'Oro"
        maskEmoji="🦋"
        score={myScore}
        variant="me"
        ruined={meRuined}
      />
      <PortraitCard
        label={opponentName}
        role="L'Avversario"
        maskEmoji="🎭"
        score={oppScore}
        variant="opp"
        ruined={oppRuined}
      />
      {/* VS badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className="font-display font-bold text-[10px] tracking-[0.16em] text-rose-deep px-1.5 py-0.5 rounded-sm border border-rose-deep/50 bg-parch-cream/80"
          style={{ boxShadow: '0 0 10px rgba(232,213,183,0.5)' }}
        >
          VS
        </div>
      </div>
    </div>
  )
}

function PortraitCard({
  label,
  role,
  maskEmoji,
  score,
  variant,
  ruined,
}: {
  label: string
  role: string
  maskEmoji: string
  score: number
  variant: 'me' | 'opp'
  ruined: boolean
}) {
  const isMe = variant === 'me'
  return (
    <div
      className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-md border ${
        isMe
          ? 'border-gold/50 bg-gradient-to-b from-gold-soft/25 to-gold-soft/8'
          : 'border-silver/50 bg-gradient-to-b from-silver-soft/20 to-silver/8'
      } ${ruined ? 'opacity-60' : ''}`}
      style={{
        boxShadow: isMe
          ? '0 4px 12px rgba(196,139,110,0.28), inset 0 1px 0 rgba(255,245,220,0.4)'
          : '0 4px 12px rgba(120,120,120,0.28), inset 0 1px 0 rgba(255,255,255,0.3)',
      }}
    >
      <div
        className={`w-10 h-10 flex items-center justify-center rounded text-xl flex-shrink-0 ${
          isMe ? 'bg-parch-cream/70' : 'bg-silver-soft/50'
        }`}
        style={{
          boxShadow: `inset 0 0 0 1.5px ${isMe ? '#c48b6e' : '#c0c0c0'}`,
        }}
      >
        {maskEmoji}
      </div>
      <div className="flex flex-col min-w-0 leading-tight">
        <div className="font-serif italic font-bold text-[12px] text-parch-cream truncate">
          {label}
        </div>
        <div className="font-mono text-[6.5px] tracking-widest text-parch-cream/45 uppercase">
          // {role}
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className="font-mono text-[6.5px] tracking-widest text-parch-cream/50 uppercase">
          Totale
        </div>
        <ScoreCounter
          value={score}
          duration={0.7}
          className={`font-display font-bold text-[24px] leading-none block ${
            isMe ? 'text-gold-soft' : 'text-silver-soft'
          }`}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Combo toast (Phase 3)                                                */
/* ═══════════════════════════════════════════════════════════════════ */

type ComboToastProps = {
  meCombo: number
  oppCombo: number
  opponentName: string
}

function ComboToast({ meCombo, oppCombo, opponentName }: ComboToastProps) {
  const items: { icon: string; who: string; label: string; value: number; owner: 'me' | 'opp' }[] = []
  if (meCombo > 0) {
    items.push({
      icon: '👑',
      who: '나',
      label: '왕궁 콤보',
      value: meCombo,
      owner: 'me',
    })
  }
  if (oppCombo > 0) {
    items.push({
      icon: '🎭',
      who: opponentName,
      label: '왕궁 콤보',
      value: oppCombo,
      owner: 'opp',
    })
  }
  if (items.length === 0) return null

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.4 }}
      className="absolute right-2 top-6 w-[150px] p-2.5 rounded-lg border border-gold z-20"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,245,220,0.94) 0%, rgba(232,213,183,0.8) 100%)',
        boxShadow:
          '0 0 0 1px rgba(232,213,183,0.6), 0 8px 22px rgba(91,70,54,0.4), 0 0 24px rgba(232,213,183,0.6)',
      }}
    >
      <div className="flex items-center justify-center gap-1 pb-1.5 mb-1.5 border-b border-gold/40">
        <span className="text-[7px] opacity-70">✦</span>
        <span className="font-display font-bold text-[9px] tracking-[0.18em] text-gold">
          COMBO
        </span>
        <span className="text-[7px] opacity-70">✦</span>
      </div>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.15, duration: 0.35 }}
          className={`flex items-center gap-1.5 py-1 ${
            i > 0 ? 'border-t border-gold/25 border-dashed' : ''
          }`}
        >
          <div className="text-[13px] w-4 text-center">{item.icon}</div>
          <div className="flex-1 flex flex-col leading-tight">
            <div className="font-serif italic font-semibold text-[9px] text-cocoa">
              {item.label}
            </div>
            <div className="font-mono text-[6.5px] text-cocoa-light tracking-wide">
              {item.who}
            </div>
          </div>
          <div
            className={`font-display font-bold text-[11px] ${
              item.owner === 'me' ? 'text-gold' : 'text-cocoa-light'
            }`}
          >
            +{item.value}
          </div>
        </motion.div>
      ))}
    </motion.aside>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Exile block (Phase 4)                                                */
/* ═══════════════════════════════════════════════════════════════════ */

type ExileBlockProps = {
  meExile: Card[]
  oppExile: Card[]
  meRuined: boolean
  oppRuined: boolean
  opponentName: string
}

function ExileBlock({
  meExile,
  oppExile,
  meRuined,
  oppRuined,
  opponentName,
}: ExileBlockProps) {
  const anyRuined = meRuined || oppRuined
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mt-4 mb-2 px-3 py-3 rounded-lg border border-rose-light/40"
      style={{
        background:
          'linear-gradient(180deg, rgba(139,58,74,0.14) 0%, rgba(139,58,74,0.05) 100%)',
      }}
    >
      {/* Skull marker */}
      <div
        className="absolute -top-2 left-3 px-1.5 bg-parch-cream/85 text-rose-deep text-[12px] leading-none rounded"
        style={{ letterSpacing: '0.1em' }}
      >
        ☠
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="font-serif italic font-bold text-[12px] text-rose-light tracking-wide">
          Il Banco degli Esiliati
        </span>
        <span className="font-mono text-[7px] tracking-[0.16em] text-rose-light/70 uppercase">
          추방석 · Exiles
        </span>
      </div>

      <div className="flex gap-3">
        <ExilePile
          label="나"
          cards={meExile}
          ownerVariant="me"
        />
        <ExilePile
          label={opponentName}
          cards={oppExile}
          ownerVariant="opp"
        />
      </div>

      <AnimatePresence>
        {anyRuined && (
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-3 -mx-3 px-3 py-2 text-center"
            style={{
              background:
                'linear-gradient(90deg, rgba(139,58,74,0.75) 0%, rgba(139,58,74,0.45) 60%, transparent 100%)',
              boxShadow: '0 4px 16px rgba(139,58,74,0.4)',
            }}
          >
            <div
              className="font-display font-bold text-parch-cream tracking-[0.2em] text-[14px]"
              style={{ textShadow: '0 0 12px rgba(0,0,0,0.5)' }}
            >
              몰락 · IL CROLLO
            </div>
            <div className="font-mono text-[8px] text-parch-cream/70 tracking-widest uppercase mt-0.5">
              총점 반토막 · half score enforced
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ExilePile({
  label,
  cards,
  ownerVariant,
}: {
  label: string
  cards: Card[]
  ownerVariant: 'me' | 'opp'
}) {
  const count = cards.length
  const penalty = count === 0 ? 0 : count * RULES.EXILE_PENALTY
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <div className="font-mono text-[7px] tracking-widest text-parch-cream/50 uppercase">
        // {label}
      </div>
      <div className="flex gap-1 items-end min-h-[36px]">
        {cards.length === 0 ? (
          <span className="italic font-serif text-[10px] text-parch-cream/40">
            없음 · nessuno
          </span>
        ) : (
          cards.slice(0, 6).map((_c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6, rotate: -12 }}
              animate={{ opacity: 1, y: 0, rotate: (i - cards.length / 2) * 4 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              className={`relative w-5 h-7 rounded-sm ${
                ownerVariant === 'me'
                  ? 'border border-rose-light/60'
                  : 'border border-silver/50'
              } bg-parch-warm flex items-center justify-center overflow-hidden`}
              style={{
                filter: 'grayscale(0.5) brightness(0.85)',
                boxShadow: '0 2px 4px rgba(139,58,74,0.35)',
              }}
            >
              <span className="text-[9px] opacity-80">🎭</span>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(139,58,74,0.14) 0%, rgba(139,58,74,0.42) 100%)',
                }}
              />
            </motion.div>
          ))
        )}
      </div>
      <div className="font-display font-bold text-[11px] text-rose-light">
        {count} 장
        {count > 0 && (
          <span className="font-mono text-[8px] text-rose-light/80 ml-1.5 tracking-wide">
            {penalty > 0 ? '+' : ''}
            {penalty} ({count} × {RULES.EXILE_PENALTY})
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Final tally (Phase 5)                                                */
/* ═══════════════════════════════════════════════════════════════════ */

type FinalTallyProps = {
  me: ScoreBreakdown
  opp: ScoreBreakdown
  opponentName: string
  onPlayAgain: () => void
  onReturnLobby: () => void
}

function FinalTally({
  me,
  opp,
  opponentName,
  onPlayAgain,
  onReturnLobby,
}: FinalTallyProps) {
  const meWon = me.total > opp.total
  const oppWon = opp.total > me.total
  const tie = me.total === opp.total

  const winnerLine = tie
    ? '무승부 · IL PATTO'
    : meWon
      ? '나의 승리 · La Vittoria'
      : `${opponentName} 승리 · La Sconfitta`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-4 mb-6 px-4 py-4 rounded-xl border-[1.5px] border-gold text-center"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 50% 30%, rgba(255,245,220,0.35) 0%, transparent 70%), linear-gradient(180deg, rgba(232,213,183,0.32) 0%, rgba(196,139,110,0.16) 100%)',
        boxShadow:
          '0 0 0 1px rgba(232,213,183,0.6), 0 8px 24px rgba(91,70,54,0.5), inset 0 1px 0 rgba(255,245,220,0.4)',
      }}
    >
      {/* Corner ornaments */}
      <span className="absolute top-2 left-3 font-display text-gold-soft text-[11px] opacity-85">
        ✦
      </span>
      <span className="absolute top-2 right-3 font-display text-gold-soft text-[11px] opacity-85">
        ✦
      </span>

      {/* Crown */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 180 }}
        className="text-[28px] leading-none mb-1"
        style={{ filter: 'drop-shadow(0 2px 3px rgba(196,139,110,0.7))' }}
      >
        {tie ? '⚖️' : '👑'}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="font-serif italic font-bold text-[15px] text-parch-cream tracking-wide mb-3"
        style={{ textShadow: '0 0 14px rgba(232,213,183,0.5)' }}
      >
        {winnerLine}
      </motion.div>

      {/* Two big scores + vs */}
      <div className="flex justify-center items-center gap-3 my-2">
        <TallySide
          label="나"
          score={me.total}
          isWinner={meWon}
          variant="me"
        />
        <div className="font-display font-bold text-[13px] tracking-[0.16em] text-rose-light">
          vs
        </div>
        <TallySide
          label={opponentName}
          score={opp.total}
          isWinner={oppWon}
          variant="opp"
        />
      </div>

      <div className="font-mono text-[8px] tracking-[0.14em] text-parch-cream/60 uppercase my-2">
        <span className="font-display font-bold text-gold-soft mx-1">VIII</span>
        Rounds ·
        <span className="font-display font-bold text-gold-soft mx-1">
          {me.combo + opp.combo > 0 ? 'COMBO' : 'NULLO'}
        </span>
        ·
        <span className="font-display font-bold text-gold-soft mx-1">
          {tie ? 'PATTO' : meWon ? 'ME' : 'OPP'}
        </span>
      </div>

      {/* CTAs */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-2.5 rounded-md active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(180deg, #e8d5b7 0%, #c48b6e 100%)',
            color: '#3d2f24',
            border: '1px solid #c48b6e',
            boxShadow:
              '0 3px 8px rgba(196,139,110,0.5), inset 0 1px 0 rgba(255,245,220,0.5)',
          }}
        >
          <div className="font-serif italic font-bold text-[14px] tracking-wide leading-none">
            다시 도전
          </div>
          <div
            className="font-mono text-[7px] tracking-[0.22em] uppercase opacity-80 mt-1"
            style={{ color: '#3d2f24' }}
          >
            Ancora
          </div>
        </button>
        <button
          onClick={onReturnLobby}
          className="flex-1 py-2.5 rounded-md border border-gold/60 active:scale-95 transition-transform"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,245,220,0.15) 0%, rgba(232,213,183,0.05) 100%)',
            color: '#f5efe3',
            boxShadow: 'inset 0 1px 0 rgba(255,245,220,0.2)',
          }}
        >
          <div className="font-serif italic font-bold text-[14px] tracking-wide leading-none">
            무도회 돌아가기
          </div>
          <div className="font-mono text-[7px] tracking-[0.22em] uppercase text-gold-soft/70 mt-1">
            Ritorna al Salone
          </div>
        </button>
      </div>

      <button
        className="mt-2 px-3 py-1 font-mono text-[8px] tracking-[0.24em] text-gold-soft/50 uppercase hover:text-gold-soft/80 transition"
        onClick={() => {
          // Placeholder — sharing not implemented yet.
        }}
      >
        결과 공유 · Condividi
      </button>
    </motion.div>
  )
}

function TallySide({
  label,
  score,
  isWinner,
  variant,
}: {
  label: string
  score: number
  isWinner: boolean
  variant: 'me' | 'opp'
}) {
  const isMe = variant === 'me'
  const numberEl = (
    <div className="flex flex-col items-center min-w-[60px]">
      <div className="font-mono text-[7px] tracking-[0.16em] text-parch-cream/60 uppercase">
        {label}
      </div>
      <ScoreCounter
        value={score}
        duration={1.2}
        className={`font-display font-bold text-[36px] leading-none block ${
          isMe ? 'text-gold-soft' : 'text-silver-soft'
        } ${!isWinner ? 'opacity-70' : ''}`}
      />
    </div>
  )
  if (isWinner) {
    return <LaurelWreath size={140}>{numberEl}</LaurelWreath>
  }
  return numberEl
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Per-slot breakdown computation                                       */
/* ═══════════════════════════════════════════════════════════════════ */

type PerSlotContribution = {
  me: number
  opp: number
  chips: SlotChip[]
  winner: (opponentName: string) => SlotWinnerTag
  /** Cumulative sum of me contributions up to and including this seat. */
  runningMeAt: number
  runningOppAt: number
}

/**
 * Compute a per-slot breakdown for every seat, mirroring `scoreSlot()` in
 * `game/scoring.ts` but exposing per-seat deltas + chip list so the ceremony
 * strip can present each row.
 *
 * NOTE: This intentionally re-implements the same math rather than adjusting
 * the domain module, since the visual walkthrough needs per-seat granularity
 * that `scorePlayer()` collapses into a single ScoreBreakdown.
 */
function computeAllSlotBreakdowns(state: MatchState): PerSlotContribution[] {
  const rows: PerSlotContribution[] = []
  let cumMe = 0
  let cumOpp = 0

  for (let i = 0; i < state.court.length; i++) {
    const contrib = computeSlotContribution(state, state.court[i], i)
    cumMe += contrib.me
    cumOpp += contrib.opp
    rows.push({ ...contrib, runningMeAt: cumMe, runningOppAt: cumOpp })
  }

  return rows
}

function computeSlotContribution(
  state: MatchState,
  slot: SlotState,
  seatIndex: number,
): Omit<PerSlotContribution, 'runningMeAt' | 'runningOppAt'> {
  const seat = SEATS[seatIndex]

  // Alliance
  if (slot.alliance) {
    const myCard = slot.alliance.me
    const oppCard = slot.alliance.opponent
    const halfBase = Math.floor(
      (myCard.surface + oppCard.surface + state.festivalBonus * 2) / 2,
    )
    const chips: SlotChip[] = [
      { kind: 'surface', label: '표면 합', value: halfBase * 2 },
      { kind: 'alliance', label: '동맹 · 반반', value: halfBase },
    ]

    let meContrib = halfBase
    let oppContrib = halfBase
    if (seat.favors === myCard.identity) {
      const buff = Math.floor(seat.bonus / 2)
      meContrib += buff
      chips.push({
        kind: 'buff',
        label: `${seat.italian} · 나`,
        value: buff,
      })
    }
    if (seat.favors === oppCard.identity) {
      const buff = Math.floor(seat.bonus / 2)
      oppContrib += buff
      chips.push({
        kind: 'buff',
        label: `${seat.italian} · opp`,
        value: buff,
      })
    }
    const myEvent = state.identityBonus[myCard.identity]
    if (myEvent) {
      const e = Math.floor(myEvent / 2)
      meContrib += e
      chips.push({ kind: 'event', label: IDENTITY_LABEL[myCard.identity], value: e })
    }
    const oppEvent = state.identityBonus[oppCard.identity]
    if (oppEvent) {
      const e = Math.floor(oppEvent / 2)
      oppContrib += e
      chips.push({
        kind: 'event',
        label: IDENTITY_LABEL[oppCard.identity],
        value: e,
      })
    }

    return {
      me: meContrib,
      opp: oppContrib,
      chips,
      winner: (opponentName: string) => ({
        kind: 'alliance',
        myAmount: meContrib,
        oppAmount: oppContrib,
        opponentName,
      }),
    }
  }

  // Empty
  if (!slot.placement) {
    return {
      me: 0,
      opp: 0,
      chips: [],
      winner: () => ({ kind: 'empty' }),
    }
  }

  const owner: Player = slot.placement.owner
  const card = slot.placement.card
  const chips: SlotChip[] = []
  let contrib = 0

  // Surface + festival
  const surface = card.surface + state.festivalBonus
  contrib += surface
  chips.push({ kind: 'surface', label: '표면', value: surface })

  // Slot buff
  if (seat.favors === card.identity) {
    contrib += seat.bonus
    chips.push({
      kind: 'buff',
      label: `${seat.italian} · ${IDENTITY_LABEL[card.identity]}`,
      value: seat.bonus,
    })
  }

  // Identity rules
  const idContrib = identityRuleBonus(state, slot, seatIndex, card, owner)
  if (idContrib.value !== 0) {
    contrib += idContrib.value
    chips.push({ kind: idContrib.kind, label: idContrib.label, value: idContrib.value })
  }

  // Event bonus
  const eventBonus = state.identityBonus[card.identity]
  if (eventBonus) {
    contrib += eventBonus
    chips.push({
      kind: 'event',
      label: `${IDENTITY_LABEL[card.identity]} 이벤트`,
      value: eventBonus,
    })
  }

  const meContrib = owner === 'me' ? contrib : 0
  const oppContrib = owner === 'opponent' ? contrib : 0

  return {
    me: meContrib,
    opp: oppContrib,
    chips,
    winner: (opponentName: string) =>
      owner === 'me'
        ? { kind: 'me', amount: contrib }
        : { kind: 'opp', amount: contrib, opponentName },
  }
}

function identityRuleBonus(
  state: MatchState,
  slot: SlotState,
  seatIndex: number,
  card: Card,
  owner: Player,
): { value: number; kind: SlotChip['kind']; label: string } {
  void slot
  switch (card.identity) {
    case 'Royalty': {
      let roys = 0
      for (const s of state.court) {
        if (s.placement?.card.identity === 'Royalty') roys++
        if (s.alliance?.me.identity === 'Royalty') roys++
        if (s.alliance?.opponent.identity === 'Royalty') roys++
      }
      return {
        value: roys * 3,
        kind: 'identity',
        label: `왕족 스택 ×${roys}`,
      }
    }
    case 'Thief': {
      let steal = 0
      for (const adj of [seatIndex - 1, seatIndex + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.owner !== owner) {
          steal += Math.floor(a.placement.card.surface / 2)
        }
      }
      return {
        value: steal,
        kind: 'identity',
        label: '도둑 훔침',
      }
    }
    case 'Scholar': {
      const slotNum = seatIndex + 1
      const cardMod = ((card.number - 1) % 8) + 1
      const diff = Math.abs(slotNum - cardMod)
      const threshold = state.scholarLoose ? 2 : 0
      const match = diff <= threshold
      return {
        value: match ? 8 : 0,
        kind: 'identity',
        label: match ? '학자 자기매치' : '학자 미스매치',
      }
    }
    case 'Hunter': {
      let hunt = 0
      for (const adj of [seatIndex - 1, seatIndex + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.card.icon === card.icon) {
          hunt += seatIndex === 4 ? 10 : 5
        }
      }
      return {
        value: hunt,
        kind: 'identity',
        label: '사냥꾼 아이콘 매치',
      }
    }
    case 'Mystic': {
      const set = new Set<string>()
      for (const s of state.court) {
        if (s.placement) set.add(s.placement.card.identity)
        if (s.alliance) {
          set.add(s.alliance.me.identity)
          set.add(s.alliance.opponent.identity)
        }
      }
      const perDistinct = seatIndex === 7 ? 3 : 2
      return {
        value: set.size * perDistinct,
        kind: 'identity',
        label: `신비 다양성 ×${set.size}`,
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Helpers                                                              */
/* ═══════════════════════════════════════════════════════════════════ */

function rowVisualFor(seatIndex: number, cursor: number): SlotRowVisual {
  if (seatIndex < cursor) return 'dim'
  if (seatIndex === cursor && cursor < 8) return 'active'
  return 'locked'
}

/**
 * Running total for a player at the given cursor position (0..8).
 * cursor = 0 → nothing scored yet; cursor = 8 → all seats scored.
 * When `applyRuinFlag` is true (final phase + player is ruined), returns
 * Math.floor(raw/2) to match `applyRuin()`.
 */
function runningTotal(
  slotBreakdowns: PerSlotContribution[],
  player: Player,
  cursor: number,
  combo: number,
  exile: number,
  applyRuinFlag: boolean,
): number {
  let sum = 0
  for (let i = 0; i < Math.min(cursor, slotBreakdowns.length); i++) {
    sum += player === 'me' ? slotBreakdowns[i].me : slotBreakdowns[i].opp
  }
  sum += combo + exile
  if (applyRuinFlag) sum = Math.floor(sum / 2)
  return sum
}
