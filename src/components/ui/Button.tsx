import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type To } from 'react-router';
import { cx } from './cx';
import { Spinner } from './Spinner';
import s from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  /** When set, renders a react-router `Link` styled as a button. */
  to?: To;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    to,
    type = 'button',
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const cls = cx(s.root, s[variant], s[size], fullWidth && s.full, loading && s.loading, className);
  const content = (
    <>
      {loading ? <Spinner size={size === 'sm' ? 12 : 14} className={s.spinner} /> : iconLeft ? <span className={s.icon}>{iconLeft}</span> : null}
      <span className={s.label}>{children}</span>
      {iconRight ? <span className={s.icon}>{iconRight}</span> : null}
    </>
  );

  if (to != null && !disabled && !loading) {
    return (
      <Link to={to} className={cls} aria-label={rest['aria-label']} title={rest.title}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Required: accessible name (also used as tooltip). */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'subtle' | 'danger' | 'primary';
  size?: ButtonSize;
  loading?: boolean;
  to?: To;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'ghost', size = 'md', loading, to, className, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = cx(s.root, s.iconOnly, s[variant], s[size], className);
  if (to != null && !disabled) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} aria-label={label} title={label} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={14} /> : children}
    </button>
  );
});
