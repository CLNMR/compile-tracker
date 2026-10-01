import type { ReactNode } from 'react';
import { cx } from './cx';
import s from './SectionHeader.module.css';

export interface SectionHeaderProps {
  children: ReactNode;
  /** Slot rendered after the trace line (counters, toggles, actions). */
  right?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  /** Heading level for semantics; defaults to h2. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
}

/** Orbitron label inside a bordered tab, followed by a 1px trace ending in a node. */
export function SectionHeader({ children, right, size = 'md', className, as: Tag = 'h2' }: SectionHeaderProps) {
  return (
    <div className={cx(s.root, s[size], className)}>
      <Tag className={s.tab}>{children}</Tag>
      <span className={s.trace} aria-hidden="true" />
      {right != null ? <div className={s.right}>{right}</div> : null}
    </div>
  );
}
