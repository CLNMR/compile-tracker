import type { Timestamp } from 'firebase/firestore';

export type SetId = 'MN01' | 'MN02' | 'MN03' | 'AX01' | 'AX02' | 'AX03';
/** Lowercase slug from `src/data/protocols.ts`, e.g. `'fire'`. */
export type ProtocolId = string;
export type SideKey = 'p1' | 'p2';
export type Scope = 'mine' | 'all';

/** users/{uid} */
export interface UserDoc {
  enabledSets: SetId[];
  defaultPlayerId?: string;
}

/** users/{uid}/players/{playerId} — the auto-id is the pseudonym used in games. */
export interface Player {
  name: string;
  createdAt: Timestamp;
  archived: boolean;
}
export type PlayerDoc = Player & { id: string };

export interface GameSide {
  /** Opaque id into the owner's players subcollection. Never a name. */
  playerId: string;
  /** Exactly 3 distinct protocol ids, sorted. */
  protocols: ProtocolId[];
  /** Subset of `protocols`: 3 for the winner, 0–2 for the loser (empty when `compileUnknown`). */
  compiled: ProtocolId[];
}

/** games/{gameId} */
export interface Game {
  schemaVersion: 1;
  ownerUid: string;
  /** User-chosen date, client-set. Sort and group by this, never by createdAt. */
  playedAt: Timestamp;
  /** 'YYYY-MM' derived from playedAt. */
  yearMonth: string;
  p1: GameSide;
  p2: GameSide;
  winner: SideKey;
  firstPlayer?: SideKey;
  /**
   * Only the winner was recorded: the loser's compiled protocols are unknown (stored as empty).
   * Such games count for wins but are left out of every compile statistic.
   */
  compileUnknown?: true;
  /** Union of both sides, 6 sorted ids (for array-contains). */
  allProtocols: ProtocolId[];
  isTestData: boolean;
  /** serverTimestamp(); audit only. */
  createdAt: Timestamp;
}
export type GameDoc = Game & {
  id: string;
  /** Set on games another account recorded and offered to me, after I accepted them (remapped to my players). */
  sharedBy?: string;
};

/** profiles/{uid} — public handle of a non-anonymous account. */
export interface Profile {
  handle: string;
}

/** users/{uid}/friends/{friendUid} — mutual: both accounts hold a doc for each other. */
export interface Friend {
  since: Timestamp;
  /** My player that stands for this friend; games with this player are offered to them. */
  playerId?: string;
}
export type FriendDoc = Friend & { uid: string };

export type OfferStatus = 'pending' | 'accepted' | 'declined';

/** users/{recipientUid}/offers/{gameId} — a game the owner recorded with a player linked to the recipient. */
export interface Offer {
  ownerUid: string;
  /** The side that is the recipient. */
  friendSide: SideKey;
  /** The side that is the owner themselves (their "me" player), if they played. */
  ownerSide?: SideKey;
  status: OfferStatus;
  offeredAt: Timestamp;
}
export type OfferDoc = Offer & { gameId: string };

/** Handles: 3–20 chars, lowercase letters, digits, underscore. Keep in sync with firestore.rules. */
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

/** Synthetic player id for a friend account that I have not linked to one of my players. */
export const FRIEND_PLAYER_PREFIX = 'friend:';
export const friendPlayerId = (uid: string): string => `${FRIEND_PLAYER_PREFIX}${uid}`;
export const friendUidOf = (playerId: string): string | null =>
  playerId.startsWith(FRIEND_PLAYER_PREFIX) ? playerId.slice(FRIEND_PLAYER_PREFIX.length) : null;

/** What the UI hands to the repo when creating/updating a game. */
export interface GameInput {
  playedAt: Date;
  p1: GameSide;
  p2: GameSide;
  winner: SideKey;
  firstPlayer?: SideKey;
  /** Winner only: `compiled` is ignored (winner = all 3, loser = unknown). */
  compileUnknown?: boolean;
  isTestData?: boolean;
}

export const otherSide = (s: SideKey): SideKey => (s === 'p1' ? 'p2' : 'p1');

/** Derive the winner from compiled counts; null if not exactly one side has 3. */
export function deriveWinner(p1: Pick<GameSide, 'compiled'>, p2: Pick<GameSide, 'compiled'>): SideKey | null {
  const a = p1.compiled.length === 3;
  const b = p2.compiled.length === 3;
  if (a && !b) return 'p1';
  if (b && !a) return 'p2';
  return null;
}

/** Whether a game's compiled protocols can be used for compile statistics. */
export const compileKnown = (g: Pick<Game, 'compileUnknown'>): boolean => g.compileUnknown !== true;

export function yearMonthOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Fixed side ids for games recorded while anonymous (no players chosen).
 * They are shared by every guest, so stats never treat them as real players.
 */
export const GUEST_PLAYER_IDS = { p1: 'alpha', p2: 'beta' } as const satisfies Record<SideKey, string>;
const GUEST_NAMES: Record<string, string> = { alpha: 'Alpha', beta: 'Beta' };

export const isGuestPlayer = (playerId: string): boolean => playerId in GUEST_NAMES;

/** Short pseudonymous label shown in "All" scope; guest sides keep their fixed names. */
export function pseudonym(playerId: string): string {
  return GUEST_NAMES[playerId] ?? `P-${playerId.slice(0, 4).toUpperCase()}`;
}
