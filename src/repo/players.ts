import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/app';
import { playerConverter } from '@/firebase/converters';
import type { PlayerDoc } from '@/types';

export const playersCol = (uid: string) => collection(db, 'users', uid, 'players').withConverter(playerConverter);

export function subscribePlayers(
  uid: string,
  onData: (players: PlayerDoc[], fromCache: boolean) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const q = query(playersCol(uid), orderBy('name'));
  return onSnapshot(q, { includeMetadataChanges: true }, (snap) => onData(snap.docs.map((d) => d.data()), snap.metadata.fromCache), onError);
}

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export async function createPlayer(uid: string, name: string): Promise<string> {
  const clean = normalizePlayerName(name);
  if (!clean) throw new Error('Player name is required');
  const ref = await addDoc(collection(db, 'users', uid, 'players'), {
    name: clean,
    createdAt: serverTimestamp(),
    archived: false,
  });
  return ref.id;
}

export async function renamePlayer(uid: string, id: string, name: string): Promise<void> {
  const clean = normalizePlayerName(name);
  if (!clean) throw new Error('Player name is required');
  await updateDoc(doc(db, 'users', uid, 'players', id), { name: clean });
}

export async function setPlayerArchived(uid: string, id: string, archived: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'players', id), { archived });
}

export async function deletePlayer(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'players', id));
}

export async function deleteAllPlayers(uid: string): Promise<number> {
  const snap = await getDocs(collection(db, 'users', uid, 'players'));
  let n = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
    n += Math.min(400, snap.docs.length - i);
  }
  return n;
}

/** Create several players at once (used by the test-data generator). Returns ids in input order. */
export async function createPlayers(uid: string, names: string[]): Promise<string[]> {
  const batch = writeBatch(db);
  const ids: string[] = [];
  for (const name of names) {
    const ref = doc(collection(db, 'users', uid, 'players'));
    batch.set(ref, { name: normalizePlayerName(name), createdAt: serverTimestamp(), archived: false });
    ids.push(ref.id);
  }
  await batch.commit();
  return ids;
}
