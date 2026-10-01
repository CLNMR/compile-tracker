import { useMemo } from 'react';
import { useGamesStore } from '@/store/gamesStore';
import { useAuthStore } from '@/store/authStore';
import type { GameDoc, Scope } from '@/types';

/** All games (store) narrowed to the requested scope. Stable array reference per (games, scope). */
export function useGames(scope: Scope): { games: GameDoc[]; loading: boolean; fromCache: boolean; error: string | null } {
  const { games, loading, fromCache, error } = useGamesStore();
  const uid = useAuthStore((s) => s.uid);
  const scoped = useMemo(() => (scope === 'all' ? games : games.filter((g) => g.ownerUid === uid)), [games, scope, uid]);
  return { games: scoped, loading, fromCache, error };
}

export function useGame(id: string | undefined): GameDoc | undefined {
  const games = useGamesStore((s) => s.games);
  return useMemo(() => (id ? games.find((g) => g.id === id) : undefined), [games, id]);
}
