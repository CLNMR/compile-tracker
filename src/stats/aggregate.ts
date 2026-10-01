import type { Game, GameSide, ProtocolId } from '@/types';

export interface ProtocolAgg {
  /** Decks (sides) that included this protocol. */
  decks: number;
  /** Of those decks, how many won. */
  wins: number;
  /** Times this protocol was compiled by its own deck. */
  compiled: number;
  /** Total protocols the opponent compiled in games where this protocol was in the deck. */
  compiledAgainst: number;
}

export interface PlayerAgg {
  games: number;
  wins: number;
  /** Games where this player went first (only counted when `firstPlayer` is known). */
  first: number;
  firstWins: number;
  /** Sum of protocols compiled by this player. */
  compiledFor: number;
  /** Sum of protocols compiled by the opponents of this player. */
  compiledAgainst: number;
  lastPlayedMs: number;
  protocolDecks: Record<ProtocolId, { decks: number; wins: number }>;
}

export interface Agg {
  games: number;
  byProtocol: Record<ProtocolId, ProtocolAgg>;
  /** key = 2 ids sorted joined with '+' */
  byPair: Record<string, { decks: number; wins: number }>;
  /** key = 3 ids sorted joined with '+' */
  byTriple: Record<string, { decks: number; wins: number }>;
  byPlayer: Record<string, PlayerAgg>;
  /** key = `${pidA}|${pidB}` with pidA < pidB; aWins = wins of pidA */
  h2h: Record<string, { games: number; aWins: number }>;
  /** key = `${a}|${b}` with a < b: games where a's deck faced b's deck; aWins = a's deck won */
  vsProtocol: Record<string, { games: number; aWins: number }>;
  /** key = yearMonth */
  byMonth: Record<string, { games: number }>;
  firstPlayerWins: number;
  firstPlayerKnown: number;
  loserCompiledSum: number;
  /** How many games the loser compiled 0, 1, 2 protocols. */
  loserCompiledHist: [number, number, number];
}

export const pairKey = (a: string, b: string): string => (a < b ? `${a}+${b}` : `${b}+${a}`);
export const tripleKey = (a: string, b: string, c: string): string => [a, b, c].sort().join('+');
export const h2hKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const vsKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const emptyAgg = (): Agg => ({
  games: 0,
  byProtocol: {},
  byPair: {},
  byTriple: {},
  byPlayer: {},
  h2h: {},
  vsProtocol: {},
  byMonth: {},
  firstPlayerWins: 0,
  firstPlayerKnown: 0,
  loserCompiledSum: 0,
  loserCompiledHist: [0, 0, 0],
});

const emptyPlayer = (): PlayerAgg => ({
  games: 0,
  wins: 0,
  first: 0,
  firstWins: 0,
  compiledFor: 0,
  compiledAgainst: 0,
  lastPlayedMs: 0,
  protocolDecks: {},
});

function foldSide(acc: Agg, side: GameSide, opp: GameSide, won: boolean, first: boolean, playedMs: number): void {
  const oppCompiled = opp.compiled.length;
  const ps = side.protocols;

  for (const p of ps) {
    const pa = (acc.byProtocol[p] ??= { decks: 0, wins: 0, compiled: 0, compiledAgainst: 0 });
    pa.decks++;
    if (won) pa.wins++;
    if (side.compiled.includes(p)) pa.compiled++;
    pa.compiledAgainst += oppCompiled;
  }

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const pr = (acc.byPair[pairKey(ps[i], ps[j])] ??= { decks: 0, wins: 0 });
      pr.decks++;
      if (won) pr.wins++;
    }
  }

  if (ps.length === 3) {
    const tr = (acc.byTriple[tripleKey(ps[0], ps[1], ps[2])] ??= { decks: 0, wins: 0 });
    tr.decks++;
    if (won) tr.wins++;
  }

  const pl = (acc.byPlayer[side.playerId] ??= emptyPlayer());
  pl.games++;
  if (won) pl.wins++;
  if (first) {
    pl.first++;
    if (won) pl.firstWins++;
  }
  pl.compiledFor += side.compiled.length;
  pl.compiledAgainst += oppCompiled;
  if (playedMs > pl.lastPlayedMs) pl.lastPlayedMs = playedMs;
  for (const p of ps) {
    const pd = (pl.protocolDecks[p] ??= { decks: 0, wins: 0 });
    pd.decks++;
    if (won) pd.wins++;
  }
}

