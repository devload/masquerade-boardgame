/**
 * MASQUERADE · AI opponents (rival directors of the Masquerade).
 *
 * Three brains of increasing skill:
 *   - malcolm  · 초급 · 무작위 합법 착수, 챌린지 X
 *   - isabella · 중급 · 즉시 점수 argmax + 속삭임 타이브레이커
 *   - lombra   · 고급 · RPS-5 위협 모델링 + R7+ 챌린지 + 유예 결투 세팅
 *
 * Usage from the match store:
 *   const brain = createAIBrain('malcolm')
 *   const action = brain.pickCommit(state, 'opponent')
 *   if (action.kind === 'commit') state = commit(state, { player: 'opponent', ...action })
 *   else if (action.kind === 'challenge') state = challenge(state, { player: 'opponent', ...action })
 *
 * Pure module — no React / store imports. `createAIBrain` takes an optional
 * `rng: () => number` (defaults to Math.random) so callers can seed the
 * personality for reproducible playthroughs.
 */

import { duel } from './rps5.ts'
import { RULES } from './match.ts'
import type {
  Card,
  Identity,
  MatchState,
  Player,
  SeatId,
  SlotState,
} from './types.ts'
import { IDENTITIES, SEATS } from './types.ts'

// ─── Public types ───────────────────────────────────────────────────
export type Difficulty = 'malcolm' | 'isabella' | 'lombra'

export type AIAction =
  | { kind: 'commit'; cardId: number; seat: SeatId }
  | { kind: 'challenge'; cardId: number; seat: SeatId } // R7+ only

export type AIBrain = {
  name: string
  difficulty: Difficulty
  flavor: string
  pickCommit(state: MatchState, player: Player): AIAction
}

// ─── Move candidates ────────────────────────────────────────────────
type Move = {
  cardId: number
  seat: SeatId
  isChallenge: boolean
}

/**
 * Enumerate all legal moves for the current player.
 *
 * A legal move is one of:
 *  - `commit`: card in hand placed into an empty (and non-pending) seat.
 *  - `challenge`: R >= CHALLENGE_ALLOWED_FROM (7), card in hand attacks a seat
 *    currently held by the opponent.
 *
 * We deliberately exclude seats already owned by `player` themselves and
 * alliance / pending seats — those are all soft-fail on `commit()`.
 */
function legalMoves(state: MatchState, player: Player, allowChallenge: boolean): Move[] {
  const p = state.players[player]
  const opp: Player = player === 'me' ? 'opponent' : 'me'
  const canChallenge = allowChallenge && state.round >= RULES.CHALLENGE_ALLOWED_FROM

  const moves: Move[] = []
  for (const card of p.hand) {
    for (const slot of state.court) {
      const seat = slot.seat
      if (slot.pending) continue
      if (slot.alliance) continue
      if (slot.placement) {
        if (slot.placement.owner === player) continue // don't overwrite self
        if (slot.placement.owner === opp && canChallenge) {
          moves.push({ cardId: card.id, seat, isChallenge: true })
        }
        continue
      }
      moves.push({ cardId: card.id, seat, isChallenge: false })
    }
  }
  return moves
}

// ─── Shared scoring bits (Isabella + L'Ombra) ───────────────────────
function seatIndexFromId(seat: SeatId): number {
  return seat - 1
}

/**
 * Score the *immediate value* of placing `card` at `seat` for `player`.
 * This is a heuristic — surface + slot buff + event / festival bonus +
 * a cheap identity kicker (Royalty stack, Hunter adjacency, Mystic distinct,
 * Scholar seat-number). Used by both Isabella and L'Ombra.
 */
