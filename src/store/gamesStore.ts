import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { subscribeGames } from '@/repo/games';
import type { GameDoc } from '@/types';

/**
 * One live subscription over ALL games. The array reference changes only when a
 * snapshot arrives, which is what `useStats` keys its memoisation on.
 */
interface GamesState {
  games: GameDoc[];
  loading: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  /** True once at least one snapshot (cache or server) arrived. */
  ready: boolean;
  error: string | null;
  start: (uid: string) => void;
  stop: () => void;
}

let unsub: Unsubscribe | null = null;
let currentUid: string | null = null;

export const useGamesStore = create<GamesState>((set) => ({
  games: [],
  loading: true,
  fromCache: true,
  hasPendingWrites: false,
  ready: false,
  error: null,

  start: (uid) => {
    if (unsub && currentUid === uid) return;
    unsub?.();
    currentUid = uid;
    set({ loading: true, error: null });
    unsub = subscribeGames(
      'all',
      uid,
      (games, meta) =>
        set({
          games,
          fromCache: meta.fromCache,
          hasPendingWrites: meta.hasPendingWrites,
          ready: true,
          // Treat the first cache-only snapshot as still loading until a server snapshot arrives.
          loading: meta.fromCache && games.length === 0,
          error: null,
        }),
      (e) => set({ error: e.message, loading: false }),
    );
  },

  stop: () => {
    unsub?.();
    unsub = null;
    currentUid = null;
    set({ games: [], loading: true, ready: false });
  },
}));
