import { useEmulators } from '@/firebase/app';
import { useT } from '@/i18n';
import s from './EmulatorBanner.module.css';

/** Thin accent bar shown under the top bar while talking to local emulators. Pass to `AppShell banner`. */
export function EmulatorBanner() {
  const { t } = useT();
  if (!useEmulators) return null;
  return (
    <div className={s.bar} role="status">
      <span className={s.dot} aria-hidden="true" />
      <span>{t('dev.emulatorBanner')}</span>
    </div>
  );
}
