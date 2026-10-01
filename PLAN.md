# Compile Tracker — Implementation Plan

## Context

Greenfield project (directory `/Users/clnif/Documents/Repos/Compile Tracker` is empty, not a git repo). Goal: a TypeScript SPA, installable as a PWA, hosted on Firebase, that tracks games of the 2‑player card game **Compile** (Greater Than Games, design Michael Yang). Users create players, record games (two players, 3 protocols each, who won, which protocols each side compiled), and browse rich stats with a "my games / all games" toggle. Player identities in the shared dataset are pseudonymous. A dev screen generates test data and resets the DB.

Decisions already made with the user:
- **Stack**: React 18 + Vite + TypeScript. Firebase (Hosting, Firestore, Auth). No Cloud Functions → must run on the **Spark (free) plan**.
- **Auth**: Firebase **Anonymous** by default, upgradeable via `linkWithPopup(GoogleAuthProvider)`; uid stays stable across linking.
- **Protocol pool**: all 45 protocols (Main 1/2/3, Aux 1/2/3) as static data, with per‑set enable toggles in Settings and set filters in Stats.
- **Result detail**: per side, tick *which* protocols were compiled (count derived); optional "who played first".
- **Stats**: computed on read, client‑side, from raw game docs (see §4 for reasoning + fallback).

This plan is written for an Opus lead agent that spawns sub‑agents. §9 defines the work packages, their contracts and what can run in parallel.

---

## 1. Game facts the app relies on

- Each player drafts **exactly 3 distinct protocols**; both sides' 6 protocols are distinct (the draft is from a shared pool of 12, so no duplicates across sides). Validation: 6 distinct protocol ids per game.
- Protocol cards have a **"Loading…"** side and a **"Compiled"** side (flip on compile). A line is compiled at ≥10 value and more than the opponent.
- **Winner = first to compile all 3** → winner always has 3 compiled, loser has 0–2. The result form derives the winner from the compiled ticks (exactly one side with 3) rather than asking separately; show an error if 0 or 2 sides have 3.
- Protocol pool (static data, `src/data/protocols.ts`):
  - **Main 1** (`MN01`): Darkness, Death, Fire, Gravity, Life, Light, Metal, Plague, Psychic, Speed, Spirit, Water
  - **Main 2** (`MN02`): Chaos, Clarity, Corruption, Courage, Fear, Ice, Luck, Mirror, Peace, Smoke, Time, War
  - **Main 3** (`MN03`): Ambush, Envy, Fulcrum, Gluttony, Greed, Lust, Momentum, Nova, Overwhelm, Pride, Sloth, Wrath
  - **Aux 1** (`AX01`): Love, Hate, Apathy · **Aux 2** (`AX02`): Diversity, Assimilation, Unity · **Aux 3** (`AX03`): Flexible, Inert, Rigid
  - Protocol id = lowercase slug (`fire`, `darkness`…). Each entry: `{ id, name, set, colors: { primary, secondary }, glyph }`.

## 2. Visual design system ("Compile" look)

Source: the official rulebook (dark violet‑black page, magenta/violet accents, glitch‑distorted "COMPILE" wordmark, `<!>` logo mark, monospace terminal prose `>_` / `>? vision flickers… blink? maybe.`, chamfered rounded panels with 1px magenta borders, section‑header "tabs" with a trailing circuit trace ending in a node dot, binary strings `0110110…` and hatched diagonal bars as ornaments, cards with abstract colourful art, a value box and three stacked command boxes). We **do not** copy artwork; protocol visuals are CSS gradients + noise.

