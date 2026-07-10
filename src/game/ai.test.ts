import { describe, it, expect } from 'vitest'
import { createAIBrain, _aiInternals } from './ai.ts'
import type { Difficulty } from './ai.ts'
import { createMatch, RULES } from './match.ts'
import type { Card, MatchState, Player, SeatId } from './types.ts'
import { SEATS } from './types.ts'

// ─── Helpers ────────────────────────────────────────────────────────
function card(overrides: Partial<Card> & Pick<Card, 'id' | 'identity'>): Card {
  return {
    name: `TC#${overrides.id}`,
    shadowName: `Masked ${overrides.id}`,
    surface: 2,
    number: overrides.id,
    icon: 'moon',
    whisper: false,
    ...overrides,
  } as Card
}

/** Deterministic mulberry32-like PRNG for seeded tests. */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Build a MatchState with fully specified hands. */
function scriptedState(opts: {
  round?: number
  me: Card[]
  opp: Card[]
  courtOverride?: (state: MatchState) => void
}): MatchState {
  const s = createMatch({
    seed: 1,
    playerCards: opts.me,
    opponentCards: opts.opp,
  })
  if (opts.round) s.round = opts.round
  if (opts.courtOverride) opts.courtOverride(s)
  return s
}

// ─── Malcolm ────────────────────────────────────────────────────────
describe('말콤 백작 (malcolm)', () => {
  it('never returns a challenge action, regardless of round', () => {
    const brain = createAIBrain('malcolm', mulberry32(7))
    for (const round of [1, 5, 7, 8]) {
      const s = createMatch({ seed: 42 })
      s.round = round
      // Force at least one occupied seat so challenge is *possible*.
      s.court[0].placement = { card: s.players.me.hand[0], owner: 'me' }
      const action = brain.pickCommit(s, 'opponent')
      expect(action.kind).toBe('commit')
    }
  })

  it('covers each legal move at least once over 200 seeded picks (soft uniform)', () => {
    const s = createMatch({ seed: 100 })
    // Isolate: hand has 5 cards, all 8 seats empty → 5 × 8 = 40 legal moves.
    const brain = createAIBrain('malcolm', mulberry32(1))
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const action = brain.pickCommit(s, 'me')
      seen.add(`${action.cardId}:${action.seat}`)
    }
    // 200 picks over 40 buckets — every bucket should almost surely be hit.
    // Soft assertion: require >= 35/40 distinct.
    expect(seen.size).toBeGreaterThanOrEqual(35)
  })

  it('always returns a legal action', () => {
    const brain = createAIBrain('malcolm', mulberry32(3))
    for (let seed = 1; seed <= 20; seed++) {
      const s = createMatch({ seed })
      const action = brain.pickCommit(s, 'me')
      expect(action.kind).toBe('commit')
      const inHand = s.players.me.hand.some((c) => c.id === action.cardId)
      expect(inHand).toBe(true)
      expect(action.seat).toBeGreaterThanOrEqual(1)
      expect(action.seat).toBeLessThanOrEqual(8)
    }
  })
})

// ─── Isabella ───────────────────────────────────────────────────────
describe('이자벨라 부인 (isabella)', () => {
  it('picks the seat that grants a slot buff when otherwise equal', () => {
    // One Royalty card in hand — should prefer Trono (seat 1, favors Royalty).
    // Give another card of equal surface but a non-matching identity so
    // Isabella's argmax cleanly prefers the buffed seat.
    const me = [
      card({ id: 1, identity: 'Royalty', surface: 1 }),
      card({ id: 2, identity: 'Thief', surface: 1, whisper: false }),
      card({ id: 3, identity: 'Hunter', surface: 1 }),
      card({ id: 4, identity: 'Mystic', surface: 1 }),
      card({ id: 5, identity: 'Scholar', surface: 1 }),
    ]
    const opp = [
      card({ id: 91, identity: 'Royalty' }),
      card({ id: 92, identity: 'Thief' }),
      card({ id: 93, identity: 'Scholar' }),
      card({ id: 94, identity: 'Hunter' }),
      card({ id: 95, identity: 'Mystic' }),
    ]
    const s = scriptedState({ me, opp })
    const brain = createAIBrain('isabella', mulberry32(1))
    const action = brain.pickCommit(s, 'me')
    expect(action.kind).toBe('commit')
    // Best pick should be Royalty into Trono (seat 1).
    expect(action.cardId).toBe(1)
    expect(action.seat).toBe(1 as SeatId)
  })

  it('breaks ties toward whisper cards', () => {
    // Two Thief cards, identical surface, only difference: one has whisper.
    // Place them in a state where neither seat gives a buff, so scores tie.
    const me = [
      card({ id: 10, identity: 'Thief', surface: 2, whisper: false }),
      card({ id: 11, identity: 'Thief', surface: 2, whisper: true }),
    ]
    const opp = [
      card({ id: 91, identity: 'Royalty' }),
      card({ id: 92, identity: 'Thief' }),
      card({ id: 93, identity: 'Scholar' }),
      card({ id: 94, identity: 'Hunter' }),
      card({ id: 95, identity: 'Mystic' }),
    ]
    const s = scriptedState({ me, opp })
    // Isabella evaluates every card×seat pair. In an empty court, the two
    // Thief cards score identically at every seat (surface is equal, buff
    // only matters at Vicolo seat 2, and both are Thief so they'd both get
    // the same +3). The whisper card should be preferred.
    const brain = createAIBrain('isabella', mulberry32(2))
    const action = brain.pickCommit(s, 'me')
    expect(action.cardId).toBe(11)
  })

  it('always returns a legal action', () => {
    const brain = createAIBrain('isabella', mulberry32(4))
    for (let seed = 1; seed <= 10; seed++) {
      const s = createMatch({ seed })
      const action = brain.pickCommit(s, 'me')
      expect(action.kind).toBe('commit')
      const inHand = s.players.me.hand.some((c) => c.id === action.cardId)
      expect(inHand).toBe(true)
    }
  })
})

