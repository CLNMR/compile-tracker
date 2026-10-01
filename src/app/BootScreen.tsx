import { TerminalLine, Wordmark } from '@/components/ui';
import { useT } from '@/i18n';
import styles from './BootScreen.module.css';

/** Full-screen boot state shown while auth resolves. */
export function BootScreen() {
  const { t } = useT();
  return (
    <div className={styles.screen}>
      <Wordmark size="lg" glitch />
      <div className={styles.lines}>
        <TerminalLine tone="muted">{t('app.boot.flicker')}</TerminalLine>
        <TerminalLine cursor>{t('app.boot.identity')}</TerminalLine>
      </div>
    </div>
  );
}