function immediateValue(state: MatchState, card: Card, seat: SeatId): number {
  const seatIdx = seatIndexFromId(seat)
  const buff = SEATS[seatIdx]
  let score = card.surface + state.festivalBonus

  if (buff.favors === card.identity) score += buff.bonus
  if (state.identityBonus[card.identity]) {
    score += state.identityBonus[card.identity] || 0
  }

  // Cheap identity-rule kicker (mirrors scoring.ts intent, not exact).
  switch (card.identity) {
    case 'Royalty': {
      let roys = 0
      for (const s of state.court) if (s.placement?.card.identity === 'Royalty') roys++
      score += (roys + 1) * 3
      break
    }
    case 'Thief': {
      for (const adj of [seatIdx - 1, seatIdx + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.owner !== state.court[seatIdx].placement?.owner) {
          score += Math.floor(a.placement.card.surface / 2)
        }
      }
      break
    }
    case 'Scholar': {
      const slotNum = seatIdx + 1
      const cardMod = ((card.number - 1) % 8) + 1
      const diff = Math.abs(slotNum - cardMod)
      const threshold = state.scholarLoose ? 2 : 0
      if (diff <= threshold) score += 8
      break
    }
    case 'Hunter': {
      for (const adj of [seatIdx - 1, seatIdx + 1]) {
        if (adj < 0 || adj >= state.court.length) continue
        const a = state.court[adj]
        if (a.placement && a.placement.card.icon === card.icon) {
          score += seatIdx === 4 ? 10 : 5
        }
      }
      break
    }
    case 'Mystic': {
      const set = new Set<Identity>()
      for (const s of state.court) {
        if (s.placement) set.add(s.placement.card.identity)
      }
      set.add(card.identity)
      score += set.size * (seatIdx === 7 ? 3 : 2)
      break
    }
  }

  return score
}

function findCardInHand(state: MatchState, player: Player, cardId: number): Card | undefined {
  return state.players[player].hand.find((c) => c.id === cardId)
}

// ─── Malcolm — 초급 (uniform random) ────────────────────────────────
function pickMalcolm(state: MatchState, player: Player, rng: () => number): AIAction {
  const moves = legalMoves(state, player, /* allowChallenge */ false)
  if (moves.length === 0) {
    // Degenerate fallback — commit the first hand card to any empty seat.
    // Should only trigger if the hand is empty (invalid state).
    return fallbackAction(state, player)
  }
  const pick = moves[Math.floor(rng() * moves.length)]
  return { kind: 'commit', cardId: pick.cardId, seat: pick.seat }
}

// ─── Isabella — 중급 (greedy value + whisper preference) ────────────
function pickIsabella(state: MatchState, player: Player, rng: () => number): AIAction {
  // Isabella considers challenges only occasionally (20%) in R7+ if she
  // spots a known-weak opponent identity and an RPS-5 winner in hand.
  const considerChallenge = state.round >= RULES.CHALLENGE_ALLOWED_FROM && rng() < 0.2
  const moves = legalMoves(state, player, considerChallenge)
  if (moves.length === 0) return fallbackAction(state, player)

  let best: Move | null = null
  let bestScore = -Infinity
  let bestIsWhisper = false

  const known = state.players[player].known

  for (const m of moves) {
    const card = findCardInHand(state, player, m.cardId)
    if (!card) continue

    let score = immediateValue(state, card, m.seat)

    if (m.isChallenge) {
      // Only respect challenge if we can prove RPS-5 winner from leaks.
      const seatIdx = seatIndexFromId(m.seat)
      const defenderCard = state.court[seatIdx].placement?.card
      if (!defenderCard) continue
      const leaked = known.some((k) => k.cardId === defenderCard.id)
      if (!leaked) {
        // Isabella doesn't gamble on unknowns.
        continue
      }
      const outcome = duel(card.identity, defenderCard.identity)
      if (outcome !== 'a') continue
      score += 6 // reward taking a proven-winning challenge
    }

    // Isabella's tiebreak: prefer whisper cards to gather info.
    const isWhisper = card.whisper === true

    if (
      score > bestScore ||
      (score === bestScore && isWhisper && !bestIsWhisper)
    ) {
      bestScore = score
      best = m
      bestIsWhisper = isWhisper
    }
  }

  if (!best) {
    // No legal challenge worked out; fall back to greedy commit.
    const commits = moves.filter((m) => !m.isChallenge)
    if (commits.length === 0) return fallbackAction(state, player)
    for (const m of commits) {
      const card = findCardInHand(state, player, m.cardId)
      if (!card) continue
      const s = immediateValue(state, card, m.seat)
      const isWhisper = card.whisper === true
      if (
        s > bestScore ||
        (s === bestScore && isWhisper && !bestIsWhisper)
      ) {
        bestScore = s
        best = m
        bestIsWhisper = isWhisper
      }
    }
    if (!best) return fallbackAction(state, player)
  }

  return best.isChallenge
    ? { kind: 'challenge', cardId: best.cardId, seat: best.seat }
    : { kind: 'commit', cardId: best.cardId, seat: best.seat }
}

