import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from './cx';
import { IconChevron } from './icons';
import s from './Field.module.css';

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options?: SelectOption[];
  /** Alternative to `options`: raw `<option>` children. */
  children?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  selectProps?: SelectHTMLAttributes<HTMLSelectElement>;
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, children, value, onChange, placeholder, disabled, required, selectProps, className },
  ref,
) {
  const auto = useId();
  const id = selectProps?.id ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={cx(s.root, !!error && s.invalid, className)}>
      {label != null ? (
        <label htmlFor={id} className={s.label}>
          {label}
          {required ? ' *' : null}
        </label>
      ) : null}
      <div className={s.control}>
        <select
          ref={ref}
          id={id}
          className={cx(s.input, s.select)}
          value={value}
          disabled={disabled}
          required={required}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errId, hintId].filter(Boolean).join(' ') || undefined}
          {...selectProps}
        >
          {placeholder != null ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
          {children}
        </select>
        <IconChevron size={18} className={s.chevron} />
      </div>
      {error ? (
        <div id={errId} className={s.error} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div id={hintId} className={s.hint}>
          {hint}
        </div>
      ) : null}
    </div>
  );
});