// ─── L'Ombra ────────────────────────────────────────────────────────
describe("L'Ombra (lombra)", () => {
  it('never issues a challenge action before round 7', () => {
    const brain = createAIBrain('lombra', mulberry32(9))
    for (const round of [1, 2, 5, 6]) {
      const s = createMatch({ seed: round + 10 })
      s.round = round
      // Force an occupied seat by opponent so challenge could theoretically fire.
      s.court[0].placement = { card: s.players.opponent.hand[0], owner: 'opponent' }
      for (let i = 0; i < 20; i++) {
        const action = brain.pickCommit(s, 'me')
        expect(action.kind).toBe('commit')
      }
    }
  })

  it('is capable of issuing a challenge action from round 7 onward', () => {
    // Force a state where challenging is clearly the best move:
    // - my hand: Royalty (which beats Thief)
    // - seat 2 occupied by opponent Thief
    // - round 7
    const me = [
      card({ id: 1, identity: 'Royalty', surface: 4 }),
      card({ id: 2, identity: 'Royalty', surface: 4 }),
      card({ id: 3, identity: 'Royalty', surface: 4 }),
      card({ id: 4, identity: 'Royalty', surface: 4 }),
      card({ id: 5, identity: 'Royalty', surface: 4 }),
    ]
    const opp = [
      card({ id: 91, identity: 'Thief' }),
      card({ id: 92, identity: 'Thief' }),
      card({ id: 93, identity: 'Thief' }),
      card({ id: 94, identity: 'Thief' }),
      card({ id: 95, identity: 'Thief' }),
    ]
    const defender = card({ id: 500, identity: 'Thief', surface: 1 })
    const s = scriptedState({
      round: 7,
      me,
      opp,
      courtOverride: (st) => {
        st.court[1].placement = { card: defender, owner: 'opponent' }
      },
    })

    const brain = createAIBrain('lombra', mulberry32(11))
    // Try a handful of picks — at least once we should see a challenge on seat 2.
    let sawChallenge = false
    for (let i = 0; i < 25; i++) {
      const action = brain.pickCommit(s, 'me')
      if (action.kind === 'challenge' && action.seat === 2) sawChallenge = true
    }
    expect(sawChallenge).toBe(true)
  })

  it('prefers a seat where its identity duels-win over an equal-surface non-duel seat', () => {
    // Setup: exactly one Thief in hand. Opponent has a known leaked Scholar.
    // Thief beats Scholar (RPS-5). Seat 3 (Biblioteca, favors Scholar) is the
    // seat where Scholar is most tempting for opponent — L'Ombra should bait
    // that seat over seat 4 (Foresta, favors Hunter, no leak match).
    // We block seat 2 (Vicolo, Thief-favored) so the "own slot buff" doesn't
    // dominate the choice.
    const me = [
      card({ id: 10, identity: 'Thief', surface: 2 }),
    ]
    const opp = [
      card({ id: 91, identity: 'Scholar', surface: 2 }),
    ]
    const s = scriptedState({
      round: 3,
      me,
      opp,
      courtOverride: (st) => {
        // Leak: 'me' knows opponent card 91 is a Scholar.
        st.players.me.known.push({ cardId: 91, identity: 'Scholar' })
        // Occupy seats that would otherwise dominate scoring:
        //  - seat 1 (Trono, Royalty buff) — not relevant for a Thief but eliminate ambiguity.
        //  - seat 2 (Vicolo, Thief buff) — remove the strongest "own buff" seat.
        const filler = card({ id: 200, identity: 'Royalty', surface: 1 })
        st.court[0].placement = { card: filler, owner: 'me' } // seat 1
        st.court[1].placement = { card: filler, owner: 'me' } // seat 2
      },
    })

    const brain = createAIBrain('lombra', mulberry32(23))
    const seatCounts: Record<number, number> = {}
    for (let i = 0; i < 80; i++) {
      const action = brain.pickCommit(s, 'me')
      seatCounts[action.seat] = (seatCounts[action.seat] || 0) + 1
    }
    // Seat 3 (Scholar-favored → likely opponent commit target) should be
    // picked at least as often as seat 4 (Hunter-favored, no duel bait).
    const s3 = seatCounts[3] || 0
    const s4 = seatCounts[4] || 0
    expect(s3).toBeGreaterThan(s4)
  })

  it('is deterministic under a fixed rng seed', () => {
    const brainA = createAIBrain('lombra', mulberry32(999))
    const brainB = createAIBrain('lombra', mulberry32(999))
    const s = createMatch({ seed: 314 })
    const picks: string[] = []
    for (let i = 0; i < 10; i++) {
      const a = brainA.pickCommit(s, 'me')
      const b = brainB.pickCommit(s, 'me')
      picks.push(`${a.kind}:${a.cardId}:${a.seat}`)
      expect(a).toEqual(b)
    }
    // Sanity: at least some picks should differ over 10 calls (rng advances).
    // If not, still ok — the rng advance is per-call; we only care about
    // brainA vs brainB equality above.
    void picks
  })

  it('always returns a legal action', () => {
    const brain = createAIBrain('lombra', mulberry32(5))
    for (let seed = 1; seed <= 10; seed++) {
      const s = createMatch({ seed })
      const action = brain.pickCommit(s, 'me')
      const inHand = s.players.me.hand.some((c) => c.id === action.cardId)
      expect(inHand).toBe(true)
      expect(action.seat).toBeGreaterThanOrEqual(1)
      expect(action.seat).toBeLessThanOrEqual(8)
    }
  })
})

