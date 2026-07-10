/**
 * LobbyScene — the title / entry screen.
 *
 * Ported verbatim from the original title-screen `App.tsx`. Visuals unchanged;
 * only the Entra al Ballo button is now wired to startMatch() → the store
 * then routes to CourtScene.
 */

import { useMatchStore } from '../store/matchStore.ts'
import { NightAmbience } from '../ui/NightAmbience.tsx'

export function LobbyScene() {
  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <NightAmbience intensity="full" />

      {/* Content column */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 px-8 pt-safe">
        <YearOrnament />

        <div className="animate-mask-drift">
          <MasqueradeMask />
        </div>

        <TitleBlock />

        <RoseDivider />

        <div className="font-serif italic text-[15px] text-parch-cream/60 text-center leading-relaxed max-w-[240px]">
          가면 뒤 자리 다툼,<br />
          자정에 밝혀지는 정체.
        </div>

        <EnterButton />

        <div className="mt-2 font-mono text-[9px] tracking-[0.35em] text-parch-cream/30 uppercase">
          Ombra Kingdom · Solo Rival
        </div>
      </div>

      <VersionChip />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── Title ── */

function YearOrnament() {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 h-px bg-gradient-to-r from-transparent to-gold-soft/60 animate-shimmer-line" />
      <span className="font-mono text-[9px] tracking-[0.45em] text-gold-soft/80 uppercase">
        MDCCLXXX
      </span>
      <span className="w-12 h-px bg-gradient-to-l from-transparent to-gold-soft/60 animate-shimmer-line" />
    </div>
  )
}

function TitleBlock() {
  return (
    <div className="text-center -mt-1">
      <h1
        className="font-display font-bold text-[42px] tracking-[0.24em] text-parch-cream leading-none"
        style={{
          textShadow: '0 0 32px rgba(232,213,183,0.4), 0 2px 12px rgba(139,58,74,0.5)',
        }}
      >
        MASQUERADE
      </h1>
      <div className="mt-3 font-serif italic text-[13px] text-gold-soft/70 tracking-wide">
        Il Ballo dei Volti Argentati
      </div>
    </div>
  )
}

function RoseDivider() {
  return (
    <div className="flex items-center gap-2.5 opacity-80 my-1">
      <span className="w-8 h-px bg-rose-deep/70" />
      <span className="font-display text-rose-light text-[13px]">✦</span>
      <span className="w-8 h-px bg-rose-deep/70" />
    </div>
  )
}

function EnterButton() {
  const startMatch = useMatchStore((s) => s.startMatch)
  return (
    <button
      className="mt-6 relative group active:scale-95 transition-transform"
      onClick={() => {
        startMatch()
      }}
    >
      <div className="absolute -inset-2 bg-gold-soft/15 rounded-full blur-lg group-hover:bg-gold-soft/30 transition" />
      <div
        className="relative px-8 py-3 border border-gold-soft/50 rounded-full
                   font-display tracking-[0.35em] text-[12px] text-gold-soft uppercase
                   bg-gradient-to-b from-white/[0.03] to-black/20
                   group-hover:border-gold-soft group-hover:text-parch-cream transition"
      >
        Entra al Ballo
      </div>
    </button>
  )
}

function VersionChip() {
  return (
    <div className="relative pb-4 flex justify-center pb-safe">
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                   bg-lavender-deep/40 border border-gold-soft/15 backdrop-blur-sm"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-light animate-pulse" />
        <span className="font-mono text-[9px] tracking-[0.3em] text-parch-cream/50 uppercase">
          v0.1 · scaffold
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── Mask ── */

function MasqueradeMask() {
  return (
    <svg viewBox="0 0 260 200" width="240" className="drop-shadow-[0_10px_36px_rgba(139,58,74,0.55)]">
      <defs>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f4eedc" />
          <stop offset="35%" stopColor="#d0c2a2" />
          <stop offset="70%" stopColor="#95845e" />
          <stop offset="100%" stopColor="#5c4e34" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#faddab" />
          <stop offset="35%" stopColor="#d4a866" />
          <stop offset="70%" stopColor="#96703a" />
          <stop offset="100%" stopColor="#5c4218" />
        </linearGradient>
        <radialGradient id="maskAura">
          <stop offset="0%" stopColor="rgba(232,213,183,0.22)" />
          <stop offset="60%" stopColor="rgba(232,213,183,0.05)" />
          <stop offset="100%" stopColor="rgba(232,213,183,0)" />
        </radialGradient>
        <filter id="maskGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="jewelGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo aura */}
      <ellipse cx="130" cy="100" rx="128" ry="88" fill="url(#maskAura)" />

      {/* Feather plumes — left (silver) */}
      <g opacity="0.75">
        <path d="M 78 42 Q 58 6, 40 12 Q 52 18, 62 28 Q 50 22, 44 30 Q 60 32, 70 38 Q 58 32, 54 40 Q 68 40, 78 42 Z"
              fill="url(#silverGrad)" />
        <path d="M 96 34 Q 84 2, 66 4 Q 78 12, 88 22 Q 78 16, 74 22 Q 86 24, 96 34 Z"
              fill="url(#silverGrad)" opacity="0.8" />
      </g>
      {/* Feather plumes — right (gold) */}
      <g opacity="0.75">
        <path d="M 182 42 Q 202 6, 220 12 Q 208 18, 198 28 Q 210 22, 216 30 Q 200 32, 190 38 Q 202 32, 206 40 Q 192 40, 182 42 Z"
              fill="url(#goldGrad)" />
        <path d="M 164 34 Q 176 2, 194 4 Q 182 12, 172 22 Q 182 16, 186 22 Q 174 24, 164 34 Z"
              fill="url(#goldGrad)" opacity="0.8" />
      </g>

      {/* Silver half (left) — Venetian Colombina style, elongated */}
      <path
        d="M 130 46
           Q 82 42, 60 62
           Q 48 78, 50 96
           Q 54 118, 74 138
           Q 96 156, 118 156
           Q 130 154, 130 138
           Z"
        fill="url(#silverGrad)"
        filter="url(#maskGlow)"
      />

      {/* Gold half (right) */}
      <path
        d="M 130 46
           Q 178 42, 200 62
           Q 212 78, 210 96
           Q 206 118, 186 138
           Q 164 156, 142 156
           Q 130 154, 130 138
           Z"
        fill="url(#goldGrad)"
        filter="url(#maskGlow)"
      />

      {/* Center split (delicate line) */}
      <line x1="130" y1="46" x2="130" y2="152" stroke="#8b6f47" strokeWidth="0.5" opacity="0.5" />

      {/* Eye almond shapes */}
      <path d="M 76 84 Q 88 72, 106 80 Q 100 96, 82 94 Q 74 90, 76 84 Z" fill="#0a0510" />
      <path d="M 184 84 Q 172 72, 154 80 Q 160 96, 178 94 Q 186 90, 184 84 Z" fill="#0a0510" />

      {/* Eye rims (metallic edge) */}
      <path d="M 76 84 Q 88 72, 106 80 Q 100 96, 82 94 Q 74 90, 76 84 Z"
            fill="none" stroke="#d0c2a2" strokeWidth="1" opacity="0.95" />
      <path d="M 184 84 Q 172 72, 154 80 Q 160 96, 178 94 Q 186 90, 184 84 Z"
            fill="none" stroke="#d4a866" strokeWidth="1" opacity="0.95" />

      {/* Elegant swirls above eyes */}
      <path d="M 54 60 Q 68 42, 96 56 Q 88 72, 70 68 Q 62 66, 60 74"
            fill="none" stroke="#faddab" strokeWidth="1.2" opacity="0.9" strokeLinecap="round" />
      <path d="M 206 60 Q 192 42, 164 56 Q 172 72, 190 68 Q 198 66, 200 74"
            fill="none" stroke="#f4eedc" strokeWidth="1.2" opacity="0.9" strokeLinecap="round" />

      {/* Curling filigree on sides */}
      <path d="M 60 100 Q 50 108, 54 118 Q 62 122, 66 116"
            fill="none" stroke="#faddab" strokeWidth="0.8" opacity="0.75" strokeLinecap="round" />
      <path d="M 200 100 Q 210 108, 206 118 Q 198 122, 194 116"
            fill="none" stroke="#f4eedc" strokeWidth="0.8" opacity="0.75" strokeLinecap="round" />

      {/* Cheek rose motifs */}
      <g>
        <circle cx="72" cy="118" r="3.5" fill="#8b3a4a" opacity="0.85" />
        <circle cx="72" cy="117" r="1.3" fill="#f4eedc" opacity="0.8" />
        <path d="M 68 118 Q 72 114, 76 118" fill="none" stroke="#8b3a4a" strokeWidth="0.5" opacity="0.6" />
      </g>
      <g>
        <circle cx="188" cy="118" r="3.5" fill="#8b3a4a" opacity="0.85" />
        <circle cx="188" cy="117" r="1.3" fill="#f4eedc" opacity="0.8" />
        <path d="M 184 118 Q 188 114, 192 118" fill="none" stroke="#8b3a4a" strokeWidth="0.5" opacity="0.6" />
      </g>

      {/* Forehead jewel setting */}
      <g filter="url(#jewelGlow)">
        <ellipse cx="130" cy="58" rx="7" ry="8" fill="#8b3a4a" />
        <ellipse cx="130" cy="56" rx="3" ry="4" fill="#faddab" opacity="0.95" />
        <circle cx="130" cy="55" r="1.1" fill="#fff" opacity="0.9" />
      </g>
      {/* Jewel prongs */}
      <path d="M 123 58 L 118 62" stroke="#c4a068" strokeWidth="0.8" opacity="0.7" />
      <path d="M 137 58 L 142 62" stroke="#d0c2a2" strokeWidth="0.8" opacity="0.7" />
      <path d="M 130 66 L 130 71" stroke="#c4a068" strokeWidth="0.6" opacity="0.6" />

      {/* Nose shading — angular Venetian bridge */}
      <path d="M 130 88 Q 126 108, 128 128 Q 130 136, 134 128 Q 136 108, 130 88 Z"
            fill="rgba(0,0,0,0.25)" />
      <path d="M 130 88 L 128 128" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />

      {/* Chin ornament — dropped teardrop */}
      <path d="M 122 152 Q 130 168, 138 152 Z" fill="url(#silverGrad)" opacity="0.55" />
      <circle cx="126" cy="150" r="1" fill="#d0c2a2" opacity="0.9" />
      <circle cx="134" cy="150" r="1" fill="#d4a866" opacity="0.9" />
      <circle cx="130" cy="162" r="1.5" fill="#8b3a4a" opacity="0.8" />

      {/* Ribbon strings trailing */}
      <path d="M 52 110 Q 30 140, 20 190" stroke="#8b3a4a" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M 56 122 Q 38 152, 30 194" stroke="#8b3a4a" strokeWidth="0.9" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M 208 110 Q 230 140, 240 190" stroke="#8b3a4a" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M 204 122 Q 222 152, 230 194" stroke="#8b3a4a" strokeWidth="0.9" fill="none" opacity="0.4" strokeLinecap="round" />
    </svg>
  )
}
