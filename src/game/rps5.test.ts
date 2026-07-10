import { describe, it, expect } from 'vitest'
import { duel, winningPairs, BEATS } from './rps5.ts'
import { IDENTITIES } from './types.ts'

describe('rps5 · balance', () => {
  it('each identity beats exactly 2 others', () => {
    for (const id of IDENTITIES) {
      expect(BEATS[id].length).toBe(2)
    }
  })

  it('each identity loses to exactly 2 others', () => {
    for (const id of IDENTITIES) {
      const losesTo = IDENTITIES.filter((other) => BEATS[other].includes(id))
      expect(losesTo.length).toBe(2)
    }
  })

  it('same identity → alliance', () => {
    for (const id of IDENTITIES) {
      expect(duel(id, id)).toBe('alliance')
    }
  })

  it('duel is transitive for winning pairs', () => {
    for (const { winner, loser } of winningPairs()) {
      expect(duel(winner, loser)).toBe('a')
      expect(duel(loser, winner)).toBe('b')
    }
  })

  it('no identity beats itself', () => {
    for (const id of IDENTITIES) {
      expect(BEATS[id]).not.toContain(id)
    }
  })
})
