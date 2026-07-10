/**
 * MASQUERADE · CardPortrait.tsx
 *
 * Procedural SVG portrait for any of the 40 guest cards. Renders a bicolored
 * Colombina-style mask parameterized by the card's identity, icon, surface,
 * whisper flag, and number. Serves as placeholder art until commissioned
 * illustrations arrive.
 *
 * The rendering algorithm and all mapping logic live in ./portraitStyle.ts —
 * this file only wires the helpers into JSX.
 *
 * Styled to look like a family member of the title-screen MasqueradeMask
 * (see App.tsx). Same silver/gold bicolor mask, feather plumes, filigree,
 * cheek roses, forehead jewel and chin teardrop — but recolored per identity
 * and dressed up (or down) per surface score.
 */

import type React from 'react'
import type { Card } from '../game/types.ts'
import {
  getDeterministicPose,
  getIconShape,
  getMaskPalette,
  getSizeSpec,
  getSurfaceOrnaments,
  getWhisperEffect,
  type PortraitSize,
} from './portraitStyle.ts'

export type CardPortraitProps = {
  card: Card
  size: PortraitSize
  faceDown?: boolean
  selected?: boolean
  ownership?: 'me' | 'opponent'
  className?: string
  onClick?: () => void
}

/**
 * Shared viewbox — chosen to give room for feather plumes above, name label
 * below, and enough vertical rhythm for the mask.
 */
const VIEW_W = 260
const VIEW_H = 360