**Tokens** (`src/styles/tokens.css`, consumed via CSS variables; Tailwind is optional — recommend **vanilla CSS modules + tokens** to keep the bespoke look):
```
--bg:            #0d0a13   /* page */
--bg-elev:       #16111f   /* panels */
--bg-elev-2:     #1f1829
--line:          #a44bd3   /* 1px panel borders, circuit traces */
--accent:        #c955ee   /* primary magenta */
--accent-strong: #e07bff
--accent-soft:   rgba(201,85,238,.16)
--text:          #efe9f7
--text-muted:    #a393bd
--text-dim:      #6e6283
--win:           #7df0c2   /* sparse use: wins / compiled */
--loss:          #ff6b8a
--radius:        10px
--chamfer:       14px      /* clip-path corner cut */
```
**Typography** (Google Fonts, self‑host via `@fontsource` to keep PWA offline‑clean):
- Display / section headers: **Orbitron** (wide techno, uppercase, letter‑spacing .12em) — used for "SUMMARY"-style header tabs, stat numbers.
- Body: **Inter**.
- Terminal prose / labels / ids: **JetBrains Mono** (prompts `>_`, pseudonymous ids, loading lines, empty states).
- Wordmark: "COMPILE" in Orbitron 900 with a CSS glitch effect (two pseudo‑element clones, `clip-path` slices animated, magenta/white channel offset); plays once on app load and on hover. Logo mark `<!>` rendered as inline SVG with the small triangle below.

**Core components** (`src/components/ui/`):
- `Panel` — chamfered container (`clip-path: polygon(...)` cutting top‑right + bottom‑left corners), 1px `--line` border via an inset pseudo‑element, optional `title` rendered as a `SectionHeader`.
- `SectionHeader` — Orbitron uppercase label inside a bordered tab, followed by a horizontal trace line and node dot (`::after` circle).
- `Button` (`primary` filled magenta, `ghost` outlined, `danger`), `IconButton`, `Toggle` (Mine/All segmented control), `Select`, `TextField`, `Checkbox` (square, magenta check), `Chip`.
- `TerminalLine` — monospace `>` prefixed lines with a blinking cursor; used for loading, empty states, dev screen log output.
- `Ornament` — `BinaryStrip`, `HatchBar`, `TraceLine` purely decorative, `aria-hidden`.
- `ProtocolCard` — mimics card anatomy: header tab with protocol name, big value box (used for counts/percentages), hex badge with glyph, body area with the protocol's gradient art; `state: 'loading' | 'compiled'` flips it (3D rotateY) and shows "COMPILED". Sizes `sm` (chip in lists), `md` (picker), `lg` (game detail).
- `ProtocolPicker` — grid of `ProtocolCard sm` filtered by enabled sets, with search; selecting exactly 3; disables protocols already taken by the other side.
- `StatTile` — Orbitron number + mono label; `BarList` (horizontal bars with protocol gradient fills); charts via **Recharts** themed with tokens (magenta line/area, dim grid).
- `Toast`, `Dialog` (confirmations: delete game, reset DB), `AppShell` (top bar with wordmark, bottom tab bar on mobile / side rail on desktop; routes: Home, New Game, Games, Stats, Settings; Dev hidden behind Settings → "Developer tools").

Motion: subtle; card flip 400ms, panel fade‑in with 1px trace "draw" on mount; respect `prefers-reduced-motion`.

**Protocol colours** (approximate, thematic; `primary`/`secondary` gradient pair): Fire `#ff6a2a/#7a1500`, Water `#2fb6ff/#0a3f8f`, Life `#3fe07a/#0b5a2a`, Death `#8a8a99/#15151c`, Darkness `#5b2d8f/#07050d`, Light `#fff1a8/#c9a227`, Metal `#c2cad3/#4a535e`, Gravity `#8f5bff/#24085a`, Plague `#b9e34a/#3f5a08`, Psychic `#ff5fd2/#6e0b56`, Speed `#ffe03a/#1fd6ff`, Spirit `#ff8ad8/#5a2bff`; Main 2/3/Aux get analogous pairs (Ice icy blue/white, Smoke greys, War crimson, Peace pale green, Time gold/teal, Luck emerald, Mirror silver/cyan, Chaos multi‑hue, Clarity white/cyan, Corruption sickly violet, Courage orange/gold, Fear deep indigo; Sins: Envy green, Greed gold, Lust rose, Wrath red, Pride purple/gold, Sloth muted blue, Gluttony amber; Love pink, Hate dark red, Apathy grey; Diversity rainbow, Assimilation steel, Unity white/blue; Flexible teal, Inert slate, Rigid iron). Store in `protocols.ts`; sub‑agent may tune.

