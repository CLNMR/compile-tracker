import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FB_API_KEY as string,
  authDomain: env.VITE_FB_AUTH_DOMAIN as string,
  projectId: env.VITE_FB_PROJECT_ID as string,
  storageBucket: env.VITE_FB_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FB_APP_ID as string,
  measurementId: (env.VITE_FB_MEASUREMENT_ID as string | undefined) || undefined,
};

export const useEmulators = String(env.VITE_USE_EMULATORS) === 'true';

export const ADMIN_UIDS: readonly string[] = String(env.VITE_ADMIN_UIDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function createDb(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    // Safari private mode / blocked IndexedDB → fall back to memory cache.
    console.warn('[firestore] persistent cache unavailable, using memory cache', e);
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}

export const db = createDb();

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
