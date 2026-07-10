import { describe, it, expect } from 'vitest'
import {
  RULES,
  challenge,
  commit,
  createMatch,
  isMatchOver,
  nextRound,
  revealCommits,
  triggerEvent,
} from './match.ts'
import type { Card, MatchState, SeatId } from './types.ts'

// ─── Helpers ────────────────────────────────────────────────────────
function pickBySeat(state: MatchState, seat: SeatId) {
  return state.court[seat - 1]
}

function card(overrides: Partial<Card> & Pick<Card, 'id' | 'identity'>): Card {
  return {
    name: `TestCard#${overrides.id}`,
    shadowName: `Masked ${overrides.id}`,
    surface: 3,
    number: overrides.id,
    icon: 'moon',
    whisper: false,
    ...overrides,
  } as Card
}

// ─── createMatch ────────────────────────────────────────────────────
describe('createMatch', () => {
  it('sets up round 1, empty court, phase=commit, HAND_SIZE cards each', () => {
    const s = createMatch({ seed: 42 })
    expect(s.round).toBe(1)
    expect(s.phase).toBe('commit')
    expect(s.court.length).toBe(8)
    expect(s.court.every((c) => c.placement === null && c.pending === null && c.alliance === null)).toBe(true)
    expect(s.players.me.hand.length).toBe(RULES.HAND_SIZE)
    expect(s.players.opponent.hand.length).toBe(RULES.HAND_SIZE)
  })

  it('is deterministic for a given seed', () => {
    const a = createMatch({ seed: 42 })
    const b = createMatch({ seed: 42 })
    expect(a.players.me.hand.map((c) => c.id)).toEqual(b.players.me.hand.map((c) => c.id))
    expect(a.players.opponent.hand.map((c) => c.id)).toEqual(
      b.players.opponent.hand.map((c) => c.id),
    )
    expect(a.market.map((c) => c.id)).toEqual(b.market.map((c) => c.id))
  })

  it('different seeds produce different hands (usually)', () => {
    const a = createMatch({ seed: 1 })
    const b = createMatch({ seed: 2 })
    // Very likely at least one hand card differs.
    const aIds = a.players.me.hand.map((c) => c.id).join(',')
    const bIds = b.players.me.hand.map((c) => c.id).join(',')
    expect(aIds).not.toBe(bIds)
  })

  it('accepts custom playerCards / opponentCards', () => {
    const custom = [
      card({ id: 1001, identity: 'Royalty' }),
      card({ id: 1002, identity: 'Thief' }),
      card({ id: 1003, identity: 'Scholar' }),
      card({ id: 1004, identity: 'Hunter' }),
      card({ id: 1005, identity: 'Mystic' }),
    ]
    const s = createMatch({ seed: 7, playerCards: custom })
    expect(s.players.me.hand.map((c) => c.id)).toEqual([1001, 1002, 1003, 1004, 1005])
    expect(s.players.opponent.hand.length).toBe(RULES.HAND_SIZE)
  })
})

// ─── commit + revealCommits ─────────────────────────────────────────
describe('commit + revealCommits', () => {
  function twoHandsSetup() {
    const me = [
      card({ id: 100, identity: 'Royalty', surface: 4 }),
      card({ id: 101, identity: 'Thief', surface: 2 }),
    ]
    const opp = [
      card({ id: 200, identity: 'Scholar', surface: 3 }),
      card({ id: 201, identity: 'Mystic', surface: 3 }),
    ]
    return createMatch({ seed: 99, playerCards: me, opponentCards: opp })
  }

  it('single commit stays in commit phase', () => {
    const s0 = twoHandsSetup()
    const s1 = commit(s0, { player: 'me', cardId: 100, seat: 1 })
    expect(s1.phase).toBe('commit')
    expect(s1.tempCommits.me).toBeDefined()
    expect(s1.tempCommits.opponent).toBeUndefined()
  })

  it('two commits (different seats) → both placed as single placements', () => {
    const s0 = twoHandsSetup()
    const s1 = commit(s0, { player: 'me', cardId: 100, seat: 1 })
    const s2 = commit(s1, { player: 'opponent', cardId: 200, seat: 3 })
    expect(s2.phase).toBe('reveal')
    const s3 = revealCommits(s2)
    expect(pickBySeat(s3, 1).placement?.card.id).toBe(100)
    expect(pickBySeat(s3, 1).placement?.owner).toBe('me')
    expect(pickBySeat(s3, 3).placement?.card.id).toBe(200)
    expect(pickBySeat(s3, 3).placement?.owner).toBe('opponent')
    expect(s3.tempCommits.me).toBeUndefined()
    expect(s3.tempCommits.opponent).toBeUndefined()
  })

  it('same seat in R2 → pending populated, deferred', () => {
    // First bump to R2.
    let s = twoHandsSetup()
    s = commit(s, { player: 'me', cardId: 100, seat: 1 })
    s = commit(s, { player: 'opponent', cardId: 200, seat: 3 })
    s = revealCommits(s)
    s = nextRound(s) // R2
    expect(s.round).toBe(2)
    expect(s.phase).toBe('commit')
    s = commit(s, { player: 'me', cardId: 101, seat: 5 })
    s = commit(s, { player: 'opponent', cardId: 201, seat: 5 })
    s = revealCommits(s)
    const slot5 = pickBySeat(s, 5)
    expect(slot5.pending).not.toBeNull()
    expect(slot5.pending?.me.id).toBe(101)
    expect(slot5.pending?.opponent.id).toBe(201)
    expect(slot5.placement).toBeNull()
  })
})

