import { describe, expect, it } from 'vitest';
import { aggregate, emptyAgg } from './aggregate';
import {
  avgLoserCompiled,
  bestCombos,
  counterPicks,
  firstPlayerAdvantage,
  gamesOverTime,
  headToHead,
  loserCompiledDistribution,
  playerRecords,
  protocolCompileRate,
  protocolMatchups,
  protocolUsage,
  protocolWinRate,
  recentForm,
  streaks,
} from './derive';
import { wilsonLower } from './wilson';
import { FIXTURE_GAMES, mkGame } from '@/test/fixtures';

const agg = aggregate(FIXTURE_GAMES);
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('protocolUsage', () => {
  it('ranks by decks with share over all decks', () => {
    const rows = protocolUsage(agg);
    expect(rows.slice(0, 2)).toEqual([
      { id: 'death', decks: 4, share: 0.5 },
      { id: 'fire', decks: 4, share: 0.5 },
    ]);
    expect(ids(rows.slice(2, 4))).toEqual(['metal', 'water']);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(3, 10);
    expect(rows).toHaveLength(11);
  });

  it('is empty for an empty agg', () => {
    expect(protocolUsage(emptyAgg())).toEqual([]);
  });
});

describe('protocolWinRate', () => {
  it('computes rates and sorts by wilson lower bound', () => {
    const rows = protocolWinRate(agg);
    const water = rows.find((r) => r.id === 'water')!;
    expect(water).toEqual({ id: 'water', decks: 3, wins: 3, rate: 1, lower: wilsonLower(3, 3) });
    expect(rows[0].id).toBe('water'); // 3/3 (0.44) beats 2/2 (0.34) beats 3/4 (0.30)
    expect(ids(rows.slice(1, 3))).toEqual(['life', 'fire']);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].lower).toBeGreaterThanOrEqual(rows[i].lower);
  });

  it('respects minDecks', () => {
    expect(ids(protocolWinRate(agg, 3)).sort()).toEqual(['death', 'fire', 'metal', 'water']);
    expect(protocolWinRate(agg, 5)).toEqual([]);
  });
});

describe('protocolCompileRate', () => {
  it('computes compiled / decks', () => {
    const rows = protocolCompileRate(agg, 2);
    expect(rows.find((r) => r.id === 'fire')).toEqual({ id: 'fire', decks: 4, compiled: 4, rate: 1 });
    expect(rows.find((r) => r.id === 'death')).toEqual({ id: 'death', decks: 4, compiled: 3, rate: 0.75 });
    expect(rows.find((r) => r.id === 'gravity')).toEqual({ id: 'gravity', decks: 2, compiled: 0, rate: 0 });
    expect(rows[rows.length - 1].id).toBe('gravity');
    // rate 1 group: fire (4), water (3), life (2), speed (2) → decks desc then id
    expect(ids(rows.slice(0, 4))).toEqual(['fire', 'water', 'life', 'speed']);
  });

  it('leaves winner-only games out of the denominator', () => {
    const withUnknown = aggregate([...FIXTURE_GAMES, mkGame({ compileUnknown: true })]);
    const rows = protocolCompileRate(withUnknown, 1);
    expect(rows.find((r) => r.id === 'fire')).toEqual({ id: 'fire', decks: 4, compiled: 4, rate: 1 });
    expect(rows.find((r) => r.id === 'gravity')).toEqual({ id: 'gravity', decks: 2, compiled: 0, rate: 0 });
    // a protocol seen only in winner-only games has no compile rate at all
    const only = aggregate([mkGame({ compileUnknown: true })]);
    expect(protocolCompileRate(only, 1)).toEqual([]);
    expect(playerRecords(only).find((r) => r.playerId === 'A')).toMatchObject({ games: 1, wins: 1, compileGames: 0, avgCompiledFor: 0 });
  });
});

describe('bestCombos', () => {
  it('ranks pairs', () => {
    const rows = bestCombos(agg, 2, 2);
    expect(rows[0]).toMatchObject({ key: 'fire+water', ids: ['fire', 'water'], decks: 3, wins: 3, rate: 1 });
    expect(rows[1]).toMatchObject({ key: 'fire+life', decks: 2, wins: 2 });
    expect(rows.map((r) => r.key)).toEqual(['fire+water', 'fire+life', 'life+water', 'fire+speed', 'death+metal', 'death+gravity', 'gravity+metal']);
  });

  it('ranks triples', () => {
    const rows = bestCombos(agg, 3);
    expect(rows[0]).toMatchObject({ key: 'fire+life+water', ids: ['fire', 'life', 'water'], decks: 2, wins: 2 });
    expect(rows).toHaveLength(6);
    expect(bestCombos(agg, 3, 3)).toEqual([]);
  });
});

