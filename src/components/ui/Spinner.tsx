import { cx } from './cx';
import s from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

/** Four-bar "scanning" spinner, rendered in currentColor. */
export function Spinner({ size = 18, className, label = 'Loading' }: SpinnerProps) {
  return (
    <span className={cx(s.root, className)} style={{ width: size, height: size }} role="status" aria-label={label}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
