/**
 * MASQUERADE · RECKONING (endgame scoring).
 *
 * Ported from docs/simulations/masquerade-sim-v2.mjs § scoring.
 * Pure functions — no mutation of input state.
 *
 * Score categories:
 *   surface  : card face value (+ festival bonus)
 *   identity : per-identity rules (Royalty stack, Thief adjacency steal,
 *              Scholar seat-number match, Hunter icon adjacency, Mystic distinct)
 *   slotBuff : seat-affinity bonus (SEATS[i].bonus) when identity matches
 *   event    : global identityBonus (from court events like kingArrives)
 *   exile    : exile count × EXILE_PENALTY  (always non-positive)
 *   combo    : end-game combos (domination, family, quintet)
 */

import { RULES } from './match.ts'
import type { MatchState, Player, ScoreBreakdown, SlotState } from './types.ts'
import { SEATS } from './types.ts'

// ─── Public API ─────────────────────────────────────────────────────
export function scorePlayer(state: MatchState, player: Player): ScoreBreakdown {
  const b: ScoreBreakdown = emptyBreakdown(player)

  for (let i = 0; i < state.court.length; i++) {
    const slot = state.court[i]
    scoreSlot(state, slot, i, b, player)
  }

  const exileCount = state.players[player].exile.length
  b.exile = exileCount === 0 ? 0 : exileCount * RULES.EXILE_PENALTY
  b.combo = comboScore(state, player)
  b.total = b.surface + b.identity + b.slotBuff + b.event + b.exile + b.combo
  return b
}

export function scoreAll(
  state: MatchState,
): { me: ScoreBreakdown; opponent: ScoreBreakdown; winner: Player | 'tie' } {
  let me = scorePlayer(state, 'me')
  let opp = scorePlayer(state, 'opponent')
  if (state.players.me.exile.length >= RULES.EXILE_LIMIT) {
    me = applyRuin(me, state.players.me.exile.length)
  }
  if (state.players.opponent.exile.length >= RULES.EXILE_LIMIT) {
    opp = applyRuin(opp, state.players.opponent.exile.length)
  }
  const winner: Player | 'tie' =
    me.total > opp.total ? 'me' : me.total < opp.total ? 'opponent' : 'tie'
  return { me, opponent: opp, winner }
}

/**
 * 몰락 (Ruin): if a player has EXILE_LIMIT+ exiled cards, their total score
 * is halved (floored). Returns a new breakdown; original not mutated.
 * Marks the breakdown with an in-band `ruined` marker via total-only mutation.
 */
export function applyRuin(breakdown: ScoreBreakdown, exileCount: number): ScoreBreakdown {
  if (exileCount < RULES.EXILE_LIMIT) return breakdown
  return { ...breakdown, total: Math.floor(breakdown.total / 2) }
}

// ─── Per-slot scoring ───────────────────────────────────────────────
function scoreSlot(
  state: MatchState,
  slot: SlotState,
  seatIndex: number,
  b: ScoreBreakdown,
  player: Player,
) {
  const seatBuff = SEATS[seatIndex]

  // Alliance: both players split surface (halved, floored).
  if (slot.alliance) {
    const myCard = slot.alliance.me
    const oppCard = slot.alliance.opponent
    const halfBase = Math.floor(
      (myCard.surface + oppCard.surface + state.festivalBonus * 2) / 2,
    )
    b.surface += halfBase
    // Both players benefit from their card's identity rule (halved impact
    // is implicit via halved surface, but per sim we don't further split
    // identity/slot bonuses).
    const myOrOpp = player === 'me' ? myCard : oppCard
    if (seatBuff.favors === myOrOpp.identity) b.slotBuff += Math.floor(seatBuff.bonus / 2)
    if (state.identityBonus[myOrOpp.identity]) {
      b.event += Math.floor((state.identityBonus[myOrOpp.identity] || 0) / 2)
    }
    return
  }

  if (!slot.placement || slot.placement.owner !== player) return

  const card = slot.placement.card

  // Surface + festival
  b.surface += card.surface + state.festivalBonus

  // Slot buff for identity match
  if (seatBuff.favors === card.identity) {
    b.slotBuff += seatBuff.bonus
  }

  // Identity rules
  switch (card.identity) {
    case 'Royalty': {
      const roys = countIdentityInCourt(state, 'Royalty')
      b.identity += roys * 3
      break
    }
    case 'Thief': {
      for (const adj of [seatIndex - 1, seatIndex + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.owner !== player) {
          b.identity += Math.floor(a.placement.card.surface / 2)
        }
      }
      break
    }
    case 'Scholar': {
      const slotNum = seatIndex + 1
      const cardMod = ((card.number - 1) % 8) + 1
      const diff = Math.abs(slotNum - cardMod)
      const threshold = state.scholarLoose ? 2 : 0
      if (diff <= threshold) b.identity += 8
      break
    }
    case 'Hunter': {
      for (const adj of [seatIndex - 1, seatIndex + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.card.icon === card.icon) {
          const bonus = seatIndex === 4 ? 10 : 5 // Slot 5 (index 4) 무도회 중심
          b.identity += bonus
        }
      }
      break
    }
    case 'Mystic': {
      const distinct = distinctIdentitiesInCourt(state)
      const perDistinct = seatIndex === 7 ? 3 : 2 // Slot 8 (index 7) 왕 옆자리
      b.identity += distinct * perDistinct
      break
    }
  }

  // Court event identity bonus
  if (state.identityBonus[card.identity]) {
    b.event += state.identityBonus[card.identity] || 0
  }
}

function countIdentityInCourt(state: MatchState, id: string): number {
  let n = 0
  for (const slot of state.court) {
    if (slot.placement?.card.identity === id) n++
    if (slot.alliance?.me.identity === id) n++
    if (slot.alliance?.opponent.identity === id) n++
  }
  return n
}

function distinctIdentitiesInCourt(state: MatchState): number {
  const set = new Set<string>()
  for (const slot of state.court) {
    if (slot.placement) set.add(slot.placement.card.identity)
    if (slot.alliance) {
      set.add(slot.alliance.me.identity)
      set.add(slot.alliance.opponent.identity)
    }
  }
  return set.size
}

// ─── Combos ─────────────────────────────────────────────────────────
function comboScore(state: MatchState, player: Player): number {
  let combo = 0

  const owned = state.court.filter((s) => s.placement?.owner === player).length
  if (owned >= 6) combo += 15

  const counts: Record<string, number> = {}
  for (const slot of state.court) {
    if (slot.placement?.owner === player) {
      const id = slot.placement.card.identity
      counts[id] = (counts[id] || 0) + 1
    }
  }
  if (Object.values(counts).some((n) => n >= 4)) combo += 15

  // Quintet: all 5 identities present across the court (any owner)
  if (distinctIdentitiesInCourt(state) === 5) combo += 10

  return combo
}

// ─── Helpers ────────────────────────────────────────────────────────
function emptyBreakdown(player: Player): ScoreBreakdown {
  return {
    player,
    surface: 0,
    identity: 0,
    slotBuff: 0,
    event: 0,
    exile: 0,
    combo: 0,
    total: 0,
  }
}
