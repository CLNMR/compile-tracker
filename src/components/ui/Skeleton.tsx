import type { CSSProperties } from 'react';
import { cx } from './cx';
import s from './Skeleton.module.css';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  /** Render N stacked text lines instead of a single block. */
  lines?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 14, radius = 4, lines, className }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cx(s.stack, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={s.block}
            style={{ height, borderRadius: radius, width: i === lines - 1 ? '60%' : width }}
          />
        ))}
      </div>
    );
  }
  const style: CSSProperties = { width, height, borderRadius: radius };
  return <span className={cx(s.block, className)} style={style} aria-hidden="true" />;
}
