/**
 * MASQUERADE · domain types.
 *
 * Ported from docs/simulations/masquerade-sim-v2.mjs into TypeScript.
 * Rules brief lives in docs/GAMEPLAN.md.
 */

export type Identity = 'Royalty' | 'Thief' | 'Scholar' | 'Hunter' | 'Mystic'

export const IDENTITIES: readonly Identity[] = [
  'Royalty', 'Thief', 'Scholar', 'Hunter', 'Mystic',
] as const

export const IDENTITY_LABEL: Record<Identity, string> = {
  Royalty: '👑 왕족',
  Thief:   '🗡 도둑',
  Scholar: '📚 학자',
  Hunter:  '🏹 사냥꾼',
  Mystic:  '🔮 신비주의자',
}

export const IDENTITY_COLOR: Record<Identity, string> = {
  Royalty: '#e8d5b7', // soft gold
  Thief:   '#8b3a4a', // deep rose
  Scholar: '#7ba3c8', // canal blue
  Hunter:  '#88a065', // sage
  Mystic:  '#a68ba8', // lavender
}

export type Icon = 'moon' | 'day' | 'water' | 'feather' | 'rose'

export const ICON_EMOJI: Record<Icon, string> = {
  moon:    '🌙',
  day:     '☀️',
  water:   '🌊',
  feather: '🪶',
  rose:    '🌹',
}

export type SeatId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type Player = 'me' | 'opponent'

export type Card = {
  id: number
  /** Formal name in Korean. */
  name: string
  /** Shadow / nickname. */
  shadowName: string
  identity: Identity
  /** 1..4, face-up surface score. */
  surface: number
  /** Unique 1..40 · used for Scholar slot-match rule. */
  number: number
  icon: Icon
  /** Whisper cards leak an opponent hand card's identity when played. */
  whisper: boolean
  /** For UI: brief flavor line. */
  flavor?: string
}

/**
 * Slot metadata — Italian seat names + Korean subtitle + Slot Buff bonus.
 * See docs/WORLD.md § 왕궁 원탁.
 */
export type SeatBuff = {
  seat: SeatId
  italian: string
  korean: string
  favors: Identity
  bonus: number
  /** Optional extra rule (e.g., Slot 5 doubles Hunter adjacency). */
  note?: string
}

export const SEATS: readonly SeatBuff[] = [
  { seat: 1, italian: 'Trono',              korean: '왕좌',        favors: 'Royalty',   bonus: 5 },
  { seat: 2, italian: 'Vicolo',             korean: '뒷골목',      favors: 'Thief',     bonus: 3 },
  { seat: 3, italian: 'Biblioteca',         korean: '도서관',      favors: 'Scholar',   bonus: 4 },
  { seat: 4, italian: 'Foresta',            korean: '숲가',        favors: 'Hunter',    bonus: 4 },
  { seat: 5, italian: 'Cuore del Ballo',    korean: '무도회 중심', favors: 'Hunter',    bonus: 2, note: '인접 아이콘 매치 2배 (5→10)' },
  { seat: 6, italian: 'Sfera',              korean: '수정구',      favors: 'Mystic',    bonus: 4 },
  { seat: 7, italian: 'Accademia',          korean: '학문',        favors: 'Scholar',   bonus: 3 },
  { seat: 8, italian: 'Fianco del Re',      korean: '왕 옆자리',   favors: 'Mystic',    bonus: 3, note: '정체 종류당 +3 (일반 +2 → +3)' },
] as const

/** A card placed at a seat, owned by a player. */
export type Placement = {
  card: Card
  owner: Player
}

/**
 * Slot state in the shared Court.
 * - empty  → { pending: null, placement: null, alliance: null }
 * - single → { placement: {...}, pending: null, alliance: null }
 * - duel deferred (R1-R4 same-seat commits) → { pending: { me, opponent }, ... }
 * - alliance (same-identity duel outcome) → { alliance: { me, opponent }, ... }
 */
export type SlotState = {
  seat: SeatId
  placement: Placement | null
  pending: { me: Card; opponent: Card } | null
  alliance: { me: Card; opponent: Card } | null
}

export type PlayerState = {
  hand: Card[]
  exile: Card[]
  /** Whisper-leaked opponent card identities (for AI/UI use). */
  known: { cardId: number; identity: Identity }[]
}

export type MatchPhase =
  | 'commit'        // both players committing card + seat face-down
  | 'reveal'        // brief pause after simultaneous reveal
  | 'draw'          // sanctuary / region draw (Faraway-style)
  | 'event'         // R3, R6 court event trigger
  | 'unmasking'     // R5 cutscene
  | 'reckoning'     // end-of-game scoring
  | 'end'

export type CourtEventId =
  | 'kingArrives'
  | 'thiefCaught'
  | 'scholarSymposium'
  | 'maskFestival'
  | 'mysticFog'
  | 'greatHunt'

export type PendingCommit = {
  cardId: number
  seat: SeatId
  /** Whether this commit was declared as a challenge on an occupied slot (R7+). */
  challenge?: boolean
}

export type MatchState = {
  round: number  // 1..8
  phase: MatchPhase
  court: SlotState[]  // length 8
  players: Record<Player, PlayerState>
  deck: Card[]
  market: Card[]
  /** Bonuses applied per identity from court events. */
  identityBonus: Partial<Record<Identity, number>>
  scholarLoose: boolean  // Symposium event relaxes slot match ±2
  festivalBonus: number  // Mask Festival adds +N to every card surface
  activeEvents: CourtEventId[]
  seed: number
  /** Rolling PRNG cursor — advances each time randomness is consumed. */
  rng: number
  log: string[]
  /** Face-down commits collected during 'commit' phase; cleared on reveal. */
  tempCommits: Partial<Record<Player, PendingCommit>>
  /** Ruin (몰락) flag set during scoring when exile >= EXILE_LIMIT. */
  ruined: Partial<Record<Player, boolean>>
}

export type ScoreBreakdown = {
  player: Player
  surface: number
  identity: number
  slotBuff: number
  event: number
  exile: number
  combo: number
  total: number
}
