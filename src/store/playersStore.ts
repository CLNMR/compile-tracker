import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { subscribePlayers } from '@/repo/players';
import type { PlayerDoc } from '@/types';

interface PlayersState {
  players: PlayerDoc[];
  byId: Map<string, PlayerDoc>;
  loading: boolean;
  error: string | null;
  start: (uid: string) => void;
  stop: () => void;
}

let unsub: Unsubscribe | null = null;
let currentUid: string | null = null;

export const usePlayersStore = create<PlayersState>((set) => ({
  players: [],
  byId: new Map(),
  loading: true,
  error: null,

  start: (uid) => {
    if (unsub && currentUid === uid) return;
    unsub?.();
    currentUid = uid;
    set({ loading: true, error: null });
    unsub = subscribePlayers(
      uid,
      (players) => set({ players, byId: new Map(players.map((p) => [p.id, p])), loading: false, error: null }),
      (e) => set({ error: e.message, loading: false }),
    );
  },

  stop: () => {
    unsub?.();
    unsub = null;
    currentUid = null;
    set({ players: [], byId: new Map(), loading: true });
  },
}));
