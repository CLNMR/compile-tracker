import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Keep the Firebase SDK out of the test process; the store module imports the repo which imports the app.
vi.mock('@/firebase/app', () => ({ app: {}, auth: {}, db: {}, useEmulators: false, ADMIN_UIDS: [] }));

import { useGamesStore } from '@/store/gamesStore';
import { computeStats, useStats } from './useStats';
import type { StatsFilter } from './filters';
import { FIXTURE_GAMES } from '@/test/fixtures';

const base: StatsFilter = { scope: 'all', myUid: 'u1' };

describe('computeStats', () => {
  it('caches per array reference and filter key', () => {
    const arr = [...FIXTURE_GAMES];
    const a = computeStats(arr, base);
    const b = computeStats(arr, { ...base, sets: [] });
    expect(b).toBe(a);
    expect(a.agg.games).toBe(4);
    const mine = computeStats(arr, { ...base, scope: 'mine' });
    expect(mine).not.toBe(a);
    expect(mine.games.map((g) => g.id)).toEqual(['G1', 'G2', 'G4']);
    expect(mine.agg.games).toBe(3);
    // A new array (even with equal content) recomputes.
    expect(computeStats([...FIXTURE_GAMES], base)).not.toBe(a);
  });
});

describe('useStats', () => {
  beforeEach(() => {
    useGamesStore.setState({ games: [...FIXTURE_GAMES], loading: false, fromCache: false, ready: true });
  });

  it('returns filtered games and aggregate from the store', () => {
    const { result } = renderHook(() => useStats({ ...base, scope: 'mine' }));
    expect(result.current.loading).toBe(false);
    expect(result.current.fromCache).toBe(false);
    expect(result.current.games.map((g) => g.id)).toEqual(['G1', 'G2', 'G4']);
    expect(result.current.agg.games).toBe(3);
  });

  it('memoises on the games array reference and filter key', () => {
    const { result, rerender } = renderHook((f: StatsFilter) => useStats(f), { initialProps: base });
    const first = result.current;
    rerender({ ...base }); // new object, same semantics
    expect(result.current.agg).toBe(first.agg);
    expect(result.current.games).toBe(first.games);

    rerender({ ...base, playerId: 'C' });
    expect(result.current.agg).not.toBe(first.agg);
    expect(result.current.agg.games).toBe(2);

    act(() => useGamesStore.setState({ games: [...FIXTURE_GAMES.slice(0, 1)], loading: true, fromCache: true }));
    expect(result.current.agg.games).toBe(0); // C is not in G1
    expect(result.current.loading).toBe(true);
    expect(result.current.fromCache).toBe(true);
  });
});
