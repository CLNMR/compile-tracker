import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { IconX } from './icons';
import s from './Chip.module.css';

export type ChipTone = 'default' | 'accent' | 'win' | 'loss' | 'warn';

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  /** When given, renders a small remove button. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Makes the chip itself clickable. */
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

export function Chip({
  children,
  tone = 'default',
  icon,
  onRemove,
  removeLabel = 'Remove',
  onClick,
  selected,
  size = 'md',
  className,
  title,
}: ChipProps) {
  const cls = cx(s.root, s[tone], s[size], onClick && s.clickable, selected && s.selected, className);
  const inner = (
    <>
      {icon ? <span className={s.icon}>{icon}</span> : null}
      <span className={s.label}>{children}</span>
    </>
  );
  if (onClick) {
    const btnProps: ButtonHTMLAttributes<HTMLButtonElement> = { onClick, 'aria-pressed': selected };
    return (
      <span className={s.wrap}>
        <button type="button" className={cls} title={title} {...btnProps}>
          {inner}
        </button>
        {onRemove ? <RemoveBtn onRemove={onRemove} label={removeLabel} tone={tone} /> : null}
      </span>
    );
  }
  return (
    <span className={cls} title={title}>
      {inner}
      {onRemove ? <RemoveBtn onRemove={onRemove} label={removeLabel} tone={tone} inline /> : null}
    </span>
  );
}

function RemoveBtn({ onRemove, label, inline }: { onRemove: () => void; label: string; tone: ChipTone; inline?: boolean }) {
  return (
    <button type="button" className={cx(s.remove, inline && s.removeInline)} onClick={onRemove} aria-label={label}>
      <IconX size={12} strokeWidth={2.5} />
    </button>
  );
}

export interface BadgeProps {
  children: ReactNode;
  tone?: ChipTone;
  /** Mono "terminal" style (ids, codes). */
  mono?: boolean;
  dot?: boolean;
  className?: string;
  title?: string;
}

/** Non-interactive small label. */
export function Badge({ children, tone = 'default', mono, dot, className, title }: BadgeProps) {
  return (
    <span className={cx(s.badge, s[tone], mono && s.mono, className)} title={title}>
      {dot ? <span className={s.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
