import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { subscribeOffers } from '@/repo/offers';
import type { OfferDoc } from '@/types';

/** Games other accounts offered to me, keyed by game id. Only runs for Google-linked accounts. */
interface OffersState {
  offers: Map<string, OfferDoc>;
  loading: boolean;
  error: string | null;
  start: (uid: string) => void;
  stop: () => void;
}

let unsub: Unsubscribe | null = null;
let currentUid: string | null = null;

export const useOffersStore = create<OffersState>((set) => ({
  offers: new Map(),
  loading: true,
  error: null,

  start: (uid) => {
    if (unsub && currentUid === uid) return;
    unsub?.();
    currentUid = uid;
    set({ loading: true, error: null });
    unsub = subscribeOffers(
      uid,
      (offers) => set({ offers: new Map(offers.map((o) => [o.gameId, o])), loading: false, error: null }),
      (e) => set({ error: e.message, loading: false }),
    );
  },

  stop: () => {
    unsub?.();
    unsub = null;
    currentUid = null;
    set({ offers: new Map(), loading: true });
  },
}));
