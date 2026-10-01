import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import s from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/** Radio-group style toggle (e.g. Mine / All). Arrow keys move the selection. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.value === value);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % enabled.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + enabled.length) % enabled.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = enabled.length - 1;
    const opt = enabled[next];
    if (!opt) return;
    onChange(opt.value);
    ref.current?.querySelector<HTMLButtonElement>(`[data-value="${opt.value}"]`)?.focus();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      id={id}
      className={cx(s.root, s[size], fullWidth && s.full, className)}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={o.value}
            disabled={o.disabled}
            className={cx(s.option, active && s.active)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
