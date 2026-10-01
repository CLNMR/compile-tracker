import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import s from './Tabs.module.css';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  disabled?: boolean;
  /** Small count/badge after the label. */
  badge?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
  className?: string;
  /** Stretch tabs across the full width (desktop). */
  grow?: boolean;
}

/** Underlined tab strip, horizontally scrollable on narrow screens. */
export function Tabs<T extends string = string>({ tabs, value, onChange, label, className, grow }: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const enabled = tabs.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.id === value);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % enabled.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = enabled.length - 1;
    const t = enabled[n];
    if (!t) return;
    onChange(t.id);
    ref.current?.querySelector<HTMLButtonElement>(`[data-id="${t.id}"]`)?.focus();
  };

  return (
    <div ref={ref} role="tablist" aria-label={label} className={cx(s.root, grow && s.grow, className)} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-id={t.id}
            disabled={t.disabled}
            className={cx(s.tab, active && s.active)}
            onClick={() => onChange(t.id)}
          >
            <span className={s.label}>{t.label}</span>
            {t.badge != null ? <span className={s.badge}>{t.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
