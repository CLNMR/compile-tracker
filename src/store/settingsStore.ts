import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import { defaultUserDoc, saveUserSettings, subscribeUser } from '@/repo/users';
import type { SetId, UserDoc } from '@/types';

interface SettingsState extends UserDoc {
  loading: boolean;
  uid: string | null;
  start: (uid: string) => void;
  stop: () => void;
  setEnabledSets: (sets: SetId[]) => Promise<void>;
  setDefaultPlayerId: (id: string | undefined) => Promise<void>;
}

let unsub: Unsubscribe | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultUserDoc(),
  loading: true,
  uid: null,

  start: (uid) => {
    if (get().uid === uid && unsub) return;
    unsub?.();
    set({ uid, loading: true });
    unsub = subscribeUser(
      uid,
      (u) => set({ ...u, loading: false }),
      () => set({ loading: false }),
    );
  },

  stop: () => {
    unsub?.();
    unsub = null;
    set({ ...defaultUserDoc(), uid: null, loading: true });
  },

  setEnabledSets: async (sets) => {
    const uid = get().uid;
    if (!uid) return;
    const next = sets.length ? sets : get().enabledSets;
    set({ enabledSets: next }); // optimistic
    await saveUserSettings(uid, { enabledSets: next });
  },

  setDefaultPlayerId: async (id) => {
    const uid = get().uid;
    if (!uid) return;
    set({ defaultPlayerId: id });
    await saveUserSettings(uid, { defaultPlayerId: id });
  },
}));
