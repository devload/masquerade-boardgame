/**
 * DirectorSigils — three tiny (~80×80) SVG sigils for the rival directors
 * shown on the Lobby difficulty picker.
 *
 * Family: same Venetian Colombina half-mask silhouette as the title-screen
 * MasqueradeMask, simplified for the small footprint. Each director has a
 * distinct palette + accent motif that echoes their story:
 *   - MalcolmSigil  · warm gold half-mask crowned by a small coronet.
 *   - IsabellaSigil · lavender + silver half-mask veiled in lace.
 *   - OmbraSigil    · deep black full mask centered on a rose in blood-red.
 */

import type React from 'react'

type SigilProps = {
  size?: number
  className?: string
}

/* ───────────────────────────────────── 말콤 백작 · warm gold · crown ── */

export function MalcolmSigil({ size = 80, className }: SigilProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="malc-gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#faddab" />
          <stop offset="55%" stopColor="#d4a866" />
          <stop offset="100%" stopColor="#8b6534" />
        </linearGradient>
        <radialGradient id="malc-halo">
          <stop offset="0%" stopColor="rgba(250,221,171,0.35)" />
          <stop offset="100%" stopColor="rgba(250,221,171,0)" />
        </radialGradient>
      </defs>
      {/* Halo */}
      <circle cx="50" cy="55" r="42" fill="url(#malc-halo)" />

      {/* Coronet — 3 points + a jewel */}
      <g fill="url(#malc-gold)" opacity="0.95">
        <path d="M 30 30 L 34 20 L 38 30 Z" />
        <path d="M 46 26 L 50 14 L 54 26 Z" />
        <path d="M 62 30 L 66 20 L 70 30 Z" />
        <rect x="28" y="30" width="44" height="4" rx="1" />
      </g>
      <circle cx="50" cy="19" r="1.6" fill="#8b3a4a" opacity="0.85" />

      {/* Half-mask — Colombina, gold only */}
      <path
        d="M 22 46
           Q 22 40, 30 38
           Q 50 34, 70 38
           Q 78 40, 78 46
           Q 78 68, 62 78
           Q 50 82, 38 78
           Q 22 68, 22 46 Z"
        fill="url(#malc-gold)"
        opacity="0.92"
      />

      {/* Eye almonds */}
      <ellipse cx="38" cy="54" rx="6" ry="3" fill="#0a0510" />
      <ellipse cx="62" cy="54" rx="6" ry="3" fill="#0a0510" />
      {/* Rims */}
      <ellipse cx="38" cy="54" rx="6" ry="3" fill="none" stroke="#faddab" strokeWidth="0.7" opacity="0.85" />
      <ellipse cx="62" cy="54" rx="6" ry="3" fill="none" stroke="#faddab" strokeWidth="0.7" opacity="0.85" />

      {/* Cheek accents */}
      <circle cx="30" cy="66" r="1.3" fill="#8b3a4a" opacity="0.7" />
      <circle cx="70" cy="66" r="1.3" fill="#8b3a4a" opacity="0.7" />

      {/* Ribbons */}
      <path d="M 22 60 Q 12 72, 10 88" stroke="#8b3a4a" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M 78 60 Q 88 72, 90 88" stroke="#8b3a4a" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
    </svg>
  )
}

/* ─────────────────────────── 이자벨라 부인 · lavender + silver · veil ── */

export function IsabellaSigil({ size = 80, className }: SigilProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="isa-lav" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2d3e5" />
          <stop offset="50%" stopColor="#a68ba8" />
          <stop offset="100%" stopColor="#5d3f65" />
        </linearGradient>
        <linearGradient id="isa-silver" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f4eedc" />
          <stop offset="60%" stopColor="#c0c0c0" />
          <stop offset="100%" stopColor="#6a6a6a" />
        </linearGradient>
        <radialGradient id="isa-halo">
          <stop offset="0%" stopColor="rgba(226,211,229,0.35)" />
          <stop offset="100%" stopColor="rgba(226,211,229,0)" />
        </radialGradient>
      </defs>
      {/* Halo */}
      <circle cx="50" cy="52" r="44" fill="url(#isa-halo)" />

      {/* Half-mask — bicolored (lavender left, silver right) */}
      <path
        d="M 50 40
           Q 30 38, 22 46
           Q 20 62, 34 76
           Q 46 84, 50 82 Z"
        fill="url(#isa-lav)"
        opacity="0.95"
      />
      <path
        d="M 50 40
           Q 70 38, 78 46
           Q 80 62, 66 76
           Q 54 84, 50 82 Z"
        fill="url(#isa-silver)"
        opacity="0.95"
      />
      {/* Center split */}
      <line x1="50" y1="40" x2="50" y2="82" stroke="#4a3856" strokeWidth="0.4" opacity="0.6" />

      {/* Eye almonds */}
      <ellipse cx="38" cy="56" rx="6" ry="3" fill="#0a0510" />
      <ellipse cx="62" cy="56" rx="6" ry="3" fill="#0a0510" />
      <ellipse cx="38" cy="56" rx="6" ry="3" fill="none" stroke="#e2d3e5" strokeWidth="0.7" opacity="0.9" />
      <ellipse cx="62" cy="56" rx="6" ry="3" fill="none" stroke="#f4eedc" strokeWidth="0.7" opacity="0.9" />

      {/* Lace veil — crosshatched arcs above and drape below */}
      <g stroke="#e2d3e5" strokeWidth="0.5" fill="none" opacity="0.75" strokeLinecap="round">
        <path d="M 24 44 Q 32 34, 42 40" />
        <path d="M 76 44 Q 68 34, 58 40" />
        <path d="M 28 46 Q 34 40, 40 44" />
        <path d="M 72 46 Q 66 40, 60 44" />
      </g>
      {/* Veil drape */}
      <g stroke="#c0c0c0" strokeWidth="0.6" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M 24 74 Q 36 88, 50 90 Q 64 88, 76 74" />
        <path d="M 30 78 Q 40 92, 50 92 Q 60 92, 70 78" strokeWidth="0.4" opacity="0.4" />
      </g>

      {/* Forehead jewel (small teardrop) */}
      <ellipse cx="50" cy="46" rx="1.8" ry="2.4" fill="#a68ba8" />
      <circle cx="50" cy="45" r="0.7" fill="#f4eedc" opacity="0.9" />
    </svg>
  )
}

