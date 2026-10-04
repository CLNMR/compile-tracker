import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { ensureFriendPlayer, fetchProfile, subscribeFriends, subscribeProfile } from '@/repo/friends';
import type { FriendDoc } from '@/types';

/** My handle and friends (with their handles). Only runs for real accounts (Google or confirmed email). */
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
/** Friends whose player is being created right now (snapshots arrive while the batch is in flight). */
const ensuring = new Set<string>();

/** Every friend is one of my players; friends who added me (or older friendships) get `@handle` created and linked. */
function ensurePlayers(uid: string, friends: readonly FriendDoc[], handles: Record<string, string>) {
  for (const f of friends) {
    const handle = handles[f.uid];
    if (f.playerId || !handle || ensuring.has(f.uid)) continue;
    ensuring.add(f.uid);
    ensureFriendPlayer(uid, f.uid, handle)
      .catch((e: unknown) => console.warn('[friends] could not create a player for a friend', e))
      .finally(() => ensuring.delete(f.uid));
  }
}

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
          ensurePlayers(uid, friends, get().handles);
          for (const f of friends) {
            if (get().handles[f.uid]) continue;
            fetchProfile(f.uid)
              .then((p) => {
                if (!p || currentUid !== uid) return;
                set((st) => ({ handles: { ...st.handles, [f.uid]: p.handle } }));
                ensurePlayers(uid, get().friends, get().handles);
              })
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
