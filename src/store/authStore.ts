import { create } from 'zustand';
import {
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ADMIN_UIDS, auth } from '@/firebase/app';
import { t } from '@/i18n';

/** Raised when the Google account is already bound to another Compile Tracker identity. */
export interface SwitchRequest {
  /** Credential recovered from the error; null when Firebase didn't attach one (we then re-prompt). */
  credential: AuthCredential | null;
  email: string | null;
}

export type LinkResult =
  | { ok: true }
  | { ok: false; reason: 'switch-required'; request: SwitchRequest }
  | { ok: false; reason: 'redirecting' }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'error'; code: string; message: string };

interface AuthState {
  user: User | null;
  /** True until the first onAuthStateChanged + anonymous sign-in resolved. */
  loading: boolean;
  error: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
  uid: string | null;
  /** Set when linking hit `credential-already-in-use` (popup or redirect); Settings shows the switch dialog. */
  switchRequest: SwitchRequest | null;
  /** Result of a redirect-based link, surfaced after the page reloads. */
  redirectNotice: { tone: 'win' | 'loss'; title: string; description?: string } | null;
  start: () => () => void;
  linkGoogle: () => Promise<LinkResult>;
  /** Sign in with the Google account that already owns data. The current anonymous data stays under the old uid. */
  switchToExistingGoogle: () => Promise<void>;
  clearSwitchRequest: () => void;
  clearRedirectNotice: () => void;
  signOut: () => Promise<void>;
}

let started = false;

const provider = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

function describe(e: unknown): { code: string; message: string } {
  if (e instanceof FirebaseError) return { code: e.code, message: e.message.replace(/^Firebase:\s*/, '') };
  return { code: 'unknown', message: (e as Error)?.message ?? String(e) };
}

function switchRequestFrom(e: FirebaseError): SwitchRequest {
  const credential = GoogleAuthProvider.credentialFromError(e);
  const email = (e.customData as { email?: string } | undefined)?.email ?? null;
  return { credential, email };
}

/** Popups are unreliable in installed PWAs (notably iOS) — prefer redirect there. */
function prefersRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return standalone || ios;
}

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  isAnonymous: true,
  isAdmin: false,
  uid: null,
  switchRequest: null,
  redirectNotice: null,

  start: () => {
    if (started) return () => {};
    started = true;

    // Complete a pending redirect-based link (no-op when there is none).
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          set({ redirectNotice: { tone: 'win', title: t('auth.linked.title'), description: t('auth.linked.description') } });
        }
      })
      .catch((e: unknown) => {
        if (e instanceof FirebaseError && e.code === 'auth/credential-already-in-use') {
          set({ switchRequest: switchRequestFrom(e) });
          return;
        }
        const d = describe(e);
        console.error('[auth] redirect result failed', e);
        set({ redirectNotice: { tone: 'loss', title: t('auth.linkFailed.title'), description: `${d.message} (${d.code})` } });
      });

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
          return; // next callback carries the user
        } catch (e) {
          const d = describe(e);
          console.error('[auth] anonymous sign-in failed', e);
          set({ loading: false, error: `${d.message} (${d.code})` });
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
    if (!user) return { ok: false, reason: 'error', code: 'no-user', message: t('auth.notSignedIn') };

    if (prefersRedirect()) {
      try {
        await linkWithRedirect(user, provider());
        return { ok: false, reason: 'redirecting' };
      } catch (e) {
        const d = describe(e);
        console.error('[auth] linkWithRedirect failed', e);
        return { ok: false, reason: 'error', ...d };
      }
    }

    try {
      const res = await linkWithPopup(user, provider());
      set({ user: res.user, isAnonymous: res.user.isAnonymous });
      return { ok: true };
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/credential-already-in-use') {
          const request = switchRequestFrom(e);
          set({ switchRequest: request });
          return { ok: false, reason: 'switch-required', request };
        }
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request' || e.code === 'auth/user-cancelled') {
          return { ok: false, reason: 'cancelled' };
        }
        if (POPUP_FALLBACK_CODES.has(e.code)) {
          try {
            await linkWithRedirect(user, provider());
            return { ok: false, reason: 'redirecting' };
          } catch (e2) {
            const d = describe(e2);
            console.error('[auth] linkWithRedirect fallback failed', e2);
            return { ok: false, reason: 'error', ...d };
          }
        }
      }
      const d = describe(e);
      console.error('[auth] linkWithPopup failed', e);
      return { ok: false, reason: 'error', ...d };
    }
  },

  switchToExistingGoogle: async () => {
    const req = get().switchRequest;
    try {
      if (req?.credential) {
        await signInWithCredential(auth, req.credential);
      } else {
        // No reusable credential — ask Google again, pre-selecting the same account.
        const p = provider();
        if (req?.email) p.setCustomParameters({ login_hint: req.email, prompt: 'select_account' });
        await signInWithPopup(auth, p);
      }
      set({ switchRequest: null });
    } catch (e) {
      const d = describe(e);
      console.error('[auth] switch to existing Google account failed', e);
      throw new Error(`${d.message} (${d.code})`);
    }
  },

  clearSwitchRequest: () => set({ switchRequest: null }),
  clearRedirectNotice: () => set({ redirectNotice: null }),

  signOut: async () => {
    await fbSignOut(auth); // onAuthStateChanged → new anonymous user
  },
}));