// ─── L'Ombra — 고급 (RPS-5 threat model + trap setup) ───────────────
function pickLombra(state: MatchState, player: Player, rng: () => number): AIAction {
  const moves = legalMoves(state, player, /* allowChallenge */ true)
  if (moves.length === 0) return fallbackAction(state, player)

  const me: Player = player
  const opp: Player = player === 'me' ? 'opponent' : 'me'

  // Enumerate opponent's *possible* identities using both leaked knowns
  // and deck-depletion inference.
  const oppIdentityDist = estimateIdentityDistribution(state, opp)

  let best: Move | null = null
  let bestScore = -Infinity

  for (const m of moves) {
    const card = findCardInHand(state, me, m.cardId)
    if (!card) continue

    let score = immediateValue(state, card, m.seat)

    // 1. RPS-5 threat model — how does our identity fare against opponent?
    const threat = rps5Advantage(card.identity, oppIdentityDist)
    // threat ∈ roughly [-1, +1]. Scale to a meaningful nudge (0..5-ish).
    score += threat * 5

    // 2. Slot-buff denial: if our seat's favored identity matches likely
    //    opponent hand identity, taking it now denies them a big buff.
    const buff = SEATS[seatIndexFromId(m.seat)]
    const denyProb = oppIdentityDist[buff.favors] ?? 0
    score += denyProb * buff.bonus * 0.5

    // 3. R7+ challenge shaping.
    if (m.isChallenge) {
      const seatIdx = seatIndexFromId(m.seat)
      const defenderCard = state.court[seatIdx].placement?.card
      if (!defenderCard) continue

      const outcome = duel(card.identity, defenderCard.identity)
      if (outcome === 'a') score += 10 // definitive win
      else if (outcome === 'alliance') score += 2
      else score -= 8 // avoid losing challenges

      // Endgame: challenge harder when opponent hand is thinning.
      const oppHandSize = state.players[opp].hand.length
      if (oppHandSize < 2) score += 3

      // Deny buff on challenge — extra reward if slot buff matches opponent.
      if (buff.favors === defenderCard.identity) score += 2
    }

    // 4. Deferred duel setup (R1..R4): occasionally bait by committing into a
    //    seat where WE already own the placement's neighbor OR where the seat
    //    is currently held by opponent but same-seat clash is deferred (not
    //    reachable — see legalMoves). Instead we use a lightweight version:
    //    in R1..R4, if we KNOW an opponent card via leak and can RPS-5 beat
    //    it, seed the seat where they're likely to commit (favored buff match).
    if (state.round <= 4 && state.players[me].known.length > 0) {
      for (const k of state.players[me].known) {
        // Would opponent want to play their known-identity card at this seat?
        const oppFavor = SEATS[seatIndexFromId(m.seat)].favors
        if (oppFavor === k.identity) {
          const outcome = duel(card.identity, k.identity)
          if (outcome === 'a') score += 2.5 // bait a duel we win at R5
        }
      }
    }

    // 5. Whisper play — info-first when the immediate delta is small.
    if (card.whisper) {
      // If our current best is close (<3), whisper wins.
      if (score - bestScore < 3 || bestScore === -Infinity) {
        score += 1.5
      }
    }

    // 6. Anti-greed noise.
    score += (rng() - 0.5) // ±0.5

    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }

  if (!best) return fallbackAction(state, player)
  return best.isChallenge
    ? { kind: 'challenge', cardId: best.cardId, seat: best.seat }
    : { kind: 'commit', cardId: best.cardId, seat: best.seat }
}