## 3. App structure & routes

```
compile-tracker/
  package.json  vite.config.ts  tsconfig.json  index.html  .env.example
  firebase.json  .firebaserc  firestore.rules  firestore.indexes.json
  public/  (manifest icons generated from SVG, favicon, robots)
  scripts/gen-icons.ts            (sharp: SVG → 192/512/maskable PNGs)
  src/
    main.tsx  App.tsx  router.tsx
    styles/ tokens.css  global.css  fonts.css
    data/ protocols.ts  sets.ts
    types/ index.ts                (Game, Player, GameSide, Scope, filters)
    firebase/ app.ts auth.ts firestore.ts converters.ts
    repo/ players.ts games.ts admin.ts    (all Firestore access goes through here)
    hooks/ useAuth.ts usePlayers.ts useGames.ts useSettings.ts useInstallPrompt.ts
    stats/ aggregate.ts derive.ts filters.ts wilson.ts useStats.ts  (+ *.test.ts)
    store/ gamesStore.ts            (single onSnapshot → array ref; zustand or context)
    devtools/ generate.ts (pure) seed.ts reset.ts
    components/ui/ ...             (design system)
    components/ protocol/ ProtocolCard.tsx ProtocolPicker.tsx
    features/
      home/HomePage.tsx
      players/PlayersPage.tsx PlayerDialog.tsx
      games/NewGamePage.tsx GamesPage.tsx GameDetailPage.tsx GameCard.tsx
      stats/StatsPage.tsx tabs/{Overview,Players,Protocols,Combos,HeadToHead}.tsx
      settings/SettingsPage.tsx
      dev/DevToolsPage.tsx
  tests/ rules/ firestore.rules.test.ts   (emulator)
  e2e/ smoke.spec.ts                      (Playwright, optional)
```

**Routes** (react‑router v6, lazy‑loaded features):
- `/` Home — wordmark hero with terminal lines, "New game" CTA, last 5 games, 3 StatTiles (games, my win rate for default player, most‑played protocol).
- `/players` — list (name, games, W‑L, win %), create/rename/archive; show pseudonymous id in mono under the name.
- `/games/new` — 3‑step wizard: (1) pick Player 1 & Player 2 (create inline), (2) protocol selection: two `ProtocolPicker`s side by side (stacked on mobile), each exactly 3, mutually exclusive; (3) result: date (default now), optional first player, per side the 3 chosen protocols as `ProtocolCard`s with a "compiled" tap‑toggle (flip); winner derived and shown; "Save" writes the game. State persisted in `sessionStorage` so a refresh mid‑wizard doesn't lose it; "Save & new (same players)" shortcut.
- `/games` — reverse‑chronological list, filter by player/protocol/set; scope toggle Mine/All (All shows pseudonymous ids).
- `/games/:id` — detail; edit/delete only if owner.
- `/stats` — global **Scope toggle** (Mine / All) in the header + filter bar (sets, date range, min games threshold for combos). Tabs:
  - *Overview*: games played, overall first‑player win rate, avg compiled by loser, games over time (area chart), most‑used protocols.
  - *Players* (Mine: named; All: pseudonymous leaderboard, min 5 games): W‑L, win %, streak, favourite protocols, best protocol.
  - *Protocols*: table/bars with usage count, usage %, deck win rate (deck containing X won), compile rate (X compiled / games X was in), avg position compiled; sort by column; click → protocol detail drawer (win rate vs each other protocol).
  - *Combos*: best 2‑protocol pairs and 3‑protocol decks by win rate with Wilson lower bound ranking + min sample slider; counter‑picks (which protocols beat X most).
  - *Head‑to‑Head* (Mine only): pick two players → record, recent games, which protocols each wins with.
- `/settings` — enabled sets (toggles, default: Main 1 on, others off until first toggle), default "me" player, account: "Sign in with Google to keep your data" (link anonymous), sign out, install app button (uses captured `beforeinstallprompt`), app version, link to Developer tools.
- `/dev` — Developer tools (see §6).

