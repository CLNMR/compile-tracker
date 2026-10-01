import { cx } from './cx';
import s from './Wordmark.module.css';

export interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  /** Plays the glitch animation on mount and on hover. */
  glitch?: boolean;
  className?: string;
}

const TEXT = 'COMPILE';

export function Wordmark({ size = 'md', glitch = true, className }: WordmarkProps) {
  return (
    <span className={cx(s.root, s[size], glitch && s.glitch, className)} data-text={TEXT} aria-label="Compile">
      {TEXT}
    </span>
  );
}
