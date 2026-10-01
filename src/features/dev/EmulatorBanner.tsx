import { useEmulators } from '@/firebase/app';
import s from './EmulatorBanner.module.css';

/** Thin accent bar shown under the top bar while talking to local emulators. Pass to `AppShell banner`. */
export function EmulatorBanner() {
  if (!useEmulators) return null;
  return (
    <div className={s.bar} role="status">
      <span className={s.dot} aria-hidden="true" />
      <span>Emulator mode · 127.0.0.1</span>
    </div>
  );
}