## 4. Data layer

### 4.1 Collections & document shapes

Two data collections. `games` is **top‑level** (the "All games" query is a plain collection read). `players` is a **subcollection under the user** (`users/{uid}/players/{pid}`) so it is private by path — no `ownerUid` filter can leak it.

```ts
// src/types/index.ts
export type SetId = 'MN01' | 'MN02' | 'MN03' | 'AX01' | 'AX02' | 'AX03';
export type ProtocolId = string;      // slug from protocols.ts, e.g. 'fire'
export type SideKey = 'p1' | 'p2';

// users/{uid}                       — settings, written only by that user
export interface UserDoc { enabledSets: SetId[]; defaultPlayerId?: string; }

// users/{uid}/players/{playerId}    — playerId = Firestore auto‑id ⇒ the pseudonym
export interface Player { name: string; createdAt: Timestamp; archived: boolean; }

// games/{gameId}
export interface GameSide {
  playerId: string;             // opaque id into the owner's players subcollection
  protocols: ProtocolId[];      // exactly 3, distinct, sorted
  compiled: ProtocolId[];       // subset of protocols; 3 for winner, 0–2 for loser
}
export interface Game {
  schemaVersion: 1;
  ownerUid: string;
  playedAt: Timestamp;          // user‑chosen, client‑set (NOT serverTimestamp) → stable sorting/stats
  yearMonth: string;            // 'YYYY-MM' derived from playedAt (grouping)
  p1: GameSide;
  p2: GameSide;
  winner: SideKey;
  firstPlayer?: SideKey;
  allProtocols: ProtocolId[];   // union of both sides, 6 sorted ids (array-contains)
  isTestData: boolean;
  createdAt: Timestamp;         // serverTimestamp(), audit only — never sort/filter by it
}
export type GameDoc = Game & { id: string };
export type PlayerDoc = Player & { id: string };
```

- `p1`/`p2` map keys (not an array) so rules can cross‑check `d[d.winner]`. `allProtocols`/`yearMonth` are computed inside the `withConverter` `toFirestore`, never by UI code. No `sets` field — set membership is derived client‑side from `protocols.ts`.
- **Pseudonymization**: real names live only under `users/{uid}/players` (owner‑read). `games` carry no names, and the rules **whitelist the allowed keys** (`keys().hasOnly([...])`) so a `name`/`displayName` field can never be written to a game later. In "All" scope the UI labels sides `P‑3F9A` (first 4 chars of `playerId`, mono). Google profile data is never written to Firestore.
- Admin: literal uid allowlist in `firestore.rules` (`isAdmin()`), set during WP0 from the uid shown in Settings. Simpler than an `admins` collection; changing it = redeploy rules.

### 4.2 Stats: compute on read (client), structured as fold → merge → derive

**Decision: no precomputed aggregates in v1.** One `onSnapshot` on `games` (ordered by `playedAt`) feeds a small store; every stat is a pure function over `GameDoc[]`.

