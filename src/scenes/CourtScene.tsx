/**
 * CourtScene — the core in-match screen. Rebuilt from a scaffold into a
 * fully-guided game view.
 *
 * Layout (top → bottom):
 *   1. Round + phase ribbon         · Roman numeral round, phase pill, hand chip
 *   2. Live score header             · me vs opponent totals + last delta
 *   3. Guidance line                 · stage-direction copy that reads the state
 *   4. 8-seat court grid             · procedural portraits, live selection glow
 *   5. Ambient log strip             · last 3 log entries in italic gold
 *   6. Hand (LA MANO)                · 5 procedural portraits, lift on select
 *   7. Commit action bar             · SIGILLARE button + AI-thinking chip
 * Overlays:
 *   · RoundRibbon on each new round
 *   · DuelWheel when two commits land on the same seat
 *   · InfoSheet triggered by the top-right (?) button
 *
 * Note: this file only renders and coordinates. Domain state comes from the
 * store; no rule logic lives here.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import { nextRound } from '../game/match.ts'
import { scorePlayer } from '../game/scoring.ts'
import { duel } from '../game/rps5.ts'
import { SEATS } from '../game/types.ts'
import type { MatchPhase, MatchState, SlotState } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'
import CardPortrait from '../ui/CardPortrait.tsx'
import { NightAmbience } from '../ui/NightAmbience.tsx'
import DuelWheel from '../ui/DuelWheel.tsx'
import RoundRibbon from '../ui/RoundRibbon.tsx'
import InfoSheet from '../ui/InfoSheet.tsx'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

const IDENTITY_EMOJI = {
  Royalty: '👑',
  Thief: '🗡',
  Scholar: '📚',
  Hunter: '🏹',
  Mystic: '🔮',
} as const

/* ─────────────────────────────────────────────────────── Court scene ── */

