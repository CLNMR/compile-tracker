import { describe, expect, it } from 'vitest';
import { aggregate, emptyAgg, foldGame, h2hKey, mergeAgg, pairKey, tripleKey, vsKey } from './aggregate';
import { generateGames } from '@/devtools/generate';
import { FIXTURE_GAMES, docsFromInputs, mkGame } from '@/test/fixtures';

describe('key helpers', () => {
  it('sort their inputs', () => {
    expect(pairKey('water', 'fire')).toBe('fire+water');
    expect(pairKey('fire', 'water')).toBe('fire+water');
    expect(tripleKey('water', 'fire', 'life')).toBe('fire+life+water');
    expect(h2hKey('B', 'A')).toBe('A|B');
    expect(vsKey('speed', 'death')).toBe('death|speed');
  });
});

describe('aggregate', () => {
  const agg = aggregate(FIXTURE_GAMES);

  it('counts games and months', () => {
    expect(agg.games).toBe(4);
    expect(agg.byMonth).toEqual({ '2025-01': { games: 2 }, '2025-03': { games: 2 } });
  });

  it('aggregates protocols', () => {
    expect(agg.byProtocol.fire).toEqual({ decks: 4, wins: 3, compiled: 4, compiledAgainst: 6 });
    expect(agg.byProtocol.death).toEqual({ decks: 4, wins: 1, compiled: 3, compiledAgainst: 11 });
    expect(agg.byProtocol.gravity).toEqual({ decks: 2, wins: 0, compiled: 0, compiledAgainst: 6 });
    expect(agg.byProtocol.speed).toEqual({ decks: 2, wins: 1, compiled: 2, compiledAgainst: 5 });
    const totalDecks = Object.values(agg.byProtocol).reduce((s, p) => s + p.decks, 0);
    expect(totalDecks).toBe(agg.games * 6);
  });

  it('aggregates pairs and triples', () => {
    expect(agg.byPair['fire+water']).toEqual({ decks: 3, wins: 3 });
    expect(agg.byPair['fire+life']).toEqual({ decks: 2, wins: 2 });
    expect(agg.byPair['death+metal']).toEqual({ decks: 3, wins: 1 });
    expect(agg.byPair['fire+speed']).toEqual({ decks: 2, wins: 1 });
    expect(Object.keys(agg.byPair)).toHaveLength(15);
    expect(agg.byTriple['fire+life+water']).toEqual({ decks: 2, wins: 2 });
    expect(agg.byTriple['death+gravity+metal']).toEqual({ decks: 2, wins: 0 });
    expect(Object.keys(agg.byTriple)).toHaveLength(6);
  });

  it('aggregates players', () => {
    const a = agg.byPlayer.A;
    expect(a).toMatchObject({ games: 3, wins: 2, first: 1, firstWins: 1, compiledFor: 8, compiledAgainst: 6 });
    expect(a.lastPlayedMs).toBe(new Date(2025, 2, 15, 12).getTime());
    expect(a.protocolDecks).toEqual({
      fire: { decks: 3, wins: 2 },
      water: { decks: 2, wins: 2 },
      life: { decks: 1, wins: 1 },
      plague: { decks: 1, wins: 0 },
      speed: { decks: 2, wins: 1 },
    });
    expect(agg.byPlayer.B).toMatchObject({ games: 3, wins: 1, first: 2, firstWins: 1, compiledFor: 4, compiledAgainst: 8 });
    expect(agg.byPlayer.C).toMatchObject({ games: 2, wins: 1, first: 0, firstWins: 0, compiledFor: 5, compiledAgainst: 3 });
  });

  it('aggregates head-to-head and protocol matchups', () => {
    expect(agg.h2h['A|B']).toEqual({ games: 2, aWins: 1 });
    expect(agg.h2h['B|C']).toEqual({ games: 1, aWins: 0 });
    expect(agg.h2h['A|C']).toEqual({ games: 1, aWins: 1 });
    expect(agg.vsProtocol['death|fire']).toEqual({ games: 4, aWins: 1 });
    expect(agg.vsProtocol['fire|gravity']).toEqual({ games: 2, aWins: 2 });
    expect(agg.vsProtocol['fire|light']).toEqual({ games: 1, aWins: 0 });
    const total = Object.values(agg.vsProtocol).reduce((s, v) => s + v.games, 0);
    expect(total).toBe(agg.games * 9);
  });

  it('aggregates first player and loser compiled stats', () => {
    expect(agg.firstPlayerKnown).toBe(3);
    expect(agg.firstPlayerWins).toBe(2);
    expect(agg.loserCompiledSum).toBe(5);
    expect(agg.loserCompiledHist).toEqual([1, 1, 2]);
  });

  it('foldGame mutates and returns the accumulator', () => {
    const acc = emptyAgg();
    expect(foldGame(acc, mkGame())).toBe(acc);
    expect(acc.games).toBe(1);
  });

  it('clamps malformed loser compiled counts', () => {
    const bad = mkGame({ p2: { compiled: ['death', 'gravity', 'metal'] } });
    const acc = aggregate([bad]);
    expect(acc.loserCompiledHist).toEqual([0, 0, 1]);
  });

  it('handles an empty input', () => {
    expect(aggregate([])).toEqual(emptyAgg());
  });

  it('counts guest (Alpha/Beta) games for protocols but not for players or head-to-head', () => {
    const agg = aggregate([mkGame({ p1: { playerId: 'alpha' }, p2: { playerId: 'beta' }, firstPlayer: 'p1' })]);
    expect(agg.games).toBe(1);
    expect(agg.byProtocol.fire).toMatchObject({ decks: 1, wins: 1 });
    expect(agg.firstPlayerKnown).toBe(1);
    expect(agg.byPlayer).toEqual({});
    expect(agg.h2h).toEqual({});
  });
});

