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
1. **Authentication → Get started**, then enable **Anonymous**, **Google** and **Email/Password** sign-in providers (email link sign-in stays off).
2. Authentication → Settings → Authorized domains: make sure the hosting domain(s) (`compile-tracker-cln.web.app`, `compile-tracker-cln.firebaseapp.com`) and `localhost` are listed.
3. (Optional) Admin: open the app → Settings, copy your uid, put it into `isAdmin()` in `firestore.rules` and `VITE_ADMIN_UIDS` in `.env.local`, then `npm run deploy:rules` and rebuild.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server against the real Firebase project |
| `npm run dev:emu` | Dev server against local emulators (start them with `npm run emulators`) |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run test` | Unit tests (stats engine, generator, filters, i18n catalogue parity) |
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

## Languages

The UI and the protocol names are available in **English** and **German**. The language is inferred from the browser (`navigator.languages`, first supported match, English fallback) and can be overridden per device in **Settings → Language**; the choice is stored in `localStorage` (`compile.locale`).

Adding a string: put the English text in `src/i18n/messages/en/<namespace>.ts`, the German text in `src/i18n/messages/de/<namespace>.ts` (its type is derived from the English file, so a missing key is a compile error), and render it with `const { t } = useT()` → `t('namespace.key', { param })`. Plurals use `key_one`/`key_other` and a `count` param. Protocol names come from `protocolName(id)`; the German list lives in `src/i18n/names.ts`. `npm run test` checks that both catalogues have the same keys and placeholders.

## Data & privacy

- Anonymous sign-in by default (guest mode): games are recorded as Alpha vs Beta without choosing players, and only shared (All) stats are shown. Create an account in Settings, by linking Google or with email and password, for named players, your own games and stats, and to keep your data across devices; an anonymous uid that loses its browser storage loses access to its data.
- In the **All** scope other users' players appear as `P-XXXX` (first 4 chars of the opaque player id).
- Test data is flagged `isTestData: true`; anyone signed in may purge it. Real games can only be deleted by their owner (or an admin).

## Friends and shared games

Non-anonymous accounts only, Google or email (rules check `sign_in_provider != 'anonymous'`).

- **Handles**: `handles/{handle} = { uid }` (unique by doc id) and `profiles/{uid} = { handle }`, written together in one batch. QR codes encode `/add/<handle>`, which opens the Players page with the handle looked up.
- **Friends**: `users/{uid}/friends/{friendUid} = { since, playerId? }`. Adding writes my doc and the mirror doc in the friend's account in one batch (the mirror may only carry `since`). `playerId` links the friend to one of my players.
- **Offers**: `users/{recipient}/offers/{gameId} = { ownerUid, friendSide, ownerSide?, status, offeredAt }`. Saving a game (and linking a friend to a player) offers every game with that player; the owner writes the sides, only the recipient sets `status`. Games themselves are unchanged and carry no uids beyond `ownerUid`.
- **Mine scope**: my games plus accepted offers, remapped by `src/stats/perspective.ts` (my side → my "me" player, the owner's side → my player linked to them or `friend:<uid>`). This also means a game played between two users is stored once, not twice.

## Analytics

Three layers, all in `src/analytics/`:

1. **Firestore counters** (always on, cookie-free): `analytics/{day}/counters/{kind}_{source}` = `{ day, n }` for `visit`, `newUser`, `game` and `link` (account created, Google or email) per source and UTC day. No uid or device id is stored; rules only allow `+1` on whitelisted ids, and only admins can read them. Admin visits are not counted, nor is `vite dev` against the live project. Each new account also bumps the all-time total `analytics/total/counters/link` (seeded on 2026-10-03 with the number of Google-linked Firebase Auth accounts), which the admin panel shows as "Accounts ever" — anonymous accounts are not counted.
2. **Cloudflare Web Analytics** (cookie-free page views, referrers, countries): set `VITE_CF_BEACON_TOKEN`. It does not record query strings, so it cannot see utm tags.
3. **Google Analytics 4** via Firebase: set `VITE_FB_MEASUREMENT_ID`. Loaded only after consent (banner, revocable in **Settings → Privacy**). Page views are sent manually; the first one carries the landing URL with its utm tags. Turn off GA's own SPA page views to avoid doubles: GA → Admin → Data collection and modification → Data streams → the web stream → Enhanced measurement (gear icon) → Page views → *Show advanced settings* → uncheck *Page changes based on browser history events* → Save. Check in the browser (with consent given and no ad blocker): GA's `/g/collect` requests should contain exactly one `page_view` per route change, and `dataLayer` should hold no `gtm.historyChange` entries. (Do not rely on `vtp_enableHistoryEvents` in gtag.js — it stays `true` regardless of this setting.)

The source is taken from `utm_source` → installed app → referrer → `direct` (`src/analytics/source.ts`). The installed app starts at `/?utm_source=pwa&utm_medium=homescreen` (manifest `id` stays `/`). The admin **Developer tools → Analytics** panel shows the counters, activity derived from the games, tagged links to copy and links to the dashboards.

## Domains and legal pages

- Main URL: `VITE_CANONICAL_ORIGIN` (https://compile.randomapps.net), also used as `VITE_FB_AUTH_DOMAIN`. Browser visits on `*.web.app` / `*.firebaseapp.com` are redirected there by an inline script in `index.html`; installed apps on the old domain keep working (their data lives in that origin's storage).
- `/privacy` (`/datenschutz`) and `/imprint` (`/impressum`), linked under every page, in Settings and in the consent banner. Texts in `src/i18n/messages/{en,de}/legal.ts`; operator name, address and email come from `VITE_LEGAL_*` (kept out of git). Bump `LEGAL_UPDATED` in `src/features/legal/operator.ts` when the texts change.

## Known limitations

- If two friends both record the same game, both copies exist; the recipient can decline the offered one.
- Deleting a game removes it for friends who accepted it too (it is the same document).
- Google linking fails with `credential-already-in-use` if that Google account already has data — the UI offers to switch; the anonymous data stays under the old uid. Email works the same way: "Create account" keeps the guest data, "Sign in" switches to the existing account and leaves it behind.
- Email accounts are not verified; password reset uses Firebase's default email template (Authentication → Templates).