Why: hobby scale (3 000 games ≈ 1 MB, computes in <10 ms incl. combos); persistent cache means only *changed* docs are billed after the first load (cold load of 3 000 docs ≈ 16 cold loads/day inside Spark's 50k reads); the Mine/All toggle is just a filter; combos (≤990 pairs / 14 190 triples) would be a key‑explosion if materialised; new stats need no backfill; works offline; no Cloud Functions / Blaze; no double‑write consistency risk.

Module API (`src/stats/`, no React/Firestore imports, fully unit‑tested):
```ts
// aggregate.ts
export interface Agg {
  games: number;
  byProtocol: Record<ProtocolId, { decks: number; wins: number; compiled: number }>;
  byPair:   Record<string, { decks: number; wins: number }>;   // key 'a+b' sorted
  byTriple: Record<string, { decks: number; wins: number }>;   // key 'a+b+c'
  byPlayer: Record<string, { games: number; wins: number; first: number; firstWins: number; compiledFor: number; compiledAgainst: number }>;
  h2h:      Record<string, { games: number; aWins: number }>;  // key 'pidA|pidB' sorted
  vsProtocol: Record<string, { games: number; aWins: number }>; // 'a|b' sorted: protocol a's deck vs deck with b
  byMonth:  Record<string, { games: number }>;
  firstPlayerWins: number; firstPlayerKnown: number; loserCompiledSum: number;
}
export const emptyAgg: () => Agg;
export const foldGame: (acc: Agg, g: Game) => Agg;
export const aggregate: (games: Game[]) => Agg;
export const mergeAgg: (a: Agg, b: Agg) => Agg;        // makes the fallback a serialization detail

// filters.ts
export interface StatsFilter { scope: 'mine'|'all'; myUid: string; sets?: SetId[]; setMode?: 'any'|'only'; from?: Date; to?: Date; includeTestData?: boolean; }
export const filterGames: (games: GameDoc[], f: StatsFilter) => GameDoc[];

// derive.ts  (Agg → presentable rows; Wilson lower bound for ranking)
protocolUsage, protocolWinRate, protocolCompileRate, bestCombos(k: 2|3, minDecks), counterPicks(protocolId),
playerRecords(players), headToHead(pidA, pidB), firstPlayerAdvantage, gamesOverTime, avgLoserCompiled

// useStats.ts
export function useStats(filter: StatsFilter): { agg: Agg; games: GameDoc[]; fromCache: boolean; loading: boolean }
// useMemo keyed on the games ARRAY REFERENCE from the store + stable filter key (not games.length — multi‑tab edits change content, not length)
```

**Fallback threshold**: when global `games` > ~5 000 or console shows >40k reads/day → add `stats/global = { asOf, byMonth: Record<yearMonth, Agg> }` (triples pruned to `decks ≥ 3`, stays < 1 MiB), written by an admin action on the Dev screen or a nightly GitHub Action with a service account (still Spark). Clients read that doc + `games where createdAt > asOf` and `mergeAgg` the delta. Real‑time global stats would then need Blaze + a Cloud Function running the same `foldGame`. Not built now; `repo/games.ts` (`subscribeGames(scope)`) hides it.

### 4.3 Queries & indexes (`firestore.indexes.json`)

- All: `collection('games').orderBy('playedAt','desc')` — automatic single‑field index.
- Mine (list + reset): `where('ownerUid','==',uid).orderBy('playedAt','desc')` → composite **(ownerUid ASC, playedAt DESC)**.
- Test‑data purge: `where('isTestData','==',true)` — single field. Optional composite **(isTestData ASC, playedAt DESC)** if production should exclude test data server‑side.
- Future protocol page: **(allProtocols CONTAINS, playedAt DESC)** — declare now, costs nothing.
- Players: subcollection read, `orderBy('name')`.
- All set/date/protocol filtering happens client‑side on the loaded array.

### 4.4 Security rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }                 // anonymous counts
    function isAdmin()  { return signedIn() && request.auth.uid in ['<ADMIN_UID>']; }
    function validSide(s) {
      return s.keys().hasOnly(['playerId','protocols','compiled'])
        && s.playerId is string && s.playerId.size() == 20
        && s.protocols is list && s.protocols.size() == 3 && s.protocols.toSet().size() == 3
        && s.compiled is list && s.protocols.toSet().hasAll(s.compiled);
    }
    function validGame(d) {
      return d.keys().hasOnly(['schemaVersion','ownerUid','playedAt','yearMonth','p1','p2',
                               'winner','firstPlayer','allProtocols','isTestData','createdAt'])
        && d.schemaVersion == 1 && d.ownerUid == request.auth.uid
        && d.playedAt is timestamp && d.yearMonth is string && d.yearMonth.size() == 7
        && validSide(d.p1) && validSide(d.p2)
        && d.winner in ['p1','p2']
        && d[d.winner].compiled.toSet() == d[d.winner].protocols.toSet()            // winner: all 3
        && d[d.winner == 'p1' ? 'p2' : 'p1'].compiled.size() < 3                    // loser: 0–2
        && (!('firstPlayer' in d) || d.firstPlayer in ['p1','p2'])
        && d.allProtocols.toSet() == d.p1.protocols.toSet().union(d.p2.protocols.toSet())
        && d.allProtocols.size() == 6                                               // 6 distinct across sides
        && d.isTestData is bool;
    }
    match /users/{uid} { allow read, write: if signedIn() && request.auth.uid == uid; }
    match /users/{uid}/players/{pid} {
      allow read, write: if signedIn() && request.auth.uid == uid
        && (request.method == 'delete' || request.resource.data.keys().hasOnly(['name','createdAt','archived']));
    }
    match /games/{gid} {
      allow read:   if signedIn();
      allow create: if signedIn() && validGame(request.resource.data);
      allow update: if signedIn() && resource.data.ownerUid == request.auth.uid && validGame(request.resource.data);
      allow delete: if signedIn() && (resource.data.ownerUid == request.auth.uid
                                      || resource.data.isTestData == true || isAdmin());
    }
    match /stats/{doc} { allow read: if signedIn(); allow write: if isAdmin(); }   // reserved for fallback
  }
}
```
Optional hardening: validate `protocols` against the literal 45‑id list. Rules are unit‑tested with `@firebase/rules-unit-testing` (see §10), especially the winner/loser cross‑check.

### 4.5 Offline / persistent cache

- `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` in try/catch → fall back to `memoryLocalCache()` (Safari private mode, blocked IndexedDB).
- Subscribe with `includeMetadataChanges: true`; show `fromCache` as a "`>cached — may be stale`" terminal badge on Stats, and `hasPendingWrites` as "`>syncing…`" on game cards. Treat the first cache‑only snapshot as loading until one server snapshot arrives.
- Never sort/filter by `createdAt` (pending `serverTimestamp()` is null locally); `playedAt` is client‑set.
- Long offline gaps invalidate the resume token → one full re‑read; acceptable, and the reason for the 5k threshold.
- Anonymous auth token is cached, so the app is fully usable offline after first launch.

## 5. Auth flow

- On load: `onAuthStateChanged`; if no user → `signInAnonymously()`. Create `users/{uid}` on first write.
- Settings → "Link Google": `linkWithPopup(auth.currentUser, new GoogleAuthProvider())`; on `auth/credential-already-in-use` offer "Sign in to existing account instead" (`signInWithCredential`) with a warning that the current anonymous data stays under the old uid (document this limitation; optional later: migration by rewriting `ownerUid`, which rules would need to allow — out of scope).
- Sign‑out from a Google‑linked account → next load creates a fresh anonymous user (explain in UI).

## 6. Developer tools screen (`/dev`)

Reachable from Settings → "Developer tools" for everyone (own‑data actions are safe); the **Admin** panel renders only when the current uid is in `VITE_ADMIN_UIDS` (mirror of the rules allowlist).
- **Generate test data**: inputs N games (default 200), number of players (default 6), date span (default 540 days), seed. Uses `devtools/generate.ts` (pure, seeded PRNG `mulberry32`) so Vitest can test determinism: creates players `Test‑Alpha…` (reuses existing `Test‑*` players), draws 3+3 distinct protocols from the *enabled sets*, biases outcomes so stats are interesting — hidden `strength: Record<ProtocolId, number>` (e.g. Fire/Speed strong, Apathy weak), `comboBonus` entries (Fire+Plague, Gravity+Speed), player skill ratings, winner = Bernoulli(sigmoid(strengthDiff + skillDiff + firstPlayerEdge≈0.12)), loser compiled count 0–2 biased by its strength, `compiled` for the loser chosen with preference for its strongest protocols. Writes in `writeBatch` chunks of 500 with `isTestData: true`. Progress as `TerminalLine`s.
- **Reset my data**: delete all my games (`where ownerUid == me`, paginated 500), then `users/{uid}/players`, optionally `users/{uid}` settings. Confirmation dialog requires typing `RESET`.
- **Delete my test data only**: same, filtered `isTestData == true`.
- **Purge global test data**: paginated `where('isTestData','==',true)` + batched deletes — the rules allow any signed‑in user to delete `isTestData` games, so this needs no admin. Real games are never touchable this way.
- **Admin: delete any game / rebuild `stats/global`** (fallback hook, UI stub only in v1).
- **Emulator**: when `VITE_USE_EMULATORS=true`, connect Auth (9099) / Firestore (8080) emulators and show a persistent banner; `npm run dev:emu` runs `firebase emulators:start --import=./emulator-data --export-on-exit`; "Nuke everything" button in emulator mode calls the emulator REST `DELETE …/documents`.
- Recommendation: use a **separate Firebase project for dev** (`compile-tracker-dev`) so generated data never shares a database with real games; `.firebaserc` gets `dev` and `prod` aliases, `.env.development` / `.env.production` carry the two configs.

## 7. PWA

- `vite-plugin-pwa` with `registerType: 'prompt'`; `ReloadPrompt` toast ("New version compiled — reload"). Workbox: precache app shell + fonts; `NetworkOnly` for `firestore.googleapis.com` (Firestore handles its own cache; never cache its long‑poll/websocket).
- Manifest: name "Compile Tracker", short_name "Compile", `display: standalone`, `theme_color #0d0a13`, `background_color #0d0a13`, icons 192/512 + maskable, generated by `scripts/gen-icons.ts` from `public/logo.svg` (the `<!>` mark on magenta).
- `index.html`: `<meta name="theme-color">`, Apple touch icon, `viewport-fit=cover`, safe‑area padding in `AppShell`.
- Install prompt captured in `useInstallPrompt`; iOS shows manual "Share → Add to Home Screen" hint.

