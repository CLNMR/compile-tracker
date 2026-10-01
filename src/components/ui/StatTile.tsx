import type { ReactNode } from 'react';
import { cx } from './cx';
import s from './StatTile.module.css';

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'accent' | 'win' | 'loss' | 'warn';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Orbitron number + mono label. */
export function StatTile({ label, value, sub, tone = 'default', size = 'md', className }: StatTileProps) {
  return (
    <div className={cx(s.root, s[tone], s[size], className)}>
      <div className={s.label}>{label}</div>
      <div className={s.value}>{value}</div>
      {sub != null ? <div className={s.sub}>{sub}</div> : null}
    </div>
  );
}
