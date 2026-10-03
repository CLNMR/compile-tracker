import { useEffect, type ReactNode } from 'react';
import { recordSession } from '@/analytics';
import { useT } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { useGamesStore } from '@/store/gamesStore';
import { usePlayersStore } from '@/store/playersStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFriendsStore } from '@/store/friendsStore';
import { useOffersStore } from '@/store/offersStore';

/**
 * Starts auth and, once a uid exists, the live data stores.
 * Renders `fallback` until auth has resolved (anonymous sign-in included).
 */
export function Bootstrap({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { t } = useT();
  const start = useAuthStore((s) => s.start);
  const uid = useAuthStore((s) => s.uid);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  useEffect(() => start(), [start]);

  useEffect(() => {
    if (uid) recordSession({ isAnonymous, isAdmin });
  }, [uid, isAnonymous, isAdmin]);

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

  // Friends and offers need a Google-linked account (rules reject anonymous users).
  useEffect(() => {
    if (!uid || isAnonymous) return;
    useFriendsStore.getState().start(uid);
    useOffersStore.getState().start(uid);
    return () => {
      useFriendsStore.getState().stop();
      useOffersStore.getState().stop();
    };
  }, [uid, isAnonymous]);

  if (loading || !uid) {
    return (
      <>
        {fallback}
        {error && <p role="alert" style={{ color: 'var(--loss)', padding: 16, fontFamily: 'var(--font-mono)' }}>&gt; {t('app.authFailed', { error })}</p>}
      </>
    );
  }
  return <>{children}</>;
}
