import { useT } from '@/i18n';
import { cx } from './cx';
import s from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  className?: string;
  /** Accessible name; defaults to the localized "Loading". */
  label?: string;
}

/** Four-bar "scanning" spinner, rendered in currentColor. */
export function Spinner({ size = 18, className, label }: SpinnerProps) {
  const { t } = useT();
  return (
    <span className={cx(s.root, className)} style={{ width: size, height: size }} role="status" aria-label={label ?? t('ui.spinner.loading')}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
