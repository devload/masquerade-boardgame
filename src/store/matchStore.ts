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
  // Actions
  startMatch: (seed?: number) => void
  setDifficulty: (d: Difficulty) => void
  goto: (scene: SceneId) => void
  selectCard: (id: number | null) => void
  selectSeat: (seat: SeatId | null) => void
  confirmCommit: () => void
  revealAndAdvance: () => void
  playAIOpponent: () => void
  resetToLobby: () => void
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

    setDifficulty: (d) => {
      set((s) => {
        s.difficulty = d
        s.brain = createAIBrain(d)
      })
    },

    startMatch: (seed = Math.floor(Math.random() * 0x7fffffff)) => {
      const match = createMatch({ seed })
      set((s) => {
        s.match = match
        s.scene = 'court'
        s.selectedCardId = null
        s.selectedSeat = null
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
      const next = commit(match, {
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
      const next = revealCommits(match)
      set((s) => {
        s.match = next
        s.scene = sceneForPhase(next, s.scene)
      })
    },

    resetToLobby: () => {
      set((s) => {
        s.match = null
        s.scene = 'lobby'
        s.selectedCardId = null
        s.selectedSeat = null
      })
    },
  })),
)