describe('mergeAgg', () => {
  const players = ['A', 'B', 'C', 'D'];
  const sets = ['MN01', 'MN02', 'AX01'] as const;

  it('identity: merging with an empty agg yields an equal agg', () => {
    const agg = aggregate(FIXTURE_GAMES);
    expect(mergeAgg(emptyAgg(), agg)).toEqual(agg);
    expect(mergeAgg(agg, emptyAgg())).toEqual(agg);
  });

  it('does not mutate its inputs', () => {
    const a = aggregate(FIXTURE_GAMES.slice(0, 2));
    const b = aggregate(FIXTURE_GAMES.slice(2));
    const snapA = JSON.stringify(a);
    const snapB = JSON.stringify(b);
    mergeAgg(a, b);
    expect(JSON.stringify(a)).toBe(snapA);
    expect(JSON.stringify(b)).toBe(snapB);
  });

  it.each([1, 2, 3, 4, 5])('property (seed %i): aggregate(A ++ B) equals mergeAgg(aggregate(A), aggregate(B))', (seed) => {
    const now = new Date(2026, 8, 30);
    const a = docsFromInputs(generateGames({ games: 40 + seed * 7, playerIds: players, enabledSets: [...sets], seed, now }), 'u1');
    const b = docsFromInputs(generateGames({ games: 25 + seed * 3, playerIds: players.slice(1), enabledSets: ['MN01'], seed: seed + 100, now }), 'u2');
    expect(mergeAgg(aggregate(a), aggregate(b))).toEqual(aggregate([...a, ...b]));
    // Merge is commutative as well.
    expect(mergeAgg(aggregate(b), aggregate(a))).toEqual(aggregate([...a, ...b]));
  });
});

describe('performance', () => {
  it('aggregates 3000 generated games quickly', () => {
    const inputs = generateGames({ games: 3000, playerIds: ['A', 'B', 'C', 'D', 'E', 'F'], enabledSets: ['MN01', 'MN02', 'MN03'], seed: 42 });
    const docs = docsFromInputs(inputs);
    aggregate(docs); // warm up
    const t0 = performance.now();
    const agg = aggregate(docs);
    const ms = performance.now() - t0;
    console.info(`aggregate(3000 games) took ${ms.toFixed(2)} ms`);
    expect(agg.games).toBe(3000);
    if (ms >= 100) console.warn(`aggregate(3000) slower than the 100 ms target: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(500);
  });
});
