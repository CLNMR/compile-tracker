import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { useT } from '@/i18n';
import { cx } from './cx';
import s from './Field.module.css';

export interface TextFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Icon or text rendered inside the field, before the input. */
  leading?: ReactNode;
  trailing?: ReactNode;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  className?: string;
  /** Shorthands forwarded to the input. */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, leading, trailing, inputProps, className, value, onChange, placeholder, type = 'text', disabled, required },
  ref,
) {
  const { t } = useT();
  const auto = useId();
  const id = inputProps?.id ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={cx(s.root, !!error && s.invalid, className)}>
      {label != null ? (
        <label htmlFor={id} className={s.label}>
          {label}
          {required ? <span title={t('ui.field.required')}> *</span> : null}
        </label>
      ) : null}
      <div className={s.control}>
        {leading ? <span className={s.adorn}>{leading}</span> : null}
        <input
          ref={ref}
          id={id}
          type={type}
          className={s.input}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errId, hintId].filter(Boolean).join(' ') || undefined}
          {...inputProps}
        />
        {trailing ? <span className={s.adorn}>{trailing}</span> : null}
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
