/**
 * MASQUERADE · portraitStyle.test.ts
 *
 * Pure-function tests for the procedural portrait algorithm. We do not have
 * @testing-library/react or jsdom in the toolchain (see package.json), so
 * DOM assertions are impossible here — instead we verify the algorithm's
 * building blocks and confirm they resolve for every one of the 40 guest
 * cards. The React component simply wires these helpers into JSX.
 */

import { describe, expect, it } from 'vitest'
import { CARDS } from '../game/cards.ts'
import { IDENTITIES, type Icon } from '../game/types.ts'
import {
  getDeterministicPose,
  getIconShape,
  getMaskPalette,
  getSizeSpec,
  getSurfaceOrnaments,
  getWhisperEffect,
  type PortraitSize,
} from './portraitStyle.ts'

describe('getMaskPalette', () => {
  it('returns a full palette for every identity', () => {
    for (const id of IDENTITIES) {
      const p = getMaskPalette(id)
      expect(p.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.primaryLight).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.primaryDark).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.secondary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.ink).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.glow).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('gives Royalty a cream-gold primary and Mystic a lavender primary', () => {
    expect(getMaskPalette('Royalty').primary.toLowerCase()).toBe('#e8d5b7')
    expect(getMaskPalette('Mystic').primary.toLowerCase()).toBe('#a68ba8')
  })

  it('gives each identity a distinct primary color', () => {
    const primaries = new Set(IDENTITIES.map((id) => getMaskPalette(id).primary.toLowerCase()))
    expect(primaries.size).toBe(IDENTITIES.length)
  })
})

describe('getIconShape', () => {
  const icons: Icon[] = ['moon', 'day', 'water', 'feather', 'rose']

  it('returns a non-empty path for every icon', () => {
    for (const icon of icons) {
      const shape = getIconShape(icon)
      expect(shape.d.length).toBeGreaterThan(4)
    }
  })

  it('marks day/water/feather/rose as strokeGroup shapes', () => {
    expect(getIconShape('day').type).toBe('strokeGroup')
    expect(getIconShape('water').type).toBe('strokeGroup')
    expect(getIconShape('feather').type).toBe('strokeGroup')
    expect(getIconShape('rose').type).toBe('strokeGroup')
  })

  it('marks moon as a solid fill shape (crescent)', () => {
    expect(getIconShape('moon').type).toBe('fill')
  })

  it('water shape has 3 total lines (main + 2 extras)', () => {
    const shape = getIconShape('water')
    expect(shape.extraPaths?.length).toBe(2)
  })
})

describe('getSurfaceOrnaments', () => {
  it('surface=1: no ornaments', () => {
    const o = getSurfaceOrnaments(1)
    expect(o.labels).toEqual([])
  })

  it('surface=2: cheek dots only', () => {
    const o = getSurfaceOrnaments(2)
    expect(o.cheekDots).toBe(true)
    expect(o.eyeFiligree).toBe(false)
    expect(o.chinTeardrop).toBe(false)
    expect(o.foreheadJewel).toBe(false)
  })

  it('surface=3: cheek dots + eye filigree', () => {
    const o = getSurfaceOrnaments(3)
    expect(o.cheekDots).toBe(true)
    expect(o.eyeFiligree).toBe(true)
    expect(o.chinTeardrop).toBe(false)
    expect(o.foreheadJewel).toBe(false)
  })

  it('surface=4: full ornaments including chin and forehead jewel', () => {
    const o = getSurfaceOrnaments(4)
    expect(o.labels).toEqual(['cheekDots', 'eyeFiligree', 'chinTeardrop', 'foreheadJewel'])
  })

  it('clamps out-of-range surface values', () => {
    expect(getSurfaceOrnaments(0).labels).toEqual([])
    expect(getSurfaceOrnaments(99).labels.length).toBe(4)
  })
})

