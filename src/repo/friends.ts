import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/app';
import { friendConverter, profileConverter } from '@/firebase/converters';
import { HANDLE_RE, normalizeHandle, type FriendDoc, type Profile } from '@/types';

const profileRef = (uid: string) => doc(db, 'profiles', uid).withConverter(profileConverter);
const handleRef = (handle: string) => doc(db, 'handles', handle);
const friendRef = (uid: string, friendUid: string) => doc(db, 'users', uid, 'friends', friendUid);

export class HandleError extends Error {
  constructor(public readonly code: 'invalid' | 'taken' | 'notFound' | 'self') {
    super(code);
    this.name = 'HandleError';
  }
}

/** Suggest a handle from a display name or email: "Ada Lovelace" → "ada_lovelace". */
export function suggestHandle(source: string | null | undefined): string {
  const base = (source ?? '')
    .split('@')[0]
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : `player_${Math.random().toString(36).slice(2, 7)}`;
}

export function subscribeProfile(uid: string, onData: (p: Profile | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(profileRef(uid), (snap) => onData(snap.exists() ? snap.data() : null), onError);
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? snap.data() : null;
}

/** Uid owning `handle`, or null. */
export async function lookupHandle(raw: string): Promise<string | null> {
  const handle = normalizeHandle(raw);
  if (!HANDLE_RE.test(handle)) return null;
  const snap = await getDoc(handleRef(handle));
  const uid = snap.exists() ? (snap.data() as { uid?: unknown }).uid : null;
  return typeof uid === 'string' ? uid : null;
}

/** Claim a new handle (or change it): handles/{new}, profiles/{uid} and release the previous one, in one batch. */
export async function claimHandle(uid: string, raw: string, previous?: string): Promise<string> {
  const handle = normalizeHandle(raw);
  if (!HANDLE_RE.test(handle)) throw new HandleError('invalid');
  if (handle === previous) return handle;
  const owner = await lookupHandle(handle);
  if (owner && owner !== uid) throw new HandleError('taken');
  const batch = writeBatch(db);
  if (!owner) batch.set(handleRef(handle), { uid });
  batch.set(doc(db, 'profiles', uid), { handle });
  if (previous) batch.delete(handleRef(previous));
  await batch.commit();
  return handle;
}

export function subscribeFriends(uid: string, onData: (friends: FriendDoc[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'friends').withConverter(friendConverter),
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError,
  );
}

/** Mutual add: my doc (optionally linked to one of my players) and the mirror doc in their account. */
export async function addFriend(myUid: string, friendUid: string, playerId?: string): Promise<void> {
  if (friendUid === myUid) throw new HandleError('self');
  const batch = writeBatch(db);
  batch.set(friendRef(myUid, friendUid), playerId ? { since: serverTimestamp(), playerId } : { since: serverTimestamp() });
  // merge: re-adding keeps the player the other side linked to me
  batch.set(friendRef(friendUid, myUid), { since: serverTimestamp() }, { merge: true });
  await batch.commit();
}

/** Removes the friendship on both sides. Games and accepted offers are kept. */
export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(friendRef(myUid, friendUid));
  batch.delete(friendRef(friendUid, myUid));
  await batch.commit();
}

export async function setFriendPlayer(myUid: string, friendUid: string, playerId: string | null): Promise<void> {
  await updateDoc(friendRef(myUid, friendUid), { playerId: playerId ?? deleteField() });
}
