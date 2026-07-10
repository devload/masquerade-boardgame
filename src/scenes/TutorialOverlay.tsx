/**
 * TutorialOverlay — a 4-panel first-time walkthrough rendered on top of
 * LobbyScene when `tutorialSeen === false`.
 *
 * Structure:
 *   Panel 1 · 세계관 소개    — Ombra kingdom, the round table
 *   Panel 2 · 카드와 자리   — a live CardPortrait + a mock seat card
 *   Panel 3 · 자정의 리빌   — MEZZANOTTE reveal moment (RPS-5)
 *   Panel 4 · 승리와 몰락    — scoring formula
 *
 * "다음 / 건너뛰기 / 시작하기" all call `markTutorialSeen()` when the
 * overlay dismisses. Uses framer-motion for panel enter/exit.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { CARDS } from '../game/cards.ts'
import { SEATS } from '../game/types.ts'
import CardPortrait from '../ui/CardPortrait.tsx'
import { useMatchStore } from '../store/matchStore.ts'

type PanelKey = 'world' | 'seats' | 'reveal' | 'scoring'

const PANELS: PanelKey[] = ['world', 'seats', 'reveal', 'scoring']

export function TutorialOverlay() {
  const markTutorialSeen = useMatchStore((s) => s.markTutorialSeen)
  const [index, setIndex] = useState(0)
  const key = PANELS[index]

  const isLast = index === PANELS.length - 1
  const next = () => {
    if (isLast) {
      markTutorialSeen()
    } else {
      setIndex((i) => i + 1)
    }
  }
  const skip = () => {
    markTutorialSeen()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background:
          'radial-gradient(ellipse 90% 55% at 50% 45%, rgba(45,20,50,0.96) 0%, rgba(12,6,18,0.98) 70%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
      data-testid="tutorial-overlay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-[340px]"
        >
          <PanelCard panelKey={key} />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="mt-6 flex items-center gap-2.5">
        {PANELS.map((p, i) => (
          <span
            key={p}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{
              background:
                i === index
                  ? 'rgba(232,213,183,0.9)'
                  : i < index
                    ? 'rgba(232,213,183,0.45)'
                    : 'rgba(232,213,183,0.2)',
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={skip}
          className="px-4 py-1.5 font-mono text-[10px] tracking-[0.3em] uppercase
                     text-parch-cream/50 hover:text-parch-cream/80 transition"
        >
          건너뛰기
        </button>
        <button
          onClick={next}
          className="relative group active:scale-95 transition-transform"
        >
          <div className="absolute -inset-1.5 bg-gold-soft/20 rounded-full blur-md group-hover:bg-gold-soft/35 transition" />
          <div
            className="relative px-6 py-2 border border-gold-soft/60 rounded-full
                       font-display tracking-[0.3em] text-[11px] text-gold-soft uppercase
                       bg-gradient-to-b from-white/[0.03] to-black/25
                       group-hover:border-gold-soft group-hover:text-parch-cream transition"
          >
            {isLast ? '시작하기' : '다음'}
          </div>
        </button>
      </div>
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────── Panels ── */

function PanelCard({ panelKey }: { panelKey: PanelKey }) {
  return (
    <div
      className="rounded-2xl border border-gold-soft/30 p-6 pt-5
                 shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
      style={{
        background:
          'linear-gradient(180deg, rgba(50,32,58,0.85) 0%, rgba(24,14,32,0.9) 100%)',
      }}
    >
      {panelKey === 'world' && <WorldPanel />}
      {panelKey === 'seats' && <SeatsPanel />}
      {panelKey === 'reveal' && <RevealPanel />}
      {panelKey === 'scoring' && <ScoringPanel />}
    </div>
  )
}

function PanelHeader({ chapter, title }: { chapter: string; title: string }) {
  return (
    <div className="mb-4 text-center">
      <div className="font-mono text-[9px] tracking-[0.45em] text-gold-soft/70 uppercase">
        {chapter}
      </div>
      <div className="mt-1.5 font-display tracking-[0.24em] text-[16px] text-parch-cream">
        {title}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 opacity-70">
        <span className="w-6 h-px bg-rose-deep/70" />
        <span className="font-display text-rose-light text-[10px]">✦</span>
        <span className="w-6 h-px bg-rose-deep/70" />
      </div>
    </div>
  )
}

function PanelBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif italic text-[14px] leading-relaxed text-parch-cream/85 text-center">
      {children}
    </div>
  )
}

/* Panel 1 — 세계관 소개 */
function WorldPanel() {
  return (
    <>
      <PanelHeader chapter="PROLOGO · 세계관" title="Il Ballo di Ombra" />
      <div className="flex justify-center my-3">
        <PalaceIllustration />
      </div>
      <PanelBody>
        1780년 오므브라 왕국의 무도회.<br />
        왕궁의 원탁에 두 감독이<br />
        가면 쓴 손님들을 앉힙니다.
      </PanelBody>
    </>
  )
}

/* Panel 2 — 카드와 자리 */
function SeatsPanel() {
  // Use CARDS[0] (가스통 자작) as the sample.
  const sample = CARDS[0]
  const seat = SEATS[0]
  return (
    <>
      <PanelHeader chapter="ATTO I · 배치" title="카드와 자리" />
      <div className="flex items-center justify-center gap-3 my-3">
        <CardPortrait card={sample} size="sm" />
        <SeatCardMini
          italian={seat.italian}
          korean={seat.korean}
          hint={`👑 왕족 +${seat.bonus}`}
        />
      </div>
      <PanelBody>
        손패의 카드를<br />
        원탁의 자리에 봉인하세요.<br />
        자리마다 총애하는 정체가 다릅니다.
      </PanelBody>
    </>
  )
}

/* Panel 3 — 자정의 리빌 */
function RevealPanel() {
  return (
    <>
      <PanelHeader chapter="ATTO II · 자정" title="Mezzanotte · 리빌" />
      <div className="flex justify-center my-3">
        <MezzanotteIllustration />
      </div>
      <PanelBody>
        R5의 자정, 유예된 결투가 밝혀집니다.<br />
        정체는 서로 물고 물리며 (RPS-5),<br />
        같은 정체끼리는 <span className="not-italic text-gold-soft/90">동맹</span>이 됩니다.
      </PanelBody>
    </>
  )
}

/* Panel 4 — 승리와 몰락 */
function ScoringPanel() {
  return (
    <>
      <PanelHeader chapter="EPILOGO · 채점" title="승리와 몰락" />
      <div className="flex justify-center my-3">
        <ScoreFormula />
      </div>
      <PanelBody>
        표면 + 슬롯 버프 + 이벤트 + 콤보<br />
        <span className="not-italic text-rose-light/80">− 몰락</span> = 최종 점수.<br />
        8라운드 후 높은 점수가 승리합니다.
      </PanelBody>
    </>
  )
}

/* ───────────────────────────────── Illustration primitives ── */

function PalaceIllustration() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" className="opacity-90">
      <defs>
        <linearGradient id="tut-palace" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#faddab" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8b6534" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Ground line */}
      <line x1="6" y1="76" x2="174" y2="76" stroke="#c48b6e" strokeWidth="0.6" opacity="0.5" />
      {/* Palace silhouette — three arches */}
      <g fill="url(#tut-palace)" stroke="#e8d5b7" strokeWidth="0.5" opacity="0.85">
        <path d="M 30 76 L 30 40 Q 30 30, 42 30 Q 54 30, 54 40 L 54 76 Z" />
        <path d="M 70 76 L 70 34 Q 70 22, 90 22 Q 110 22, 110 34 L 110 76 Z" />
        <path d="M 126 76 L 126 40 Q 126 30, 138 30 Q 150 30, 150 40 L 150 76 Z" />
      </g>
      {/* Central spire */}
      <path d="M 90 22 L 90 10" stroke="#e8d5b7" strokeWidth="0.6" opacity="0.7" />
      <circle cx="90" cy="8" r="1.6" fill="#faddab" />
      {/* Candle warmth in windows */}
      <circle cx="42" cy="52" r="2.2" fill="#faddab" opacity="0.85" />
      <circle cx="90" cy="46" r="2.6" fill="#faddab" opacity="0.9" />
      <circle cx="138" cy="52" r="2.2" fill="#faddab" opacity="0.85" />
      {/* Reflection (canal) */}
      <line x1="20" y1="82" x2="160" y2="82" stroke="#a68ba8" strokeWidth="0.3" opacity="0.5" />
      <line x1="30" y1="86" x2="150" y2="86" stroke="#a68ba8" strokeWidth="0.2" opacity="0.35" />
    </svg>
  )
}