// ─── R5 unmasking ───────────────────────────────────────────────────
describe('R5 UNMASKING', () => {
  it('nextRound to R5 sets phase=unmasking; revealCommits resolves all deferred duels', () => {
    // Craft: R1..R4 various same-seat clashes.
    const me = [
      card({ id: 300, identity: 'Royalty' }), // R1 → S1 clash Thief (loses)
      card({ id: 301, identity: 'Scholar' }), // R2 → S2 clash Mystic (Scholar wins)
      card({ id: 302, identity: 'Hunter' }),  // R3 filler
      card({ id: 303, identity: 'Mystic' }),  // R4 filler
      card({ id: 304, identity: 'Royalty' }), // R5 commit
    ]
    const opp = [
      card({ id: 400, identity: 'Thief' }),
      card({ id: 401, identity: 'Mystic' }),
      card({ id: 402, identity: 'Hunter' }),
      card({ id: 403, identity: 'Royalty' }),
      card({ id: 404, identity: 'Scholar' }),
    ]
    let s = createMatch({ seed: 5, playerCards: me, opponentCards: opp })

    // R1 same-seat clash S1
    s = commit(s, { player: 'me', cardId: 300, seat: 1 })
    s = commit(s, { player: 'opponent', cardId: 400, seat: 1 })
    s = revealCommits(s)
    expect(pickBySeat(s, 1).pending).not.toBeNull()
    s = nextRound(s) // R2

    // R2 same-seat clash S2
    s = commit(s, { player: 'me', cardId: 301, seat: 2 })
    s = commit(s, { player: 'opponent', cardId: 401, seat: 2 })
    s = revealCommits(s)
    expect(pickBySeat(s, 2).pending).not.toBeNull()

    s = nextRound(s) // R3
    // R3 no clash, different seats
    s = commit(s, { player: 'me', cardId: 302, seat: 3 })
    s = commit(s, { player: 'opponent', cardId: 402, seat: 4 })
    s = revealCommits(s)

    s = nextRound(s) // R4
    s = commit(s, { player: 'me', cardId: 303, seat: 5 })
    s = commit(s, { player: 'opponent', cardId: 403, seat: 6 })
    s = revealCommits(s)

    s = nextRound(s) // R5 → unmasking
    expect(s.phase).toBe('unmasking')

    // Bulk-resolve deferred duels, then transition to commit for R5.
    s = revealCommits(s)
    expect(s.phase).toBe('commit')

    // Both players commit for R5.
    s = commit(s, { player: 'me', cardId: 304, seat: 7 })
    s = commit(s, { player: 'opponent', cardId: 404, seat: 8 })
    s = revealCommits(s)

    // All deferred pending should now be resolved.
    expect(pickBySeat(s, 1).pending).toBeNull()
    expect(pickBySeat(s, 2).pending).toBeNull()
    // S1: Royalty beats Thief → me wins S1.
    expect(pickBySeat(s, 1).placement?.owner).toBe('me')
    // S2: Scholar beats Mystic → me wins S2.
    expect(pickBySeat(s, 2).placement?.owner).toBe('me')
    // R5 commits also placed.
    expect(pickBySeat(s, 7).placement?.card.id).toBe(304)
    expect(pickBySeat(s, 8).placement?.card.id).toBe(404)
  })
})

