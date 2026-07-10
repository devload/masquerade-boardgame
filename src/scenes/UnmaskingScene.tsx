/**
 * UnmaskingScene — R5 MEZZANOTTE cutscene.
 *
 * The emotional pivot of a match: every deferred R1-R4 clash (SlotState.pending)
 * is publicly resolved here in a dramatic 3-phase sequence.
 *
 *   Phase 1 · MEZZANOTTE  (2.0s)
 *     Full black-to-plum vignette, huge Cinzel title with a letter-by-letter
 *     stagger reveal, a rotating 12-dot clock chime motif, and a 3-dot
 *     progress indicator with ① active.
 *
 *   Phase 2 · REVEAL      (variable, ~3-4s)
 *     Enumerate court.pending seats one at a time (400ms stagger). Each seat
 *     first shows two face-down CardPortraits side-by-side, then flips them
 *     face-up in unison (framer-motion rotateY), then paints the outcome:
 *       - a wins        → gold laurel + loser fades to red-tinted exile band
 *       - b wins        → silver laurel + loser fades to red-tinted exile band
 *       - alliance      → twin hearts connecting both cards, both stay
 *     Progress dot ② becomes active.
 *
 *   Phase 3 · CONCLUSION  (1.5s)
 *     Big banner "가면 뒤 정체가 밝혀졌습니다." + small "다음 라운드 준비…".
 *     Progress dot ③ becomes active. On completion (or Skip tap) we dispatch
 *     revealAndAdvance() — which resolves pending duels in domain state — then
 *     goto('court').
 *
 * The cutscene is animation-driven, not raw setTimeout-driven for its overall
 * length: each phase kicks off the next when its own animation completes. A
 * "Skip" button is always available in the top-right for players who have
 * seen it before.
 *
 * Files created alongside this scene:
 *   - src/ui/LaurelBadge.tsx      (win badge, gold or silver)
 *   - src/ui/AllianceHearts.tsx   (동맹 flourish between two cards)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { duel } from '../game/rps5.ts'
import type { Card } from '../game/types.ts'
import { IDENTITY_LABEL } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'
import CardPortrait from '../ui/CardPortrait.tsx'
import { NightAmbience } from '../ui/NightAmbience.tsx'
import { LaurelBadge } from '../ui/LaurelBadge.tsx'
import { AllianceHearts } from '../ui/AllianceHearts.tsx'

// ─────────────────────────────────────────── phase timing constants ──
const PHASE_1_MS = 2000
/** Each pending seat takes this long from flip to next stagger step. */
const PHASE_2_PER_SEAT_MS = 900
/** Additional wait after the last seat before phase 3 begins. */
const PHASE_2_TAIL_MS = 400
const PHASE_3_MS = 1500

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

type Phase = 1 | 2 | 3

