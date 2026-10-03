import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import type { FriendDoc, Game, GameDoc, GameSide, OfferDoc, Player, PlayerDoc, Profile, UserDoc } from '@/types';
import { DEFAULT_ENABLED_SETS } from '@/data/sets';

const snapshotOptions: SnapshotOptions = { serverTimestamps: 'estimate' };

function normalizeSide(raw: Partial<GameSide> | undefined): GameSide {
  return {
    playerId: String(raw?.playerId ?? ''),
    protocols: [...(raw?.protocols ?? [])].sort(),
    compiled: [...(raw?.compiled ?? [])].sort(),
  };
}

export const gameConverter: FirestoreDataConverter<GameDoc, DocumentData> = {
  toFirestore(game: GameDoc): DocumentData {
    // Strip the id; everything else is written as-is (repo builds a complete Game).
    const { id: _id, ...rest } = game;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): GameDoc {
    const d = snap.data(options ?? snapshotOptions) as Partial<Game>;
    const p1 = normalizeSide(d.p1);
    const p2 = normalizeSide(d.p2);
    const game: GameDoc = {
      id: snap.id,
      schemaVersion: 1,
      ownerUid: String(d.ownerUid ?? ''),
      playedAt: d.playedAt instanceof Timestamp ? d.playedAt : Timestamp.now(),
      yearMonth: String(d.yearMonth ?? ''),
      p1,
      p2,
      winner: d.winner === 'p2' ? 'p2' : 'p1',
      firstPlayer: d.firstPlayer === 'p1' || d.firstPlayer === 'p2' ? d.firstPlayer : undefined,
      allProtocols: [...(d.allProtocols ?? [...p1.protocols, ...p2.protocols])].sort(),
      isTestData: Boolean(d.isTestData),
      createdAt: d.createdAt instanceof Timestamp ? d.createdAt : Timestamp.now(),
    };
    if (d.compileUnknown === true) game.compileUnknown = true;
    return game;
  },
};

export const playerConverter: FirestoreDataConverter<PlayerDoc, DocumentData> = {
  toFirestore(player: PlayerDoc): DocumentData {
    const { id: _id, ...rest } = player;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): PlayerDoc {
    const d = snap.data(options ?? snapshotOptions) as Partial<Player>;
    return {
      id: snap.id,
      name: String(d.name ?? ''),
      createdAt: d.createdAt instanceof Timestamp ? d.createdAt : Timestamp.now(),
      archived: Boolean(d.archived),
    };
  },
};

export const userConverter: FirestoreDataConverter<UserDoc, DocumentData> = {
  toFirestore(u: UserDoc): DocumentData {
    return { ...u };
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): UserDoc {
    const d = snap.data(options ?? snapshotOptions) as Partial<UserDoc>;
    return {
      enabledSets: Array.isArray(d.enabledSets) && d.enabledSets.length ? d.enabledSets : [...DEFAULT_ENABLED_SETS],
      defaultPlayerId: typeof d.defaultPlayerId === 'string' ? d.defaultPlayerId : undefined,
    };
  },
};

export const profileConverter: FirestoreDataConverter<Profile, DocumentData> = {
  toFirestore(p: Profile): DocumentData {
    return { handle: p.handle };
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): Profile {
    const d = snap.data(options ?? snapshotOptions) as Partial<Profile>;
    return { handle: String(d.handle ?? '') };
  },
};

export const friendConverter: FirestoreDataConverter<FriendDoc, DocumentData> = {
  toFirestore(f: FriendDoc): DocumentData {
    const { uid: _uid, ...rest } = f;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): FriendDoc {
    const d = snap.data(options ?? snapshotOptions) as Record<string, unknown>;
    const friend: FriendDoc = { uid: snap.id, since: d.since instanceof Timestamp ? d.since : Timestamp.now() };
    if (typeof d.playerId === 'string' && d.playerId) friend.playerId = d.playerId;
    return friend;
  },
};

export const offerConverter: FirestoreDataConverter<OfferDoc, DocumentData> = {
  toFirestore(o: OfferDoc): DocumentData {
    const { gameId: _id, ...rest } = o;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): OfferDoc {
    const d = snap.data(options ?? snapshotOptions) as Record<string, unknown>;
    const offer: OfferDoc = {
      gameId: snap.id,
      ownerUid: String(d.ownerUid ?? ''),
      friendSide: d.friendSide === 'p2' ? 'p2' : 'p1',
      status: d.status === 'accepted' || d.status === 'declined' ? d.status : 'pending',
      offeredAt: d.offeredAt instanceof Timestamp ? d.offeredAt : Timestamp.now(),
    };
    if (d.ownerSide === 'p1' || d.ownerSide === 'p2') offer.ownerSide = d.ownerSide;
    return offer;
  },
};
