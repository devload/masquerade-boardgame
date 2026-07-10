/**
 * InfoSheet — a small bottom-sheet modal explaining the current phase, three
 * situational tips, and a placeholder button for the (future) full rules
 * modal. Used by CourtScene's top-right (?) button.
 *
 * Pure presentational: parent owns visibility state.
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { MatchPhase } from '../game/types.ts'

type Props = {
  open: boolean
  onClose: () => void
  round: number
  phase: MatchPhase
}

function copyForPhase(phase: MatchPhase, round: number): {
  headline: string
  body: string
  tips: string[]
} {
  if (phase === 'commit') {
    return {
      headline: `R${round} · 봉인 (COMMIT)`,
      body:
        '카드 한 장과 자리 한 곳을 골라 뒷면으로 봉인합니다. 상대도 동시에 봉인합니다.',
      tips: [
        '카드와 자리 모두 골라야 하단 버튼이 활성화됩니다.',
        '자리마다 선호 정체가 있어 매치되면 Slot Buff가 추가로 붙습니다.',
        '같은 자리에 서로가 봉인하면 결투가 유예되었다가 자정(R5)에 판정됩니다.',
      ],
    }
  }
  if (phase === 'reveal') {
    return {
      headline: `R${round} · 공개 (REVEAL)`,
      body: '봉인한 카드가 동시에 뒤집힙니다. 같은 자리를 노렸다면 RPS-5로 판정됩니다.',
      tips: [
        '왕족 ▶ 도둑·신비주의자',
        '학자 ▶ 왕족·신비주의자',
        '사냥꾼 ▶ 왕족·학자',
      ],
    }
  }
  if (phase === 'unmasking') {
    return {
      headline: 'MEZZANOTTE · 자정의 시선',
      body: '유예되었던 결투가 한꺼번에 판정됩니다. 패자는 추방됩니다.',
      tips: [
        '같은 정체끼리 부딪히면 동맹이 되어 자리를 공유합니다.',
        '추방이 3장을 넘기면 몰락 위험이 시작됩니다.',
        '리빌 후에는 다음 라운드가 자동으로 이어집니다.',
      ],
    }
  }
  if (phase === 'reckoning') {
    return {
      headline: 'RECKONING · 심판',
      body: '모든 라운드가 끝났습니다. 표면 점수, 정체 규칙, Slot Buff, 콤보를 합산합니다.',
      tips: [
        '표면 점수: 카드 표기 숫자 + 축제 보정',
        '콤보: 6석 이상 지배 / 같은 정체 4장 / 다섯 정체 모두 배치',
        '몰락: 추방이 EXILE_LIMIT 이상이면 총점 절반',
      ],
    }
  }
  return {
    headline: '준비 중',
    body: '잠시 후 다음 국면으로 넘어갑니다.',
    tips: [],
  }
}

export function InfoSheet({ open, onClose, round, phase }: Props) {
  const { headline, body, tips } = copyForPhase(phase, round)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto
                       rounded-t-2xl border-t border-x border-gold-soft/50
                       bg-gradient-to-b from-lavender-deep to-black
                       shadow-gold-glow"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            data-testid="info-sheet"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-parch-cream/30" />
            <div className="px-5 pt-3 pb-5">
              <div className="flex items-baseline justify-between">
                <div className="font-display text-parch-cream text-[15px] tracking-[0.15em]">
                  {headline}
                </div>
                <button
                  onClick={onClose}
                  className="font-mono text-[9px] tracking-[0.25em] text-parch-cream/60 uppercase
                             active:scale-95"
                >
                  닫기
                </button>
              </div>
              <p className="mt-2 font-serif italic text-[13px] text-parch-cream/85 leading-snug">
                {body}
              </p>
              {tips.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {tips.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-2 items-start text-[11px] text-parch-cream/75 font-body"
                    >
                      <span className="text-gold-soft/80">✦</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                disabled
                className="mt-4 w-full py-2 rounded-md border border-parch-cream/15
                           bg-black/30 text-parch-cream/40
                           font-mono text-[10px] tracking-[0.3em] uppercase cursor-not-allowed"
              >
                규칙 보기 · 준비 중
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default InfoSheet
