import type { GameDoc, ProtocolId } from '@/types';
import { vsKey, type Agg } from './aggregate';
import { rate, wilsonLower } from './wilson';

export interface ProtocolUsageRow {
  id: ProtocolId;
  decks: number;
  /** decks / (games * 2) */
  share: number;
}

export interface ProtocolWinRateRow {
  id: ProtocolId;
  decks: number;
  wins: number;
  rate: number;
  lower: number;
}

export interface ProtocolCompileRateRow {
  id: ProtocolId;
  /** Decks with known compile data (winner-only games excluded). */
  decks: number;
  compiled: number;
  rate: number;
}

export interface ComboRow {
  key: string;
  ids: ProtocolId[];
  decks: number;
  wins: number;
  rate: number;
  lower: number;
}

export interface CounterPickRow {
  id: ProtocolId;
  games: number;
  /** How often a deck with `id` beat a deck containing the queried protocol. */
  winRateAgainst: number;
}

export interface MatchupRow {
  id: ProtocolId;
  games: number;
  /** Queried protocol's deck win rate against decks containing `id`. */
  rate: number;
}

export interface PlayerRecordRow {
  playerId: string;
  games: number;
  wins: number;
  losses: number;
  rate: number;
  lower: number;
  /** Share of games (with known first player) where this player went first. */
  firstRate: number;
  /** Games with known compile data; the averages below are over these. */
  compileGames: number;
  avgCompiledFor: number;
  avgCompiledAgainst: number;
  lastPlayedMs: number;
  /** Most played protocol. */
  favourite: ProtocolId | null;
  /** Highest win rate protocol with at least 3 decks. */
  best: ProtocolId | null;
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function protocolUsage(agg: Agg): ProtocolUsageRow[] {
  const total = agg.games * 2;
  return Object.entries(agg.byProtocol)
    .map(([id, p]) => ({ id, decks: p.decks, share: rate(p.decks, total) }))
    .sort((a, b) => b.decks - a.decks || byId(a, b));
}

export function protocolWinRate(agg: Agg, minDecks = 1): ProtocolWinRateRow[] {
  return Object.entries(agg.byProtocol)
    .filter(([, p]) => p.decks >= minDecks)
    .map(([id, p]) => ({ id, decks: p.decks, wins: p.wins, rate: rate(p.wins, p.decks), lower: wilsonLower(p.wins, p.decks) }))
    .sort((a, b) => b.lower - a.lower || b.rate - a.rate || b.decks - a.decks || byId(a, b));
}

export function protocolCompileRate(agg: Agg, minDecks = 1): ProtocolCompileRateRow[] {
  return Object.entries(agg.byProtocol)
    .filter(([, p]) => p.compileDecks >= minDecks)
    .map(([id, p]) => ({ id, decks: p.compileDecks, compiled: p.compiled, rate: rate(p.compiled, p.compileDecks) }))
    .sort((a, b) => b.rate - a.rate || b.decks - a.decks || byId(a, b));
}

export function bestCombos(agg: Agg, k: 2 | 3, minDecks = 1): ComboRow[] {
  const src = k === 2 ? agg.byPair : agg.byTriple;
  return Object.entries(src)
    .filter(([, c]) => c.decks >= minDecks)
    .map(([key, c]) => ({
      key,
      ids: key.split('+'),
      decks: c.decks,
      wins: c.wins,
      rate: rate(c.wins, c.decks),
      lower: wilsonLower(c.wins, c.decks),
    }))
    .sort((a, b) => b.lower - a.lower || b.rate - a.rate || b.decks - a.decks || (a.key < b.key ? -1 : 1));
}

/** Iterate every protocol that faced `protocolId`, with games and wins of `protocolId`'s deck. */
function facedBy(agg: Agg, protocolId: ProtocolId): { id: ProtocolId; games: number; myWins: number }[] {
  const out: { id: ProtocolId; games: number; myWins: number }[] = [];
  for (const other of Object.keys(agg.byProtocol)) {
    if (other === protocolId) continue;
    const v = agg.vsProtocol[vsKey(protocolId, other)];
    if (!v || v.games === 0) continue;
    const myWins = protocolId < other ? v.aWins : v.games - v.aWins;
    out.push({ id: other, games: v.games, myWins });
  }
  return out;
}

/** Protocols whose decks beat decks containing `protocolId` most often. */
export function counterPicks(agg: Agg, protocolId: ProtocolId, minGames = 1): CounterPickRow[] {
  return facedBy(agg, protocolId)
    .filter((r) => r.games >= minGames)
    .map((r) => ({ id: r.id, games: r.games, winRateAgainst: rate(r.games - r.myWins, r.games) }))
    .sort((a, b) => b.winRateAgainst - a.winRateAgainst || b.games - a.games || byId(a, b));
}

/** `protocolId`'s deck win rate vs decks containing each other protocol. */
export function protocolMatchups(agg: Agg, protocolId: ProtocolId): MatchupRow[] {
  return facedBy(agg, protocolId)
    .map((r) => ({ id: r.id, games: r.games, rate: rate(r.myWins, r.games) }))
    .sort((a, b) => b.rate - a.rate || b.games - a.games || byId(a, b));
}

export function playerRecords(agg: Agg): PlayerRecordRow[] {
  return Object.entries(agg.byPlayer)
    .map(([playerId, p]) => {
      let favourite: ProtocolId | null = null;
      let favDecks = 0;
      let best: ProtocolId | null = null;
      let bestRate = -1;
      let bestDecks = 0;
      for (const id of Object.keys(p.protocolDecks).sort()) {
        const d = p.protocolDecks[id];
        if (d.decks > favDecks) {
          favourite = id;
          favDecks = d.decks;
        }
        if (d.decks >= 3) {
          const r = rate(d.wins, d.decks);
          if (r > bestRate || (r === bestRate && d.decks > bestDecks)) {
            best = id;
            bestRate = r;
            bestDecks = d.decks;
          }
        }
      }
      return {
        playerId,
        games: p.games,
        wins: p.wins,
        losses: p.games - p.wins,
        rate: rate(p.wins, p.games),
        lower: wilsonLower(p.wins, p.games),
        firstRate: rate(p.first, p.games),
        compileGames: p.compileGames,
        avgCompiledFor: rate(p.compiledFor, p.compileGames),
        avgCompiledAgainst: rate(p.compiledAgainst, p.compileGames),
        lastPlayedMs: p.lastPlayedMs,
        favourite,
        best,
      };
    })
    .sort((a, b) => b.lower - a.lower || b.wins - a.wins || b.games - a.games || (a.playerId < b.playerId ? -1 : 1));
}

export function headToHead(agg: Agg, pidA: string, pidB: string): { games: number; aWins: number; bWins: number } {
  const key = pidA < pidB ? `${pidA}|${pidB}` : `${pidB}|${pidA}`;
  const h = agg.h2h[key];
  if (!h) return { games: 0, aWins: 0, bWins: 0 };
  const aWins = pidA < pidB ? h.aWins : h.games - h.aWins;
  return { games: h.games, aWins, bWins: h.games - aWins };
}

export function firstPlayerAdvantage(agg: Agg): { rate: number; n: number } {
  return { rate: rate(agg.firstPlayerWins, agg.firstPlayerKnown), n: agg.firstPlayerKnown };
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1); // month index m == next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Ascending by month; gaps between the first and last month are filled with 0. */
export function gamesOverTime(agg: Agg): { yearMonth: string; games: number }[] {
  const months = Object.keys(agg.byMonth).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
  if (months.length === 0) return [];
  const out: { yearMonth: string; games: number }[] = [];
  const last = months[months.length - 1];
  for (let ym = months[0]; ; ym = nextMonth(ym)) {
    out.push({ yearMonth: ym, games: agg.byMonth[ym]?.games ?? 0 });
    if (ym === last || out.length > 1200) break;
  }
  return out;
}

export function avgLoserCompiled(agg: Agg): number {
  return rate(agg.loserCompiledSum, agg.compileKnown);
}

export function loserCompiledDistribution(agg: Agg): { compiled: 0 | 1 | 2; games: number; share: number }[] {
  return ([0, 1, 2] as const).map((c) => ({ compiled: c, games: agg.loserCompiledHist[c], share: rate(agg.loserCompiledHist[c], agg.compileKnown) }));
}

const involves = (g: GameDoc, playerId: string): boolean => g.p1.playerId === playerId || g.p2.playerId === playerId;
const wonBy = (g: GameDoc, playerId: string): boolean => (g.winner === 'p1' ? g.p1 : g.p2).playerId === playerId;

function playerGamesAsc(games: readonly GameDoc[], playerId: string): GameDoc[] {
  return games.filter((g) => involves(g, playerId)).sort((a, b) => a.playedAt.toMillis() - b.playedAt.toMillis());
}

/** `current` is positive for a win streak, negative for a loss streak, 0 without games. */
export function streaks(games: readonly GameDoc[], playerId: string): { current: number; longestWin: number; longestLoss: number } {
  let current = 0;
  let longestWin = 0;
  let longestLoss = 0;
  for (const g of playerGamesAsc(games, playerId)) {
    if (wonBy(g, playerId)) {
      current = current > 0 ? current + 1 : 1;
      if (current > longestWin) longestWin = current;
    } else {
      current = current < 0 ? current - 1 : -1;
      if (-current > longestLoss) longestLoss = -current;
    }
  }
  return { current, longestWin, longestLoss };
}

/** Last `n` results of `playerId`, most recent last. */
export function recentForm(games: readonly GameDoc[], playerId: string, n = 10): ('W' | 'L')[] {
  const mine = playerGamesAsc(games, playerId);
  return mine.slice(Math.max(0, mine.length - n)).map((g) => (wonBy(g, playerId) ? 'W' : 'L'));
}
