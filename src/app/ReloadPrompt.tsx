import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, TerminalLine } from '@/components/ui';
import { useT } from '@/i18n';
import styles from './ReloadPrompt.module.css';

/** Shown when a new service worker is waiting. */
export function ReloadPrompt() {
  const { t } = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for updates every hour while the app stays open.
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className={styles.wrap} role="status">
      <TerminalLine tone="warn">{t('app.reload.message')}</TerminalLine>
      <div className={styles.actions}>
        <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
          {t('app.reload.reload')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          {t('app.reload.later')}
        </Button>
      </div>
    </div>
  );
}
