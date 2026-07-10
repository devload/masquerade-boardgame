/**
 * ReckoningScene — end-of-match tally placeholder.
 *
 * Reads scoreAll(match) and prints both score breakdowns side by side plus a
 * winner line. Not the full sceneographic reckoning ceremony from UX.md — just
 * a scaffolded readout that confirms the domain scoring is correct end-to-end.
 */

import { scoreAll } from '../game/scoring.ts'
import type { ScoreBreakdown } from '../game/types.ts'
import { useMatchStore } from '../store/matchStore.ts'
import { NightAmbience } from '../ui/NightAmbience.tsx'

export function ReckoningScene() {
  const match = useMatchStore((s) => s.match)
  const resetToLobby = useMatchStore((s) => s.resetToLobby)

  if (!match) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <NightAmbience intensity="full" />
      </div>
    )
  }

  const { me, opponent, winner } = scoreAll(match)

  const winnerText =
    winner === 'tie'
      ? '무승부 · Pareggio'
      : winner === 'me'
        ? `승리 · Vittoria (${me.total} vs ${opponent.total})`
        : `말콤 백작 승리 · ${opponent.total} vs ${me.total}`

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="full" />

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-safe pt-6 gap-4 overflow-y-auto">
        <div className="flex items-center gap-3 opacity-80">
          <span className="w-10 h-px bg-gold-soft/50" />
          <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/70 uppercase">
            Il Bilancio
          </span>
          <span className="w-10 h-px bg-gold-soft/50" />
        </div>

        <h1
          className="font-display font-bold text-parch-cream tracking-[0.28em] text-[32px] leading-none"
          style={{
            textShadow:
              '0 0 32px rgba(232,213,183,0.4), 0 2px 12px rgba(139,58,74,0.5)',
          }}
        >
          RECKONING
        </h1>
        <div className="font-serif italic text-[13px] text-gold-soft/70">
          자정 이후의 셈
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-[380px] mt-2">
          <ScoreCard title="나" italian="Il Conte" breakdown={me} highlight={winner === 'me'} />
          <ScoreCard
            title="말콤 백작"
            italian="L'Avversario"
            breakdown={opponent}
            highlight={winner === 'opponent'}
          />
        </div>

        <div
          className="mt-3 px-5 py-3 rounded-md border border-gold-soft/40
                     bg-gradient-to-b from-white/[0.03] to-black/25
                     font-display tracking-[0.28em] text-[13px] text-parch-cream text-center"
          style={{
            textShadow: '0 0 12px rgba(232,213,183,0.35)',
          }}
        >
          {winnerText}
        </div>

        <button
          onClick={resetToLobby}
          className="mt-2 relative group active:scale-95 transition-transform"
        >
          <div className="absolute -inset-2 bg-gold-soft/15 rounded-full blur-lg group-hover:bg-gold-soft/30 transition" />
          <div
            className="relative px-6 py-2.5 border border-gold-soft/50 rounded-full
                       font-display tracking-[0.3em] text-[11px] text-gold-soft uppercase
                       bg-gradient-to-b from-white/[0.03] to-black/20
                       group-hover:border-gold-soft group-hover:text-parch-cream transition"
          >
            다시 시작
          </div>
        </button>

        <div className="h-6" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────── ScoreCard ── */

type ScoreCardProps = {
  title: string
  italian: string
  breakdown: ScoreBreakdown
  highlight: boolean
}

function ScoreCard({ title, italian, breakdown, highlight }: ScoreCardProps) {
  const rows: [string, number][] = [
    ['표면', breakdown.surface],
    ['정체', breakdown.identity],
    ['자리 버프', breakdown.slotBuff],
    ['이벤트', breakdown.event],
    ['추방', breakdown.exile],
    ['콤보', breakdown.combo],
  ]

  return (
    <div
      className={`rounded-md p-3 border bg-black/30 backdrop-blur-sm
                  ${
                    highlight
                      ? 'border-gold-soft/70 shadow-gold-glow'
                      : 'border-parch-cream/15'
                  }`}
    >
      <div className="text-center mb-2">
        <div className="font-display text-parch-cream text-[13px] tracking-[0.2em]">
          {title}
        </div>
        <div className="font-serif italic text-[9px] text-gold-soft/60 tracking-wide">
          {italian}
        </div>
      </div>
      <div className="space-y-1 pb-2 border-b border-parch-cream/10">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between font-mono text-[10px]"
          >
            <span className="text-parch-cream/50 tracking-widest uppercase">{label}</span>
            <span
              className={
                value < 0
                  ? 'text-rose-light'
                  : value > 0
                    ? 'text-gold-soft'
                    : 'text-parch-cream/40'
              }
            >
              {value > 0 ? '+' : ''}
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-mono text-[9px] tracking-widest text-parch-cream/50 uppercase">
          Total
        </span>
        <span className="font-display font-bold text-parch-cream text-[24px] leading-none">
          {breakdown.total}
        </span>
      </div>
    </div>
  )
}
