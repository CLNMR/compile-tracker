import { useMemo } from 'react';
import { useGamesStore } from '@/store/gamesStore';
import type { GameDoc } from '@/types';
import { aggregate, type Agg } from './aggregate';
import { filterGames, filterKey, type StatsFilter } from './filters';

export interface StatsEntry {
  games: GameDoc[];
  agg: Agg;
}

export interface StatsResult extends StatsEntry {
  loading: boolean;
  fromCache: boolean;
}

/**
 * Per games-array cache of filtered games + aggregates, keyed by `filterKey`.
 * The store only replaces the array when a snapshot arrives, so entries are reused
 * across components and re-renders and die with the array.
 */
const cache = new WeakMap<GameDoc[], Map<string, StatsEntry>>();

/** Filter + aggregate with caching. Pure apart from the cache; exported for tests. */
export function computeStats(all: GameDoc[], filter: StatsFilter): StatsEntry {
  let perArray = cache.get(all);
  if (!perArray) {
    perArray = new Map();
    cache.set(all, perArray);
  }
  const key = filterKey(filter);
  let entry = perArray.get(key);
  if (!entry) {
    const games = filterGames(all, filter);
    entry = { games, agg: aggregate(games) };
    perArray.set(key, entry);
  }
  return entry;
}

export function useStats(filter: StatsFilter): StatsResult {
  const all = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.loading);
  const fromCache = useGamesStore((s) => s.fromCache);
  const key = filterKey(filter);
  // `key` fully captures `filter`'s semantics, so a new filter object with equal content is a cache hit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entry = useMemo(() => computeStats(all, filter), [all, key]);
  return { games: entry.games, agg: entry.agg, loading, fromCache };
}
