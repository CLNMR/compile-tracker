import type { ReactNode } from 'react';
import { cx } from './cx';
import { TerminalBlock, type TerminalBlockLine } from './Terminal';
import { BinaryStrip } from './Ornament';
import s from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Terminal lines; the last one gets the cursor. */
  lines: Array<ReactNode | TerminalBlockLine>;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ lines, title, icon, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cx(s.root, compact && s.compact, className)}>
      {icon ? <div className={s.icon}>{icon}</div> : null}
      {title != null ? <div className={s.title}>{title}</div> : null}
      <TerminalBlock lines={lines} className={s.terminal} tone="muted" />
      {action ? <div className={s.action}>{action}</div> : null}
      <BinaryStrip length={28} seed={3} className={s.binary} />
    </div>
  );
}