export default function CardPortrait(props: CardPortraitProps): React.JSX.Element {
  const { card, size, faceDown, selected, ownership = 'me', className, onClick } = props

  const spec = getSizeSpec(size)
  const palette = getMaskPalette(card.identity)
  const pose = getDeterministicPose(card.number)
  const ornaments = getSurfaceOrnaments(card.surface)
  const whisperFx = getWhisperEffect(card.whisper)
  const iconShape = getIconShape(card.icon)

  const borderColor = ownership === 'opponent' ? '#c0c0c0' : '#e8d5b7'
  const uid = `p${card.id}`

  const containerClass = [
    'inline-block relative align-top select-none',
    onClick ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default',
    selected ? 'scale-105' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const containerStyle: React.CSSProperties = {
    width: spec.width,
    // For thumbnails we render a square; otherwise keep card aspect.
    height: spec.maskOnly ? spec.width : spec.height,
    filter: selected
      ? `drop-shadow(0 0 12px rgba(232,213,183,0.85)) drop-shadow(0 4px 8px rgba(0,0,0,0.4))`
      : `drop-shadow(0 3px 6px rgba(0,0,0,0.25))`,
  }

  return (
    <div
      className={containerClass}
      style={containerStyle}
      onClick={onClick}
      data-testid={`card-portrait-${card.id}`}
      data-face-down={faceDown ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      data-ownership={ownership}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${spec.maskOnly ? VIEW_W : VIEW_H}`}
        width={spec.width}
        height={spec.maskOnly ? spec.width : spec.height}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`${uid}-parchment`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5efe3" />
            <stop offset="60%" stopColor="#ecdfc9" />
            <stop offset="100%" stopColor="#d4c1a0" />
          </linearGradient>
          <linearGradient id={`${uid}-primaryHalf`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.primaryLight} />
            <stop offset="45%" stopColor={palette.primary} />
            <stop offset="100%" stopColor={palette.primaryDark} />
          </linearGradient>
          <linearGradient id={`${uid}-secondaryHalf`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.secondaryLight} />
            <stop offset="45%" stopColor={palette.secondary} />
            <stop offset="100%" stopColor={palette.secondaryDark} />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.55" />
            <stop offset="60%" stopColor={palette.glow} stopOpacity="0.18" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glowFilter`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id={`${uid}-noise`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.35" fill={palette.primaryDark} opacity="0.06" />
            <circle cx="5" cy="4" r="0.3" fill={palette.primaryDark} opacity="0.05" />
            <circle cx="3" cy="6" r="0.25" fill={palette.primaryDark} opacity="0.04" />
          </pattern>
        </defs>

        {/* ── Parchment frame ─────────────────────────────────────────── */}
        <rect
          x="2"
          y="2"
          width={VIEW_W - 4}
          height={(spec.maskOnly ? VIEW_W : VIEW_H) - 4}
          rx={spec.rx * 2}
          ry={spec.rx * 2}
          fill={`url(#${uid}-parchment)`}
          stroke={borderColor}
          strokeWidth="1.5"
        />
        {/* Noise overlay for parchment texture */}
        <rect
          x="2"
          y="2"
          width={VIEW_W - 4}
          height={(spec.maskOnly ? VIEW_W : VIEW_H) - 4}
          rx={spec.rx * 2}
          ry={spec.rx * 2}
          fill={`url(#${uid}-noise)`}
          pointerEvents="none"
        />
        {/* Inner soft glow ring */}
        <rect
          x="6"
          y="6"
          width={VIEW_W - 12}
          height={(spec.maskOnly ? VIEW_W : VIEW_H) - 12}
          rx={spec.rx * 2 - 4}
          ry={spec.rx * 2 - 4}
          fill="none"
          stroke={borderColor}
          strokeWidth="0.6"
          opacity="0.55"
        />

        {/* ── Whisper glow (behind mask) ───────────────────────────── */}
        {!faceDown && whisperFx.showGlow && (
          <ellipse
            cx={VIEW_W / 2}
            cy={130}
            rx={VIEW_W / 2 - 20}
            ry={90}
            fill={`url(#${uid}-glow)`}
          />
        )}

        {/* ── Mask ────────────────────────────────────────────────── */}
        <g transform={`rotate(${pose.tilt} ${VIEW_W / 2} 130)`}>
          {faceDown ? (
            <MaskSilhouette
              palette={palette}
              uid={uid}
              cardNumber={card.number}
              hasFeathers={pose.hasFeathers}
            />
          ) : (
            <MaskDetailed
              palette={palette}
              uid={uid}
              pose={pose}
              ornaments={ornaments}
              iconShape={iconShape}
            />
          )}
        </g>

        {/* ── Whisper sigil top-right ─────────────────────────────── */}
        {!faceDown && whisperFx.showSigil && (
          <g transform={`translate(${VIEW_W - 32}, 28)`}>
            <circle r="10" fill={palette.glow} opacity="0.35" />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y="1"
              fontSize="16"
              fill={palette.accent}
              fontFamily="Cinzel, Georgia, serif"
            >
              ✦
            </text>
          </g>
        )}

        {/* ── Bottom text region ──────────────────────────────────── */}
        {!spec.maskOnly && (
          <g>
            {/* subtle divider above the name band */}
            <line
              x1="30"
              y1={VIEW_H - 92}
              x2={VIEW_W - 30}
              y2={VIEW_H - 92}
              stroke={palette.accent}
              strokeWidth="0.5"
              opacity="0.4"
            />
            <text
              x={VIEW_W / 2}
              y={VIEW_H - 66}
              textAnchor="middle"
              fontFamily="Cormorant Garamond, Georgia, serif"
              fontStyle="italic"
              fontSize="22"
              fill="#3a2410"
            >
              {faceDown ? '' : card.name}
            </text>
            {spec.showShadowName && !faceDown && (
              <text
                x={VIEW_W / 2}
                y={VIEW_H - 42}
                textAnchor="middle"
                fontFamily="Cormorant Garamond, Georgia, serif"
                fontStyle="italic"
                fontSize="14"
                fill="#8b6f47"
                opacity="0.85"
              >
                {card.shadowName}
              </text>
            )}
            {/* Surface number bottom-right in Cinzel display */}
            {!faceDown && (
              <g>
                <circle
                  cx={VIEW_W - 28}
                  cy={VIEW_H - 28}
                  r="14"
                  fill={palette.primary}
                  stroke={palette.primaryDark}
                  strokeWidth="0.7"
                  opacity="0.9"
                />
                <text
                  x={VIEW_W - 28}
                  y={VIEW_H - 22}
                  textAnchor="middle"
                  fontFamily="Cinzel, Georgia, serif"
                  fontWeight="700"
                  fontSize="16"
                  fill={palette.ink}
                >
                  +{card.surface}
                </text>
              </g>
            )}
            {faceDown && (
              <text
                x={VIEW_W / 2}
                y={VIEW_H - 30}
                textAnchor="middle"
                fontFamily="Cinzel, Georgia, serif"
                fontWeight="700"
                fontSize="18"
                fill={palette.primaryDark}
                opacity="0.85"
              >
                {card.number.toString().padStart(2, '0')}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── Mask (face up) ── */

type MaskDetailedProps = {
  palette: ReturnType<typeof getMaskPalette>
  uid: string
  pose: ReturnType<typeof getDeterministicPose>
  ornaments: ReturnType<typeof getSurfaceOrnaments>
  iconShape: ReturnType<typeof getIconShape>
}

function MaskDetailed({ palette, uid, pose, ornaments, iconShape }: MaskDetailedProps) {
  // Eye almond geometry — width fixed at 30, height derived from eyeAspect.
  const eyeW = 30
  const eyeH = eyeW * pose.eyeAspect

  return (
    <g>
      {/* Feather plumes — deterministic by number */}
      {pose.hasFeathers && (
        <g opacity="0.75">
          {/* Left plume — secondary color */}
          <path
            d="M 78 92 Q 58 56, 40 62 Q 52 68, 62 78 Q 50 72, 44 80 Q 60 82, 70 88 Q 58 82, 54 90 Q 68 90, 78 92 Z"
            fill={`url(#${uid}-secondaryHalf)`}
          />
          <path
            d="M 96 84 Q 84 52, 66 54 Q 78 62, 88 72 Q 78 66, 74 72 Q 86 74, 96 84 Z"
            fill={`url(#${uid}-secondaryHalf)`}
            opacity="0.8"
          />
          {/* Right plume — primary color */}
          <path
            d="M 182 92 Q 202 56, 220 62 Q 208 68, 198 78 Q 210 72, 216 80 Q 200 82, 190 88 Q 202 82, 206 90 Q 192 90, 182 92 Z"
            fill={`url(#${uid}-primaryHalf)`}
          />
          <path
            d="M 164 84 Q 176 52, 194 54 Q 182 62, 172 72 Q 182 66, 186 72 Q 174 74, 164 84 Z"
            fill={`url(#${uid}-primaryHalf)`}
            opacity="0.8"
          />
        </g>
      )}

      {/* Halo behind mask */}
      <ellipse cx="130" cy="150" rx="120" ry="70" fill={palette.glow} opacity="0.08" />

      {/* Left half (secondary) */}
      <path
        d="M 130 96
           Q 82 92, 60 112
           Q 48 128, 50 146
           Q 54 168, 74 188
           Q 96 206, 118 206
           Q 130 204, 130 188
           Z"
        fill={`url(#${uid}-secondaryHalf)`}
        filter={`url(#${uid}-glowFilter)`}
      />

      {/* Right half (primary) */}
      <path
        d="M 130 96
           Q 178 92, 200 112
           Q 212 128, 210 146
           Q 206 168, 186 188
           Q 164 206, 142 206
           Q 130 204, 130 188
           Z"
        fill={`url(#${uid}-primaryHalf)`}
        filter={`url(#${uid}-glowFilter)`}
      />

      {/* Center split */}
      <line x1="130" y1="96" x2="130" y2="202" stroke={palette.ink} strokeWidth="0.5" opacity="0.5" />

      {/* Eye almonds */}
      <ellipse
        cx="90"
        cy="138"
        rx={eyeW / 2}
        ry={eyeH / 2}
        fill={palette.ink}
      />
      <ellipse
        cx="170"
        cy="138"
        rx={eyeW / 2}
        ry={eyeH / 2}
        fill={palette.ink}
      />
      {/* Eye rims */}
      <ellipse
        cx="90"
        cy="138"
        rx={eyeW / 2}
        ry={eyeH / 2}
        fill="none"
        stroke={palette.secondaryLight}
        strokeWidth="1"
        opacity="0.95"
      />
      <ellipse
        cx="170"
        cy="138"
        rx={eyeW / 2}
        ry={eyeH / 2}
        fill="none"
        stroke={palette.primaryLight}
        strokeWidth="1"
        opacity="0.95"
      />

      {/* Eye highlights */}
      <circle cx="94" cy="134" r="1.6" fill="#f5efe3" opacity="0.85" />
      <circle cx="174" cy="134" r="1.6" fill="#f5efe3" opacity="0.85" />

      {/* Forehead icon accent (all cards) */}
      <IconAccent shape={iconShape} palette={palette} />

      {/* Nose shading */}
      <path
        d="M 130 138 Q 126 158, 128 178 Q 130 186, 134 178 Q 136 158, 130 138 Z"
        fill="rgba(0,0,0,0.22)"
      />

      {/* Ornaments layered by surface ───────────────────── */}
      {ornaments.cheekDots && (
        <g>
          <circle cx="82" cy="168" r="3" fill={palette.accent} opacity="0.85" />
          <circle cx="82" cy="167" r="1.1" fill="#f4eedc" opacity="0.8" />
          <circle cx="178" cy="168" r="3" fill={palette.accent} opacity="0.85" />
          <circle cx="178" cy="167" r="1.1" fill="#f4eedc" opacity="0.8" />
        </g>
      )}

      {ornaments.eyeFiligree && (
        <g fill="none" stroke={palette.accent} strokeWidth="1" strokeLinecap="round" opacity="0.75">
          <path d="M 62 118 Q 76 100, 104 112" />
          <path d="M 198 118 Q 184 100, 156 112" />
          {/* side curls */}
          <path d="M 60 150 Q 50 158, 54 168 Q 62 172, 66 166" />
          <path d="M 200 150 Q 210 158, 206 168 Q 198 172, 194 166" />
        </g>
      )}

      {ornaments.foreheadJewel && (
        <g filter={`url(#${uid}-glowFilter)`}>
          <ellipse cx="130" cy="108" rx="6" ry="7" fill={palette.accent} />
          <ellipse cx="130" cy="106" rx="2.5" ry="3.5" fill={palette.glow} opacity="0.95" />
          <circle cx="130" cy="105" r="1" fill="#fff" opacity="0.9" />
        </g>
      )}

      {ornaments.chinTeardrop && (
        <g>
          <path
            d="M 122 202 Q 130 218, 138 202 Z"
            fill={`url(#${uid}-secondaryHalf)`}
            opacity="0.55"
          />
          <circle cx="126" cy="200" r="1" fill={palette.secondaryLight} opacity="0.9" />
          <circle cx="134" cy="200" r="1" fill={palette.primaryLight} opacity="0.9" />
          <circle cx="130" cy="212" r="1.5" fill={palette.accent} opacity="0.85" />
        </g>
      )}

      {/* Ribbon strings — always present, subtle */}
      <path
        d="M 52 160 Q 30 190, 22 232"
        stroke={palette.accent}
        strokeWidth="1.2"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M 208 160 Q 230 190, 238 232"
        stroke={palette.accent}
        strokeWidth="1.2"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
      />
    </g>
  )
}

/* ────────────────────────────────────────────────────── Icon accent ── */

function IconAccent({
  shape,
  palette,
}: {
  shape: ReturnType<typeof getIconShape>
  palette: ReturnType<typeof getMaskPalette>
}) {
  const sw = shape.strokeWidth ?? 1.2
  if (shape.type === 'fill') {
    return <path d={shape.d} fill={palette.accent} opacity="0.9" />
  }
  if (shape.type === 'stroke') {
    return (
      <path
        d={shape.d}
        fill="none"
        stroke={palette.accent}
        strokeWidth={sw}
        strokeLinecap="round"
        opacity="0.9"
      />
    )
  }
  // strokeGroup: main + extras all drawn as strokes
  return (
    <g fill="none" stroke={palette.accent} strokeWidth={sw} strokeLinecap="round" opacity="0.9">
      <path d={shape.d} />
      {shape.extraPaths?.map((d, i) => <path key={i} d={d} />)}
    </g>
  )
}

/* ─────────────────────────────────────────────────── Face-down mask ── */

function MaskSilhouette({
  palette,
  uid,
  cardNumber,
  hasFeathers,
}: {
  palette: ReturnType<typeof getMaskPalette>
  uid: string
  cardNumber: number
  hasFeathers: boolean
}) {
  void cardNumber
  return (
    <g>
      {hasFeathers && (
        <g opacity="0.35">
          <path
            d="M 78 92 Q 58 56, 40 62 Q 52 68, 62 78 Q 50 72, 44 80 Q 60 82, 70 88 Q 58 82, 54 90 Q 68 90, 78 92 Z"
            fill={palette.primaryDark}
          />
          <path
            d="M 182 92 Q 202 56, 220 62 Q 208 68, 198 78 Q 210 72, 216 80 Q 200 82, 190 88 Q 202 82, 206 90 Q 192 90, 182 92 Z"
            fill={palette.primaryDark}
          />
        </g>
      )}
      {/* Outer silhouette */}
      <path
        d="M 130 96
           Q 82 92, 60 112
           Q 48 128, 50 146
           Q 54 168, 74 188
           Q 96 206, 118 206
           Q 142 206, 164 206
           Q 186 206, 210 146
           Q 212 128, 200 112
           Q 178 92, 130 96 Z"
        fill={palette.primaryDark}
        opacity="0.85"
        filter={`url(#${uid}-glowFilter)`}
      />
      {/* Inner outline stroke — lighter */}
      <path
        d="M 130 100
           Q 84 96, 64 116
           Q 52 130, 54 146
           Q 58 166, 76 184
           Q 96 200, 118 200
           Q 142 200, 164 200
           Q 184 200, 206 146
           Q 208 130, 196 116
           Q 176 96, 130 100 Z"
        fill="none"
        stroke={palette.glow}
        strokeWidth="0.8"
        opacity="0.55"
      />
      {/* Two hollow eye slits */}
      <ellipse cx="90" cy="138" rx="12" ry="6" fill="#0a0206" opacity="0.85" />
      <ellipse cx="170" cy="138" rx="12" ry="6" fill="#0a0206" opacity="0.85" />
      {/* Center split */}
      <line x1="130" y1="96" x2="130" y2="204" stroke={palette.glow} strokeWidth="0.4" opacity="0.35" />
    </g>
  )
}