export function CourtScene() {
  const match = useMatchStore((s) => s.match)
  const brainName = useMatchStore((s) => s.brain.name)
  const selectedCardId = useMatchStore((s) => s.selectedCardId)
  const selectedSeat = useMatchStore((s) => s.selectedSeat)
  const selectCard = useMatchStore((s) => s.selectCard)
  const selectSeat = useMatchStore((s) => s.selectSeat)
  const confirmCommit = useMatchStore((s) => s.confirmCommit)
  const playAI = useMatchStore((s) => s.playAIOpponent)
  const revealAndAdvance = useMatchStore((s) => s.revealAndAdvance)
  const aiThinking = useMatchStore((s) => s.aiThinking)
  const setAIThinking = useMatchStore((s) => s.setAIThinking)
  const lastRevealLog = useMatchStore((s) => s.lastRevealLog)

  // Local UI state
  const [infoOpen, setInfoOpen] = useState(false)
  const [duelState, setDuelState] = useState<null | {
    key: string
    my: SlotState['placement']
    opp: SlotState['placement']
    outcome: 'a' | 'b' | 'alliance'
  }>(null)

  // Track previous round for the ribbon animation, and previous scores for
  // the "+N" delta pulse.
  const prevRoundRef = useRef<number | null>(null)
  const [ribbonRound, setRibbonRound] = useState<number | null>(null)
  const prevScoreRef = useRef<{ me: number; opp: number }>({ me: 0, opp: 0 })
  const [scoreDelta, setScoreDelta] = useState<{ me: number; opp: number }>({
    me: 0,
    opp: 0,
  })

  // ── Round change → show ribbon ──────────────────────────────
  useEffect(() => {
    if (!match) return
    if (prevRoundRef.current !== match.round) {
      prevRoundRef.current = match.round
      setRibbonRound(match.round)
      const t = setTimeout(() => setRibbonRound(null), 1400)
      return () => clearTimeout(t)
    }
    return
  }, [match?.round, match])

  // ── Phase-driven progression: reveal → next round ───────────
  useEffect(() => {
    if (!match) return
    if (match.phase === 'reveal') {
      // Slight delay so the reveal animation can play.
      const t = setTimeout(() => revealAndAdvance(), 700)
      return () => clearTimeout(t)
    }
    if (match.phase === 'draw') {
      const t = setTimeout(() => {
        const { match: cur } = useMatchStore.getState()
        if (!cur) return
        const advanced = nextRound(cur)
        useMatchStore.setState((s) => {
          s.match = advanced
          if (advanced.phase === 'unmasking') s.scene = 'unmasking'
          else if (advanced.phase === 'reckoning') s.scene = 'reckoning'
        })
      }, 550)
      return () => clearTimeout(t)
    }
    return
  }, [match, revealAndAdvance])

  // ── Live scores ─────────────────────────────────────────────
  const scores = useMemo(() => {
    if (!match) return { me: 0, opp: 0 }
    return {
      me: scorePlayer(match, 'me').total,
      opp: scorePlayer(match, 'opponent').total,
    }
  }, [match])

  // Update the delta when scores change.
  useEffect(() => {
    const prev = prevScoreRef.current
    const dMe = scores.me - prev.me
    const dOpp = scores.opp - prev.opp
    if (dMe !== 0 || dOpp !== 0) {
      setScoreDelta({ me: dMe, opp: dOpp })
      prevScoreRef.current = { me: scores.me, opp: scores.opp }
      const t = setTimeout(() => setScoreDelta({ me: 0, opp: 0 }), 900)
      return () => clearTimeout(t)
    }
    return
  }, [scores.me, scores.opp])

  if (!match) return null

  const myHand = match.players.me.hand
  const bothCommitted = !!match.tempCommits.me && !!match.tempCommits.opponent
  const canCommit =
    match.phase === 'commit' &&
    !aiThinking &&
    selectedCardId != null &&
    selectedSeat != null

  // Compact hand-count chip
  const handChip = `손 ${myHand.length} · 시장 ${match.market.length}`

  // Commit handler — runs AI in a delayed tick to give a "thinking" beat.
  const handleCommit = () => {
    if (!canCommit) return
    confirmCommit()
    setAIThinking(true)
    // Reveal chain: AI commits after ~500ms, reveal fires after ~250ms more.
    setTimeout(() => {
      playAI()
      setTimeout(() => {
        // Before revealing, detect a same-seat clash so we can prime the
        // DuelWheel overlay to appear during reveal.
        const { match: after } = useMatchStore.getState()
        if (after && after.tempCommits.me && after.tempCommits.opponent) {
          const clash = detectClash(after)
          if (clash) setDuelState(clash)
          revealAndAdvance()
        } else {
          setAIThinking(false)
        }
      }, 260)
    }, 520)
  }

  const guidance = getGuidance({
    phase: match.phase,
    hasCard: selectedCardId != null,
    hasSeat: selectedSeat != null,
    aiThinking,
    brainName,
  })

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="dim" showFlourishes={false} />

      {/* ── Round + phase ribbon ─────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe pt-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[9px] tracking-[0.35em] text-gold-soft/70 uppercase">
            Round
          </span>
          <span className="font-display text-parch-cream text-xl tracking-widest leading-none">
            {ROMAN[match.round - 1] || match.round}
          </span>
          <span className="font-mono text-[9px] tracking-[0.25em] text-parch-cream/40">
            / VIII
          </span>
        </div>
        <PhasePill phase={match.phase} />
        <div className="flex items-center gap-2">
          <div className="font-mono text-[9px] text-parch-cream/60">
            {handChip}
          </div>
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="rules-info"
            className="w-6 h-6 rounded-full border border-gold-soft/50
                       text-gold-soft/85 font-serif italic text-[13px] leading-none
                       flex items-center justify-center active:scale-90
                       bg-black/25"
          >
            ?
          </button>
        </div>
      </div>

      {/* ── Live score header (always visible) ─────────────── */}
      <ScoreHeader
        meScore={scores.me}
        oppScore={scores.opp}
        oppName={brainName}
        deltaMe={scoreDelta.me}
        deltaOpp={scoreDelta.opp}
      />

      {/* ── Guidance line ───────────────────────────────────── */}
      <div className="relative z-10 px-4 mt-1.5 mb-1 flex items-center justify-center min-h-[18px]">
        <GuidanceLine text={guidance.text} tone={guidance.tone} />
      </div>

      {/* ── Court grid ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-3 pb-1">
        <div className="grid grid-cols-4 gap-1.5 w-full max-w-[420px]">
          {match.court.map((slot) => (
            <SeatCard
              key={slot.seat}
              slot={slot}
              selected={selectedSeat === slot.seat}
              canSelect={
                match.phase === 'commit' &&
                !bothCommitted &&
                !aiThinking &&
                selectedCardId != null
              }
              onSelect={() =>
                selectSeat(selectedSeat === slot.seat ? null : slot.seat)
              }
            />
          ))}
        </div>
      </div>

      {/* ── Ambient log strip ───────────────────────────────── */}
      <LogStrip lines={lastRevealLog} />

      {/* ── Exile pile indicators ───────────────────────────── */}
      <ExileIndicator match={match} />

      {/* ── Hand ────────────────────────────────────────────── */}
      <div className="relative z-10 px-3 pt-1">
        <div className="mb-1 flex items-center gap-2 justify-center">
          <span className="w-6 h-px bg-gold-soft/30" />
          <span className="font-mono text-[8px] tracking-[0.35em] text-gold-soft/60 uppercase">
            La Mano · 손패 ({myHand.length})
          </span>
          <span className="w-6 h-px bg-gold-soft/30" />
        </div>
        <div className="flex justify-center gap-1 overflow-x-auto flex-nowrap px-1 -mx-1">
          {myHand.map((card) => (
            <motion.div
              key={card.id}
              className="shrink-0"
              animate={{ y: selectedCardId === card.id ? -8 : 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <CardPortrait
                card={card}
                size="sm"
                ownership="me"
                selected={selectedCardId === card.id}
                onClick={
                  match.phase === 'commit' && !bothCommitted && !aiThinking
                    ? () =>
                        selectCard(selectedCardId === card.id ? null : card.id)
                    : undefined
                }
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Commit action bar ───────────────────────────────── */}
      <div className="relative z-10 px-4 pb-safe pb-3 pt-2">
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className={`w-full py-2.5 rounded-md font-display tracking-[0.3em] text-[12px] uppercase
                      border transition-all active:scale-[0.98]
                      ${
                        canCommit
                          ? 'border-gold-soft/80 text-parch-cream bg-gradient-to-b from-gold-soft/35 to-rose-deep/25 shadow-gold-glow animate-pulse-soft'
                          : 'border-parch-cream/10 text-parch-cream/25 bg-black/20 cursor-not-allowed'
                      }`}
        >
          {canCommit ? 'Sigillare ✦ 봉인' : '카드와 자리를 선택하세요'}
        </button>
      </div>

      {/* ── AI thinking chip ────────────────────────────────── */}
      <AnimatePresence>
        {aiThinking && (
          <motion.div
            key="ai-chip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40
                       px-3 py-1.5 rounded-full
                       bg-lavender-deep/85 border border-gold-soft/40
                       shadow-gold-glow backdrop-blur-sm
                       font-serif italic text-[11px] text-parch-cream
                       flex items-center gap-2 pointer-events-none"
          >
            <span className="text-base emoji">🎭</span>
            <span>{brainName}이(가) 카드를 봉인합니다</span>
            <ThinkingDots />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Round ribbon overlay ────────────────────────────── */}
      <AnimatePresence>
        {ribbonRound && (
          <RoundRibbon
            roman={ROMAN[ribbonRound - 1] || String(ribbonRound)}
            subtitle={ribbonRound === 1 ? '무도회의 서막' : `Round ${ribbonRound}`}
          />
        )}
      </AnimatePresence>

      {/* ── Duel wheel overlay ──────────────────────────────── */}
      {duelState && duelState.my && duelState.opp && (
        <DuelWheel
          key={duelState.key}
          my={duelState.my.card.identity}
          opponent={duelState.opp.card.identity}
          outcome={duelState.outcome}
          onDone={() => setDuelState(null)}
        />
      )}

      {/* ── Info bottom sheet ───────────────────────────────── */}
      <InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        round={match.round}
        phase={match.phase}
      />

      {/* ── Scene-scoped keyframes ──────────────────────────── */}
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 8px rgba(232,213,183,0.35); }
          50%      { box-shadow: 0 0 18px rgba(232,213,183,0.8); }
        }
        .animate-pulse-soft { animation: pulse-soft 2.4s ease-in-out infinite; }
        @keyframes invite {
          0%, 100% { border-color: rgba(232,213,183,0.35); }
          50%      { border-color: rgba(232,213,183,0.75); }
        }
        .animate-invite { animation: invite 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────── Guidance line ── */

type Guidance = { text: string; tone: 'muted' | 'active' | 'gold' | 'italic' }

function getGuidance(args: {
  phase: MatchPhase
  hasCard: boolean
  hasSeat: boolean
  aiThinking: boolean
  brainName: string
}): Guidance {
  const { phase, hasCard, hasSeat, aiThinking, brainName } = args
  if (phase === 'reveal') return { text: '자정의 시선...', tone: 'italic' }
  if (phase === 'draw') return { text: '다음 라운드 준비...', tone: 'muted' }
  if (phase === 'unmasking')
    return { text: 'MEZZANOTTE — 가면이 벗겨집니다', tone: 'gold' }
  if (phase === 'reckoning') return { text: '심판 준비 중...', tone: 'gold' }
  // commit phase
  if (aiThinking) return { text: `${brainName}이(가) 봉인 중...`, tone: 'active' }
  if (!hasCard && !hasSeat) return { text: '카드를 골라주세요', tone: 'italic' }
  if (hasCard && !hasSeat)
    return { text: '자리를 봉인할 곳을 선택하세요', tone: 'italic' }
  if (hasCard && hasSeat)
    return { text: '봉인 준비 완료 · 하단 버튼을 누르세요', tone: 'gold' }
  return { text: '카드를 골라주세요', tone: 'italic' }
}

function GuidanceLine({ text, tone }: Guidance) {
  const cls =
    tone === 'gold'
      ? 'text-gold-soft'
      : tone === 'active'
        ? 'text-parch-cream'
        : tone === 'italic'
          ? 'text-parch-cream/80 italic'
          : 'text-parch-cream/50 italic'
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`font-serif text-[12px] tracking-wide ${cls}`}
    >
      {text}
    </motion.div>
  )
}

/* ───────────────────────────────────────────── Phase pill ── */

function PhasePill({ phase }: { phase: MatchPhase }) {
  const label = phaseLabel(phase)
  const active = phase === 'commit' || phase === 'reveal' || phase === 'unmasking'
  return (
    <motion.div
      animate={{
        boxShadow: active
          ? [
              '0 0 4px rgba(232,213,183,0.3)',
              '0 0 14px rgba(232,213,183,0.7)',
              '0 0 4px rgba(232,213,183,0.3)',
            ]
          : '0 0 4px rgba(232,213,183,0.2)',
      }}
      transition={{ duration: 2.2, repeat: Infinity }}
      className="px-2.5 py-1 rounded-sm border border-gold-soft/40 bg-lavender-deep/40 backdrop-blur-sm
                 font-mono text-[9px] tracking-[0.35em] text-gold-soft/90 uppercase"
    >
      {label}
    </motion.div>
  )
}

function phaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case 'commit':
      return 'COMMIT'
    case 'reveal':
      return 'REVEAL'
    case 'unmasking':
      return 'MEZZANOTTE'
    case 'reckoning':
      return 'RECKONING'
    case 'draw':
      return 'DRAW'
    case 'event':
      return 'EVENT'
    case 'end':
      return 'END'
  }
}

/* ───────────────────────────────────────────── Score header ── */

function ScoreHeader({
  meScore,
  oppScore,
  oppName,
  deltaMe,
  deltaOpp,
}: {
  meScore: number
  oppScore: number
  oppName: string
  deltaMe: number
  deltaOpp: number
}) {
  return (
    <div className="relative z-10 mx-3 mt-2 grid grid-cols-2 gap-2">
      <ScoreCard
        label="나"
        total={meScore}
        delta={deltaMe}
        tint="gold"
      />
      <ScoreCard
        label={oppName}
        total={oppScore}
        delta={deltaOpp}
        tint="silver"
      />
    </div>
  )
}

function ScoreCard({
  label,
  total,
  delta,
  tint,
}: {
  label: string
  total: number
  delta: number
  tint: 'gold' | 'silver'
}) {
  const ring =
    tint === 'gold' ? 'border-gold-soft/60' : 'border-silver/60'
  const glow =
    tint === 'gold' ? 'shadow-gold-glow' : 'shadow-silver-glow'
  const totalColor =
    tint === 'gold' ? 'text-gold-soft' : 'text-silver-soft'
  return (
    <div
      className={`relative rounded-md ${ring} ${glow}
                  border bg-gradient-to-b from-lavender-deep/70 to-black/60
                  px-3 py-1.5 flex items-center justify-between`}
    >
      <div className="font-mono text-[8px] tracking-[0.25em] text-parch-cream/60 uppercase truncate">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <div className={`font-display ${totalColor} text-[18px] leading-none`}>
          {total}
        </div>
        <AnimatePresence>
          {delta !== 0 && (
            <motion.div
              key={`delta-${label}-${total}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: -6 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.8 }}
              className={`font-mono text-[10px] ${
                delta > 0 ? 'text-sage-light' : 'text-rose-light'
              }`}
            >
              {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────── Seat card ── */

type SeatCardProps = {
  slot: SlotState
  selected: boolean
  canSelect: boolean
  onSelect: () => void
}

function SeatCard({ slot, selected, canSelect, onSelect }: SeatCardProps) {
  const seatMeta = SEATS[slot.seat - 1]
  const isEmpty = !slot.placement && !slot.alliance && !slot.pending
  const clickable = canSelect && isEmpty

  const borderClass = selected
    ? 'border-gold-soft shadow-gold-glow'
    : slot.pending
      ? 'border-rose-deep/70'
      : slot.alliance
        ? 'border-lavender/70'
        : slot.placement
          ? slot.placement.owner === 'me'
            ? 'border-gold-soft/50'
            : 'border-silver/50'
          : clickable
            ? 'border-gold-soft/40 animate-invite'
            : 'border-parch-cream/12'

  return (
    <motion.button
      onClick={clickable ? onSelect : undefined}
      disabled={!clickable}
      whileTap={clickable ? { scale: 0.95 } : undefined}
      className={`relative rounded-md p-1 aspect-[3/4] border ${borderClass}
                  bg-gradient-to-b from-black/40 to-lavender-deep/30 backdrop-blur-[2px]
                  text-left overflow-hidden
                  ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      data-seat={slot.seat}
    >
      {/* Faint identity watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none emoji"
        style={{
          fontSize: '54px',
          opacity: 0.09,
          filter: 'blur(0.5px)',
        }}
      >
        {IDENTITY_EMOJI[seatMeta.favors]}
      </div>

      {/* Header row */}
      <div className="relative flex justify-between items-baseline leading-tight">
        <div className="flex flex-col">
          <span className="font-display text-[8px] tracking-[0.15em] text-gold-soft/85">
            {ROMAN[slot.seat - 1]}
          </span>
          <span className="font-serif italic text-[8px] text-parch-cream/85 truncate max-w-[54px]">
            {seatMeta.italian}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-[7px] text-gold-soft/70">
            +{seatMeta.bonus}
          </span>
          <span className="font-serif italic text-[7px] text-parch-cream/50">
            {seatMeta.korean}
          </span>
        </div>
      </div>

      {/* Slot body */}
      <div className="relative mt-1 flex items-center justify-center min-h-[52px]">
        {isEmpty && (
          <div className="w-[54px] h-[62px] rounded-md border border-dashed border-gold-soft/30 flex items-center justify-center">
            <span className="font-serif italic text-[8px] text-gold-soft/50">
              {selected ? '선택됨' : canSelect ? '탭' : '봉인 대기'}
            </span>
          </div>
        )}

        {slot.placement && !slot.pending && !slot.alliance && (
          <PlacementView placement={slot.placement} />
        )}

        {slot.alliance && (
          <div className="flex gap-0.5 items-center scale-90">
            <CardPortrait card={slot.alliance.me} size="thumb" ownership="me" />
            <span className="font-serif italic text-[9px] text-lavender">∞</span>
            <CardPortrait
              card={slot.alliance.opponent}
              size="thumb"
              ownership="opponent"
            />
          </div>
        )}

        {slot.pending && <PendingDuelView pending={slot.pending} />}
      </div>

      {/* Alliance / pending label under body */}
      {slot.alliance && (
        <div className="relative mt-0.5 text-center font-serif italic text-[8px] text-lavender">
          동맹
        </div>
      )}
      {slot.pending && (
        <div className="relative mt-0.5 text-center font-serif italic text-[8px] text-rose-light">
          결투 유예 · MEZZANOTTE
        </div>
      )}
    </motion.button>
  )
}

function PlacementView({
  placement,
}: {
  placement: NonNullable<SlotState['placement']>
}) {
  const tint =
    placement.owner === 'me'
      ? 'text-gold-soft'
      : 'text-silver-soft'
  return (
    <motion.div
      initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center gap-0.5"
    >
      <CardPortrait
        card={placement.card}
        size="sm"
        ownership={placement.owner}
        className="scale-[0.7] origin-center"
      />
      <div
        className={`font-mono text-[7px] tracking-widest ${tint} truncate max-w-[60px]`}
      >
        +{placement.card.surface} · {placement.card.name.slice(0, 5)}
      </div>
    </motion.div>
  )
}

function PendingDuelView({
  pending,
}: {
  pending: NonNullable<SlotState['pending']>
}) {
  return (
    <div className="relative w-[64px] h-[62px] flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-md"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,58,74,0.35), transparent 70%)',
        }}
      />
      <motion.div
        animate={{ rotate: [-6, -8, -6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute left-1"
      >
        <CardPortrait
          card={pending.me}
          size="thumb"
          ownership="me"
          faceDown
        />
      </motion.div>
      <motion.div
        animate={{ rotate: [6, 8, 6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute right-1"
      >
        <CardPortrait
          card={pending.opponent}
          size="thumb"
          ownership="opponent"
          faceDown
        />
      </motion.div>
    </div>
  )
}

/* ───────────────────────────────────────────── Log strip ── */

function LogStrip({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  const visible = lines.slice(-3)
  return (
    <div className="relative z-10 px-4 py-1 flex flex-col items-center gap-0.5">
      {visible.map((line, i) => (
        <motion.div
          key={`${i}-${line}`}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 0.75 - i * 0.15, y: 0 }}
          className="font-serif italic text-[10px] text-gold-soft/80 truncate max-w-[92%]"
        >
          {stripEmoji(line)}
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Cheap emoji strip so the log strip reads cleanly even when the underlying
 * `match.log` uses decorative glyphs. We keep meaningful glyphs (⚔🤝⏸) but
 * drop the noisy round separators.
 */
function stripEmoji(s: string): string {
  return s
    .replace(/═+/g, '')
    .replace(/GRAND UNMASKING/g, 'GRAND UNMASKING')
    .trim()
}

/* ───────────────────────────────────────────── Exile indicator ── */

function ExileIndicator({ match }: { match: MatchState }) {
  const me = match.players.me.exile.length
  const opp = match.players.opponent.exile.length
  if (me === 0 && opp === 0) return null
  const warn = me >= 3 || opp >= 3
  return (
    <div className="relative z-10 mx-3 mb-1 flex justify-between text-[9px] font-mono">
      <div className="flex items-center gap-1 text-parch-cream/70">
        <span className="emoji">☠</span>
        <span>추방 {me}</span>
      </div>
      {warn && (
        <div className="text-rose-light font-serif italic text-[10px] animate-pulse">
          몰락 위험
        </div>
      )}
      <div className="flex items-center gap-1 text-parch-cream/70">
        <span>추방 {opp}</span>
        <span className="emoji">☠</span>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────── Thinking dots ── */

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
          className="w-1 h-1 rounded-full bg-parch-cream/80"
        />
      ))}
    </span>
  )
}

/* ───────────────────────────────────────────── Clash detection ── */

/**
 * Look at both tempCommits — if they share the same seat, return the
 * matching cards + duel outcome so the DuelWheel can preview it.
 */
function detectClash(match: MatchState): null | {
  key: string
  my: SlotState['placement']
  opp: SlotState['placement']
  outcome: 'a' | 'b' | 'alliance'
} {
  const mine = match.tempCommits.me
  const opp = match.tempCommits.opponent
  if (!mine || !opp) return null
  if (mine.seat !== opp.seat) return null

  const myCard = match.players.me.hand.find((c) => c.id === mine.cardId)
  const oppCard = match.players.opponent.hand.find(
    (c) => c.id === opp.cardId,
  )
  if (!myCard || !oppCard) return null

  const outcome = duel(myCard.identity, oppCard.identity)
  return {
    key: `duel-${mine.seat}-${myCard.id}-${oppCard.id}`,
    my: { card: myCard, owner: 'me' },
    opp: { card: oppCard, owner: 'opponent' },
    outcome,
  }
}
