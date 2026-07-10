/**
 * UnmaskingScene — R5 cutscene stub.
 *
 * Shows the MEZZANOTTE title card, then after ~3s dispatches revealCommits()
 * (which resolves every deferred pending duel in one pass) and routes back to
 * the court. A Skip button is provided for dev convenience.
 */

import { useEffect } from 'react'

import { useMatchStore } from '../store/matchStore.ts'
import { NightAmbience } from '../ui/NightAmbience.tsx'

export function UnmaskingScene() {
  const revealAndAdvance = useMatchStore((s) => s.revealAndAdvance)
  const goto = useMatchStore((s) => s.goto)

  const resolveAndReturn = () => {
    revealAndAdvance() // resolves all pending duels while phase='unmasking'
    goto('court')
  }

  useEffect(() => {
    const t = setTimeout(resolveAndReturn, 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="full" showFlourishes={false} />

      {/* Vignette overlay for cutscene drama */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Skip button */}
      <button
        onClick={resolveAndReturn}
        className="absolute top-4 right-4 z-20 pt-safe
                   px-3 py-1 rounded-full border border-gold-soft/30
                   font-mono text-[9px] tracking-[0.3em] text-gold-soft/60 uppercase
                   hover:text-parch-cream hover:border-gold-soft/60 transition"
      >
        Skip
      </button>

      {/* Center title */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="flex items-center gap-3 opacity-80">
          <span className="w-10 h-px bg-gold-soft/50" />
          <span className="font-mono text-[9px] tracking-[0.4em] text-gold-soft/70 uppercase">
            R V · Mezzanotte
          </span>
          <span className="w-10 h-px bg-gold-soft/50" />
        </div>

        <div className="text-center">
          <div className="font-display text-parch-cream text-[13px] tracking-[0.3em] mb-3 opacity-70">
            ⊙ · ⊙
          </div>
          <h1
            className="font-display font-bold text-parch-cream tracking-[0.32em] text-[36px] leading-none"
            style={{
              textShadow:
                '0 0 32px rgba(232,213,183,0.45), 0 2px 12px rgba(139,58,74,0.55)',
            }}
          >
            MEZZANOTTE
          </h1>
          <div className="mt-5 font-serif italic text-[16px] text-gold-soft/70 tracking-wide">
            자정, 가면이 벗겨진다
          </div>
          <div className="mt-2 font-mono text-[9px] tracking-[0.25em] text-parch-cream/40 uppercase">
            // 12번의 종소리로 800년의 관습이 완성된다
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-60">
          <span className="font-display text-rose-light text-[13px]">✦</span>
          <span className="font-display text-rose-light text-[13px]">✦</span>
          <span className="font-display text-rose-light text-[13px]">✦</span>
        </div>
      </div>
    </div>
  )
}