describe('counterPicks / protocolMatchups', () => {
  it('finds the protocols that beat fire most often', () => {
    const rows = counterPicks(agg, 'fire');
    expect(rows[0]).toEqual({ id: 'light', games: 1, winRateAgainst: 1 });
    expect(rows[1]).toEqual({ id: 'metal', games: 3, winRateAgainst: 1 / 3 });
    expect(rows[2]).toEqual({ id: 'death', games: 4, winRateAgainst: 0.25 });
    expect(ids(rows.slice(3))).toEqual(['gravity', 'darkness', 'spirit']);
    expect(ids(counterPicks(agg, 'fire', 2))).toEqual(['metal', 'death', 'gravity']);
  });

  it('reports fire win rate against each opponent protocol', () => {
    const rows = protocolMatchups(agg, 'fire');
    expect(ids(rows)).toEqual(['gravity', 'darkness', 'spirit', 'death', 'metal', 'light']);
    expect(rows.find((r) => r.id === 'death')).toEqual({ id: 'death', games: 4, rate: 0.75 });
    expect(rows.find((r) => r.id === 'light')).toEqual({ id: 'light', games: 1, rate: 0 });
  });

  it('works from the other side of the key too', () => {
    // death > darkness lexicographically; darkness only faced fire/speed/water in G4 and lost.
    expect(protocolMatchups(agg, 'darkness')).toEqual([
      { id: 'fire', games: 1, rate: 0 },
      { id: 'speed', games: 1, rate: 0 },
      { id: 'water', games: 1, rate: 0 },
    ]);
    expect(counterPicks(agg, 'spirit')).toEqual([
      { id: 'fire', games: 1, winRateAgainst: 1 },
      { id: 'speed', games: 1, winRateAgainst: 1 },
      { id: 'water', games: 1, winRateAgainst: 1 },
    ]);
  });

  it('returns nothing for unknown protocols', () => {
    expect(counterPicks(agg, 'nope')).toEqual([]);
    expect(protocolMatchups(agg, 'nope')).toEqual([]);
  });
});

describe('playerRecords', () => {
  it('computes per-player records', () => {
    const rows = playerRecords(agg);
    const a = rows.find((r) => r.playerId === 'A')!;
    expect(a).toEqual({
      playerId: 'A',
      games: 3,
      wins: 2,
      losses: 1,
      rate: 2 / 3,
      lower: wilsonLower(2, 3),
      firstRate: 1 / 3,
      compileGames: 3,
      avgCompiledFor: 8 / 3,
      avgCompiledAgainst: 2,
      lastPlayedMs: new Date(2025, 2, 15, 12).getTime(),
      favourite: 'fire',
      best: 'fire',
    });
    const b = rows.find((r) => r.playerId === 'B')!;
    expect(b).toMatchObject({ games: 3, wins: 1, losses: 2, firstRate: 2 / 3, favourite: 'death', best: 'death' });
    const c = rows.find((r) => r.playerId === 'C')!;
    expect(c).toMatchObject({ games: 2, wins: 1, losses: 1, firstRate: 0, favourite: 'darkness', best: null, avgCompiledFor: 2.5, avgCompiledAgainst: 1.5 });
    expect(rows.map((r) => r.playerId)).toEqual(['A', 'C', 'B']);
  });

  it('picks best by rate then decks', () => {
    const games = [
      ...Array.from({ length: 3 }, () => mkGame({ p1: { protocols: ['fire', 'life', 'water'] } })),
      ...Array.from({ length: 4 }, () => mkGame({ p1: { protocols: ['speed', 'life', 'water'] } })),
      mkGame({ p1: { protocols: ['fire', 'life', 'water'] }, winner: 'p2' }),
    ];
    const [a] = playerRecords(aggregate(games)).filter((r) => r.playerId === 'A');
    // life/water: 8 decks 7 wins; speed: 4/4 (rate 1) > fire 4 decks 3 wins
    expect(a.best).toBe('speed');
    expect(a.favourite).toBe('life');
  });
});