describe('getDeterministicPose', () => {
  it('is deterministic — same number → same pose', () => {
    const a = getDeterministicPose(17)
    const b = getDeterministicPose(17)
    expect(a).toEqual(b)
  })

  it('tilt stays within [-8, +8]', () => {
    for (let n = 1; n <= 40; n++) {
      const { tilt } = getDeterministicPose(n)
      expect(tilt).toBeGreaterThanOrEqual(-8)
      expect(tilt).toBeLessThanOrEqual(8)
    }
  })

  it('eye aspect stays within [0.55, 0.75]', () => {
    for (let n = 1; n <= 40; n++) {
      const { eyeAspect } = getDeterministicPose(n)
      expect(eyeAspect).toBeGreaterThanOrEqual(0.55)
      expect(eyeAspect).toBeLessThanOrEqual(0.75)
    }
  })

  it('gives feathers to high-number (≥30) and low-number (≤6) cards', () => {
    expect(getDeterministicPose(1).hasFeathers).toBe(true)
    expect(getDeterministicPose(6).hasFeathers).toBe(true)
    expect(getDeterministicPose(30).hasFeathers).toBe(true)
    expect(getDeterministicPose(40).hasFeathers).toBe(true)
  })

  it('withholds feathers from most mid-range cards', () => {
    // 7, 8, 9 are mid-range and not divisible by 5 → no plumes
    expect(getDeterministicPose(7).hasFeathers).toBe(false)
    expect(getDeterministicPose(8).hasFeathers).toBe(false)
    expect(getDeterministicPose(9).hasFeathers).toBe(false)
    // 10, 15, 20, 25 are mid-range multiples of 5 → they DO get plumes
    expect(getDeterministicPose(10).hasFeathers).toBe(true)
    expect(getDeterministicPose(15).hasFeathers).toBe(true)
  })
})

describe('getWhisperEffect', () => {
  it('true → show glow + sigil', () => {
    expect(getWhisperEffect(true)).toEqual({ showGlow: true, showSigil: true })
  })
  it('false → hide both', () => {
    expect(getWhisperEffect(false)).toEqual({ showGlow: false, showSigil: false })
  })
})

describe('getSizeSpec', () => {
  const sizes: PortraitSize[] = ['thumb', 'sm', 'md', 'lg']

  it('returns matching viewport widths', () => {
    expect(getSizeSpec('thumb').width).toBe(60)
    expect(getSizeSpec('sm').width).toBe(96)
    expect(getSizeSpec('md').width).toBe(140)
    expect(getSizeSpec('lg').width).toBe(220)
  })

  it('thumb hides labels and is mask-only', () => {
    const spec = getSizeSpec('thumb')
    expect(spec.showLabel).toBe(false)
    expect(spec.maskOnly).toBe(true)
  })

  it('lg shows the shadow name', () => {
    expect(getSizeSpec('lg').showShadowName).toBe(true)
  })

  it('sm and md hide the shadow name', () => {
    expect(getSizeSpec('sm').showShadowName).toBe(false)
    expect(getSizeSpec('md').showShadowName).toBe(false)
  })

  it('all sizes have a positive rounded corner radius', () => {
    for (const s of sizes) {
      expect(getSizeSpec(s).rx).toBeGreaterThan(0)
    }
  })
})

describe('procedural coverage — all 40 guests resolve without gaps', () => {
  it('every card produces a full palette, icon shape, ornaments, and pose', () => {
    expect(CARDS.length).toBe(40)
    for (const card of CARDS) {
      const palette = getMaskPalette(card.identity)
      const icon = getIconShape(card.icon)
      const ornaments = getSurfaceOrnaments(card.surface)
      const pose = getDeterministicPose(card.number)
      const whisper = getWhisperEffect(card.whisper)

      expect(palette.primary).toBeTruthy()
      expect(icon.d).toBeTruthy()
      expect(ornaments.labels.length).toBeGreaterThanOrEqual(0)
      expect(pose.tilt).toBeGreaterThanOrEqual(-8)
      expect(pose.tilt).toBeLessThanOrEqual(8)
      expect(typeof whisper.showGlow).toBe('boolean')
    }
  })
})
