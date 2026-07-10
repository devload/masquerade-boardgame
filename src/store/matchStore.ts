/**
 * matchStore — the single source of truth for the scaffold UI.
 *
 * Scene routing is a single `scene` field (no React Router). Domain state is
 * held under `match`, always produced by the pure functions in `src/game/`.
 * We keep ephemeral in-round selection (selectedCardId / selectedSeat) here
 * as well; both clear the moment a commit is confirmed.
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { challenge, commit, createMatch, revealCommits } from '../game/match.ts'
import { createAIBrain } from '../game/ai.ts'
import type { AIBrain, Difficulty } from '../game/ai.ts'
import type { MatchState, SeatId } from '../game/types.ts'

export type SceneId = 'lobby' | 'court' | 'unmasking' | 'reckoning' | 'result'

type MatchStore = {
  scene: SceneId
  match: MatchState | null
  difficulty: Difficulty
  brain: AIBrain
  // UI-local ephemeral selection during the commit phase
  selectedCardId: number | null
  selectedSeat: SeatId | null
  /**
   * Rolling last few log entries produced by the most recent reveal — the
   * CourtScene reads this to render a subtle event strip. Kept small so the
   * store doesn't grow unbounded; the authoritative full log stays on
   * `match.log`.
   */
  lastRevealLog: string[]
  /**
   * True while the AI opponent is "thinking" (`playAIOpponent` running or
   * queued). The UI uses this to render a "말콤 백작이 봉인 중..." chip.
   */
  aiThinking: boolean
  /**
   * Whether the first-time tutorial overlay has ever been dismissed. Hydrated
   * from localStorage on store init so returning players skip it. Defaults to
   * `false` on SSR / no-localStorage environments.
   */
  tutorialSeen: boolean
  /**
   * Controls the persistent Rules / Help modal. Anywhere in the app can flip
   * this via `setShowRules(true)` (e.g. Lobby "?" button, Court info button).
   */
  showRules: boolean
  /**
   * True right after the very first Reckoning of a session — the Lobby uses
   * this to render a "다음엔 이자벨라 부인에게" nudge toast. Cleared on
   * toast dismiss or on the next `startMatch`.
   */
  justFinishedFirstMatch: boolean
  // Actions
  /** Start a match. If `difficulty` is passed, applies it before creating. */
  startMatch: (seed?: number, difficulty?: Difficulty) => void
  setDifficulty: (d: Difficulty) => void
  goto: (scene: SceneId) => void
  selectCard: (id: number | null) => void
  selectSeat: (seat: SeatId | null) => void
  confirmCommit: () => void
  revealAndAdvance: () => void
  playAIOpponent: () => void
  setAIThinking: (v: boolean) => void
  resetToLobby: () => void
  /** Marks the tutorial as seen (state + localStorage). */
  markTutorialSeen: () => void
  setShowRules: (show: boolean) => void
  dismissFirstMatchHint: () => void
}

/**
 * Read the tutorialSeen flag from localStorage (browser-only). Falsy on SSR
 * or when the key is absent.
 */
function readTutorialSeen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('masq_tutorialSeen') === '1'
  } catch {
    return false
  }
}

/**
 * After a reveal, decide which scene to switch to next.
 * - unmasking → R5 cutscene
 * - reckoning → end-of-match tally
 * - anything else (draw / commit) → stay on court
 */
function sceneForPhase(match: MatchState, current: SceneId): SceneId {
  if (match.phase === 'unmasking') return 'unmasking'
  if (match.phase === 'reckoning') return 'reckoning'
  if (current === 'lobby') return 'court'
  return current
}