// ─── Challenge (R5+) ────────────────────────────────────────────────
describe('challenge (R5+)', () => {
  it('winning identity exiles defender', () => {
    // Setup: opponent already occupies S1 with a Thief; my Royalty challenges.
    const me = [card({ id: 500, identity: 'Royalty' })]
    const opp = [card({ id: 600, identity: 'Thief' })]
    let s = createMatch({ seed: 11, playerCards: me, opponentCards: opp })
    // Fast-forward to R5 — challenges open the moment identities are unmasked.
    s = {
      ...s,
      round: 5,
      court: s.court.map((c, i) =>
        i === 0
          ? { ...c, placement: { card: opp[0], owner: 'opponent' } }
          : c,
      ),
    }
    const s2 = challenge(s, { player: 'me', cardId: 500, seat: 1 })
    expect(pickBySeat(s2, 1).placement?.owner).toBe('me')
    expect(pickBySeat(s2, 1).placement?.card.id).toBe(500)
    expect(s2.players.opponent.exile.map((c) => c.id)).toContain(600)
  })

  it('is a no-op below R5', () => {
    const me = [card({ id: 501, identity: 'Royalty' })]
    const opp = [card({ id: 601, identity: 'Thief' })]
    let s = createMatch({ seed: 12, playerCards: me, opponentCards: opp })
    s = {
      ...s,
      round: 4,
      court: s.court.map((c, i) =>
        i === 0 ? { ...c, placement: { card: opp[0], owner: 'opponent' } } : c,
      ),
    }
    const s2 = challenge(s, { player: 'me', cardId: 501, seat: 1 })
    // Placement unchanged.
    expect(pickBySeat(s2, 1).placement?.owner).toBe('opponent')
  })
})

// ─── Alliance ───────────────────────────────────────────────────────
describe('alliance', () => {
  it('same identity duel → alliance flag set, both cards stay', () => {
    // R2 same-seat clash defers; then advance to R5 to force resolution.
    const me = [
      card({ id: 700, identity: 'Royalty' }),
      card({ id: 701, identity: 'Royalty' }),
      card({ id: 702, identity: 'Royalty' }),
      card({ id: 703, identity: 'Royalty' }),
      card({ id: 704, identity: 'Royalty' }),
    ]
    const opp = [
      card({ id: 800, identity: 'Royalty' }),
      card({ id: 801, identity: 'Royalty' }),
      card({ id: 802, identity: 'Royalty' }),
      card({ id: 803, identity: 'Royalty' }),
      card({ id: 804, identity: 'Royalty' }),
    ]
    let s = createMatch({ seed: 20, playerCards: me, opponentCards: opp })
    // R1 clash on S1 (deferred)
    s = commit(s, { player: 'me', cardId: 700, seat: 1 })
    s = commit(s, { player: 'opponent', cardId: 800, seat: 1 })
    s = revealCommits(s)
    for (let r = 2; r <= 4; r++) {
      s = nextRound(s)
      // put on different seats to avoid extra clashes
      s = commit(s, { player: 'me', cardId: [701, 702, 703][r - 2], seat: (r + 1) as SeatId })
      s = commit(s, { player: 'opponent', cardId: [801, 802, 803][r - 2], seat: (r + 3) as SeatId })
      s = revealCommits(s)
    }
    s = nextRound(s) // R5 → unmasking
    s = revealCommits(s) // bulk resolve pending
    s = commit(s, { player: 'me', cardId: 704, seat: 7 })
    s = commit(s, { player: 'opponent', cardId: 804, seat: 8 })
    s = revealCommits(s)

    const s1 = pickBySeat(s, 1)
    expect(s1.alliance).not.toBeNull()
    expect(s1.alliance?.me.id).toBe(700)
    expect(s1.alliance?.opponent.id).toBe(800)
  })
})

// ─── Events / phase progression ─────────────────────────────────────
describe('triggerEvent + nextRound', () => {
  it('maskFestival adds festivalBonus', () => {
    const s = createMatch({ seed: 3 })
    const s2 = triggerEvent(s, 'maskFestival')
    expect(s2.festivalBonus).toBe(1)
    // Idempotent by event id
    const s3 = triggerEvent(s2, 'maskFestival')
    expect(s3.festivalBonus).toBe(1)
  })

  it('kingArrives sets Royalty bonus', () => {
    const s = createMatch({ seed: 4 })
    const s2 = triggerEvent(s, 'kingArrives')
    expect(s2.identityBonus.Royalty).toBe(5)
  })

  it('scholarSymposium relaxes scholar match', () => {
    const s = createMatch({ seed: 6 })
    const s2 = triggerEvent(s, 'scholarSymposium')
    expect(s2.scholarLoose).toBe(true)
  })

  it('nextRound past MAX_ROUNDS → reckoning; isMatchOver = true', () => {
    let s = createMatch({ seed: 8 })
    for (let i = 0; i < 20; i++) s = nextRound(s)
    expect(s.phase).toBe('reckoning')
    expect(isMatchOver(s)).toBe(true)
  })
})
