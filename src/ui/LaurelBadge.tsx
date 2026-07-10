/**
 * LaurelBadge — small laurel wreath used in UnmaskingScene duel resolutions.
 *
 * Renders a symmetric SVG wreath around a short label ("당신의 승리" / persona
 * name). Two tints:
 *   - variant='gold'   → my card won (warm soft gold)
 *   - variant='silver' → opponent card won (cool platinum)
 */

import type React from 'react'

export type LaurelBadgeProps = {
  variant: 'gold' | 'silver'
  label: string
  className?: string
}

export function LaurelBadge({ variant, label, className }: LaurelBadgeProps): React.JSX.Element {
  const stroke = variant === 'gold' ? '#f4e4c8' : '#dcdcdc'
  const fill = variant === 'gold' ? '#e8d5b7' : '#c0c0c0'
  const textColor = variant === 'gold' ? '#f5efe3' : '#e8e8e8'
  const glow =
    variant === 'gold'
      ? '0 0 12px rgba(232,213,183,0.6), 0 0 24px rgba(244,228,200,0.3)'
      : '0 0 12px rgba(192,192,192,0.55), 0 0 24px rgba(220,220,220,0.28)'

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${className ?? ''}`}
      style={{
        background: 'rgba(20,12,25,0.72)',
        border: `1px solid ${fill}`,
        boxShadow: glow,
        color: textColor,
      }}
    >
      {/* Left laurel */}
      <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
        <g fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round">
          {/* Main stem */}
          <path d="M 12 2 Q 8 8, 6 14" />
          {/* Leaves left side */}
          <path d="M 10 4 Q 6 4, 5 7" fill={fill} opacity="0.9" />
          <path d="M 9 7 Q 5 7, 4 10" fill={fill} opacity="0.85" />
          <path d="M 8 10 Q 4 10, 3 13" fill={fill} opacity="0.8" />
        </g>
      </svg>
      <span
        className="font-serif italic font-semibold text-[11px] tracking-wide leading-none"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {label}
      </span>
      {/* Right laurel (mirrored) */}
      <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
        <g transform="translate(14,0) scale(-1,1)" fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round">
          <path d="M 12 2 Q 8 8, 6 14" />
          <path d="M 10 4 Q 6 4, 5 7" fill={fill} opacity="0.9" />
          <path d="M 9 7 Q 5 7, 4 10" fill={fill} opacity="0.85" />
          <path d="M 8 10 Q 4 10, 3 13" fill={fill} opacity="0.8" />
        </g>
      </svg>
    </div>
  )
}
