/**
 * MASQUERADE · 가면의 무도회 (Il Ballo dei Volti Argentati)
 *
 * App is now a scene router. The active scene is picked from the store's
 * `scene` field; each scene owns its own backdrop / atmosphere. All wiring
 * happens in the individual `src/scenes/*.tsx` files.
 */

import type { ComponentType } from 'react'

import { CourtScene } from './scenes/CourtScene.tsx'
import { LobbyScene } from './scenes/LobbyScene.tsx'
import { ReckoningScene } from './scenes/ReckoningScene.tsx'
import { RulesModal } from './scenes/RulesModal.tsx'
import { UnmaskingScene } from './scenes/UnmaskingScene.tsx'
import { useMatchStore } from './store/matchStore.ts'
import type { SceneId } from './store/matchStore.ts'

const SCENE_MAP: Record<SceneId, ComponentType> = {
  lobby: LobbyScene,
  court: CourtScene,
  unmasking: UnmaskingScene,
  reckoning: ReckoningScene,
  result: ReckoningScene,
}

export default function App() {
  const scene = useMatchStore((s) => s.scene)
  const Scene = SCENE_MAP[scene]
  return (
    <>
      <Scene />
      <RulesModal />
    </>
  )
}