## 8. Firebase project setup (user action + lead agent)

1. **User** creates a Firebase project in the console (or lead agent via `firebase projects:create` after `firebase login`), enables **Authentication → Anonymous + Google**, creates **Firestore (Native mode, production rules)**, enables **Hosting**. Copies the web app config into `.env.local` (`VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_APP_ID`, …). `.env.example` committed.
2. `firebase init` outputs are written by the agent (not interactively): `firebase.json` (hosting `dist`, SPA rewrite to `/index.html`, headers for `sw.js` no‑cache, firestore rules/indexes paths, emulators auth 9099 / firestore 8080 / ui), `.firebaserc`.
3. Deploy: `npm run build && firebase deploy --only hosting,firestore`. Afterwards copy your uid (shown in Settings) into the `isAdmin()` allowlist in `firestore.rules` and `VITE_ADMIN_UIDS`, redeploy rules.
4. Authorized domains: add the hosting domain for Google sign‑in.

## 9. Work breakdown for the Opus lead + sub‑agents

Contracts first, then fan out. Each WP lists its **inputs** (must exist), **outputs**, and **done criteria**. Sub‑agents must not edit files outside their WP except `src/types/index.ts` via the lead.

**WP0 — Scaffold & contracts (lead, sequential, ~first)**
- `npm create vite@latest . -- --template react-ts`; add deps: `firebase`, `react-router-dom`, `recharts`, `vite-plugin-pwa`, `@fontsource/orbitron`, `@fontsource/inter`, `@fontsource/jetbrains-mono`, dev: `vitest`, `@testing-library/react`, `jsdom`, `@firebase/rules-unit-testing`, `firebase-tools`, `sharp`, `eslint`, `prettier`, `playwright` (optional).
- Write: folder layout, `src/types/index.ts`, `src/data/protocols.ts` + `sets.ts`, `src/styles/tokens.css`, `firebase.json`, `.firebaserc`, `.env.example`, `firestore.indexes.json`, npm scripts (`dev`, `dev:emu`, `build`, `test`, `test:rules`, `emulators`, `deploy`, `gen:icons`), `git init` + `.gitignore`, `CLAUDE.md` (conventions: CSS modules, repo layer only touches Firestore, pure stats, tokens).
- Done: `npm run build` passes on the empty shell; types/data compile.

