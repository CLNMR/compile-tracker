import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { fetchProfile, subscribeFriends, subscribeProfile } from '@/repo/friends';
import type { FriendDoc } from '@/types';

/** My handle and friends (with their handles). Only runs for Google-linked accounts. */
interface FriendsState {
  /** My handle; null = not claimed yet. */
  handle: string | null;
  friends: FriendDoc[];
  /** friend uid → handle (loaded once per friend). */
  handles: Record<string, string>;
  loading: boolean;
  error: string | null;
  start: (uid: string) => void;
  stop: () => void;
}

let unsubs: Unsubscribe[] = [];
let currentUid: string | null = null;

export const useFriendsStore = create<FriendsState>((set, get) => ({
  handle: null,
  friends: [],
  handles: {},
  loading: true,
  error: null,

  start: (uid) => {
    if (currentUid === uid && unsubs.length) return;
    unsubs.forEach((u) => u());
    currentUid = uid;
    set({ loading: true, error: null });
    let gotProfile = false;
    let gotFriends = false;
    const done = () => gotProfile && gotFriends && set({ loading: false });
    const fail = (e: Error) => set({ error: e.message, loading: false });
    unsubs = [
      subscribeProfile(
        uid,
        (p) => {
          gotProfile = true;
          set({ handle: p?.handle ?? null });
          done();
        },
        fail,
      ),
      subscribeFriends(
        uid,
        (friends) => {
          gotFriends = true;
          set({ friends });
          done();
          for (const f of friends) {
            if (get().handles[f.uid]) continue;
            fetchProfile(f.uid)
              .then((p) => p && set((st) => ({ handles: { ...st.handles, [f.uid]: p.handle } })))
              .catch(() => {});
          }
        },
        fail,
      ),
    ];
  },

  stop: () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    currentUid = null;
    set({ handle: null, friends: [], handles: {}, loading: true, error: null });
  },
}));
