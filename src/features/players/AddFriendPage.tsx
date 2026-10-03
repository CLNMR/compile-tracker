import { Navigate, useParams } from 'react-router';
import { Button, EmptyState, IconUser } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { normalizeHandle } from '@/types';

/** Target of friend QR codes: /add/:handle → Players page with the handle looked up. */
export default function AddFriendPage() {
  const { t } = useT();
  const { isAnonymous } = useAuth();
  const handle = normalizeHandle(useParams().handle ?? '');
  if (!isAnonymous) return <Navigate to={`/players?add=${encodeURIComponent(handle)}`} replace />;
  return (
    <EmptyState
      icon={<IconUser />}
      title={t('friends.addRoute.title', { handle })}
      lines={[t('friends.addRoute.line1'), { text: t('friends.addRoute.line2'), tone: 'muted' }]}
      action={<Button to="/settings">{t('friends.addRoute.settings')}</Button>}
    />
  );
}
