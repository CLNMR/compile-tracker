import { useCallback } from 'react';
import { usePlayersStore } from '@/store/playersStore';
import { pseudonym } from '@/types';
import { useAuthStore } from '@/store/authStore';

export function usePlayers() {
  return usePlayersStore();
}

/**
 * Resolve a playerId to a display label: the real name for the viewer's own players,
 * a pseudonym for everyone else's.
 */
export function usePlayerLabel() {
  const byId = usePlayersStore((s) => s.byId);
  const uid = useAuthStore((s) => s.uid);
  return useCallback(
    (playerId: string, ownerUid?: string) => {
      if (!ownerUid || ownerUid === uid) {
        const p = byId.get(playerId);
        if (p) return p.name;
      }
      return pseudonym(playerId);
    },
    [byId, uid],
  );
}
