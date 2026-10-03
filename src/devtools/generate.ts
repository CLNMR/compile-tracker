import type { GameInput, ProtocolId, SetId, SideKey } from '@/types';
import { protocolsInSets } from '@/data/protocols';

export interface GenerateOptions {
  games: number;
  /** At least 2 distinct player ids. Lower indexes play (and win) a little more. */
  playerIds: string[];
  enabledSets: SetId[];
  seed: number;
  /** Window of play dates ending at `now`. Default 540. */
  days?: number;
  now?: Date;
}

export const TEST_PLAYER_NAMES: string[] = [
  'Test-Alpha',
  'Test-Beta',
  'Test-Gamma',
  'Test-Delta',
  'Test-Epsilon',
  'Test-Zeta',
  'Test-Eta',
  'Test-Theta',
];

/** Small, fast seeded PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic value in [-1, 1) derived from a string. */
const unitHash = (s: string): number => (hashStr(s) / 4294967296) * 2 - 1;

const STRENGTH_OVERRIDES: Readonly<Record<string, number>> = {
  fire: 0.9,
  speed: 0.75,
  psychic: 0.65,
  apathy: -0.9,
  inert: -0.8,
  sloth: -0.7,
};

/** Hidden per-protocol strength in roughly [-0.9, 0.9] (logit units). */
export function protocolStrength(id: ProtocolId): number {
  return STRENGTH_OVERRIDES[id] ?? unitHash(id) * 0.6;
}

const pk = (a: string, b: string): string => (a < b ? `${a}+${b}` : `${b}+${a}`);

const COMBO_BONUS: Readonly<Record<string, number>> = {
  [pk('fire', 'plague')]: 0.55,
  [pk('gravity', 'speed')]: 0.5,
  [pk('life', 'water')]: 0.45,
  [pk('darkness', 'death')]: 0.5,
  [pk('love', 'hate')]: 0.6,
};

/** Mean protocol strength plus combo bonuses of the deck. */
export function deckStrength(ids: readonly ProtocolId[]): number {
  let s = 0;
  for (const id of ids) s += protocolStrength(id);
  s /= Math.max(1, ids.length);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) s += COMBO_BONUS[pk(ids[i], ids[j])] ?? 0;
  }
  return s;
}

/** Players earlier in the list are a bit stronger. */
export const playerSkill = (index: number): number => Math.max(-0.6, 0.45 - 0.15 * index);

const FIRST_PLAYER_EDGE = 0.12;
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const DAY_MS = 86_400_000;

/** Index drawn proportionally to `weights` (all > 0). */
function pickWeighted(rng: () => number, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Draw `n` distinct items without replacement, proportional to `weight(item)`. */
function sampleWeighted<T>(rng: () => number, items: readonly T[], weight: (t: T) => number, n: number): T[] {
  const pool = [...items];
  const weights = pool.map(weight);
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = pickWeighted(rng, weights);
    out.push(pool[i]);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return out;
}

function pickPlayers(rng: () => number, playerIds: readonly string[]): [number, number] {
  const weights = playerIds.map((_, i) => 1 / Math.sqrt(i + 1));
  const a = pickWeighted(rng, weights);
  const rest = weights.map((w, i) => (i === a ? 0 : w));
  const b = pickWeighted(rng, rest);
  return [a, b];
}

function pickPlayedAt(rng: () => number, nowMs: number, days: number): Date {
  // 30% of games fall into the last 6 weeks (or the whole window if shorter), the rest are uniform.
  const recentDays = Math.min(42, days);
  const back = rng() < 0.3 ? rng() * recentDays : rng() * days;
  return new Date(Math.round(nowMs - back * DAY_MS));
}

/** How many protocols the loser compiled (0–2), biased by its deck strength. */
function pickLoserCompiledCount(rng: () => number, strength: number): number {
  const prob2 = Math.min(0.75, Math.max(0.05, 0.3 + 0.25 * strength));
  const prob0 = Math.min(0.75, Math.max(0.05, 0.3 - 0.25 * strength));
  const r = rng();
  if (r < prob0) return 0;
  if (r > 1 - prob2) return 2;
  return 1;
}

/** Strongest protocols first, with a little noise so it is not fully deterministic per deck. */
function pickLoserCompiled(rng: () => number, ids: readonly ProtocolId[], count: number): ProtocolId[] {
  const scored = ids.map((id) => ({ id, score: protocolStrength(id) + (rng() - 0.5) * 0.4 }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.id);
}

const WINNER_ONLY_SHARE = 0.1;

/**
 * Deterministic, biased test data. Same options → identical output.
 * Every returned input satisfies `buildGame` from `@/repo/games`.
 */
export function generateGames(opts: GenerateOptions): GameInput[] {
  const { games, playerIds, enabledSets, seed } = opts;
  if (new Set(playerIds).size < 2) throw new Error('generateGames: at least 2 distinct playerIds required');
  const pool = protocolsInSets(enabledSets).map((p) => p.id);
  if (pool.length < 6) throw new Error(`generateGames: need at least 6 protocols in the enabled sets, got ${pool.length}`);
  const days = Math.max(1, opts.days ?? 540);
  const nowMs = (opts.now ?? new Date()).getTime();
  const rng = mulberry32(seed);
  const popularity = (id: ProtocolId): number => Math.exp(0.6 * unitHash(`${id}:pop`) + 0.3 * protocolStrength(id));

  const out: GameInput[] = [];
  for (let n = 0; n < games; n++) {
    const [ia, ib] = pickPlayers(rng, playerIds);
    const drawn = sampleWeighted(rng, pool, popularity, 6);
    const deck1 = drawn.slice(0, 3).sort();
    const deck2 = drawn.slice(3, 6).sort();

    const firstPlayer: SideKey | undefined = rng() < 0.85 ? (rng() < 0.5 ? 'p1' : 'p2') : undefined;
    const s1 = deckStrength(deck1) + playerSkill(ia) + (firstPlayer === 'p1' ? FIRST_PLAYER_EDGE : 0);
    const s2 = deckStrength(deck2) + playerSkill(ib) + (firstPlayer === 'p2' ? FIRST_PLAYER_EDGE : 0);
    const winner: SideKey = rng() < sigmoid(s1 - s2) ? 'p1' : 'p2';

    const loserDeck = winner === 'p1' ? deck2 : deck1;
    const loserCompiled = pickLoserCompiled(rng, loserDeck, pickLoserCompiledCount(rng, deckStrength(loserDeck))).sort();

    const input: GameInput = {
      playedAt: pickPlayedAt(rng, nowMs, days),
      p1: { playerId: playerIds[ia], protocols: deck1, compiled: winner === 'p1' ? [...deck1] : loserCompiled },
      p2: { playerId: playerIds[ib], protocols: deck2, compiled: winner === 'p2' ? [...deck2] : loserCompiled },
      winner,
      isTestData: true,
    };
    if (firstPlayer) input.firstPlayer = firstPlayer;
    // Some results are logged as winner only (loser's compiled protocols unknown).
    if (rng() < WINNER_ONLY_SHARE) input.compileUnknown = true;
    out.push(input);
  }

  out.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  return out;
}
