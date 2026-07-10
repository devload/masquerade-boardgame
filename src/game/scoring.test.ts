import { describe, it, expect } from 'vitest'
import { createMatch, RULES } from './match.ts'
import { applyRuin, scoreAll, scorePlayer } from './scoring.ts'
import type { Card, MatchState, Placement } from './types.ts'
import { SEATS } from './types.ts'

function makeCard(id: number, over: Partial<Card>): Card {
  return {
    id,
    name: `#${id}`,
    shadowName: `Masked ${id}`,
    identity: 'Royalty',
    surface: 2,
    number: id,
    icon: 'moon',
    whisper: false,
    ...over,
  }
}

function withPlacements(base: MatchState, list: Array<{ seat: number; placement: Placement }>) {
  return {
    ...base,
    court: base.court.map((slot, i) => {
      const found = list.find((x) => x.seat === i + 1)
      return found ? { ...slot, placement: found.placement } : slot
    }),
  }
}

describe('scoring · known-case hand computed', () => {
  it('single Royalty on Slot 1 · surface 3', () => {
    const base = createMatch({ seed: 1 })
    const c = makeCard(9001, { identity: 'Royalty', surface: 3 })
    const s = withPlacements(base, [{ seat: 1, placement: { card: c, owner: 'me' } }])
    const b = scorePlayer(s, 'me')
    // surface=3 + slotBuff(Royalty on Slot 1)=5 + identity(Royalty x1) = 3 + 5 + 3 = 11
    // No event, no exile, no combo.
    expect(b.surface).toBe(3)
    expect(b.slotBuff).toBe(5) // SEATS[0].bonus=5
    expect(b.identity).toBe(3) // 1 Royalty in court * 3
    expect(b.event).toBe(0)
    expect(b.exile).toBe(0)
    expect(b.combo).toBe(0)
    expect(b.total).toBe(11)
  })

  it('Scholar on Slot 3 with matching number → +8', () => {
    // Scholar rule: seat_num == ((card.number-1) % 8) + 1 → +8.
    // Slot 3 (index 2, num=3). We need cardMod=3 → number where (number-1)%8+1 = 3
    // → (number-1)%8 = 2 → number ≡ 3 mod 8 → number=3,11,19...
    const base = createMatch({ seed: 2 })
    const c = makeCard(3, { identity: 'Scholar', surface: 1, number: 3 })
    const s = withPlacements(base, [{ seat: 3, placement: { card: c, owner: 'me' } }])
    const b = scorePlayer(s, 'me')
    // surface=1, slotBuff=Scholar on Slot 3 = SEATS[2].bonus = 4, identity=+8
    expect(b.surface).toBe(1)
    expect(b.slotBuff).toBe(4)
    expect(b.identity).toBe(8)
    expect(b.total).toBe(1 + 4 + 8)
  })

  it('Mystic on Slot 8 · distinct×3 with 3 distinct identities in court', () => {
    const base = createMatch({ seed: 3 })
    const mystic = makeCard(8001, { identity: 'Mystic', surface: 2 })
    const roy = makeCard(8002, { identity: 'Royalty' })
    const thief = makeCard(8003, { identity: 'Thief' })
    const s = withPlacements(base, [
      { seat: 8, placement: { card: mystic, owner: 'me' } },
      { seat: 5, placement: { card: roy, owner: 'opponent' } },
      { seat: 6, placement: { card: thief, owner: 'opponent' } },
    ])
    const b = scorePlayer(s, 'me')
    // Distinct identities: Mystic, Royalty, Thief = 3 → 3 × 3 (Slot 8 왕 옆자리) = 9
    expect(b.identity).toBe(9)
    // Slot buff: Mystic on Slot 8 → SEATS[7].bonus=3
    expect(b.slotBuff).toBe(3)
    expect(b.surface).toBe(2)
    expect(b.total).toBe(2 + 3 + 9)
  })

  it('Hunter icon adjacency (basic Slot 4) grants +5 each side match', () => {
    const base = createMatch({ seed: 4 })
    const hunter = makeCard(9101, { identity: 'Hunter', surface: 2, icon: 'moon' })
    const leftNeighbor = makeCard(9102, { identity: 'Thief', icon: 'moon' })
    const rightNeighbor = makeCard(9103, { identity: 'Scholar', icon: 'moon' })
    const s = withPlacements(base, [
      { seat: 3, placement: { card: leftNeighbor, owner: 'opponent' } },
      { seat: 4, placement: { card: hunter, owner: 'me' } },
      { seat: 5, placement: { card: rightNeighbor, owner: 'opponent' } },
    ])
    const b = scorePlayer(s, 'me')
    // Hunter on Slot 4 (index 3) → +5 for each adjacent icon match = +10
    expect(b.identity).toBe(10)
  })

  it('Hunter on Slot 5 doubles adjacent icon bonus (10 each)', () => {
    const base = createMatch({ seed: 5 })
    const hunter = makeCard(9201, { identity: 'Hunter', surface: 1, icon: 'moon' })
    const rightNeighbor = makeCard(9202, { identity: 'Scholar', icon: 'moon' })
    const s = withPlacements(base, [
      { seat: 5, placement: { card: hunter, owner: 'me' } },
      { seat: 6, placement: { card: rightNeighbor, owner: 'opponent' } },
    ])
    const b = scorePlayer(s, 'me')
    // Slot 5 favors Hunter with +2, adjacency doubles: 10.
    expect(b.slotBuff).toBe(SEATS[4].bonus) // 2
    expect(b.identity).toBe(10)
  })

  it('festival bonus adds to every placed card surface', () => {
    const base = createMatch({ seed: 6 })
    const c = makeCard(9301, { identity: 'Royalty', surface: 3 })
    let s = withPlacements(base, [{ seat: 1, placement: { card: c, owner: 'me' } }])
    s = { ...s, festivalBonus: 2 }
    const b = scorePlayer(s, 'me')
    expect(b.surface).toBe(3 + 2)
  })

  it('event identityBonus adds to owner score', () => {
    const base = createMatch({ seed: 7 })
    const c = makeCard(9401, { identity: 'Thief', surface: 3 })
    let s = withPlacements(base, [{ seat: 2, placement: { card: c, owner: 'me' } }])
    s = { ...s, identityBonus: { Thief: -3 } }
    const b = scorePlayer(s, 'me')
    expect(b.event).toBe(-3)
  })
})

