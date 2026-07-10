/**
 * LaurelWreath — decorative SVG olive branches that curve around the winner's
 * final score card in the ReckoningScene.
 *
 * Two symmetric branches, drawn with gold outlines. `size` controls the overall
 * pixel width; the SVG scales the interior curves proportionally so the wreath
 * hugs whatever number sits inside.
 */

import type React from 'react'

export type LaurelWreathProps = {
  size?: number
  className?: string
  children?: React.ReactNode
}

export function LaurelWreath({
  size = 160,
  className,
  children,
}: LaurelWreathProps): React.JSX.Element {
  const stroke = '#e8d5b7'
  const leafFill = '#e8d5b7'

  const Branch = ({ mirrored = false }: { mirrored?: boolean }) => (
    <g transform={mirrored ? 'translate(80,0) scale(-1,1)' : undefined}>
      {/* Main stem — arcing curve */}
      <path
        d="M 6 8 Q 4 40, 20 74"
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Leaves — layered along the stem */}
      <g fill={leafFill} stroke={stroke} strokeWidth="0.5" opacity="0.85">
        <ellipse cx="7" cy="16" rx="6" ry="2.2" transform="rotate(-42 7 16)" />
        <ellipse cx="6" cy="26" rx="6.5" ry="2.4" transform="rotate(-28 6 26)" />
        <ellipse cx="8" cy="36" rx="7" ry="2.5" transform="rotate(-14 8 36)" />
        <ellipse cx="10" cy="46" rx="7" ry="2.6" transform="rotate(4 10 46)" />
        <ellipse cx="13" cy="56" rx="6.8" ry="2.5" transform="rotate(22 13 56)" />
        <ellipse cx="17" cy="66" rx="6.2" ry="2.4" transform="rotate(38 17 66)" />
      </g>
      {/* Small berry near the tip */}
      <circle cx="20" cy="74" r="1.6" fill="#c48b6e" opacity="0.9" />
    </g>
  )

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {/* Left branch */}
      <svg
        width={size * 0.34}
        height={size * 0.52}
        viewBox="0 0 80 80"
        className="absolute left-0 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <Branch />
      </svg>
      {/* Right branch (mirrored) */}
      <svg
        width={size * 0.34}
        height={size * 0.52}
        viewBox="0 0 80 80"
        className="absolute right-0 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <Branch mirrored />
      </svg>
      {/* Ornament at top - center */}
      <svg
        width={size * 0.18}
        height={size * 0.18}
        viewBox="0 0 40 40"
        className="absolute -top-2 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      >
        <g fill={leafFill} stroke={stroke} strokeWidth="0.6" opacity="0.85">
          <path d="M 20 6 L 22 14 L 30 14 L 24 20 L 26 28 L 20 24 L 14 28 L 16 20 L 10 14 L 18 14 Z" />
        </g>
      </svg>
      {/* Content in center */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
