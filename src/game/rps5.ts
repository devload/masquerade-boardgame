import type { Identity } from './types.ts'

/**
 * RPS-5 · 각 정체는 2개를 이기고 2개에게 진다.
 *
 * See docs/WORLD.md § RPS-5 · 세력 관계도
 *   왕족  ▶ 도둑, 신비주의자
 *   도둑  ▶ 학자, 사냥꾼
 *   학자  ▶ 왕족, 신비주의자
 *   사냥꾼 ▶ 왕족, 학자
 *   신비주의자 ▶ 도둑, 사냥꾼
 */
export const BEATS: Record<Identity, readonly Identity[]> = {
  Royalty: ['Thief', 'Mystic'],
  Thief:   ['Scholar', 'Hunter'],
  Scholar: ['Royalty', 'Mystic'],
  Hunter:  ['Royalty', 'Scholar'],
  Mystic:  ['Thief', 'Hunter'],
}

export type DuelOutcome = 'a' | 'b' | 'alliance'

/**
 * Return which side wins the duel. Same identity → alliance (both stay
 * and share the seat).
 */
export function duel(a: Identity, b: Identity): DuelOutcome {
  if (a === b) return 'alliance'
  return BEATS[a].includes(b) ? 'a' : 'b'
}

/** All (attacker → defender) pairs where attacker wins, for AI reasoning. */
export function winningPairs(): Array<{ winner: Identity; loser: Identity }> {
  const out: Array<{ winner: Identity; loser: Identity }> = []
  for (const [winner, losers] of Object.entries(BEATS)) {
    for (const loser of losers) {
      out.push({ winner: winner as Identity, loser })
    }
  }
  return out
}
