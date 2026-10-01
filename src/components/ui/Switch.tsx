import { forwardRef, useId, type ReactNode } from 'react';
import { cx } from './cx';
import s from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible name when no visible label is given. */
  'aria-label'?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, label, description, disabled, size = 'md', className, 'aria-label': ariaLabel },
  ref,
) {
  const id = useId();
  const labelId = label != null ? `${id}-label` : undefined;
  return (
    <div className={cx(s.root, s[size], disabled && s.disabled, className)}>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : ariaLabel}
        disabled={disabled}
        className={cx(s.track, checked && s.on)}
        onClick={() => onChange(!checked)}
      >
        <span className={s.thumb} aria-hidden="true" />
      </button>
      {label != null || description != null ? (
        <span className={s.text} onClick={() => !disabled && onChange(!checked)}>
          {label != null ? (
            <span id={labelId} className={s.label}>
              {label}
            </span>
          ) : null}
          {description != null ? <span className={s.desc}>{description}</span> : null}
        </span>
      ) : null}
    </div>
  );
});
