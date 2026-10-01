import { cx } from './cx';
import s from './LogoMark.module.css';

export interface LogoMarkProps {
  /** Pixel size (square). */
  size?: number;
  className?: string;
  /** Accessible label; omit to mark decorative. */
  title?: string;
}

/** The `<!>` mark with a small triangle below, drawn in currentColor. */
export function LogoMark({ size = 28, className, title }: LogoMarkProps) {
  return (
    <svg
      className={cx(s.root, className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* < */}
      <path d="M20 12 6 26l14 14" />
      {/* > */}
      <path d="M44 12l14 14-14 14" />
      {/* ! */}
      <path d="M32 10v18" strokeWidth={6} />
      <path d="M32 36v2" strokeWidth={6} />
      {/* triangle below */}
      <path d="M32 48l7 10H25z" fill="currentColor" stroke="none" />
    </svg>
  );
}
