import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useGamesStore } from '@/store/gamesStore';
import { usePlayersStore } from '@/store/playersStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Starts auth and, once a uid exists, the live data stores.
 * Renders `fallback` until auth has resolved (anonymous sign-in included).
 */
export function Bootstrap({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const start = useAuthStore((s) => s.start);
  const uid = useAuthStore((s) => s.uid);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  useEffect(() => start(), [start]);

  useEffect(() => {
    if (!uid) return;
    useGamesStore.getState().start(uid);
    usePlayersStore.getState().start(uid);
    useSettingsStore.getState().start(uid);
    return () => {
      useGamesStore.getState().stop();
      usePlayersStore.getState().stop();
      useSettingsStore.getState().stop();
    };
  }, [uid]);

  if (loading || !uid) {
    return (
      <>
        {fallback}
        {error && <p role="alert" style={{ color: 'var(--loss)', padding: 16, fontFamily: 'var(--font-mono)' }}>&gt; auth failed: {error}</p>}
      </>
    );
  }
  return <>{children}</>;
}
