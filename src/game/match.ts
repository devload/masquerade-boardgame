/**
 * MASQUERADE · match state machine
 *
 * Pure functions only. Every exported function takes a MatchState (+ inputs)
 * and returns a new MatchState. Arguments are never mutated.
 *
 * Ported from docs/simulations/masquerade-sim-v2.mjs.
 * The sim runs both players' moves inside one round; here we split it into
 * (1) commit, (2) revealCommits, (3) nextRound so a UI layer can drive the
 * transitions. R5 same-seat clashes accumulate as SlotState.pending and are
 * resolved in bulk when phase='unmasking'.
 */
import { produce } from 'immer'

import { duel } from './rps5.ts'
import type {
  Card,
  CourtEventId,
  Identity,
  MatchState,
  PendingCommit,
  Player,
  PlayerState,
  SeatId,
  SlotState,
} from './types.ts'
import { ICON_EMOJI, IDENTITIES, IDENTITY_LABEL, SEATS } from './types.ts'

// ─── Constants ──────────────────────────────────────────────────────
export const RULES = {
  EXILE_LIMIT: 5,
  EXILE_PENALTY: -4,
  DUEL_WIN_BONUS: 0,
  CHALLENGE_ALLOWED_FROM: 7,
  MAX_ROUNDS: 8,
  UNMASKING_ROUND: 5,
  EVENT_ROUNDS: [3, 6] as const,
  HAND_SIZE: 5,
  DECK_SIZE: 40,
  WHISPER_RATE: 0.15,
} as const

const ICONS = ['moon', 'day', 'water', 'feather', 'rose'] as const

