import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/app';
import { gameConverter } from '@/firebase/converters';
import { yearMonthOf, type Game, type GameDoc, type GameInput, type GameSide, type SideKey } from '@/types';
import { isKnownProtocol } from '@/data/protocols';

export const gamesCol = () => collection(db, 'games').withConverter(gameConverter);

export interface SnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export type InvalidGameCode =
  | 'protocolCount'
  | 'protocolsDistinct'
  | 'unknownProtocol'
  | 'compiledSubset'
  | 'playerMissing'
  | 'samePlayer'
  | 'sixDistinct'
  | 'winnerIncomplete'
  | 'loserComplete';

/**
 * Thrown before hitting Firestore so the UI gets a readable message.
 * `code` + `params` let the UI render a localized text (`games.errors.<code>`); `message` is the English fallback.
 */
export class InvalidGameError extends Error {
  constructor(
    public readonly code: InvalidGameCode,
    message: string,
    public readonly params: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = 'InvalidGameError';
  }
}

function assertSide(side: GameSide, key: SideKey) {
  const label = key === 'p1' ? 'Player 1' : 'Player 2';
  const params = { side: key };
  if (side.protocols.length !== 3) throw new InvalidGameError('protocolCount', `${label}: exactly 3 protocols required`, params);
  if (new Set(side.protocols).size !== 3) throw new InvalidGameError('protocolsDistinct', `${label}: protocols must be distinct`, params);
  for (const p of side.protocols) if (!isKnownProtocol(p)) throw new InvalidGameError('unknownProtocol', `${label}: unknown protocol ${p}`, { ...params, protocol: p });
  for (const c of side.compiled) if (!side.protocols.includes(c)) throw new InvalidGameError('compiledSubset', `${label}: compiled must be a subset of protocols`, params);
  if (!side.playerId) throw new InvalidGameError('playerMissing', `${label}: player missing`, params);
}

/** Build a complete, rule-valid Game from UI input. Pure — exported for tests and the generator. */
export function buildGame(ownerUid: string, input: GameInput, createdAt: Timestamp | ReturnType<typeof serverTimestamp>): Omit<Game, 'createdAt'> & { createdAt: unknown } {
  const unknown = Boolean(input.compileUnknown);
  // Winner only: the winner compiled all 3 by definition, the loser's progress is not recorded.
  const compiledOf = (side: GameSide, key: SideKey) => (!unknown ? side.compiled : key === input.winner ? side.protocols : []);
  const p1: GameSide = { playerId: input.p1.playerId, protocols: [...input.p1.protocols].sort(), compiled: [...compiledOf(input.p1, 'p1')].sort() };
  const p2: GameSide = { playerId: input.p2.playerId, protocols: [...input.p2.protocols].sort(), compiled: [...compiledOf(input.p2, 'p2')].sort() };
  assertSide(p1, 'p1');
  assertSide(p2, 'p2');
  if (p1.playerId === p2.playerId) throw new InvalidGameError('samePlayer', 'A player cannot face themselves');
  const all = [...p1.protocols, ...p2.protocols].sort();
  if (new Set(all).size !== 6) throw new InvalidGameError('sixDistinct', 'Both sides must use 6 distinct protocols');
  const winner = input.winner;
  const loser = winner === 'p1' ? p2 : p1;
  const win = winner === 'p1' ? p1 : p2;
  if (win.compiled.length !== 3) throw new InvalidGameError('winnerIncomplete', 'The winner must have compiled all 3 protocols');
  if (loser.compiled.length >= 3) throw new InvalidGameError('loserComplete', 'The loser cannot have compiled all 3 protocols');

  const game: Omit<Game, 'createdAt'> & { createdAt: unknown } = {
    schemaVersion: 1,
    ownerUid,
    playedAt: Timestamp.fromDate(input.playedAt),
    yearMonth: yearMonthOf(input.playedAt),
    p1,
    p2,
    winner,
    allProtocols: all,
    isTestData: Boolean(input.isTestData),
    createdAt,
  };
  if (input.firstPlayer) game.firstPlayer = input.firstPlayer;
  if (unknown) game.compileUnknown = true;
  return game;
}

export async function createGame(ownerUid: string, input: GameInput): Promise<string> {
  const data = buildGame(ownerUid, input, serverTimestamp());
  // Bypass the converter for the write: `createdAt` is a FieldValue here.
  const ref = await addDoc(collection(db, 'games'), data);
  return ref.id;
}

export async function updateGame(ownerUid: string, id: string, input: GameInput, createdAt: Timestamp): Promise<void> {
  const data = buildGame(ownerUid, input, createdAt);
  await setDoc(doc(db, 'games', id), data);
}

export async function deleteGame(id: string): Promise<void> {
  await deleteDoc(doc(db, 'games', id));
}

export type Scope = 'mine' | 'all';

/**
 * Single live subscription over games. `scope: 'all'` reads the whole collection (stats);
 * `scope: 'mine'` narrows server-side (cheaper when only own games are needed).
 */
export function subscribeGames(
  scope: Scope,
  uid: string,
  onData: (games: GameDoc[], meta: SnapshotMeta) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const constraints: QueryConstraint[] = scope === 'mine' ? [where('ownerUid', '==', uid)] : [];
  const q = query(gamesCol(), ...constraints, orderBy('playedAt', 'desc'));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => d.data()), { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites }),
    onError,
  );
}

/** Batched delete of everything matching the constraints. Returns the count deleted. */
export async function deleteGamesWhere(
  constraints: QueryConstraint[],
  onProgress?: (deleted: number) => void,
): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(collection(db, 'games'), ...constraints, limit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    onProgress?.(deleted);
    if (snap.size < 400) break;
  }
  return deleted;
}

export const deleteMyGames = (uid: string, onProgress?: (n: number) => void) =>
  deleteGamesWhere([where('ownerUid', '==', uid)], onProgress);

export const deleteMyTestGames = (uid: string, onProgress?: (n: number) => void) =>
  deleteGamesWhere([where('ownerUid', '==', uid), where('isTestData', '==', true)], onProgress);

export const deleteAllTestGames = (onProgress?: (n: number) => void) =>
  deleteGamesWhere([where('isTestData', '==', true)], onProgress);

/** Write many prepared games (from the generator) in batches of 400. */
export async function writeGamesBatch(
  ownerUid: string,
  inputs: GameInput[],
  onProgress?: (written: number) => void,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < inputs.length; i += 400) {
    const batch = writeBatch(db);
    for (const input of inputs.slice(i, i + 400)) {
      const ref = doc(collection(db, 'games'));
      batch.set(ref, buildGame(ownerUid, input, serverTimestamp()));
    }
    await batch.commit();
    written = Math.min(inputs.length, i + 400);
    onProgress?.(written);
  }
  return written;
}