/**
 * Return probability-ish weights of each identity the opponent might hold in
 * hand. Uses:
 *   - Confirmed leaks (state.players[player].known) → mass 1.
 *   - Deck depletion: remaining identity share in (deck + market).
 * Result is normalized to sum to 1 over IDENTITIES.
 */
function estimateIdentityDistribution(
  state: MatchState,
  opp: Player,
): Record<Identity, number> {
  const dist: Record<Identity, number> = {
    Royalty: 0, Thief: 0, Scholar: 0, Hunter: 0, Mystic: 0,
  }
  const oppHand = state.players[opp].hand
  const known = state.players[opp === 'me' ? 'opponent' : 'me'].known
    // knowns are stored per revealer; we care about the *opponent* leaks known
    // to the current player (opposite of `opp`).
    .filter((k) => oppHand.some((c) => c.id === k.cardId))
  const knownIds = new Set(known.map((k) => k.cardId))
  const unknownCount = oppHand.length - known.length

  for (const k of known) dist[k.identity] += 1

  // Pool from which unknown hand cards were drawn: deck + market.
  const pool: Card[] = [...state.deck, ...state.market]
  const poolCounts: Record<Identity, number> = {
    Royalty: 0, Thief: 0, Scholar: 0, Hunter: 0, Mystic: 0,
  }
  for (const c of pool) poolCounts[c.identity]++
  const total = pool.length || 1

  if (unknownCount > 0) {
    for (const id of IDENTITIES) {
      const share = poolCounts[id] / total
      dist[id] += share * unknownCount
    }
  }

  // Normalize to [0..1] weights summing to 1.
  const sum = Object.values(dist).reduce((a, b) => a + b, 0) || 1
  for (const id of IDENTITIES) dist[id] = dist[id] / sum

  // Silence unused variable warnings while keeping intent explicit.
  void knownIds

  return dist
}

/**
 * RPS-5 advantage of a single identity against a probability distribution of
 * opponent identities. Returns roughly:
 *   +1 = beats everyone, -1 = loses to everyone, 0 = neutral.
 */
function rps5Advantage(
  mine: Identity,
  oppDist: Record<Identity, number>,
): number {
  let adv = 0
  for (const id of IDENTITIES) {
    const p = oppDist[id]
    if (!p) continue
    const outcome = duel(mine, id)
    if (outcome === 'a') adv += p
    else if (outcome === 'b') adv -= p
    // alliance → neutral
  }
  return adv
}

// ─── Fallback ───────────────────────────────────────────────────────
function fallbackAction(state: MatchState, player: Player): AIAction {
  const hand = state.players[player].hand
  const cardId = hand[0]?.id ?? 0
  // First empty seat, else seat 1.
  const empty = state.court.find((s) => !s.placement && !s.pending && !s.alliance)
  const seat = (empty?.seat ?? 1) as SeatId
  return { kind: 'commit', cardId, seat }
}

// ─── Factory ────────────────────────────────────────────────────────
export function createAIBrain(
  difficulty: Difficulty,
  rng: () => number = Math.random,
): AIBrain {
  switch (difficulty) {
    case 'malcolm':
      return {
        name: '말콤 백작',
        difficulty,
        flavor: '젊음이 서투름을 가면처럼 두른다.',
        pickCommit: (state, player) => pickMalcolm(state, player, rng),
      }
    case 'isabella':
      return {
        name: '이자벨라 부인',
        difficulty,
        flavor: '슬픔은 냉정한 계산이 된다.',
        pickCommit: (state, player) => pickIsabella(state, player, rng),
      }
    case 'lombra':
      return {
        name: "L'Ombra",
        difficulty,
        flavor: '그림자에게는 이름이 없다.',
        pickCommit: (state, player) => pickLombra(state, player, rng),
      }
  }
}

// ─── Test-only internals ────────────────────────────────────────────
export const _aiInternals = {
  legalMoves,
  immediateValue,
  estimateIdentityDistribution,
  rps5Advantage,
}

// Reference imports we intentionally keep for type completeness.
void ({} as SlotState)