function SeatCardMini({
  italian,
  korean,
  hint,
}: {
  italian: string
  korean: string
  hint: string
}) {
  return (
    <div
      className="w-[96px] h-[132px] rounded-lg border border-gold-soft/40
                 flex flex-col items-center justify-center gap-1.5 px-2"
      style={{
        background:
          'linear-gradient(180deg, rgba(245,239,227,0.05) 0%, rgba(139,111,71,0.15) 100%)',
      }}
    >
      <div className="font-display tracking-[0.2em] text-[10px] text-gold-soft/90 uppercase text-center">
        {italian}
      </div>
      <div className="font-serif italic text-[11px] text-parch-cream/75 text-center">
        {korean}
      </div>
      <div className="mt-1 px-2 py-0.5 rounded-full border border-gold-soft/40
                      font-mono text-[9px] tracking-[0.15em] text-parch-cream/90">
        {hint}
      </div>
    </div>
  )
}

const IDENTITY_EMOJI = ['👑', '🗡', '📚', '🏹', '🔮'] as const

function MezzanotteIllustration() {
  const radius = 44
  const cx = 70
  const cy = 55
  return (
    <svg width="140" height="110" viewBox="0 0 140 110">
      <defs>
        <radialGradient id="tut-moon">
          <stop offset="0%" stopColor="#f4eedc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f4eedc" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      {/* Moon */}
      <circle cx={cx} cy={cy} r="30" fill="url(#tut-moon)" />
      <circle cx={cx} cy={cy} r="10" fill="#f4eedc" opacity="0.6" />
      {/* Pentagram positions — 5 identities */}
      {IDENTITY_EMOJI.map((emoji, i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        return (
          <g key={emoji}>
            <circle cx={x} cy={y} r="9" fill="rgba(20,12,30,0.75)" stroke="#e8d5b7" strokeWidth="0.6" />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="10"
              fontFamily="system-ui, sans-serif"
            >
              {emoji}
            </text>
          </g>
        )
      })}
      {/* Arrows (star pattern) */}
      {IDENTITY_EMOJI.map((_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const b = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2
        const x1 = cx + Math.cos(a) * (radius - 10)
        const y1 = cy + Math.sin(a) * (radius - 10)
        const x2 = cx + Math.cos(b) * (radius - 10)
        const y2 = cy + Math.sin(b) * (radius - 10)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#8b3a4a"
            strokeWidth="0.6"
            opacity="0.55"
          />
        )
      })}
      {/* Label */}
      <text
        x={cx}
        y={104}
        textAnchor="middle"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="9"
        letterSpacing="3"
        fill="#e8d5b7"
        opacity="0.85"
      >
        MEZZANOTTE
      </text>
    </svg>
  )
}

function ScoreFormula() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[280px]">
      <FormulaChip label="표면" tone="gold" />
      <span className="text-parch-cream/60">+</span>
      <FormulaChip label="슬롯" tone="gold" />
      <span className="text-parch-cream/60">+</span>
      <FormulaChip label="이벤트" tone="gold" />
      <span className="text-parch-cream/60">+</span>
      <FormulaChip label="콤보" tone="gold" />
      <span className="text-parch-cream/60">−</span>
      <FormulaChip label="몰락" tone="rose" />
    </div>
  )
}

function FormulaChip({ label, tone }: { label: string; tone: 'gold' | 'rose' }) {
  const cls =
    tone === 'gold'
      ? 'border-gold-soft/50 text-gold-soft'
      : 'border-rose-deep/60 text-rose-light'
  return (
    <span
      className={`px-2 py-0.5 rounded-full border font-mono text-[9px] tracking-[0.15em] ${cls}`}
    >
      {label}
    </span>
  )
}