**Parallel wave 1** (after WP0):
- **WP1 — Design system** (`src/components/ui/*`, `global.css`, `fonts.css`, wordmark/glitch, `AppShell`, `ProtocolCard`, `ProtocolPicker`): Storybook not required; build a `/dev/ui` kitchen‑sink route for visual QA. Done: every component in §2 exists, keyboard accessible, mobile layout verified at 390px.
- **WP2 — Firebase layer** (`src/firebase/*`, `src/repo/*`, `src/hooks/useAuth|usePlayers|useGames|useSettings`, `firestore.rules`, `tests/rules/*`): converters with `withConverter`, auth bootstrap + Google linking, subscriptions returning `{ data, loading, error, fromCache }`. Done: rules tests pass in emulator (owner/non‑owner/admin/invalid shapes), hooks typed.
- **WP3 — Stats engine + test‑data generator** (`src/stats/*`, `src/devtools/generate.ts`, Vitest): implement `Agg`/`foldGame`/`aggregate`/`mergeAgg`, `filterGames`, every `derive.ts` function in §4.2 (covering all tabs in §3 `/stats`), Wilson lower bound; property test `aggregate(a ++ b) ≡ mergeAgg(aggregate(a), aggregate(b))`. Done: ≥90% coverage on `stats/`, generator deterministic for a seed and always produces rule‑valid games, fixture of 3k games aggregates in <50 ms.

