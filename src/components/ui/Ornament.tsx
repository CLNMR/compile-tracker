import { useMemo } from 'react';
import { cx } from './cx';
import s from './Ornament.module.css';

/* All ornaments are purely decorative and aria-hidden. */

export interface BinaryStripProps {
  /** Number of bits (default 32). */
  length?: number;
  /** Deterministic seed so SSR/CSR and re-renders match. */
  seed?: number;
  className?: string;
}

function bits(length: number, seed: number): string {
  let x = (seed * 2654435761) >>> 0 || 1;
  let out = '';
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out += x & 1 ? '1' : '0';
  }
  return out;
}

export function BinaryStrip({ length = 32, seed = 7, className }: BinaryStripProps) {
  const text = useMemo(() => bits(length, seed), [length, seed]);
  return (
    <span className={cx(s.binary, className)} aria-hidden="true">
      {text}
    </span>
  );
}

export interface HatchBarProps {
  height?: number;
  className?: string;
  tone?: 'accent' | 'dim' | 'win' | 'loss';
}

export function HatchBar({ height = 6, className, tone = 'accent' }: HatchBarProps) {
  return <span className={cx(s.hatch, s[`hatch-${tone}`], className)} style={{ height }} aria-hidden="true" />;
}

export interface TraceLineProps {
  direction?: 'h' | 'v';
  /** Draw a node circle at the start / end. */
  nodes?: 'none' | 'end' | 'both';
  className?: string;
  length?: number | string;
}

export function TraceLine({ direction = 'h', nodes = 'end', className, length }: TraceLineProps) {
  const style = length != null ? (direction === 'h' ? { width: length } : { height: length }) : undefined;
  return (
    <span
      className={cx(s.trace, direction === 'v' ? s.traceV : s.traceH, s[`nodes-${nodes}`], className)}
      style={style}
      aria-hidden="true"
    />
  );
}
