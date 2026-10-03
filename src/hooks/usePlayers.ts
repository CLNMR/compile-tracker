import { useCallback } from 'react';
import { usePlayersStore } from '@/store/playersStore';
import { friendUidOf, pseudonym } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useFriendsStore } from '@/store/friendsStore';
import { useT } from '@/i18n';

export function usePlayers() {
  return usePlayersStore();
}

/**
 * Resolve a playerId to a display label: the real name for the viewer's own players,
 * `@handle` for friend accounts in accepted games, a pseudonym for everyone else's.
 * `ownerUid` undefined = the id is in my namespace (own or remapped shared game).
 */
export function usePlayerLabel() {
  const { t } = useT();
  const byId = usePlayersStore((s) => s.byId);
  const handles = useFriendsStore((s) => s.handles);
  const uid = useAuthStore((s) => s.uid);
  return useCallback(
    (playerId: string, ownerUid?: string) => {
      const friendUid = friendUidOf(playerId);
      if (friendUid) return friendUid === uid ? t('friends.you') : handles[friendUid] ? `@${handles[friendUid]}` : pseudonym(friendUid);
      if (!ownerUid || ownerUid === uid) {
        const p = byId.get(playerId);
        if (p) return p.name;
      }
      return pseudonym(playerId);
    },
    [byId, handles, uid, t],
  );
}
