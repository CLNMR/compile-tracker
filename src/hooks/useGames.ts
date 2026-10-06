import { useMemo } from 'react';
import { useGamesStore } from '@/store/gamesStore';
import { useAuthStore } from '@/store/authStore';
import { useFriendsStore } from '@/store/friendsStore';
import { useOffersStore } from '@/store/offersStore';
import { useSettingsStore } from '@/store/settingsStore';
import { myGames, remapOffered } from '@/stats/perspective';
import type { FriendDoc, GameDoc, OfferDoc, Scope } from '@/types';

/** friend uid → my player linked to them. */
export const friendLinks = (friends: readonly FriendDoc[]): Map<string, string> =>
  new Map(friends.flatMap((f): [string, string][] => (f.playerId ? [[f.uid, f.playerId]] : [])));

type MineInputs = [GameDoc[], string | null, Map<string, OfferDoc>, FriendDoc[], string | undefined];
let lastInputs: MineInputs | null = null;
let lastMine: GameDoc[] = [];

/**
 * My games plus accepted offers (remapped to my players). Memoised on the input references at module level,
 * so every component shares one array — `useStats` caches aggregates per array reference.
 */
function selectMine(...inputs: MineInputs): GameDoc[] {
  if (lastInputs && inputs.every((x, i) => x === lastInputs![i])) return lastMine;
  const [all, uid, offers, friends, selfPlayerId] = inputs;
  lastInputs = inputs;
  lastMine = uid ? myGames({ all, myUid: uid, offers, friendPlayers: friendLinks(friends), selfPlayerId }) : [];
  return lastMine;
}

const withoutTestData = new WeakMap<GameDoc[], GameDoc[]>();

/** Test data is for admins (only they can generate it); everyone else never sees it. Stable per store array. */
function realGames(all: GameDoc[]): GameDoc[] {
  let out = withoutTestData.get(all);
  if (!out) {
    out = all.some((g) => g.isTestData) ? all.filter((g) => !g.isTestData) : all;
    withoutTestData.set(all, out);
  }
  return out;
}

/** The games array that stats and lists of `scope` are computed from (`myUid` defaults to the signed-in user). */
export function useScopedSource(scope: Scope, myUid?: string): GameDoc[] {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const stored = useGamesStore((s) => s.games);
  const all = isAdmin ? stored : realGames(stored);
  const authUid = useAuthStore((s) => s.uid);
  const uid = myUid ?? authUid;
  const offers = useOffersStore((s) => s.offers);
  const friends = useFriendsStore((s) => s.friends);
  const selfPlayerId = useSettingsStore((s) => s.defaultPlayerId);
  return scope === 'all' ? all : selectMine(all, uid, offers, friends, selfPlayerId);
}

/** All games (store) narrowed to the requested scope. Stable array reference per (games, scope). */
export function useGames(scope: Scope): { games: GameDoc[]; loading: boolean; fromCache: boolean; error: string | null } {
  const { loading, fromCache, error } = useGamesStore();
  const games = useScopedSource(scope);
  return { games, loading, fromCache, error };
}

/** One game; a game offered to me (any status) comes back remapped to my players. */
export function useGame(id: string | undefined): GameDoc | undefined {
  const games = useGamesStore((s) => s.games);
  const uid = useAuthStore((s) => s.uid);
  const offers = useOffersStore((s) => s.offers);
  const friends = useFriendsStore((s) => s.friends);
  const selfPlayerId = useSettingsStore((s) => s.defaultPlayerId);
  return useMemo(() => {
    const game = id ? games.find((g) => g.id === id) : undefined;
    if (!game || !uid || game.ownerUid === uid) return game;
    const offer = offers.get(game.id);
    if (!offer || offer.ownerUid !== game.ownerUid) return game;
    return remapOffered(game, offer, uid, friendLinks(friends), selfPlayerId);
  }, [games, id, uid, offers, friends, selfPlayerId]);
}