/* ──────────────────────── L'Ombra · deep black · red rose center ── */

export function OmbraSigil({ size = 80, className }: SigilProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="omb-black" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a1620" />
          <stop offset="60%" stopColor="#120810" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <radialGradient id="omb-halo">
          <stop offset="0%" stopColor="rgba(139,58,74,0.35)" />
          <stop offset="100%" stopColor="rgba(139,58,74,0)" />
        </radialGradient>
        <radialGradient id="omb-rose">
          <stop offset="0%" stopColor="#c48b95" />
          <stop offset="55%" stopColor="#8b3a4a" />
          <stop offset="100%" stopColor="#4a1a24" />
        </radialGradient>
      </defs>
      {/* Bloody halo */}
      <circle cx="50" cy="52" r="44" fill="url(#omb-halo)" />

      {/* Full mask — a taller silhouette than the others */}
      <path
        d="M 50 32
           Q 26 34, 20 50
           Q 18 68, 30 80
           Q 40 86, 50 86
           Q 60 86, 70 80
           Q 82 68, 80 50
           Q 74 34, 50 32 Z"
        fill="url(#omb-black)"
      />
      {/* Inner rim highlight */}
      <path
        d="M 50 36
           Q 30 38, 24 52
           Q 22 66, 32 76
           Q 40 82, 50 82
           Q 60 82, 68 76
           Q 78 66, 76 52
           Q 70 38, 50 36 Z"
        fill="none"
        stroke="#8b3a4a"
        strokeWidth="0.5"
        opacity="0.55"
      />

      {/* Eye slits */}
      <ellipse cx="38" cy="54" rx="5.5" ry="2.4" fill="#8b3a4a" opacity="0.9" />
      <ellipse cx="62" cy="54" rx="5.5" ry="2.4" fill="#8b3a4a" opacity="0.9" />
      <ellipse cx="38" cy="54" rx="5.5" ry="2.4" fill="none" stroke="#c48b95" strokeWidth="0.4" opacity="0.7" />
      <ellipse cx="62" cy="54" rx="5.5" ry="2.4" fill="none" stroke="#c48b95" strokeWidth="0.4" opacity="0.7" />

      {/* Red rose center — forehead */}
      <g>
        <circle cx="50" cy="44" r="4.5" fill="url(#omb-rose)" />
        <circle cx="50" cy="43.5" r="2.4" fill="#8b3a4a" opacity="0.9" />
        <circle cx="50" cy="43" r="1" fill="#f4eedc" opacity="0.8" />
        {/* Petal hints */}
        <path d="M 46 44 Q 45 41, 48 41" fill="none" stroke="#4a1a24" strokeWidth="0.5" opacity="0.7" />
        <path d="M 54 44 Q 55 41, 52 41" fill="none" stroke="#4a1a24" strokeWidth="0.5" opacity="0.7" />
      </g>

      {/* Thorn ribbons (jagged) */}
      <path d="M 18 62 Q 8 76, 6 92" stroke="#8b3a4a" strokeWidth="1.1" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M 82 62 Q 92 76, 94 92" stroke="#8b3a4a" strokeWidth="1.1" fill="none" opacity="0.6" strokeLinecap="round" />
      {/* Tiny thorn tick marks */}
      <path d="M 12 74 L 15 73" stroke="#8b3a4a" strokeWidth="0.7" opacity="0.7" />
      <path d="M 10 82 L 13 81" stroke="#8b3a4a" strokeWidth="0.7" opacity="0.7" />
      <path d="M 88 74 L 85 73" stroke="#8b3a4a" strokeWidth="0.7" opacity="0.7" />
      <path d="M 90 82 L 87 81" stroke="#8b3a4a" strokeWidth="0.7" opacity="0.7" />
    </svg>
  )
}
