# Compile Tracker

A PWA for tracking games of **Compile** (Greater Than Games). Create players, record games (3 protocols per side, who compiled what), and browse stats — for your own games or everything recorded in the shared database, with players pseudonymised.

Stack: React 19 · Vite 7 · TypeScript · Firebase (Auth, Firestore, Hosting) · vite-plugin-pwa · Recharts · Vitest.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Firebase console → Project settings → Your apps
npm run dev
```

Firebase project: `compile-tracker-cln` (see `.firebaserc`). The Firebase CLI account for this directory is bound with `firebase login:use`.

### One-time Firebase console steps
1. **Authentication → Get started**, then enable **Anonymous** and **Google** sign-in providers.
2. Authentication → Settings → Authorized domains: make sure the hosting domain(s) (`compile-tracker-cln.web.app`, `compile-tracker-cln.firebaseapp.com`) and `localhost` are listed.
3. (Optional) Admin: open the app → Settings, copy your uid, put it into `isAdmin()` in `firestore.rules` and `VITE_ADMIN_UIDS` in `.env.local`, then `npm run deploy:rules` and rebuild.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server against the real Firebase project |
| `npm run dev:emu` | Dev server against local emulators (start them with `npm run emulators`) |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run test` | Unit tests (stats engine, generator, filters) |
| `npm run test:rules` | Firestore security-rules tests in the emulator |
| `npm run gen:icons` | Regenerate PWA icons from `public/logo.svg` |
| `npm run deploy` | Build and deploy Hosting + Firestore rules/indexes |
| `npm run deploy:rules` | Deploy only rules/indexes |

## Architecture

- `src/types` — document shapes. `games/{id}` is top-level; players live in `users/{uid}/players` so names are private by path. Games never carry names; the rules whitelist game keys.
- `src/repo` — all Firestore access. `buildGame()` enforces the game invariants client-side; `firestore.rules` enforces them server-side.
- `src/store` — zustand stores with one `onSnapshot` over all games, players, settings.
- `src/stats` — pure fold → merge → derive functions; stats are computed on read. See `PLAN.md` §4.2 for the reasoning and the fallback (precomputed `stats/global`) when the collection grows past ~5k games.
- `src/components/ui` — design system derived from the Compile rulebook look. `src/components/protocol` — protocol cards and picker.
- `src/features/*` — pages. `/dev` has test-data generation and reset tools; `/dev/ui` is the component kitchen sink.

## Data & privacy

- Anonymous sign-in by default. Link a Google account in Settings to keep your data across devices; an anonymous uid that loses its browser storage loses access to its data.
- In the **All** scope other users' players appear as `P-XXXX` (first 4 chars of the opaque player id).
- Test data is flagged `isTestData: true`; anyone signed in may purge it. Real games can only be deleted by their owner (or an admin).

## Known limitations

- Games are always between two players of one account; two tracker users playing each other would each record their own copy.
- Google linking fails with `credential-already-in-use` if that Google account already has data — the UI offers to switch; the anonymous data stays under the old uid.