// ─────────────────────────────────────────── main scene ──
export function UnmaskingScene() {
  const match = useMatchStore((s) => s.match)
  const revealAndAdvance = useMatchStore((s) => s.revealAndAdvance)
  const goto = useMatchStore((s) => s.goto)

  const [phase, setPhase] = useState<Phase>(1)
  /** How many pending duels have been revealed so far (drives Phase 2 stagger). */
  const [revealedCount, setRevealedCount] = useState(0)
  const doneRef = useRef(false)

  // Snapshot the list of pending duels ONCE on mount. Once we dispatch
  // revealAndAdvance() the pending state gets consumed in the store, so we
  // capture it up-front to keep the cutscene deterministic.
  const pendingSlots = useMemo<PendingSnapshot[]>(() => {
    if (!match) return []
    return match.court
      .map((slot, idx) => ({ slot, idx }))
      .filter(({ slot }) => !!slot.pending)
      .map(({ slot, idx }) => ({
        seatIndex: idx,
        seat: slot.seat,
        me: slot.pending!.me,
        opponent: slot.pending!.opponent,
      }))
  }, [match])

  // Total pending duels for phase-2 length calculation.
  const totalPending = pendingSlots.length

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    revealAndAdvance()
    goto('court')
  }

  // ─── Phase 1 → 2 timer ──────────────────────────────────
  useEffect(() => {
    if (phase !== 1) return
    const t = setTimeout(() => setPhase(2), PHASE_1_MS)
    return () => clearTimeout(t)
  }, [phase])

  // ─── Phase 2 stagger: reveal one pending seat at a time ──
  useEffect(() => {
    if (phase !== 2) return
    if (totalPending === 0) {
      // Nothing to resolve — skip straight to phase 3 after a short beat so the
      // player still sees the phase indicator advance.
      const t = setTimeout(() => setPhase(3), 600)
      return () => clearTimeout(t)
    }
    if (revealedCount < totalPending) {
      const t = setTimeout(() => {
        setRevealedCount((c) => c + 1)
      }, PHASE_2_PER_SEAT_MS)
      return () => clearTimeout(t)
    }
    // All revealed — brief tail then advance
    const t = setTimeout(() => setPhase(3), PHASE_2_TAIL_MS)
    return () => clearTimeout(t)
  }, [phase, revealedCount, totalPending])

  // ─── Phase 3 → finish timer ─────────────────────────────
  useEffect(() => {
    if (phase !== 3) return
    const t = setTimeout(finish, PHASE_3_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Dev-only beat logging so we can eyeball the cutscene rhythm.
  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[UnmaskingScene] phase=${phase} revealed=${revealedCount}/${totalPending}`,
      )
    }
  }, [phase, revealedCount, totalPending])

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      {/* Dimmed ambience (deeper than Lobby) */}
      <NightAmbience intensity="dim" showFlourishes={false} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 34%, rgba(0,0,0,0.82) 100%)',
        }}
      />
      {/* Two focused candles (Phase 1 emphasis) */}
      <FocusedCandles phase={phase} />

      {/* Persistent Skip control (top-right) */}
      <button
        onClick={finish}
        className="absolute top-3 right-3 z-30 pt-safe
                   px-3 py-1.5 rounded-full border border-gold-soft/40
                   font-mono text-[9px] tracking-[0.28em] text-gold-soft/70 uppercase
                   hover:text-parch-cream hover:border-gold-soft/70
                   active:scale-95 transition"
        aria-label="자정 컷씬 건너뛰기"
      >
        Skip ▸
      </button>

      {/* Persistent progress indicator (bottom) */}
      <ProgressIndicator phase={phase} />

      {/* Content by phase */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {phase === 1 && <PhaseOne key="p1" />}
          {phase === 2 && (
            <PhaseTwo
              key="p2"
              pending={pendingSlots}
              revealedCount={revealedCount}
              totalPending={totalPending}
            />
          )}
          {phase === 3 && <PhaseThree key="p3" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── Phase 1 · MEZZANOTTE ──

const MEZZANOTTE = 'MEZZANOTTE'.split('')

function PhaseOne() {
  return (
    <motion.div
      className="w-full flex flex-col items-center gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Clock chime dots */}
      <ClockChime />

      {/* Round chip */}
      <div className="flex items-center gap-3 opacity-80">
        <span className="w-10 h-px bg-gold-soft/50" />
        <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/75 uppercase">
          R V · MEZZANOTTE
        </span>
        <span className="w-10 h-px bg-gold-soft/50" />
      </div>

      {/* Title — letter stagger */}
      <div className="text-center">
        <motion.h1
          className="font-display font-bold text-parch-cream tracking-[0.32em] text-[38px] leading-none"
          style={{
            paddingLeft: '0.32em',
            textShadow:
              '0 0 24px rgba(232,213,183,0.55), 0 0 48px rgba(244,228,200,0.35), 0 2px 8px rgba(139,58,74,0.55)',
          }}
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
            hidden: {},
          }}
          aria-label="MEZZANOTTE"
        >
          {MEZZANOTTE.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 0.42, ease: 'easeOut' },
                },
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.h1>

        <motion.div
          className="mt-4 font-serif italic text-[15px] text-gold-soft/80 tracking-wide"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.5 }}
        >
          자정 · 가면이 벗겨진다
        </motion.div>
        <motion.div
          className="mt-2 font-mono text-[8.5px] tracking-[0.22em] text-parch-cream/40 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          // 12번의 종소리로 800년의 관습이 완성된다
        </motion.div>
      </div>
    </motion.div>
  )
}

/** 12 dots in a ring, one rotating with a brighter fill. */
function ClockChime() {
  const dots = Array.from({ length: 12 }, (_, i) => i)
  const radius = 46
  return (
    <div className="relative w-[112px] h-[112px]">
      {dots.map((i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
        const x = 56 + radius * Math.cos(angle)
        const y = 56 + radius * Math.sin(angle)
        return (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold-soft/35"
            style={{ left: x - 2, top: y - 2 }}
          />
        )
      })}
      {/* Rotating bright dot */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: 0, height: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
      >
        <span
          className="absolute w-2 h-2 rounded-full block"
          style={{
            left: -4,
            top: -radius - 4,
            background: '#f4e4c8',
            boxShadow: '0 0 8px #f4e4c8, 0 0 18px rgba(244,228,200,0.6)',
          }}
        />
      </motion.div>
      {/* Center flourish */}
      <div
        className="absolute inset-0 flex items-center justify-center font-display text-gold-soft/70 text-[14px] tracking-[0.3em]"
        aria-hidden="true"
      >
        XII
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── Phase 2 · REVEAL ──

type PendingSnapshot = {
  seatIndex: number
  seat: number
  me: Card
  opponent: Card
}

function PhaseTwo({
  pending,
  revealedCount,
  totalPending,
}: {
  pending: PendingSnapshot[]
  revealedCount: number
  totalPending: number
}) {
  return (
    <motion.div
      className="w-full flex flex-col items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 opacity-80">
        <span className="w-10 h-px bg-gold-soft/50" />
        <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/75 uppercase">
          Reveal · 유예 결투 정산
        </span>
        <span className="w-10 h-px bg-gold-soft/50" />
      </div>

      {/* 8 seat pills — glow only for the seat currently being resolved */}
      <SeatPillRow pending={pending} revealedCount={revealedCount} />

      {/* Stacked duel resolutions (each is revealed in sequence) */}
      <div className="w-full max-w-[340px] flex flex-col gap-3 mt-1">
        {totalPending === 0 ? (
          <EmptyPending />
        ) : (
          pending.slice(0, revealedCount).map((p, i) => (
            <DuelResolution
              key={`s${p.seat}`}
              pending={p}
              isCurrent={i === revealedCount - 1}
            />
          ))
        )}
      </div>

      <div className="mt-3 font-mono text-[8.5px] tracking-[0.25em] text-parch-cream/40 uppercase">
        // {Math.min(revealedCount, totalPending)} / {totalPending} 결투 정산
      </div>
    </motion.div>
  )
}

function SeatPillRow({
  pending,
  revealedCount,
}: {
  pending: PendingSnapshot[]
  revealedCount: number
}) {
  const activeSeat =
    revealedCount > 0 && revealedCount <= pending.length
      ? pending[revealedCount - 1].seat
      : null
  const resolvedSeats = new Set(
    pending.slice(0, Math.max(0, revealedCount - 1)).map((p) => p.seat),
  )
  const pendingSeats = new Set(pending.map((p) => p.seat))

  return (
    <div className="flex items-center gap-1">
      {ROMAN.map((r, idx) => {
        const seat = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
        const isPending = pendingSeats.has(seat)
        const isActive = activeSeat === seat
        const isResolved = resolvedSeats.has(seat)

        let cls = 'text-silver/40 border-silver/20'
        if (isPending && !isResolved && !isActive) cls = 'text-rose-light/70 border-rose-light/40'
        if (isResolved) cls = 'text-gold-soft/70 border-gold-soft/50'
        if (isActive) cls = 'text-parch-cream border-gold-soft'

        return (
          <motion.div
            key={seat}
            className={`min-w-[22px] h-[22px] px-1 rounded-sm border font-mono text-[8px] tracking-widest flex items-center justify-center ${cls}`}
            animate={
              isActive
                ? {
                    scale: [1, 1.15, 1.1],
                    boxShadow: [
                      '0 0 0px rgba(232,213,183,0)',
                      '0 0 12px rgba(232,213,183,0.7)',
                      '0 0 8px rgba(232,213,183,0.5)',
                    ],
                  }
                : { scale: 1, boxShadow: '0 0 0px rgba(232,213,183,0)' }
            }
            transition={{ duration: 0.5 }}
          >
            {r}
          </motion.div>
        )
      })}
    </div>
  )
}

function EmptyPending() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-4 text-center px-6 py-5 rounded-lg border border-gold-soft/25"
      style={{ background: 'rgba(20,12,25,0.55)' }}
    >
      <div className="font-serif italic text-[15px] text-parch-cream/85">
        정산할 유예 결투가 없습니다
      </div>
      <div className="mt-1 font-mono text-[8.5px] tracking-[0.24em] text-parch-cream/45 uppercase">
        // R1~R4 동안 같은 자리 충돌 없음
      </div>
    </motion.div>
  )
}

// ─── Individual duel resolution row (Phase 2 body) ──
function DuelResolution({
  pending,
  isCurrent,
}: {
  pending: PendingSnapshot
  isCurrent: boolean
}) {
  const outcome = duel(pending.me.identity, pending.opponent.identity)
  // Two-stage local animation: (a) render face-down cards, (b) after ~450ms
  // flip them face-up together. Only start the flip when *this* row is the
  // currently-active one (i.e. just been added to the sequence).
  const [flipped, setFlipped] = useState(!isCurrent)
  useEffect(() => {
    if (!isCurrent) {
      setFlipped(true)
      return
    }
    const t = setTimeout(() => setFlipped(true), 450)
    return () => clearTimeout(t)
  }, [isCurrent])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative rounded-lg px-3 py-2.5 flex items-stretch gap-3"
      style={{
        background:
          'linear-gradient(180deg, rgba(30,15,40,0.72) 0%, rgba(15,8,22,0.42) 100%)',
        border: '1px solid rgba(139,111,71,0.35)',
        boxShadow: isCurrent
          ? '0 0 22px rgba(232,213,183,0.28), inset 0 0 20px rgba(232,213,183,0.06)'
          : 'inset 0 0 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* Left: seat number chip */}
      <div className="flex flex-col items-center justify-center min-w-[38px] gap-0.5">
        <div className="font-mono text-[8px] tracking-[0.15em] text-gold-soft/55 uppercase">
          Seat
        </div>
        <div className="font-display font-bold text-parch-cream text-[16px] leading-none">
          {ROMAN[pending.seat - 1]}
        </div>
      </div>

      {/* Middle: two flipping cards */}
      <div className="flex-1 flex items-center justify-center relative min-h-[92px]">
        <div className="flex items-center gap-2 relative">
          <FlipCard card={pending.me} flipped={flipped} ownership="me" fadeLoser={flipped && outcome === 'b'} />

          {/* Center vs / hearts overlay */}
          {!flipped ? (
            <div className="font-mono text-[10px] text-gold-soft/60 tracking-[0.2em]">
              vs
            </div>
          ) : outcome === 'alliance' ? (
            <div className="mx-1">
              <AllianceHearts />
            </div>
          ) : (
            <motion.div
              className="font-display font-bold text-rose-light text-[14px] tracking-[0.15em]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              style={{ textShadow: '0 0 10px rgba(196,139,149,0.7)' }}
            >
              ▶
            </motion.div>
          )}

          <FlipCard
            card={pending.opponent}
            flipped={flipped}
            ownership="opponent"
            fadeLoser={flipped && outcome === 'a'}
          />
        </div>
      </div>

      {/* Right: outcome badge (only after flip) */}
      <div className="flex flex-col items-end justify-center min-w-[86px] gap-1">
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="flex flex-col items-end gap-1"
          >
            {outcome === 'a' && (
              <LaurelBadge variant="gold" label="당신의 승리" />
            )}
            {outcome === 'b' && (
              <LaurelBadge variant="silver" label="상대의 승리" />
            )}
            {outcome === 'alliance' && (
              <div className="font-serif italic text-[11px] text-lavender/85">
                {IDENTITY_LABEL[pending.me.identity]}
              </div>
            )}
            <div
              className="font-mono text-[7.5px] tracking-[0.18em] uppercase"
              style={{ color: outcome === 'alliance' ? '#c9a8d0' : '#c48b95' }}
            >
              {outcome === 'a'
                ? '// 상대 추방'
                : outcome === 'b'
                  ? '// 나 추방 -4'
                  : '// 자리 공유'}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Card that flips from face-down to face-up (framer-motion rotateY) ──
function FlipCard({
  card,
  flipped,
  ownership,
  fadeLoser,
}: {
  card: Card
  flipped: boolean
  ownership: 'me' | 'opponent'
  fadeLoser: boolean
}) {
  return (
    <div
      className="relative"
      style={{ width: 96, height: 132, perspective: 700 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      >
        {/* Back (face-down) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardPortrait card={card} size="sm" faceDown ownership={ownership} />
        </div>
        {/* Front (face-up) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          animate={{ opacity: fadeLoser ? 0.35 : 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <CardPortrait card={card} size="sm" ownership={ownership} />
        </motion.div>
      </motion.div>

      {/* Red exile tint overlay on the losing card */}
      {fadeLoser && (
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139,58,74,0.55) 0%, rgba(139,58,74,0.15) 70%)',
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────── Phase 3 · CONCLUSION ──

function PhaseThree() {
  return (
    <motion.div
      className="w-full flex flex-col items-center gap-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 opacity-80">
        <span className="w-10 h-px bg-gold-soft/50" />
        <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/75 uppercase">
          Conclusione · 결판
        </span>
        <span className="w-10 h-px bg-gold-soft/50" />
      </div>

      <motion.div
        className="text-center px-8 py-6 rounded-lg"
        style={{
          background:
            'linear-gradient(180deg, rgba(232,213,183,0.14) 0%, rgba(232,213,183,0.03) 100%)',
          border: '1px solid rgba(232,213,183,0.5)',
          boxShadow: '0 0 32px rgba(232,213,183,0.32)',
        }}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.55, ease: 'easeOut' }}
      >
        <div
          className="font-display font-bold text-parch-cream text-[18px] tracking-[0.14em]"
          style={{
            textShadow: '0 0 16px rgba(232,213,183,0.5), 0 2px 6px rgba(0,0,0,0.6)',
          }}
        >
          가면 뒤 정체가 밝혀졌습니다.
        </div>
        <div className="mt-2 font-serif italic text-[13px] text-gold-soft/80">
          Le maschere sono cadute.
        </div>
      </motion.div>

      <motion.div
        className="font-mono text-[9px] tracking-[0.3em] text-parch-cream/55 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1] }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        다음 라운드 준비...
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────── Progress indicator (bottom) ──

function ProgressIndicator({ phase }: { phase: Phase }) {
  const steps: Array<{ n: '①' | '②' | '③'; label: string }> = [
    { n: '①', label: '자정' },
    { n: '②', label: '리빌' },
    { n: '③', label: '결판' },
  ]
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full"
      style={{
        background: 'rgba(10,5,15,0.65)',
        border: '1px solid rgba(139,111,71,0.35)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {steps.map((step, i) => {
        const stepNum = (i + 1) as Phase
        const isActive = stepNum === phase
        const isDone = stepNum < phase
        return (
          <div key={step.n} className="flex items-center gap-1.5">
            <motion.div
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-gold-bright' : isDone ? 'bg-gold-soft/60' : 'bg-parch-cream/15'
              }`}
              animate={
                isActive
                  ? {
                      scale: [1, 1.35, 1.2],
                      boxShadow: [
                        '0 0 4px rgba(232,213,183,0.5)',
                        '0 0 14px rgba(244,228,200,0.85)',
                        '0 0 8px rgba(232,213,183,0.55)',
                      ],
                    }
                  : { scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }
              }
              transition={{ duration: 1.6, repeat: isActive ? Infinity : 0 }}
            />
            <span
              className={`font-mono text-[8px] tracking-[0.22em] uppercase ${
                isActive
                  ? 'text-parch-cream'
                  : isDone
                    ? 'text-gold-soft/65'
                    : 'text-parch-cream/30'
              }`}
            >
              {step.n} {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-gold-soft/25 text-[10px] leading-none">·</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────── Focused candles ──

function FocusedCandles({ phase }: { phase: Phase }) {
  // Two candles instead of Lobby's four — softer, more focused for cutscene.
  const intensity = phase === 1 ? 1 : 0.7
  return (
    <>
      <div
        className="absolute top-[16%] left-[14%] w-24 h-24 rounded-full pointer-events-none blur-sm animate-candle-a"
        style={{
          background: `radial-gradient(circle, rgba(232,213,183,${0.45 * intensity}) 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute top-[18%] right-[14%] w-24 h-24 rounded-full pointer-events-none blur-sm animate-candle-b"
        style={{
          background: `radial-gradient(circle, rgba(196,139,110,${0.42 * intensity}) 0%, transparent 65%)`,
        }}
      />
    </>
  )
}
