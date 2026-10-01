# Compile Tracker — conventions

React 19 + Vite 7 + TypeScript, Firebase (Auth anonymous→Google, Firestore, Hosting), PWA via vite-plugin-pwa. Spark plan only: no Cloud Functions.

- Path alias `@/` → `src/`. Strict TS, `verbatimModuleSyntax` (use `import type`).
- Styling: vanilla **CSS modules** (`*.module.css`) + design tokens in `src/styles/tokens.css`. No Tailwind. Fonts via `@fontsource/*` (Orbitron display, Inter body, JetBrains Mono terminal).
- All Firestore access goes through `src/repo/*`. UI never imports `firebase/firestore` directly (types excepted).
- Live data lives in zustand stores (`src/store/*`): one `onSnapshot` over all games; hooks in `src/hooks/*` are thin selectors.
- `src/stats/*` is pure (no React/Firebase imports) and unit-tested; stats are computed on read from `GameDoc[]`.
- Games never contain player names. Names are in `users/{uid}/players`; other users see `pseudonym(playerId)`.
- A valid game: 3 distinct protocols per side, 6 distinct overall, winner compiled all 3, loser 0–2. `buildGame()` in `src/repo/games.ts` enforces this client-side; `firestore.rules` enforces it server-side.
- Scripts: `npm run dev`, `dev:emu`, `build`, `test`, `test:rules`, `emulators`, `deploy`.
