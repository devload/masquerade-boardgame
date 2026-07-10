/**
 * MASQUERADE · portraitStyle.ts
 *
 * Pure helpers that translate a card's fields into visual attributes for the
 * procedural portrait system. Kept dependency-free so we can unit-test the
 * rendering algorithm without a DOM.
 *
 * The algorithm layers 5 signals onto a shared "Colombina mask" archetype
 * (see title screen's MasqueradeMask):
 *   identity → mask palette
 *   icon     → forehead accent shape
 *   surface  → ornamentation density (1..4)
 *   whisper  → magical glow + ✦ sigil
 *   number   → deterministic pose (tilt / eye aspect / feather plumes)
 */

import type { Icon, Identity } from '../game/types.ts'

/** Palette for one identity's mask body. */
export type MaskPalette = {
  /** Primary metal / cloth mid tone. */
  primary: string
  /** Highlight (upper stop of gradient). */
  primaryLight: string
  /** Shadow (lower stop of gradient). */
  primaryDark: string
  /** Secondary mask half (the mask is bicolored). */
  secondary: string
  secondaryLight: string
  secondaryDark: string
  /** Accent used for filigree, icon shape, jewels. */
  accent: string
  /** Ink used for eyes / linework. */
  ink: string
  /** Soft glow tint used behind whisper cards. */
  glow: string
}

/**
 * Palette per identity — each identity has a bicolored mask with a light and
 * dark half, plus an accent and ink. Values echo IDENTITY_COLOR but expanded.
 */
export function getMaskPalette(identity: Identity): MaskPalette {
  switch (identity) {
    case 'Royalty':
      return {
        primary: '#e8d5b7',
        primaryLight: '#f6e0aa',
        primaryDark: '#8a6a3a',
        secondary: '#f4eedc',
        secondaryLight: '#fdf7ec',
        secondaryDark: '#95845e',
        accent: '#c48b6e',
        ink: '#3a2410',
        glow: '#faddab',
      }
    case 'Thief':
      return {
        primary: '#8b3a4a',
        primaryLight: '#c48b95',
        primaryDark: '#4a1a24',
        secondary: '#5a2030',
        secondaryLight: '#8b4a58',
        secondaryDark: '#2a1018',
        accent: '#1a0a10',
        ink: '#0a0206',
        glow: '#c48b95',
      }
    case 'Scholar':
      return {
        primary: '#7ba3c8',
        primaryLight: '#a5bec8',
        primaryDark: '#3a5a78',
        secondary: '#5a80a0',
        secondaryLight: '#7ba3c8',
        secondaryDark: '#243848',
        accent: '#243848',
        ink: '#0a1420',
        glow: '#a5bec8',
      }
    case 'Hunter':
      return {
        primary: '#88a065',
        primaryLight: '#a5bd80',
        primaryDark: '#4a5a34',
        secondary: '#6a8050',
        secondaryLight: '#88a065',
        secondaryDark: '#2a3820',
        accent: '#5b4636',
        ink: '#1a2010',
        glow: '#a5bd80',
      }
    case 'Mystic':
      return {
        primary: '#a68ba8',
        primaryLight: '#c8b0ca',
        primaryDark: '#3d1f4a',
        secondary: '#3d1f4a',
        secondaryLight: '#68488a',
        secondaryDark: '#1a0a26',
        accent: '#e8d5b7',
        ink: '#0a0510',
        glow: '#c8b0ca',
      }
  }
}

/**
 * Forehead accent shape for the given icon.
 * Returns SVG path data drawn on a 260x200 viewbox, centered around (130, 60).
 * The 'type' field lets the renderer choose stroke vs fill.
 */
export type IconShape = {
  /** How the shape should be drawn. */
  type: 'stroke' | 'fill' | 'strokeGroup'
  /** Primary SVG path data (a `d=` attribute). */
  d: string
  /** Optional secondary paths (waves need three lines, rose needs petals). */
  extraPaths?: string[]
  /** Suggested stroke width relative to a 260-wide viewbox. */
  strokeWidth?: number
}

