/**
 * MASQUERADE · 가면의 무도회 (Il Ballo dei Volti Argentati)
 *
 * v0 · scaffold only. Domain logic ports from docs/simulations/
 * masquerade-sim-v2.mjs into TypeScript modules under src/game/.
 *
 * Rules brief: docs/GAMEPLAN.md
 * Characters:  docs/CHARACTERS.md
 * World:       docs/WORLD.md
 * UX flow:     docs/UX.md
 */
export default function App() {
  return (
    <div className="w-full h-full flex flex-col pt-safe pb-safe overflow-hidden">
      <div className="pointer-events-none absolute inset-0"
           style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(232,213,183,0.2), transparent 60%)' }} />

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <div className="font-mono text-[10px] tracking-[0.35em] text-cocoa-light uppercase">
          // Il Ballo dei Volti Argentati
        </div>
        <h1 className="font-display font-bold text-6xl leading-none tracking-widest text-cocoa text-center"
            style={{ textShadow: '0 2px 12px rgba(196,139,110,0.25)' }}>
          MASQUERADE
        </h1>

        {/* Ornament flourish */}
        <div className="flex items-center gap-2 opacity-70">
          <span className="w-8 h-px bg-gold" />
          <span className="font-display text-gold text-sm">✦</span>
          <span className="w-8 h-px bg-gold" />
        </div>

        <div className="font-serif italic text-lg text-cocoa-light text-center leading-relaxed max-w-xs mt-2">
          가면 뒤 자리 다툼,<br />
          자정에 밝혀지는 정체.
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="font-mono text-[10px] tracking-widest text-cocoa-light uppercase">
            Ombra Kingdom · 1780
          </div>
          <div className="font-mono text-[9px] tracking-[0.3em] text-cocoa-light/70 uppercase">
            Design Phase · No Play Yet
          </div>
        </div>
      </div>

      {/* Footer status */}
      <div className="relative pb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-parch-light border border-cocoa-light/25 shadow-card-lift">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-cocoa-light uppercase">
            v0.0 · scaffold
          </span>
        </div>
      </div>
    </div>
  )
}
