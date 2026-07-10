/**
 * RulesModal — the persistent Help / Rules modal, mounted at the App level so
 * it can overlay any scene. Toggled through the store field `showRules`.
 *
 * Tabs (sections):
 *   1. 게임 흐름 (Ordine del ballo)
 *   2. 정체 · RPS-5
 *   3. 원탁의 자리 · 슬롯 버프
 *   4. 왕궁 이벤트
 *   5. 결투 · 몰락
 *   6. 채점 (Reckoning)
 *
 * The modal preserves the lobby palette: parchment/gold/rose on a dim
 * lavender-deep backdrop. Cormorant serif body, Cinzel headers, Space Mono
 * eyebrows.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { RULES } from '../game/match.ts'
import { IDENTITY_LABEL, SEATS } from '../game/types.ts'
import type { Identity } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'

type SectionKey =
  | 'flow'
  | 'rps5'
  | 'seats'
  | 'events'
  | 'combat'
  | 'scoring'

const SECTIONS: { key: SectionKey; label: string; eyebrow: string }[] = [
  { key: 'flow',    label: '게임 흐름', eyebrow: 'ORDINE' },
  { key: 'rps5',    label: '정체 · RPS-5', eyebrow: 'IDENTITÀ' },
  { key: 'seats',   label: '자리 · 슬롯 버프', eyebrow: 'TAVOLO' },
  { key: 'events',  label: '왕궁 이벤트', eyebrow: 'EVENTI' },
  { key: 'combat',  label: '결투 · 몰락', eyebrow: 'DUELLO' },
  { key: 'scoring', label: '점수 계산', eyebrow: 'RECKONING' },
]

export function RulesModal() {
  const showRules = useMatchStore((s) => s.showRules)
  const setShowRules = useMatchStore((s) => s.setShowRules)
  const [section, setSection] = useState<SectionKey>('flow')

  return (
    <AnimatePresence>
      {showRules && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: 'rgba(16,10,28,0.92)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          data-testid="rules-modal"
        >
          <motion.div
            className="relative flex-1 flex flex-col overflow-hidden"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Header onClose={() => setShowRules(false)} />
            <TabBar active={section} onSelect={setSection} />
            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-2 text-parch-cream/90">
              {section === 'flow' && <FlowSection />}
              {section === 'rps5' && <Rps5Section />}
              {section === 'seats' && <SeatsSection />}
              {section === 'events' && <EventsSection />}
              {section === 'combat' && <CombatSection />}
              {section === 'scoring' && <ScoringSection />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────── Chrome ── */

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative pt-safe pt-4 pb-3 px-6 flex items-center justify-between border-b border-gold-soft/15">
      <div className="flex items-center gap-3">
        <span className="w-6 h-px bg-gold-soft/60" />
        <div>
          <div className="font-mono text-[9px] tracking-[0.45em] text-gold-soft/70 uppercase">
            IL LIBRO
          </div>
          <div className="font-display tracking-[0.24em] text-[16px] text-parch-cream">
            무도회의 규칙
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="닫기"
        className="w-10 h-10 rounded-full border border-gold-soft/40
                   flex items-center justify-center
                   text-gold-soft/85 hover:text-parch-cream
                   hover:border-gold-soft transition active:scale-95"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M 2 2 L 12 12 M 12 2 L 2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function TabBar({
  active,
  onSelect,
}: {
  active: SectionKey
  onSelect: (k: SectionKey) => void
}) {
  return (
    <div className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
      {SECTIONS.map((s) => {
        const isActive = s.key === active
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={`flex-none px-3 py-1.5 rounded-full text-[10px] font-mono tracking-[0.18em] uppercase transition
              ${
                isActive
                  ? 'bg-gold-soft/20 border border-gold-soft/70 text-parch-cream'
                  : 'border border-gold-soft/20 text-parch-cream/55 hover:text-parch-cream/85 hover:border-gold-soft/40'
              }`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────── Section 1 ── */

function FlowSection() {
  const phases: { round: string; title: string; body: string; icon: string }[] = [
    { round: 'R1', title: 'Commit',    body: '카드+자리 face-down 봉인 · 서로 다른 자리면 평화 배치',       icon: '🎴' },
    { round: 'R2', title: 'Commit',    body: '같은 자리면 결투는 자정까지 유예 · face-down 스택',              icon: '🕯' },
    { round: 'R3', title: 'Evento',    body: '왕궁 이벤트 발동 (6종 중 1) · 판이 흔들림',                        icon: '🎪' },
    { round: 'R4', title: 'Commit',    body: '마지막 유예 · 다음 라운드는 자정',                                    icon: '⏳' },
    { round: 'R5', title: 'Mezzanotte', body: 'GRAND UNMASKING · 정체 공개, 유예 결투 정산',                    icon: '🌙' },
    { round: 'R6', title: 'Evento',    body: '두 번째 이벤트 · 후반부 균형 재편',                                  icon: '🎪' },
    { round: 'R7', title: 'Sfida',     body: '챌린지 개방 · 점유된 자리에 직접 도전 가능',                       icon: '⚔️' },
    { round: 'R8', title: 'Reckoning',  body: '최종 봉인 · 왼→오 채점',                                              icon: '🏆' },
  ]
  return (
    <section>
      <SectionTitle title="라운드의 순서" subtitle="Ordine del Ballo · 8라운드" />
      <div className="mt-4 flex flex-col gap-2.5">
        {phases.map((p) => (
          <div
            key={p.round}
            className="flex items-start gap-3 p-3 rounded-lg border border-gold-soft/15"
            style={{ background: 'rgba(50,32,58,0.55)' }}
          >
            <div className="flex-none w-9 h-9 rounded-full border border-gold-soft/40 flex items-center justify-center text-[14px]">
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[9px] tracking-[0.3em] text-gold-soft/80 uppercase">
                  {p.round}
                </span>
                <span className="font-display tracking-[0.15em] text-[13px] text-parch-cream">
                  {p.title}
                </span>
              </div>
              <div className="mt-1 font-serif italic text-[12px] text-parch-cream/75 leading-relaxed">
                {p.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────── Section 2 ── */

const RPS5_ORDER: Identity[] = ['Royalty', 'Thief', 'Mystic', 'Hunter', 'Scholar']
const RPS5_EMOJI: Record<Identity, string> = {
  Royalty: '👑',
  Thief: '🗡',
  Scholar: '📚',
  Hunter: '🏹',
  Mystic: '🔮',
}

// A crushes B (in-game duel outcome — a wins). Precomputed for the diagram.
const CRUSHES: [Identity, Identity][] = [
  ['Royalty', 'Thief'],
  ['Royalty', 'Mystic'],
  ['Thief', 'Scholar'],
  ['Thief', 'Hunter'],
  ['Scholar', 'Royalty'],
  ['Scholar', 'Mystic'],
  ['Hunter', 'Royalty'],
  ['Hunter', 'Scholar'],
  ['Mystic', 'Thief'],
  ['Mystic', 'Hunter'],
]

function Rps5Section() {
  const cx = 130
  const cy = 130
  const r = 96
  const positions = RPS5_ORDER.map((id, i) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
    return {
      id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    }
  })
  const posOf = (id: Identity) => positions.find((p) => p.id === id)!

  return (
    <section>
      <SectionTitle title="정체 · RPS-5" subtitle="다섯 정체가 서로 물고 물린다" />
      <div className="mt-2 flex justify-center">
        <svg width="260" height="260" viewBox="0 0 260 260">
          {/* Halo */}
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#e8d5b7" strokeWidth="0.4" opacity="0.35" />
          {/* Arrows */}
          {CRUSHES.map(([a, b], i) => {
            const pa = posOf(a)
            const pb = posOf(b)
            const dx = pb.x - pa.x
            const dy = pb.y - pa.y
            const len = Math.sqrt(dx * dx + dy * dy)
            const ux = dx / len
            const uy = dy / len
            const inset = 22
            const x1 = pa.x + ux * inset
            const y1 = pa.y + uy * inset
            const x2 = pb.x - ux * inset
            const y2 = pb.y - uy * inset
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#8b3a4a"
                  strokeWidth="0.9"
                  opacity="0.55"
                />
                {/* Arrowhead */}
                <polygon
                  points={`${x2},${y2} ${x2 - ux * 6 - uy * 3},${y2 - uy * 6 + ux * 3} ${x2 - ux * 6 + uy * 3},${y2 - uy * 6 - ux * 3}`}
                  fill="#8b3a4a"
                  opacity="0.7"
                />
              </g>
            )
          })}
          {/* Identity nodes */}
          {positions.map((p) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r="20" fill="rgba(24,14,32,0.9)" stroke="#e8d5b7" strokeWidth="0.7" />
              <text
                x={p.x}
                y={p.y + 6}
                textAnchor="middle"
                fontSize="18"
                fontFamily="system-ui, sans-serif"
              >
                {RPS5_EMOJI[p.id]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {RPS5_ORDER.map((id) => (
          <div
            key={id}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-gold-soft/15"
            style={{ background: 'rgba(50,32,58,0.55)' }}
          >
            <div className="text-[18px]">{RPS5_EMOJI[id]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display tracking-[0.15em] text-[12px] text-parch-cream">
                {IDENTITY_LABEL[id]}
              </div>
              <div className="mt-0.5 font-serif italic text-[11px] text-parch-cream/70">
                {IDENTITY_BLURB[id]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-serif italic text-[12px] text-parch-cream/60 leading-relaxed text-center">
        각 정체는 두 정체를 이기고 두 정체에게 진다.<br />
        같은 정체끼리는 <span className="not-italic text-gold-soft/85">동맹</span>이 되어 자리를 나눈다.
      </p>
    </section>
  )
}

const IDENTITY_BLURB: Record<Identity, string> = {
  Royalty: '왕궁 왕족 자리 하나당 +3 · 도둑과 신비주의를 짓누른다.',
  Thief:   '인접 상대 카드의 표면 절반을 훔친다 · 학자와 사냥꾼을 앞선다.',
  Scholar: '자리 번호와 카드 번호가 맞으면 +8 · 왕족과 신비를 반박한다.',
  Hunter:  '인접 아이콘이 겹치면 +5 · 왕족과 학자를 사냥한다.',
  Mystic:  '왕궁 정체 종류당 +2 · 도둑과 사냥꾼을 홀린다.',
}

/* ─────────────────────────────────────────────── Section 3 ── */

function SeatsSection() {
  return (
    <section>
      <SectionTitle title="원탁의 8자리" subtitle="Tavolo dei Otto · 자리마다 총애가 다르다" />
      <div className="mt-4 flex flex-col gap-2">
        {SEATS.map((seat) => (
          <div
            key={seat.seat}
            className="flex items-center gap-3 p-3 rounded-lg border border-gold-soft/15"
            style={{ background: 'rgba(50,32,58,0.55)' }}
          >
            <div className="flex-none w-8 h-8 rounded-full border border-gold-soft/50 flex items-center justify-center font-display text-[13px] text-gold-soft">
              {seat.seat}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display tracking-[0.2em] text-[12px] text-gold-soft/90 uppercase">
                  {seat.italian}
                </span>
                <span className="font-serif italic text-[11px] text-parch-cream/70">
                  {seat.korean}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-parch-cream/85">
                <span>{RPS5_EMOJI[seat.favors]}</span>
                <span>+{seat.bonus}</span>
                {seat.note && (
                  <span className="font-serif italic text-parch-cream/60 normal-case">
                    · {seat.note}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────── Section 4 ── */

function EventsSection() {
  const events = [
    { icon: '👑', name: '왕이 도착', italian: "L'Arrivo del Re",   effect: '모든 왕족 카드 +5' },
    { icon: '⛓',  name: '도둑 검거', italian: 'La Cattura',         effect: '모든 도둑 -3' },
    { icon: '📖', name: '학자 초청', italian: 'Il Simposio',        effect: '학자 매치 조건 ±2' },
    { icon: '🎪', name: '가면 축제', italian: 'Il Festival',        effect: '모든 카드 표면 +1' },
    { icon: '🌫', name: '신비 안개', italian: 'La Nebbia',          effect: '모든 신비주의 +5' },
    { icon: '🏹', name: '사냥 대회', italian: 'La Grande Caccia',   effect: '모든 사냥꾼 +5' },
  ]
  return (
    <section>
      <SectionTitle title="왕궁 이벤트" subtitle="R3와 R6에 각 1회 · 6종 중 무작위" />
      <div className="mt-4 flex flex-col gap-2">
        {events.map((e) => (
          <div
            key={e.name}
            className="flex items-center gap-3 p-3 rounded-lg border border-gold-soft/15"
            style={{ background: 'rgba(50,32,58,0.55)' }}
          >
            <div className="flex-none w-10 h-10 rounded-full border border-gold-soft/40 flex items-center justify-center text-[18px]">
              {e.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display tracking-[0.15em] text-[12px] text-parch-cream">
                  {e.name}
                </span>
                <span className="font-serif italic text-[10px] text-gold-soft/70">
                  {e.italian}
                </span>
              </div>
              <div className="mt-0.5 font-serif italic text-[12px] text-parch-cream/75">
                {e.effect}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────── Section 5 ── */

function CombatSection() {
  return (
    <section>
      <SectionTitle title="결투 · 몰락" subtitle="Duello e Rovina" />
      <div className="mt-4 flex flex-col gap-3">
        <RuleBlock
          eyebrow="R1 — R4"
          title="유예 결투"
          body="같은 자리에 봉인이 겹치면 두 카드가 face-down으로 자리에 쌓이고, R5 자정까지 결과가 미뤄집니다."
        />
        <RuleBlock
          eyebrow="R5 · MEZZANOTTE"
          title="일괄 정산"
          body="정체가 공개되며 유예 결투가 순서대로 판정됩니다. 승자가 자리를 갖고, 패자는 추방석으로."
        />
        <RuleBlock
          eyebrow={`R${RULES.CHALLENGE_ALLOWED_FROM} — R${RULES.MAX_ROUNDS}`}
          title="챌린지"
          body="점유된 상대 자리에 즉시 도전할 수 있습니다. 이기면 그 자리를 뺏고, 지면 내 카드가 추방됩니다."
        />
        <RuleBlock
          eyebrow="ROVINA"
          title={`몰락 · 추방 ${RULES.EXILE_LIMIT}장`}
          body={`한쪽 추방석에 카드 ${RULES.EXILE_LIMIT}장이 쌓이면 그 감독은 즉시 패배합니다. 장당 ${RULES.EXILE_PENALTY}점의 페널티도 함께.`}
          tone="rose"
        />
        <RuleBlock
          eyebrow="ALLEANZA"
          title="동맹"
          body="결투에 나선 두 카드가 같은 정체면 우아하게 동맹이 되어 자리에 함께 남고, 점수는 반씩 나눕니다."
        />
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────── Section 6 ── */

function ScoringSection() {
  return (
    <section>
      <SectionTitle title="채점의 셈법" subtitle="Reckoning · 왼→오 스캔" />
      <div className="mt-4 flex flex-col gap-3">
        <RuleBlock
          eyebrow="① 표면"
          title="Volto"
          body="각 자리 주인은 그 카드의 표면 점수를 그대로 얻습니다."
        />
        <RuleBlock
          eyebrow="② 정체 규칙"
          title="Identità"
          body="정체마다 자기 자리에서 발동하는 규칙이 있습니다 (RPS-5 탭 참조)."
        />
        <RuleBlock
          eyebrow="③ 슬롯 버프"
          title="Trono · Vicolo · ..."
          body="자리가 그 정체를 총애하면 추가 점수. Slot 5 · 8은 특별 규칙."
        />
        <RuleBlock
          eyebrow="④ 이벤트"
          title="Eventi"
          body="R3·R6에 발동된 왕궁 이벤트의 효과가 반영됩니다."
        />
        <RuleBlock
          eyebrow="⑤ 콤보"
          title="Combo"
          body="왕궁 지배(6+ 자리) +15 · 가문의 위엄(한 정체 4명+) +15 · 완벽한 무도회(5정체 다 등장) +10 · 평화의 무도회(결투 0회) +20."
        />
        <RuleBlock
          eyebrow="⑥ 추방"
          title="Esilio"
          body={`추방된 카드 한 장당 ${RULES.EXILE_PENALTY}점. ${RULES.EXILE_LIMIT}장 도달 시 그 감독은 몰락합니다.`}
          tone="rose"
        />
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────── Shared blocks ── */

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pt-4 pb-2">
      <div className="font-display tracking-[0.22em] text-[15px] text-parch-cream">
        {title}
      </div>
      <div className="mt-1 font-serif italic text-[12px] text-gold-soft/70">
        {subtitle}
      </div>
      <div className="mt-2 flex items-center gap-2 opacity-70">
        <span className="w-6 h-px bg-rose-deep/70" />
        <span className="font-display text-rose-light text-[10px]">✦</span>
        <span className="w-16 h-px bg-rose-deep/70" />
      </div>
    </div>
  )
}

function RuleBlock({
  eyebrow,
  title,
  body,
  tone = 'gold',
}: {
  eyebrow: string
  title: string
  body: string
  tone?: 'gold' | 'rose'
}) {
  const borderCls =
    tone === 'rose' ? 'border-rose-deep/40' : 'border-gold-soft/20'
  const eyebrowCls =
    tone === 'rose' ? 'text-rose-light/80' : 'text-gold-soft/80'
  return (
    <div
      className={`p-3.5 rounded-lg border ${borderCls}`}
      style={{ background: 'rgba(50,32,58,0.55)' }}
    >
      <div className={`font-mono text-[9px] tracking-[0.3em] uppercase ${eyebrowCls}`}>
        {eyebrow}
      </div>
      <div className="mt-1 font-display tracking-[0.14em] text-[13px] text-parch-cream">
        {title}
      </div>
      <div className="mt-1.5 font-serif italic text-[12px] text-parch-cream/75 leading-relaxed">
        {body}
      </div>
    </div>
  )
}