// ─── PRNG (Mulberry32) ──────────────────────────────────────────────
/** Deterministic seedable PRNG. Advances `state.rng` by 1 per call. */
function nextRand(state: MutableStateLike): number {
  state.rng = (state.rng + 0x6D2B79F5) | 0
  let t = state.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

type MutableStateLike = { rng: number }

function randInt(state: MutableStateLike, maxExclusive: number): number {
  return Math.floor(nextRand(state) * maxExclusive)
}

function shuffleInPlace<T>(state: MutableStateLike, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(state, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Deck generation ────────────────────────────────────────────────
function makeDeck(state: MutableStateLike, size: number): Card[] {
  const cards: Card[] = []
  let id = 1
  const perIdentity = Math.ceil(size / IDENTITIES.length)
  for (const identity of IDENTITIES) {
    for (let i = 0; i < perIdentity; i++) {
      if (cards.length >= size) break
      const surface = 1 + randInt(state, 4) // 1..4
      const icon = ICONS[randInt(state, ICONS.length)]
      const whisper = nextRand(state) < RULES.WHISPER_RATE
      cards.push({
        id,
        name: `${identity} ${i + 1}`,
        shadowName: `Masked ${identity[0]}${i + 1}`,
        identity,
        surface,
        number: id,
        icon,
        whisper,
      })
      id++
    }
  }
  return shuffleInPlace(state, cards)
}

function makeEmptyCourt(): SlotState[] {
  return SEATS.map((s) => ({
    seat: s.seat,
    placement: null,
    pending: null,
    alliance: null,
  }))
}

function makePlayerState(): PlayerState {
  return { hand: [], exile: [], known: [] }
}

// ─── createMatch ────────────────────────────────────────────────────
export function createMatch(opts: {
  seed: number
  playerCards?: Card[]
  opponentCards?: Card[]
}): MatchState {
  const seed = opts.seed | 0
  const rngHolder: MutableStateLike = { rng: seed }
  // Build a deck; if custom hands are supplied we still generate a deck so
  // the market/replacement pool is populated.
  const deck = makeDeck(rngHolder, RULES.DECK_SIZE)

  const myHand: Card[] = []
  const oppHand: Card[] = []
  if (opts.playerCards) {
    myHand.push(...opts.playerCards.slice(0, RULES.HAND_SIZE))
  } else {
    while (myHand.length < RULES.HAND_SIZE && deck.length > 0) {
      myHand.push(deck.shift()!)
    }
  }
  if (opts.opponentCards) {
    oppHand.push(...opts.opponentCards.slice(0, RULES.HAND_SIZE))
  } else {
    while (oppHand.length < RULES.HAND_SIZE && deck.length > 0) {
      oppHand.push(deck.shift()!)
    }
  }

  const market: Card[] = []
  while (market.length < 3 && deck.length > 0) market.push(deck.shift()!)

  return {
    round: 1,
    phase: 'commit',
    court: makeEmptyCourt(),
    players: {
      me: { ...makePlayerState(), hand: myHand },
      opponent: { ...makePlayerState(), hand: oppHand },
    },
    deck,
    market,
    identityBonus: {},
    scholarLoose: false,
    festivalBonus: 0,
    activeEvents: [],
    seed,
    rng: rngHolder.rng,
    log: [`R1 시작 — 왕궁 개장`],
    tempCommits: {},
    ruined: {},
  }
}

// ─── commit ─────────────────────────────────────────────────────────
export type CommitInput = {
  player: Player
  cardId: number
  seat: SeatId
  /** Optional — set to true when R7+ and target seat is occupied by opponent. */
  challenge?: boolean
}

export function commit(state: MatchState, input: CommitInput): MatchState {
  if (state.phase !== 'commit') return state
  const hand = state.players[input.player].hand
  const card = hand.find((c) => c.id === input.cardId)
  if (!card) return state

  return produce(state, (draft) => {
    const pending: PendingCommit = {
      cardId: input.cardId,
      seat: input.seat,
      challenge: input.challenge,
    }
    draft.tempCommits[input.player] = pending
    if (draft.tempCommits.me && draft.tempCommits.opponent) {
      draft.phase = 'reveal'
    }
  })
}

// ─── Whisper effect ─────────────────────────────────────────────────
function applyWhisper(draft: MatchState, revealer: Player) {
  const opp: Player = revealer === 'me' ? 'opponent' : 'me'
  const oppHand = draft.players[opp].hand
  if (oppHand.length === 0) return
  const target = oppHand[0]
  // Skip if already known
  if (draft.players[revealer].known.some((k) => k.cardId === target.id)) return
  draft.players[revealer].known.push({
    cardId: target.id,
    identity: target.identity,
  })
  draft.log.push(`🌙 ${revealer === 'me' ? '나' : '상대'} 속삭임 — 상대 손패 정체 유출`)
}

// ─── Duel resolution (mutates draft) ────────────────────────────────
function resolveDuelOnSlot(
  draft: MatchState,
  seatIndex: number,
  myCard: Card,
  oppCard: Card,
  isChallenge: boolean,
) {
  const outcome = duel(myCard.identity, oppCard.identity)
  const slot = draft.court[seatIndex]

  if (outcome === 'alliance') {
    slot.alliance = { me: myCard, opponent: oppCard }
    slot.placement = null
    slot.pending = null
    draft.log.push(
      `🤝 S${slot.seat} 동맹 — 양쪽 ${IDENTITY_LABEL[myCard.identity]}`,
    )
    return
  }

  const winner: Player = outcome === 'a' ? 'me' : 'opponent'
  const loser: Player = outcome === 'a' ? 'opponent' : 'me'
  const winCard = outcome === 'a' ? myCard : oppCard
  const loseCard = outcome === 'a' ? oppCard : myCard

  slot.placement = { card: winCard, owner: winner }
  slot.alliance = null
  slot.pending = null
  draft.players[loser].exile.push(loseCard)
  draft.log.push(
    `⚔ S${slot.seat} ${winner === 'me' ? '나' : '상대'} ${IDENTITY_LABEL[winCard.identity]} 승리` +
      ` · ${IDENTITY_LABEL[loseCard.identity]} 추방${isChallenge ? ' (챌린지)' : ''}`,
  )
}

// ─── Draw / refill helpers ──────────────────────────────────────────
function refillHand(draft: MatchState, player: Player) {
  while (draft.players[player].hand.length < RULES.HAND_SIZE) {
    // Prefer market first, then deck
    if (draft.market.length > 0) {
      draft.players[player].hand.push(draft.market.shift()!)
      if (draft.deck.length > 0) draft.market.push(draft.deck.shift()!)
    } else if (draft.deck.length > 0) {
      draft.players[player].hand.push(draft.deck.shift()!)
    } else {
      break
    }
  }
}

// ─── revealCommits ──────────────────────────────────────────────────
export function revealCommits(state: MatchState): MatchState {
  // Allowed in 'reveal' (normal simultaneous reveal) or 'unmasking' (R5 bulk
  // pending resolution — no commits consumed).
  if (state.phase !== 'reveal' && state.phase !== 'unmasking') return state

  return produce(state, (draft) => {
    // R5 UNMASKING: resolve every deferred pending clash from R1..R4 and
    // then transition back to 'commit' so the R5 round can play normally.
    if (draft.phase === 'unmasking') {
      draft.log.push(`═════════ R${draft.round} · GRAND UNMASKING ═════════`)
      for (let i = 0; i < draft.court.length; i++) {
        const slot = draft.court[i]
        if (slot.pending) {
          resolveDuelOnSlot(draft, i, slot.pending.me, slot.pending.opponent, false)
        }
      }
      draft.phase = 'commit'
      return
    }

    const myCommit = draft.tempCommits.me
    const oppCommit = draft.tempCommits.opponent
    if (!myCommit || !oppCommit) return

    const myCard = draft.players.me.hand.find((c) => c.id === myCommit.cardId)
    const oppCard = draft.players.opponent.hand.find(
      (c) => c.id === oppCommit.cardId,
    )
    if (!myCard || !oppCard) {
      draft.tempCommits = {}
      draft.phase = 'commit'
      return
    }

    // Whisper effects fire on reveal.
    if (myCard.whisper) applyWhisper(draft, 'me')
    if (oppCard.whisper) applyWhisper(draft, 'opponent')

    // Remove played cards from hands.
    draft.players.me.hand = draft.players.me.hand.filter((c) => c.id !== myCard.id)
    draft.players.opponent.hand = draft.players.opponent.hand.filter(
      (c) => c.id !== oppCard.id,
    )

    const mySeatIdx = seatIndex(myCommit.seat)
    const oppSeatIdx = seatIndex(oppCommit.seat)

    if (myCommit.seat !== oppCommit.seat) {
      // Different seats — place each without duel (unless one is a challenge).
      placeOrChallenge(draft, mySeatIdx, myCard, 'me', myCommit.challenge === true)
      placeOrChallenge(draft, oppSeatIdx, oppCard, 'opponent', oppCommit.challenge === true)
    } else {
      // Same seat — clash.
      if (draft.round <= 4) {
        draft.court[mySeatIdx].pending = { me: myCard, opponent: oppCard }
        draft.log.push(`⏸ S${draft.court[mySeatIdx].seat} 결투 유예 → R5 UNMASKING`)
      } else {
        resolveDuelOnSlot(draft, mySeatIdx, myCard, oppCard, false)
      }
    }

    // Refill hands.
    refillHand(draft, 'me')
    refillHand(draft, 'opponent')

    // Consume commits, advance phase.
    draft.tempCommits = {}
    draft.phase = draft.round >= RULES.MAX_ROUNDS ? 'reckoning' : 'draw'
  })
}

function seatIndex(seat: SeatId): number {
  return seat - 1
}

function placeOrChallenge(
  draft: MatchState,
  seatIdx: number,
  card: Card,
  owner: Player,
  wasChallengeFlag: boolean,
) {
  const slot = draft.court[seatIdx]
  const opp: Player = owner === 'me' ? 'opponent' : 'me'

  // If the slot is empty, straightforward placement.
  if (!slot.placement && !slot.alliance) {
    slot.placement = { card, owner }
    return
  }

  // Occupied — this only resolves peacefully if slot owner is same player.
  // Otherwise this becomes an immediate challenge (R7+).
  if (slot.placement && slot.placement.owner === opp) {
    if (draft.round >= RULES.CHALLENGE_ALLOWED_FROM || wasChallengeFlag) {
      resolveDuelOnSlot(draft, seatIdx, owner === 'me' ? card : slot.placement.card, owner === 'opponent' ? card : slot.placement.card, true)
    } else {
      // Invalid placement — put card back in hand (soft failure).
      draft.players[owner].hand.push(card)
      draft.log.push(`⚠ S${slot.seat} 이미 점유됨 — ${owner === 'me' ? '나' : '상대'} 배치 취소`)
    }
    return
  }

  // Slot has alliance or same-owner placement: soft-fail.
  draft.players[owner].hand.push(card)
  draft.log.push(`⚠ S${slot.seat} 배치 불가 — 카드 반환`)
}

// ─── nextRound ──────────────────────────────────────────────────────
export function nextRound(state: MatchState): MatchState {
  return produce(state, (draft) => {
    if (draft.round >= RULES.MAX_ROUNDS) {
      draft.phase = 'reckoning'
      return
    }
    draft.round += 1
    draft.log.push(`R${draft.round} 시작`)
    if (draft.round === RULES.UNMASKING_ROUND) {
      draft.phase = 'unmasking'
      return
    }
    // Event rounds still enter 'commit'; caller may trigger event via triggerEvent().
    draft.phase = 'commit'
  })
}

// ─── triggerEvent ───────────────────────────────────────────────────
export function triggerEvent(state: MatchState, eventId: CourtEventId): MatchState {
  return produce(state, (draft) => {
    if (draft.activeEvents.includes(eventId)) return
    draft.activeEvents.push(eventId)
    switch (eventId) {
      case 'kingArrives':
        addIdentityBonus(draft, 'Royalty', 5)
        draft.log.push(`🎪 이벤트: 👑 왕이 도착 · 왕족 +5`)
        break
      case 'thiefCaught':
        addIdentityBonus(draft, 'Thief', -3)
        draft.log.push(`🎪 이벤트: ⛓ 도둑 검거 · 도둑 -3`)
        break
      case 'scholarSymposium':
        draft.scholarLoose = true
        draft.log.push(`🎪 이벤트: 📖 학자 초청 · 학자 조건 완화 ±2`)
        break
      case 'maskFestival':
        draft.festivalBonus += 1
        draft.log.push(`🎪 이벤트: 🎪 가면 축제 · 표면 +1`)
        break
      case 'mysticFog':
        addIdentityBonus(draft, 'Mystic', 5)
        draft.log.push(`🎪 이벤트: 🌫 신비 안개 · 신비주의자 +5`)
        break
      case 'greatHunt':
        addIdentityBonus(draft, 'Hunter', 5)
        draft.log.push(`🎪 이벤트: 🏹 사냥 대회 · 사냥꾼 +5`)
        break
    }
  })
}

function addIdentityBonus(draft: MatchState, id: Identity, delta: number) {
  draft.identityBonus[id] = (draft.identityBonus[id] || 0) + delta
}

// ─── challenge (R7+) ────────────────────────────────────────────────
export function challenge(state: MatchState, input: CommitInput): MatchState {
  if (state.round < RULES.CHALLENGE_ALLOWED_FROM) return state
  const seatIdx = seatIndex(input.seat)
  const slot = state.court[seatIdx]
  const opp: Player = input.player === 'me' ? 'opponent' : 'me'
  if (!slot.placement || slot.placement.owner !== opp) return state

  const attackerHand = state.players[input.player].hand
  const attackerCard = attackerHand.find((c) => c.id === input.cardId)
  if (!attackerCard) return state

  return produce(state, (draft) => {
    // Remove attacker from hand
    draft.players[input.player].hand = draft.players[input.player].hand.filter(
      (c) => c.id !== attackerCard.id,
    )
    const defenderCard = draft.court[seatIdx].placement!.card
    const myCard = input.player === 'me' ? attackerCard : defenderCard
    const oppCard = input.player === 'me' ? defenderCard : attackerCard
    resolveDuelOnSlot(draft, seatIdx, myCard, oppCard, true)
    // Refill attacker hand.
    refillHand(draft, input.player)
  })
}

// ─── isMatchOver ────────────────────────────────────────────────────
export function isMatchOver(state: MatchState): boolean {
  return state.phase === 'reckoning' || state.phase === 'end'
}

// ─── Test-only utility exports ──────────────────────────────────────
export const _internals = {
  ICONS,
  ICON_EMOJI,
  seatIndex,
  resolveDuelOnSlot,
}
