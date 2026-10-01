import { deleteDoc, doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/app';
import { userConverter } from '@/firebase/converters';
import { DEFAULT_ENABLED_SETS } from '@/data/sets';
import type { UserDoc } from '@/types';

export const userRef = (uid: string) => doc(db, 'users', uid).withConverter(userConverter);

export const defaultUserDoc = (): UserDoc => ({ enabledSets: [...DEFAULT_ENABLED_SETS] });

export function subscribeUser(uid: string, onData: (u: UserDoc) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? snap.data() : defaultUserDoc()),
    onError,
  );
}

export async function saveUserSettings(uid: string, patch: Partial<UserDoc>): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.enabledSets) clean.enabledSets = patch.enabledSets;
  if ('defaultPlayerId' in patch) clean.defaultPlayerId = patch.defaultPlayerId ?? null;
  await setDoc(doc(db, 'users', uid), clean, { merge: true });
}

export async function deleteUserSettings(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}
