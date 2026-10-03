import { friendPlayerId, type GameDoc, type GameSide, type OfferDoc } from '@/types';

export interface PerspectiveInput {
  /** All games (the store's array). */
  all: readonly GameDoc[];
  myUid: string;
  /** My offers inbox, keyed by game id. */
  offers: ReadonlyMap<string, OfferDoc>;
  /** friend uid → my player linked to that friend. */
  friendPlayers: ReadonlyMap<string, string>;
  /** My "me" player; the side offered to me becomes this player. */
  selfPlayerId?: string;
}

const withPlayer = (side: GameSide, playerId: string): GameSide => ({ ...side, playerId });

/**
 * A game another account recorded and I accepted, seen from my side: the side that is me becomes my "me"
 * player, the owner's side becomes my player linked to them (or a synthetic `friend:<uid>` id).
 * Any other side keeps the owner's opaque player id and shows as a pseudonym.
 */
export function remapOffered(game: GameDoc, offer: OfferDoc, myUid: string, friendPlayers: ReadonlyMap<string, string>, selfPlayerId?: string): GameDoc {
  const sides = { p1: game.p1, p2: game.p2 };
  sides[offer.friendSide] = withPlayer(sides[offer.friendSide], selfPlayerId ?? friendPlayerId(myUid));
  if (offer.ownerSide && offer.ownerSide !== offer.friendSide) {
    sides[offer.ownerSide] = withPlayer(sides[offer.ownerSide], friendPlayers.get(game.ownerUid) ?? friendPlayerId(game.ownerUid));
  }
  return { ...game, p1: sides.p1, p2: sides.p2, sharedBy: game.ownerUid };
}

/** My games plus accepted offers (remapped), in the order of `all` (newest first). */
export function myGames({ all, myUid, offers, friendPlayers, selfPlayerId }: PerspectiveInput): GameDoc[] {
  const out: GameDoc[] = [];
  for (const g of all) {
    if (g.ownerUid === myUid) {
      out.push(g);
      continue;
    }
    const offer = offers.get(g.id);
    if (offer && offer.status === 'accepted' && offer.ownerUid === g.ownerUid) {
      out.push(remapOffered(g, offer, myUid, friendPlayers, selfPlayerId));
    }
  }
  return out;
}
