import { useMemo } from 'react';
import { useGamesStore } from '@/store/gamesStore';
import { useFriendsStore } from '@/store/friendsStore';
import { useOffersStore } from '@/store/offersStore';
import type { GameDoc, OfferDoc } from '@/types';

export interface OfferedGame {
  offer: OfferDoc;
  /** The game as stored (owner's player ids). */
  game: GameDoc;
}

/**
 * Offers whose game still exists and really belongs to the offering account, newest game first.
 * Pending offers from accounts that are no longer friends are hidden; decided ones stay.
 */
export function useOfferedGames(): { pending: OfferedGame[]; accepted: OfferedGame[]; declined: OfferedGame[]; loading: boolean } {
  const games = useGamesStore((s) => s.games);
  const offers = useOffersStore((s) => s.offers);
  const loading = useOffersStore((s) => s.loading);
  const friends = useFriendsStore((s) => s.friends);
  return useMemo(() => {
    const friendUids = new Set(friends.map((f) => f.uid));
    const out = { pending: [] as OfferedGame[], accepted: [] as OfferedGame[], declined: [] as OfferedGame[], loading };
    if (offers.size === 0) return out;
    for (const game of games) {
      const offer = offers.get(game.id);
      if (!offer || offer.ownerUid !== game.ownerUid) continue;
      if (offer.status === 'pending' && !friendUids.has(offer.ownerUid)) continue;
      out[offer.status].push({ offer, game });
    }
    return out;
  }, [games, offers, friends, loading]);
}

export function usePendingOfferCount(): number {
  return useOfferedGames().pending.length;
}
