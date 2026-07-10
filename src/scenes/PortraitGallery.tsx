/**
 * MASQUERADE · PortraitGallery.tsx
 *
 * Developer-only preview: a scrollable 4-column grid of every one of the 40
 * procedural CardPortrait renders at 'md' size. Provided so the design team
 * can eyeball the whole deck at once and spot palette / ornament regressions.
 *
 * NOT wired into the store's scene routing. To view, temporarily import and
 * render this from src/App.tsx (see README-portrait-preview.md at repo root).
 */

import type React from 'react'
import { useState } from 'react'
import { CARDS } from '../game/cards.ts'
import CardPortrait from '../ui/CardPortrait.tsx'

export default function PortraitGallery(): React.JSX.Element {
  const [faceDown, setFaceDown] = useState(false)

  return (
    <div
      className="w-full h-full overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse 100% 55% at 50% 10%, rgba(232,213,183,0.18) 0%, transparent 55%), linear-gradient(178deg, #241628 0%, #1a1220 45%, #2a1420 100%)',
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-[0.28em] text-parch-cream">
              PORTRAIT GALLERY
            </h1>
            <div className="mt-1 font-serif italic text-[13px] text-gold-soft/70 tracking-wide">
              40 procedural guest masks · dev preview
            </div>
          </div>
          <button
            onClick={() => setFaceDown((v) => !v)}
            className="px-4 py-2 rounded-full border border-gold-soft/50 font-display tracking-[0.25em]
                       text-[11px] text-gold-soft uppercase bg-gradient-to-b from-white/[0.03] to-black/20
                       hover:border-gold-soft hover:text-parch-cream active:scale-95 transition"
          >
            {faceDown ? 'Reveal All' : 'Flip All'}
          </button>
        </header>

        <div className="grid grid-cols-4 gap-4 justify-items-center">
          {CARDS.map((card) => (
            <CardPortrait key={card.id} card={card} size="md" faceDown={faceDown} />
          ))}
        </div>

        <footer className="mt-8 font-mono text-[10px] tracking-[0.3em] text-parch-cream/40 uppercase text-center">
          {CARDS.length} guests · procedural v0.1
        </footer>
      </div>
    </div>
  )
}
