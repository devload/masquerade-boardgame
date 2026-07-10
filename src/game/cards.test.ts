import { describe, it, expect } from 'vitest'
import { CARDS, DECK_SIZE, cardById, cardsByIdentity } from './cards.ts'
import { IDENTITIES } from './types.ts'

describe('cards · deck integrity', () => {
  it('has exactly 40 cards', () => {
    expect(CARDS.length).toBe(40)
    expect(DECK_SIZE).toBe(40)
  })

  it('has unique ids 1..40', () => {
    const ids = CARDS.map((c) => c.id).sort((a, b) => a - b)
    expect(ids).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    expect(new Set(ids).size).toBe(40)
  })

  it('id equals number for every card (Scholar slot-match invariant)', () => {
    for (const card of CARDS) {
      expect(card.number).toBe(card.id)
    }
  })

  it('every identity has exactly 8 cards', () => {
    for (const identity of IDENTITIES) {
      expect(cardsByIdentity(identity).length).toBe(8)
    }
  })

  it('every surface score is within 1..4', () => {
    for (const card of CARDS) {
      expect(card.surface).toBeGreaterThanOrEqual(1)
      expect(card.surface).toBeLessThanOrEqual(4)
    }
  })

  it('whisper flag matches the doc distribution (2 per identity = 10 total)', () => {
    // NOTE: docs/CHARACTERS.md intro claims "카드 15% (전체 6장)" but the
    // per-identity summary table and row-level ✦ marks both give 2 whispers
    // per identity = 10 total. Port is faithful to row data (authoritative).
    const whisperCount = CARDS.filter((c) => c.whisper).length
    expect(whisperCount).toBe(10)
    for (const identity of IDENTITIES) {
      const w = cardsByIdentity(identity).filter((c) => c.whisper).length
      expect(w).toBe(2)
    }
  })
})

describe('cards · helpers', () => {
  it('cardById returns the correct card', () => {
    const card = cardById(2)
    expect(card.name).toBe('붉은 나비 부인')
    expect(card.identity).toBe('Royalty')
    expect(card.whisper).toBe(true)
  })

  it('cardById throws for unknown id', () => {
    expect(() => cardById(0)).toThrow()
    expect(() => cardById(41)).toThrow()
    expect(() => cardById(-1)).toThrow()
  })

  it('cardsByIdentity returns cards of that identity only', () => {
    const thieves = cardsByIdentity('Thief')
    expect(thieves.length).toBe(8)
    for (const c of thieves) {
      expect(c.identity).toBe('Thief')
    }
    expect(thieves.map((c) => c.id).sort((a, b) => a - b)).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16,
    ])
  })
})