describe('headToHead / firstPlayerAdvantage', () => {
  it('reports both orientations', () => {
    expect(headToHead(agg, 'A', 'B')).toEqual({ games: 2, aWins: 1, bWins: 1 });
    expect(headToHead(agg, 'B', 'A')).toEqual({ games: 2, aWins: 1, bWins: 1 });
    expect(headToHead(agg, 'C', 'B')).toEqual({ games: 1, aWins: 1, bWins: 0 });
    expect(headToHead(agg, 'B', 'C')).toEqual({ games: 1, aWins: 0, bWins: 1 });
    expect(headToHead(agg, 'A', 'Z')).toEqual({ games: 0, aWins: 0, bWins: 0 });
  });

  it('computes first player advantage', () => {
    expect(firstPlayerAdvantage(agg)).toEqual({ rate: 2 / 3, n: 3 });
    expect(firstPlayerAdvantage(emptyAgg())).toEqual({ rate: 0, n: 0 });
  });
});

describe('gamesOverTime', () => {
  it('fills gaps between months', () => {
    expect(gamesOverTime(agg)).toEqual([
      { yearMonth: '2025-01', games: 2 },
      { yearMonth: '2025-02', games: 0 },
      { yearMonth: '2025-03', games: 2 },
    ]);
  });

  it('crosses year boundaries and ignores malformed keys', () => {
    const a = aggregate([mkGame({ playedAt: new Date(2024, 10, 3) }), mkGame({ playedAt: new Date(2025, 1, 3) })]);
    a.byMonth['garbage'] = { games: 5 };
    expect(gamesOverTime(a).map((r) => r.yearMonth)).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
    expect(gamesOverTime(emptyAgg())).toEqual([]);
  });
});

describe('loser compiled', () => {
  it('averages and distributes', () => {
    expect(avgLoserCompiled(agg)).toBe(1.25);
    expect(loserCompiledDistribution(agg)).toEqual([
      { compiled: 0, games: 1, share: 0.25 },
      { compiled: 1, games: 1, share: 0.25 },
      { compiled: 2, games: 2, share: 0.5 },
    ]);
    expect(avgLoserCompiled(emptyAgg())).toBe(0);
  });

  it('ignores winner-only games', () => {
    const withUnknown = aggregate([...FIXTURE_GAMES, mkGame({ compileUnknown: true })]);
    expect(avgLoserCompiled(withUnknown)).toBe(1.25);
    expect(loserCompiledDistribution(withUnknown).map((d) => d.share)).toEqual([0.25, 0.25, 0.5]);
  });
});

describe('streaks / recentForm', () => {
  it('computes streaks in played order regardless of input order', () => {
    const shuffled = [FIXTURE_GAMES[3], FIXTURE_GAMES[0], FIXTURE_GAMES[2], FIXTURE_GAMES[1]];
    expect(streaks(shuffled, 'A')).toEqual({ current: 1, longestWin: 1, longestLoss: 1 });
    expect(streaks(shuffled, 'B')).toEqual({ current: -1, longestWin: 1, longestLoss: 1 });
    expect(streaks(shuffled, 'C')).toEqual({ current: -1, longestWin: 1, longestLoss: 1 });
    expect(streaks(shuffled, 'Z')).toEqual({ current: 0, longestWin: 0, longestLoss: 0 });
  });

  it('tracks longer runs', () => {
    const games = [
      mkGame({ playedAt: new Date(2025, 0, 1), winner: 'p2' }),
      mkGame({ playedAt: new Date(2025, 0, 2), winner: 'p2' }),
      mkGame({ playedAt: new Date(2025, 0, 3), winner: 'p2' }),
      mkGame({ playedAt: new Date(2025, 0, 4), winner: 'p1' }),
      mkGame({ playedAt: new Date(2025, 0, 5), winner: 'p1' }),
    ];
    expect(streaks(games, 'A')).toEqual({ current: 2, longestWin: 2, longestLoss: 3 });
    expect(streaks(games, 'B')).toEqual({ current: -2, longestWin: 3, longestLoss: 2 });
    expect(recentForm(games, 'A')).toEqual(['L', 'L', 'L', 'W', 'W']);
    expect(recentForm(games, 'B', 2)).toEqual(['L', 'L']);
  });

  it('recentForm returns most recent last', () => {
    expect(recentForm(FIXTURE_GAMES, 'A')).toEqual(['W', 'L', 'W']);
    expect(recentForm(FIXTURE_GAMES, 'A', 2)).toEqual(['L', 'W']);
    expect(recentForm(FIXTURE_GAMES, 'Z')).toEqual([]);
  });
});