export const useMatchStore = create<MatchStore>()(
  immer((set, get) => ({
    scene: 'lobby',
    match: null,
    difficulty: 'malcolm',
    brain: createAIBrain('malcolm'),
    selectedCardId: null,
    selectedSeat: null,
    lastRevealLog: [],
    aiThinking: false,
    tutorialSeen: readTutorialSeen(),
    showRules: false,
    justFinishedFirstMatch: false,

    setDifficulty: (d) => {
      set((s) => {
        s.difficulty = d
        s.brain = createAIBrain(d)
      })
    },

    startMatch: (seed = Math.floor(Math.random() * 0x7fffffff), difficulty) => {
      if (difficulty) {
        set((s) => {
          s.difficulty = difficulty
          s.brain = createAIBrain(difficulty)
        })
      }
      const match = createMatch({ seed })
      set((s) => {
        s.match = match
        s.scene = 'court'
        s.selectedCardId = null
        s.selectedSeat = null
        s.lastRevealLog = []
        s.aiThinking = false
        // Starting a new match clears any lingering "just finished" nudge.
        s.justFinishedFirstMatch = false
      })
    },

    markTutorialSeen: () => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('masq_tutorialSeen', '1')
        } catch {
          // ignore quota / privacy-mode failures
        }
      }
      set((s) => {
        s.tutorialSeen = true
      })
    },

    setShowRules: (show) => {
      set((s) => {
        s.showRules = show
      })
    },

    dismissFirstMatchHint: () => {
      set((s) => {
        s.justFinishedFirstMatch = false
      })
    },

    setAIThinking: (v) => {
      set((s) => {
        s.aiThinking = v
      })
    },

    goto: (scene) => {
      set((s) => {
        s.scene = scene
      })
    },

    selectCard: (id) => {
      set((s) => {
        s.selectedCardId = id
      })
    },

    selectSeat: (seat) => {
      set((s) => {
        s.selectedSeat = seat
      })
    },

    confirmCommit: () => {
      const { match, selectedCardId, selectedSeat } = get()
      if (!match || selectedCardId == null || selectedSeat == null) return
      // Route to challenge() when the target seat is held by the opponent and
      // R >= CHALLENGE_ALLOWED_FROM; otherwise standard commit.
      const slot = match.court.find((c) => c.seat === selectedSeat)
      const isChallenge =
        !!slot?.placement &&
        slot.placement.owner === 'opponent' &&
        match.round >= 5
      const next = isChallenge
        ? challenge(match, {
            player: 'me',
            cardId: selectedCardId,
            seat: selectedSeat,
          })
        : commit(match, {
            player: 'me',
            cardId: selectedCardId,
            seat: selectedSeat,
          })
      set((s) => {
        s.match = next
        s.selectedCardId = null
        s.selectedSeat = null
      })
    },

    /**
     * Dispatch the AI opponent's move through the currently-selected brain.
     * Malcolm/Isabella/L'Ombra all conform to the same AIAction shape, so we
     * just route commit vs challenge to the matching domain function.
     */
    playAIOpponent: () => {
      const { match, brain } = get()
      if (!match) return
      if (match.tempCommits.opponent) return // already committed this round
      if (match.players.opponent.hand.length === 0) return

      const action = brain.pickCommit(match, 'opponent')
      const next =
        action.kind === 'challenge'
          ? challenge(match, {
              player: 'opponent',
              cardId: action.cardId,
              seat: action.seat,
            })
          : commit(match, {
              player: 'opponent',
              cardId: action.cardId,
              seat: action.seat,
            })
      set((s) => {
        s.match = next
      })
    },

    revealAndAdvance: () => {
      const { match } = get()
      if (!match) return
      const before = match.log.length
      const next = revealCommits(match)
      // Grab any new log lines produced by this reveal — keep the last 3 as
      // the ambient event strip.
      const freshLines = next.log.slice(before)
      const merged = [...get().lastRevealLog, ...freshLines].slice(-3)
      set((s) => {
        s.match = next
        s.scene = sceneForPhase(next, s.scene)
        s.lastRevealLog = merged
        s.aiThinking = false
      })
    },

    resetToLobby: () => {
      const hadMatch = get().match !== null
      // First-time nudge: if we just completed our first match, mark the
      // flag so the Lobby renders a subtle hint toast on return.
      let firstMatchDone = false
      if (typeof window !== 'undefined') {
        try {
          firstMatchDone = window.localStorage.getItem('masq_firstMatchDone') === '1'
        } catch {
          firstMatchDone = false
        }
      }
      const showHint = hadMatch && !firstMatchDone
      if (showHint && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('masq_firstMatchDone', '1')
        } catch {
          // ignore
        }
      }
      set((s) => {
        s.match = null
        s.scene = 'lobby'
        s.selectedCardId = null
        s.selectedSeat = null
        s.lastRevealLog = []
        s.aiThinking = false
        s.justFinishedFirstMatch = showHint
      })
    },
  })),
)
