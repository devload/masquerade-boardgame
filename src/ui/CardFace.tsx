/**
 * CardFace — a small parchment card component.
 *
 * Renders a single guest card as a Venetian ivory rectangle with an
 * identity-colored accent band, surface number, formal name, and whisper mark.
 * Used in both the player's hand and the court slots.
 */

import type { Card, Identity } from '../game/types.ts'
import { ICON_EMOJI, IDENTITY_COLOR, IDENTITY_LABEL } from '../game/types.ts'

type Props = {
  card: Card
  size?: 'sm' | 'md'
  selected?: boolean
  faceDown?: boolean
  onClick?: () => void
}

const IDENTITY_EMOJI: Record<Identity, string> = {
  Royalty: '👑',
  Thief: '🗡',
  Scholar: '📚',
  Hunter: '🏹',
  Mystic: '🔮',
}

export function CardFace({ card, size = 'md', selected, faceDown, onClick }: Props) {
  const dims =
    size === 'sm'
      ? 'w-14 h-20 text-[9px]'
      : 'w-[62px] h-[90px] text-[10px]'

  if (faceDown) {
    return (
      <button
        onClick={onClick}
        className={`${dims} relative rounded-md border border-gold-soft/40 shadow-card-lift
                    bg-gradient-to-br from-lavender-deep to-[#1a1220]
                    ${selected ? 'ring-2 ring-gold-soft shadow-gold-glow' : ''}
                    ${onClick ? 'active:scale-95 transition-transform' : ''}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-gold-soft/60 text-xl">✦</span>
        </div>
      </button>
    )
  }

  const accent = IDENTITY_COLOR[card.identity]
  const label = IDENTITY_LABEL[card.identity]
  const idEmoji = IDENTITY_EMOJI[card.identity]
  const iconEmoji = ICON_EMOJI[card.icon]

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${dims} relative rounded-md text-cocoa
                  bg-parch-cream shadow-parchment
                  ${selected ? 'ring-2 ring-gold-soft shadow-gold-glow -translate-y-1' : ''}
                  ${onClick ? 'active:scale-95 transition-all cursor-pointer' : 'cursor-default'}`}
      style={{
        borderTop: `3px solid ${accent}`,
      }}
    >
      {/* Top-left: surface number */}
      <div
        className="absolute top-0.5 left-1 font-display font-bold text-cocoa leading-none"
        style={{ fontSize: size === 'sm' ? '11px' : '13px' }}
      >
        {card.surface}
      </div>
      {/* Top-right: whisper marker */}
      {card.whisper && (
        <div className="absolute top-0.5 right-1 text-rose-deep text-[10px]">✦</div>
      )}
      {/* Center: identity emoji */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: size === 'sm' ? '20px' : '26px' }}
      >
        <span className="emoji">{idEmoji}</span>
      </div>
      {/* Bottom: name + icon */}
      <div className="absolute bottom-0.5 left-0 right-0 px-1 flex items-center justify-between">
        <span
          className="font-serif italic text-cocoa/80 truncate leading-tight"
          style={{ fontSize: size === 'sm' ? '7px' : '8px' }}
        >
          {label.replace(/^.\s/, '')}
        </span>
        <span className="emoji" style={{ fontSize: size === 'sm' ? '8px' : '9px' }}>
          {iconEmoji}
        </span>
      </div>
    </button>
  )
}
