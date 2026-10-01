import type { ReactNode } from 'react';
import { cx } from './cx';
import s from './BarList.module.css';

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Defaults to the largest value in the list. */
  max?: number;
  /** CSS color or gradient used as bar fill. Defaults to magenta. */
  color?: string;
  sub?: ReactNode;
  onClick?: () => void;
}

export interface BarListProps {
  items: BarListItem[];
  format?: (value: number, item: BarListItem) => ReactNode;
  className?: string;
  /** Show a thin track behind the bar. */
  track?: boolean;
}

export function BarList({ items, format = (v) => String(v), className, track = true }: BarListProps) {
  const globalMax = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cx(s.root, className)}>
      {items.map((item) => {
        const max = item.max ?? globalMax;
        const pct = Math.max(0, Math.min(100, (item.value / Math.max(1, max)) * 100));
        const Row = item.onClick ? 'button' : 'div';
        return (
          <li key={item.key} className={s.item}>
            <Row className={cx(s.row, item.onClick && s.clickable)} onClick={item.onClick} type={item.onClick ? 'button' : undefined}>
              <div className={s.head}>
                <span className={s.label}>{item.label}</span>
                <span className={s.value}>{format(item.value, item)}</span>
              </div>
              <div className={cx(s.track, !track && s.noTrack)}>
                <span
                  className={s.bar}
                  style={{ width: `${pct}%`, background: item.color ?? 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }}
                />
              </div>
              {item.sub != null ? <div className={s.sub}>{item.sub}</div> : null}
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