/** Fold one game into the accumulator. Mutates and returns `acc`. */
export function foldGame(acc: Agg, g: Game): Agg {
  acc.games++;
  const month = (acc.byMonth[g.yearMonth] ??= { games: 0 });
  month.games++;

  const p1Won = g.winner === 'p1';
  const loser = p1Won ? g.p2 : g.p1;
  const playedMs = g.playedAt.toMillis();

  foldSide(acc, g.p1, g.p2, p1Won, g.firstPlayer === 'p1', playedMs);
  foldSide(acc, g.p2, g.p1, !p1Won, g.firstPlayer === 'p2', playedMs);

  // Head to head: `a` is the lexicographically smaller player id.
  const h = (acc.h2h[h2hKey(g.p1.playerId, g.p2.playerId)] ??= { games: 0, aWins: 0 });
  h.games++;
  const p1IsA = g.p1.playerId < g.p2.playerId;
  if (p1IsA === p1Won) h.aWins++;

  // Protocol vs protocol: every protocol on p1's side faced every protocol on p2's side.
  for (const a of g.p1.protocols) {
    for (const b of g.p2.protocols) {
      const v = (acc.vsProtocol[vsKey(a, b)] ??= { games: 0, aWins: 0 });
      v.games++;
      // The smaller id sits on p1's side iff a < b.
      if ((a < b) === p1Won) v.aWins++;
    }
  }

  if (g.firstPlayer) {
    acc.firstPlayerKnown++;
    if (g.firstPlayer === g.winner) acc.firstPlayerWins++;
  }

  const lc = Math.min(2, Math.max(0, loser.compiled.length));
  acc.loserCompiledSum += lc;
  acc.loserCompiledHist[lc]++;

  return acc;
}

export function aggregate(games: readonly Game[]): Agg {
  const acc = emptyAgg();
  for (const g of games) foldGame(acc, g);
  return acc;
}

/** Field-wise sum of two records of plain numeric objects (all fields must be numbers). */
function mergeCountRecords<T extends object>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(a)) out[k] = { ...a[k] };
  for (const k of Object.keys(b)) {
    const cur = out[k];
    if (!cur) {
      out[k] = { ...b[k] };
      continue;
    }
    const dst = cur as unknown as Record<string, number>;
    const src = b[k] as unknown as Record<string, number>;
    for (const f of Object.keys(src)) dst[f] = (dst[f] ?? 0) + src[f];
  }
  return out;
}

function mergePlayer(a: PlayerAgg, b: PlayerAgg): PlayerAgg {
  return {
    games: a.games + b.games,
    wins: a.wins + b.wins,
    first: a.first + b.first,
    firstWins: a.firstWins + b.firstWins,
    compiledFor: a.compiledFor + b.compiledFor,
    compiledAgainst: a.compiledAgainst + b.compiledAgainst,
    lastPlayedMs: Math.max(a.lastPlayedMs, b.lastPlayedMs),
    protocolDecks: mergeCountRecords(a.protocolDecks, b.protocolDecks),
  };
}

function clonePlayer(p: PlayerAgg): PlayerAgg {
  return { ...p, protocolDecks: mergeCountRecords(p.protocolDecks, {}) };
}

/** Pure: returns a new Agg equal to aggregating the union of both inputs. */
export function mergeAgg(a: Agg, b: Agg): Agg {
  const byPlayer: Record<string, PlayerAgg> = {};
  for (const k of Object.keys(a.byPlayer)) byPlayer[k] = clonePlayer(a.byPlayer[k]);
  for (const k of Object.keys(b.byPlayer)) {
    byPlayer[k] = byPlayer[k] ? mergePlayer(byPlayer[k], b.byPlayer[k]) : clonePlayer(b.byPlayer[k]);
  }
  return {
    games: a.games + b.games,
    byProtocol: mergeCountRecords(a.byProtocol, b.byProtocol),
    byPair: mergeCountRecords(a.byPair, b.byPair),
    byTriple: mergeCountRecords(a.byTriple, b.byTriple),
    byPlayer,
    h2h: mergeCountRecords(a.h2h, b.h2h),
    vsProtocol: mergeCountRecords(a.vsProtocol, b.vsProtocol),
    byMonth: mergeCountRecords(a.byMonth, b.byMonth),
    firstPlayerWins: a.firstPlayerWins + b.firstPlayerWins,
    firstPlayerKnown: a.firstPlayerKnown + b.firstPlayerKnown,
    loserCompiledSum: a.loserCompiledSum + b.loserCompiledSum,
    loserCompiledHist: [
      a.loserCompiledHist[0] + b.loserCompiledHist[0],
      a.loserCompiledHist[1] + b.loserCompiledHist[1],
      a.loserCompiledHist[2] + b.loserCompiledHist[2],
    ],
  };
}