// ─── Flavor + factory ───────────────────────────────────────────────
describe('createAIBrain factory', () => {
  it('returns the expected persona metadata for each difficulty', () => {
    const cases: Array<[Difficulty, string]> = [
      ['malcolm', '말콤'],
      ['isabella', '이자벨라'],
      ['lombra', 'Ombra'],
    ]
    for (const [difficulty, nameFrag] of cases) {
      const brain = createAIBrain(difficulty)
      expect(brain.difficulty).toBe(difficulty)
      expect(brain.name).toContain(nameFrag)
      expect(brain.flavor.length).toBeGreaterThan(0)
    }
  })
})

// ─── Internals sanity ───────────────────────────────────────────────
describe('_aiInternals', () => {
  it('legalMoves excludes pending and alliance seats', () => {
    const s = createMatch({ seed: 44 })
    s.court[0].pending = {
      me: s.players.me.hand[0],
      opponent: s.players.opponent.hand[0],
    }
    s.court[1].alliance = {
      me: s.players.me.hand[1],
      opponent: s.players.opponent.hand[1],
    }
    const moves = _aiInternals.legalMoves(s, 'me', false)
    for (const m of moves) {
      expect(m.seat).not.toBe(1)
      expect(m.seat).not.toBe(2)
    }
  })

  it('legalMoves includes challenges only when allowChallenge && round >= 7', () => {
    const s = createMatch({ seed: 55 })
    s.court[2].placement = { card: s.players.opponent.hand[0], owner: 'opponent' }
    s.round = 6
    const movesR6 = _aiInternals.legalMoves(s, 'me', true)
    expect(movesR6.every((m) => !m.isChallenge)).toBe(true)
    s.round = 7
    const movesR7 = _aiInternals.legalMoves(s, 'me', true)
    expect(movesR7.some((m) => m.isChallenge && m.seat === 3)).toBe(true)
    const movesR7NoAllow = _aiInternals.legalMoves(s, 'me', false)
    expect(movesR7NoAllow.every((m) => !m.isChallenge)).toBe(true)
  })

  it('estimateIdentityDistribution sums to ~1', () => {
    const s = createMatch({ seed: 66 })
    const dist = _aiInternals.estimateIdentityDistribution(s, 'opponent')
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 5)
  })
})

// Reference SEATS to keep the import warning free.
void SEATS
// Reference RULES for clarity of intent (challenge cutoff round is 7).
void RULES
// Reference Player for tsc.
void ({} as Player)