export function getIconShape(icon: Icon): IconShape {
  switch (icon) {
    case 'moon':
      // Crescent above forehead — sitting just above the jewel band.
      return {
        type: 'fill',
        d: 'M 128 32 A 12 12 0 1 0 128 56 A 9 12 0 1 1 128 32 Z',
      }
    case 'day':
      // Radiant sun disc — small filled circle with 8 rays around it.
      return {
        type: 'strokeGroup',
        d: 'M 130 42 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0',
        extraPaths: [
          'M 130 30 L 130 24',
          'M 130 60 L 130 54',
          'M 118 42 L 112 42',
          'M 148 42 L 142 42',
          'M 121 33 L 117 29',
          'M 143 33 L 147 29',
          'M 121 51 L 117 55',
          'M 143 51 L 147 55',
        ],
        strokeWidth: 1.4,
      }
    case 'water':
      // Three wavy lines stacked vertically.
      return {
        type: 'strokeGroup',
        d: 'M 116 32 Q 122 28, 130 32 Q 138 36, 144 32',
        extraPaths: [
          'M 116 42 Q 122 38, 130 42 Q 138 46, 144 42',
          'M 116 52 Q 122 48, 130 52 Q 138 56, 144 52',
        ],
        strokeWidth: 1.6,
      }
    case 'feather':
      // A single stylized quill curling from upper-right to lower-left.
      return {
        type: 'strokeGroup',
        d: 'M 142 28 Q 138 44, 122 56',
        extraPaths: [
          // barb strokes
          'M 138 34 Q 134 34, 132 38',
          'M 134 40 Q 130 40, 128 44',
          'M 130 46 Q 126 46, 124 50',
          // shaft accent
          'M 140 30 Q 137 42, 126 54',
        ],
        strokeWidth: 1.2,
      }
    case 'rose':
      // Five-petal rose — centered circle + 5 petals as small arcs.
      return {
        type: 'strokeGroup',
        d: 'M 130 42 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0',
        extraPaths: [
          // petals rotated around center
          'M 130 34 Q 126 34, 126 38 Q 130 38, 130 34 Z',
          'M 138 40 Q 138 44, 134 44 Q 134 40, 138 40 Z',
          'M 134 50 Q 130 50, 130 46 Q 134 46, 134 50 Z',
          'M 122 44 Q 126 44, 126 40 Q 122 40, 122 44 Z',
          'M 130 50 Q 134 50, 134 46 Q 130 46, 130 50 Z',
        ],
        strokeWidth: 1.0,
      }
  }
}

/** Which ornaments should the mask carry given a surface score (1..4)? */
export type SurfaceOrnaments = {
  cheekDots: boolean
  eyeFiligree: boolean
  chinTeardrop: boolean
  foreheadJewel: boolean
  /** Human-readable list — used by tests. */
  labels: string[]
}

export function getSurfaceOrnaments(surface: number): SurfaceOrnaments {
  const clamped = Math.max(1, Math.min(4, Math.floor(surface)))
  const cheekDots = clamped >= 2
  const eyeFiligree = clamped >= 3
  const chinTeardrop = clamped >= 4
  const foreheadJewel = clamped >= 4
  const labels: string[] = []
  if (cheekDots) labels.push('cheekDots')
  if (eyeFiligree) labels.push('eyeFiligree')
  if (chinTeardrop) labels.push('chinTeardrop')
  if (foreheadJewel) labels.push('foreheadJewel')
  return { cheekDots, eyeFiligree, chinTeardrop, foreheadJewel, labels }
}

/** Deterministic pose derived from a card's number (1..40). */
export type DeterministicPose = {
  /** Degrees of tilt applied to the mask group. Range: -8..+8. */
  tilt: number
  /**
   * Eye almond aspect ratio (height / width). Range: 0.55..0.75.
   * Lower = sleepier eyes; higher = more open.
   */
  eyeAspect: number
  /** Whether feather plumes flank the mask. */
  hasFeathers: boolean
}

export function getDeterministicPose(cardNumber: number): DeterministicPose {
  // Number is 1..40; treat any other input as its abs value mod 40 + 1.
  const n = ((Math.abs(Math.floor(cardNumber)) - 1) % 40) + 1
  // Spread tilt across the 17-step range -8..+8 in a deterministic way.
  const tilt = ((n * 7) % 17) - 8
  // Eye aspect: map n through a stable 0..1 curve then into 0.55..0.75.
  const aspectStep = ((n * 13) % 21) / 20
  const eyeAspect = 0.55 + aspectStep * 0.2
  const hasFeathers = n >= 30 || n <= 6
    ? true
    // Mid-range numbers get plumes only for a subset — every 5th card 10..29.
    : n % 5 === 0
  return { tilt, eyeAspect, hasFeathers }
}

/**
 * Whether the whisper flag should be visualized as a magical glow layer.
 * Split out as a helper so tests can reason about it in isolation.
 */
export function getWhisperEffect(whisper: boolean): {
  showGlow: boolean
  showSigil: boolean
} {
  return { showGlow: whisper, showSigil: whisper }
}

/**
 * Size table for the 4 supported sizes.
 * viewport is the CSS width in px; the SVG viewbox is fixed at 260x360
 * (portrait aspect) regardless of size.
 */
export type PortraitSize = 'thumb' | 'sm' | 'md' | 'lg'

export type SizeSpec = {
  width: number
  height: number
  /** border-radius on the outer card frame. */
  rx: number
  /** Whether the label region (name / shadow / surface) is rendered. */
  showLabel: boolean
  /** Whether the shadow name is rendered under the formal name. */
  showShadowName: boolean
  /** Whether to render only the mask (used for tiny thumbnails). */
  maskOnly: boolean
}

export function getSizeSpec(size: PortraitSize): SizeSpec {
  switch (size) {
    case 'thumb':
      return { width: 60, height: 60, rx: 6, showLabel: false, showShadowName: false, maskOnly: true }
    case 'sm':
      return { width: 96, height: 132, rx: 8, showLabel: true, showShadowName: false, maskOnly: false }
    case 'md':
      return { width: 140, height: 196, rx: 10, showLabel: true, showShadowName: false, maskOnly: false }
    case 'lg':
      return { width: 220, height: 308, rx: 14, showLabel: true, showShadowName: true, maskOnly: false }
  }
}
