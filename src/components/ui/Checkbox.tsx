import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import s from './Checkbox.module.css';

export interface CheckboxProps {
  label?: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, checked, defaultChecked, onChange, disabled, indeterminate, inputProps, className },
  ref,
) {
  const auto = useId();
  const id = inputProps?.id ?? auto;
  return (
    <label htmlFor={id} className={cx(s.root, disabled && s.disabled, className)}>
      <input
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        id={id}
        type="checkbox"
        className={s.input}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        {...inputProps}
      />
      <span className={s.box} aria-hidden="true" />
      {label != null || description != null ? (
        <span className={s.text}>
          {label != null ? <span className={s.label}>{label}</span> : null}
          {description != null ? <span className={s.desc}>{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
});
