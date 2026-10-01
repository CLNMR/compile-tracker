import { create } from 'zustand';
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ADMIN_UIDS, auth } from '@/firebase/app';

export type LinkResult =
  | { ok: true }
  | { ok: false; reason: 'credential-already-in-use'; credential: unknown }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'error'; message: string };

interface AuthState {
  user: User | null;
  /** True until the first onAuthStateChanged + anonymous sign-in resolved. */
  loading: boolean;
  error: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
  uid: string | null;
  start: () => () => void;
  linkGoogle: () => Promise<LinkResult>;
  /** Used after `credential-already-in-use`: switch to the existing Google account (old anon data stays behind). */
  signInWithExistingGoogle: (credential: unknown) => Promise<void>;
  signOut: () => Promise<void>;
}

let started = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  isAnonymous: true,
  isAdmin: false,
  uid: null,

  start: () => {
    if (started) return () => {};
    started = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
          return; // next callback carries the user
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
          return;
        }
      }
      set({
        user,
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        isAdmin: ADMIN_UIDS.includes(user.uid),
        loading: false,
        error: null,
      });
    });
    return () => {
      started = false;
      unsub();
    };
  },

  linkGoogle: async () => {
    const user = get().user;
    if (!user) return { ok: false, reason: 'error', message: 'Not signed in' };
    try {
      const res = await linkWithPopup(user, new GoogleAuthProvider());
      set({ user: res.user, isAnonymous: res.user.isAnonymous });
      return { ok: true };
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/credential-already-in-use') {
          return { ok: false, reason: 'credential-already-in-use', credential: GoogleAuthProvider.credentialFromError(e) };
        }
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
          return { ok: false, reason: 'cancelled' };
        }
        return { ok: false, reason: 'error', message: e.message };
      }
      return { ok: false, reason: 'error', message: (e as Error).message };
    }
  },

  signInWithExistingGoogle: async (credential) => {
    if (!credential) throw new Error('No credential');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signInWithCredential(auth, credential as any);
  },

  signOut: async () => {
    await fbSignOut(auth); // onAuthStateChanged → new anonymous user
  },
}));
