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

- Anonymous sign-in by default (guest mode): games are recorded as Alpha vs Beta without choosing players, and only shared (All) stats are shown. Link a Google account in Settings for named players, your own games and stats, and to keep your data across devices; an anonymous uid that loses its browser storage loses access to its data.
- In the **All** scope other users' players appear as `P-XXXX` (first 4 chars of the opaque player id).
- Test data is flagged `isTestData: true`; anyone signed in may purge it. Real games can only be deleted by their owner (or an admin).

## Analytics

Three layers, all in `src/analytics/`:

1. **Firestore counters** (always on, cookie-free): `analytics/{day}/counters/{kind}_{source}` = `{ day, n }` for `visit`, `newUser`, `game` and `link` (Google linked) per source and UTC day. No uid or device id is stored; rules only allow `+1` on whitelisted ids, and only admins can read them. Admin visits are not counted, nor is `vite dev` against the live project. Each new account also bumps the all-time total `analytics/total/counters/newUser` (seeded on 2026-10-03 with the Firebase Auth account count), which the admin panel shows as "Accounts ever".
2. **Cloudflare Web Analytics** (cookie-free page views, referrers, countries): set `VITE_CF_BEACON_TOKEN`. It does not record query strings, so it cannot see utm tags.
3. **Google Analytics 4** via Firebase: set `VITE_FB_MEASUREMENT_ID`. Loaded only after consent (banner, revocable in **Settings → Privacy**). Page views are sent manually; the first one carries the landing URL with its utm tags. Turn off GA's own SPA page views to avoid doubles: GA → Admin → Data collection and modification → Data streams → the web stream → Enhanced measurement (gear icon) → Page views → *Show advanced settings* → uncheck *Page changes based on browser history events* → Save. Check: `curl -s 'https://www.googletagmanager.com/gtag/js?id=<G-ID>' | grep -o '"vtp_enableHistoryEvents":[a-z]*'` should print `false`.

The source is taken from `utm_source` → installed app → referrer → `direct` (`src/analytics/source.ts`). The installed app starts at `/?utm_source=pwa&utm_medium=homescreen` (manifest `id` stays `/`). The admin **Developer tools → Analytics** panel shows the counters, activity derived from the games, tagged links to copy and links to the dashboards.

## Domains and legal pages

- Main URL: `VITE_CANONICAL_ORIGIN` (https://compile.randomapps.net), also used as `VITE_FB_AUTH_DOMAIN`. Browser visits on `*.web.app` / `*.firebaseapp.com` are redirected there by an inline script in `index.html`; installed apps on the old domain keep working (their data lives in that origin's storage).
- `/privacy` (`/datenschutz`) and `/imprint` (`/impressum`), linked under every page, in Settings and in the consent banner. Texts in `src/i18n/messages/{en,de}/legal.ts`; operator name, address and email come from `VITE_LEGAL_*` (kept out of git). Bump `LEGAL_UPDATED` in `src/features/legal/operator.ts` when the texts change.

## Known limitations

- Games are always between two players of one account; two tracker users playing each other would each record their own copy.
- Google linking fails with `credential-already-in-use` if that Google account already has data — the UI offers to switch; the anonymous data stays under the old uid.