**Parallel wave 2** (after wave 1):
- **WP4 — Players & Games features** (`features/players`, `features/games`, `features/home`): wizard with validation, sessionStorage persistence, edit/delete, list filters, pseudonymous labels in All scope.
- **WP5 — Stats features** (`features/stats/*`): tabs, scope toggle, filters, Recharts theming, protocol detail drawer, empty states as terminal lines.
- **WP6 — Settings, Dev tools, PWA** (`features/settings`, `features/dev`, `vite.config.ts` PWA block, `ReloadPrompt`, `scripts/gen-icons.ts`, `public/*`, `useInstallPrompt`): set toggles, Google link, install, generate/reset flows with progress, admin purge, emulator banner.

**WP7 — Integration & QA (lead)**: wire routes/lazy loading, run `npm run build`, Lighthouse PWA audit ≥ 90, run full test suite, end‑to‑end manual pass (below), `firebase deploy`, write `README.md` (setup, env, emulator, deploy, admin doc).

## 10. Verification

1. `npm run test` — Vitest: stats (known fixtures → expected win rates/compile rates/combos), generator determinism, filters.
2. `npm run test:rules` — emulator rules: owner can CRUD own players/games; non‑owner cannot read players, can read games, cannot write/delete; admin can delete `isTestData` games only; invalid games (duplicate protocol, winner with 2 compiled, loser with 3) rejected.
3. `npm run dev:emu` manual flow: anonymous sign‑in → create 2 players → new game wizard (3+3 distinct protocols, flip compiled, winner derived) → appears in Games and Stats (Mine) → Dev tools generate 200 games → Stats (All) shows pseudonymous ids, protocols/combos populated → reset my data → empty states show. Toggle offline in DevTools → record a game → back online → syncs.
4. PWA: `npm run build && npm run preview` → Chrome "Install" available, Lighthouse PWA + a11y pass; update flow shows reload toast after a rebuild.
5. Deploy to Firebase Hosting; verify Google linking on the hosted domain and that a second browser (different anon uid) sees games in "All" without names.

## 11. Risks / notes

- Anonymous uid loss (cleared storage before linking Google) orphans that user's players and games permanently — surfaced prominently in Settings/Home as a one‑time terminal hint pushing Google linking.
- Games are always between two of *one* user's players; cross‑account games (two tracker users playing each other) aren't modelled in v1 — each records their own copy, which double‑counts in "All". Acceptable for now; note it in README.
- `isTestData` games are deletable by any signed‑in user (griefing risk on shared test data only) — mitigated by the separate dev project.
- Rules don't verify `yearMonth` matches `playedAt`; a user could only skew month grouping of their own games. Low impact.
- Google‑Fonts self‑hosting via `@fontsource` keeps offline rendering consistent.
- Protocol colours and glyphs are original approximations; no official art is bundled.
- If Main/Aux lists change (future sets), `protocols.ts` is the single source; stats never hard‑code ids.