describe('scoring · combos', () => {
  it('6+ owned seats grants +15 domination combo', () => {
    const base = createMatch({ seed: 10 })
    const mine = Array.from({ length: 6 }, (_, i) => ({
      seat: i + 1,
      placement: {
        card: makeCard(1000 + i, { identity: 'Thief', surface: 1 }),
        owner: 'me' as const,
      },
    }))
    const s = withPlacements(base, mine)
    const b = scorePlayer(s, 'me')
    expect(b.combo).toBeGreaterThanOrEqual(15)
  })

  it('4 same-identity owned grants +15 family combo', () => {
    const base = createMatch({ seed: 11 })
    const mine = [1, 2, 3, 4].map((seat, i) => ({
      seat,
      placement: {
        card: makeCard(2000 + i, { identity: 'Royalty', surface: 1 }),
        owner: 'me' as const,
      },
    }))
    const s = withPlacements(base, mine)
    const b = scorePlayer(s, 'me')
    // Family +15 (4 Royalty)
    expect(b.combo).toBeGreaterThanOrEqual(15)
  })

  it('all 5 identities in court → +10 quintet each', () => {
    const base = createMatch({ seed: 12 })
    const list = [
      { seat: 1, id: 'Royalty' as const },
      { seat: 2, id: 'Thief' as const },
      { seat: 3, id: 'Scholar' as const },
      { seat: 4, id: 'Hunter' as const },
      { seat: 5, id: 'Mystic' as const },
    ].map((x, i) => ({
      seat: x.seat,
      placement: {
        card: makeCard(3000 + i, { identity: x.id, surface: 1 }),
        owner: 'me' as const,
      },
    }))
    const s = withPlacements(base, list)
    const b = scorePlayer(s, 'me')
    // +10 quintet included in combo.
    expect(b.combo).toBeGreaterThanOrEqual(10)
  })
})

describe('scoring · exile penalty & ruin', () => {
  it('exile count × EXILE_PENALTY', () => {
    const base = createMatch({ seed: 20 })
    const s: MatchState = {
      ...base,
      players: {
        ...base.players,
        me: {
          ...base.players.me,
          exile: [makeCard(9500, {}), makeCard(9501, {}), makeCard(9502, {})],
        },
      },
    }
    const b = scorePlayer(s, 'me')
    expect(b.exile).toBe(3 * RULES.EXILE_PENALTY)
  })

  it('applyRuin halves total when exile >= EXILE_LIMIT', () => {
    const breakdown = {
      player: 'me' as const,
      surface: 30,
      identity: 10,
      slotBuff: 4,
      event: 0,
      exile: -20,
      combo: 10,
      total: 34,
    }
    const ruined = applyRuin(breakdown, 5)
    expect(ruined.total).toBe(17)
    // Not mutated
    expect(breakdown.total).toBe(34)
  })

  it('applyRuin is a no-op below EXILE_LIMIT', () => {
    const breakdown = {
      player: 'me' as const,
      surface: 10,
      identity: 0,
      slotBuff: 0,
      event: 0,
      exile: -8,
      combo: 0,
      total: 2,
    }
    const notRuined = applyRuin(breakdown, 2)
    expect(notRuined.total).toBe(2)
  })

  it('scoreAll integrates ruin when exile count === EXILE_LIMIT (5)', () => {
    const base = createMatch({ seed: 21 })
    const c = makeCard(9600, { identity: 'Royalty', surface: 4 })
    let s: MatchState = withPlacements(base, [
      { seat: 1, placement: { card: c, owner: 'me' } },
    ])
    // 5 exiles on me → ruin.
    s = {
      ...s,
      players: {
        ...s.players,
        me: {
          ...s.players.me,
          exile: Array.from({ length: 5 }, (_, i) => makeCard(9700 + i, {})),
        },
      },
    }
    const { me } = scoreAll(s)
    // Before ruin: surface=4 slotBuff=5 identity=3 exile=-20 → total=-8 → after ruin floor(-8/2)=-4
    expect(me.total).toBe(-4)
  })
})

describe('scoreAll · winner', () => {
  it('picks me when me.total > opponent.total', () => {
    const base = createMatch({ seed: 30 })
    const myCard = makeCard(9800, { identity: 'Royalty', surface: 4 })
    const s = withPlacements(base, [
      { seat: 1, placement: { card: myCard, owner: 'me' } },
    ])
    const { winner } = scoreAll(s)
    expect(winner).toBe('me')
  })

  it('tie yields winner=tie', () => {
    const base = createMatch({ seed: 31 })
    // No placements → both 0.
    const { winner } = scoreAll(base)
    expect(winner).toBe('tie')
  })
})
