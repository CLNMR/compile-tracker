import { TerminalLine, Wordmark } from '@/components/ui';
import styles from './BootScreen.module.css';

/** Full-screen boot state shown while auth resolves. */
export function BootScreen() {
  return (
    <div className={styles.screen}>
      <Wordmark size="lg" glitch />
      <div className={styles.lines}>
        <TerminalLine tone="muted">vision flickers… blink? maybe.</TerminalLine>
        <TerminalLine cursor>establishing identity</TerminalLine>
      </div>
    </div>
  );
}
