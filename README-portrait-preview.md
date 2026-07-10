# Portrait Gallery Preview

The 40 procedural guest portraits are rendered by `src/ui/CardPortrait.tsx`.
The mapping algorithm (identity → palette, icon → forehead accent, surface →
ornaments, whisper → glow, number → pose) lives in `src/ui/portraitStyle.ts`.

## Eyeball the whole deck

There is a developer-only scene at `src/scenes/PortraitGallery.tsx` that shows
all 40 portraits in a 4-column grid with a "Flip All" toggle for face-down
mode. It is intentionally **not** wired into the store's scene routing.

To view it locally, temporarily swap `App.tsx`:

```tsx
// src/App.tsx  (temporary)
import PortraitGallery from './scenes/PortraitGallery.tsx'
export default function App() {
  return <PortraitGallery />
}
```

Then:

```bash
cd /Users/devload/masquerade-boardgame
npm run dev
# open http://localhost:5173
```

Revert `App.tsx` before committing.

## Verify programmatically

```bash
cd /Users/devload/masquerade-boardgame
npx tsc --noEmit
npx vitest run
```

All existing tests + the new pure-function tests in
`src/ui/portraitStyle.test.ts` should pass.
