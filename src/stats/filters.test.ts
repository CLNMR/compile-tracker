import { describe, expect, it } from 'vitest';
import { filterGames, filterKey, type StatsFilter } from './filters';
import { FIXTURE_GAMES, mkGame } from '@/test/fixtures';

const base: StatsFilter = { scope: 'all', myUid: 'u1' };
const idsOf = (f: StatsFilter, games = FIXTURE_GAMES) => filterGames(games, f).map((g) => g.id);

describe('filterGames', () => {
  it('returns everything for the plain "all" scope', () => {
    expect(idsOf(base)).toEqual(['G1', 'G2', 'G3', 'G4']);
  });

  it('scope "mine" narrows to the owner', () => {
    expect(idsOf({ ...base, scope: 'mine' })).toEqual(['G1', 'G2', 'G4']);
    expect(idsOf({ ...base, scope: 'mine', myUid: 'u2' })).toEqual(['G3']);
    expect(idsOf({ ...base, scope: 'mine', myUid: 'nobody' })).toEqual([]);
  });

  it('includes test data by default and excludes it on request', () => {
    expect(idsOf({ ...base, includeTestData: true })).toHaveLength(4);
    expect(idsOf({ ...base, includeTestData: false })).toEqual(['G1', 'G2', 'G4']);
  });

  it('filters by date range inclusively (whole days)', () => {
    expect(idsOf({ ...base, from: new Date(2025, 0, 20) })).toEqual(['G2', 'G3', 'G4']);
    expect(idsOf({ ...base, to: new Date(2025, 0, 20) })).toEqual(['G1', 'G2']);
    // `to` covers the whole day even when given a midnight date; `from` starts at midnight.
    expect(idsOf({ ...base, from: new Date(2025, 0, 10, 23, 59), to: new Date(2025, 0, 10, 0, 0) })).toEqual(['G1']);
    expect(idsOf({ ...base, from: new Date(2025, 1, 1), to: new Date(2025, 1, 28) })).toEqual([]);
  });

  it('filters by player and protocol', () => {
    expect(idsOf({ ...base, playerId: 'C' })).toEqual(['G3', 'G4']);
    expect(idsOf({ ...base, playerId: 'A' })).toEqual(['G1', 'G2', 'G4']);
    expect(idsOf({ ...base, playerId: 'Z' })).toEqual([]);
    expect(idsOf({ ...base, protocolId: 'speed' })).toEqual(['G2', 'G4']);
    expect(idsOf({ ...base, protocolId: 'light' })).toEqual(['G2']);
    expect(idsOf({ ...base, protocolId: 'chaos' })).toEqual([]);
  });

  it('filters by sets with "any" and "only"', () => {
    const games = [
      ...FIXTURE_GAMES,
      mkGame({ id: 'MIX', p1: { protocols: ['chaos', 'fire', 'love'] }, p2: { protocols: ['ice', 'death', 'hate'] } }),
      mkGame({ id: 'M2', p1: { protocols: ['chaos', 'clarity', 'courage'] }, p2: { protocols: ['ice', 'fear', 'luck'] } }),
    ];
    expect(idsOf({ ...base, sets: ['MN01'] }, games)).toEqual(['G1', 'G2', 'G3', 'G4', 'MIX']);
    expect(idsOf({ ...base, sets: ['MN01'], setMode: 'only' }, games)).toEqual(['G1', 'G2', 'G3', 'G4']);
    expect(idsOf({ ...base, sets: ['MN02'], setMode: 'any' }, games)).toEqual(['MIX', 'M2']);
    expect(idsOf({ ...base, sets: ['MN02'], setMode: 'only' }, games)).toEqual(['M2']);
    expect(idsOf({ ...base, sets: ['MN02', 'AX01'], setMode: 'only' }, games)).toEqual(['M2']);
    expect(idsOf({ ...base, sets: ['MN01', 'MN02', 'AX01'], setMode: 'only' }, games)).toHaveLength(6);
    expect(idsOf({ ...base, sets: ['AX03'] }, games)).toEqual([]);
    // Empty set list = no set filter.
    expect(idsOf({ ...base, sets: [] }, games)).toHaveLength(6);
  });

  it('treats unknown protocol ids as belonging to no set', () => {
    const weird = mkGame({ id: 'W', p1: { protocols: ['zzz', 'fire', 'water'] } });
    expect(idsOf({ ...base, sets: ['MN01'], setMode: 'only' }, [weird])).toEqual([]);
    expect(idsOf({ ...base, sets: ['MN01'], setMode: 'any' }, [weird])).toEqual(['W']);
  });

  it('combines flags', () => {
    expect(idsOf({ ...base, scope: 'mine', playerId: 'C', protocolId: 'fire', includeTestData: false })).toEqual(['G4']);
  });

  it('does not mutate the input', () => {
    const copy = [...FIXTURE_GAMES];
    filterGames(copy, { ...base, scope: 'mine' });
    expect(copy).toEqual(FIXTURE_GAMES);
  });
});

describe('filterKey', () => {
  it('is stable for equal filters and differs when semantics differ', () => {
    const a: StatsFilter = { ...base, sets: ['MN02', 'MN01'], from: new Date(2025, 0, 10, 8), includeTestData: true };
    const b: StatsFilter = { ...base, sets: ['MN01', 'MN02'], from: new Date(2025, 0, 10, 22), setMode: 'any' };
    expect(filterKey(a)).toBe(filterKey(b));
    expect(filterKey({ ...a, scope: 'mine' })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, setMode: 'only' })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, includeTestData: false })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, from: new Date(2025, 0, 11) })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, to: new Date(2025, 0, 11) })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, playerId: 'A' })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, protocolId: 'fire' })).not.toBe(filterKey(a));
    expect(filterKey({ ...a, myUid: 'x' })).not.toBe(filterKey(a));
    expect(filterKey({ ...base, sets: [] })).toBe(filterKey(base));
  });
});
