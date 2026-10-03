import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/app';
import { offerConverter } from '@/firebase/converters';
import type { FriendDoc, GameSide, OfferDoc, OfferStatus, SideKey } from '@/types';

const offerRef = (recipientUid: string, gameId: string) => doc(db, 'users', recipientUid, 'offers', gameId);

/** The parts of a game that decide who it is offered to. */
export interface OfferableGame {
  p1: Pick<GameSide, 'playerId'>;
  p2: Pick<GameSide, 'playerId'>;
  isTestData?: boolean;
}

export interface OfferTarget {
  friendUid: string;
  friendSide: SideKey;
  ownerSide?: SideKey;
}

/** Friends a game is offered to: one per side whose player is linked to a friend. Pure. */
export function offerTargets(game: OfferableGame, friends: readonly FriendDoc[], selfPlayerId?: string): OfferTarget[] {
  if (game.isTestData) return [];
  const sides: SideKey[] = ['p1', 'p2'];
  const ownerSide = sides.find((k) => selfPlayerId && game[k].playerId === selfPlayerId);
  const out: OfferTarget[] = [];
  for (const k of sides) {
    const friend = friends.find((f) => f.playerId && f.playerId === game[k].playerId);
    if (!friend) continue;
    out.push(ownerSide && ownerSide !== k ? { friendUid: friend.uid, friendSide: k, ownerSide } : { friendUid: friend.uid, friendSide: k });
  }
  return out;
}

function putOffer(batch: WriteBatch, ownerUid: string, gameId: string, target: OfferTarget, exists: boolean) {
  const ref = offerRef(target.friendUid, gameId);
  if (exists) {
    // Keep the recipient's decision; only the sides may change.
    batch.update(ref, { friendSide: target.friendSide, ownerSide: target.ownerSide ?? deleteField() });
  } else {
    batch.set(ref, {
      ownerUid,
      friendSide: target.friendSide,
      ...(target.ownerSide ? { ownerSide: target.ownerSide } : {}),
      status: 'pending',
      offeredAt: serverTimestamp(),
    });
  }
}

/**
 * After a game was created or edited: offer it to every linked friend on it, update existing offers,
 * and withdraw offers to friends no longer on it. Returns the number of friends it is offered to.
 */
export async function syncGameOffers(
  ownerUid: string,
  gameId: string,
  game: OfferableGame,
  friends: readonly FriendDoc[],
  selfPlayerId?: string,
): Promise<number> {
  if (friends.length === 0) return 0;
  const targets = offerTargets(game, friends, selfPlayerId);
  const existing = await Promise.all(
    friends.map(async (f) => {
      const snap = await getDoc(offerRef(f.uid, gameId));
      return snap.exists() && (snap.data() as { ownerUid?: string }).ownerUid === ownerUid;
    }),
  );
  const batch = writeBatch(db);
  let writes = 0;
  friends.forEach((f, i) => {
    const target = targets.find((t) => t.friendUid === f.uid);
    if (target) putOffer(batch, ownerUid, gameId, target, existing[i]);
    else if (existing[i]) batch.delete(offerRef(f.uid, gameId));
    else return;
    writes++;
  });
  if (writes > 0) await batch.commit();
  return targets.length;
}

/** Before deleting a game: remove its offers from my friends' inboxes. */
export async function withdrawGameOffers(ownerUid: string, gameId: string, friends: readonly FriendDoc[]): Promise<void> {
  await syncGameOffers(ownerUid, gameId, { p1: { playerId: '' }, p2: { playerId: '' }, isTestData: true }, friends);
}

/** Offers I already sent to `friendUid`, keyed by game id. */
async function sentOffers(ownerUid: string, friendUid: string): Promise<Map<string, OfferDoc>> {
  const snap = await getDocs(query(collection(db, 'users', friendUid, 'offers').withConverter(offerConverter), where('ownerUid', '==', ownerUid)));
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

export interface GameRef extends OfferableGame {
  id: string;
}

/** After linking a friend to one of my players: offer all my games with that player. Returns how many were newly offered. */
export async function offerPastGames(
  ownerUid: string,
  friend: FriendDoc,
  myGames: readonly GameRef[],
  selfPlayerId?: string,
): Promise<number> {
  const sent = await sentOffers(ownerUid, friend.uid);
  const jobs = myGames
    .map((g) => ({ id: g.id, target: offerTargets(g, [friend], selfPlayerId)[0] }))
    .filter((j): j is { id: string; target: OfferTarget } => !!j.target);
  let added = 0;
  for (let i = 0; i < jobs.length; i += 400) {
    const batch = writeBatch(db);
    for (const { id, target } of jobs.slice(i, i + 400)) {
      putOffer(batch, ownerUid, id, target, sent.has(id));
      if (!sent.has(id)) added++;
    }
    await batch.commit();
  }
  return added;
}

/** After unlinking a friend's player: withdraw the offers they have not decided on yet. */
export async function withdrawPendingOffers(ownerUid: string, friendUid: string): Promise<number> {
  const sent = await sentOffers(ownerUid, friendUid);
  const pending = [...sent.values()].filter((o) => o.status === 'pending');
  for (let i = 0; i < pending.length; i += 400) {
    const batch = writeBatch(db);
    pending.slice(i, i + 400).forEach((o) => batch.delete(offerRef(friendUid, o.gameId)));
    await batch.commit();
  }
  return pending.length;
}

export function subscribeOffers(uid: string, onData: (offers: OfferDoc[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'offers').withConverter(offerConverter),
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError,
  );
}

export async function setOfferStatus(uid: string, gameIds: readonly string[], status: OfferStatus): Promise<void> {
  for (let i = 0; i < gameIds.length; i += 400) {
    const batch = writeBatch(db);
    gameIds.slice(i, i + 400).forEach((id) => batch.update(offerRef(uid, id), { status }));
    await batch.commit();
  }
}
