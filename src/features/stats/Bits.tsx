import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/components/ui';
import { useT } from '@/i18n';
import s from './Bits.module.css';

/** Thin bar for inline use inside table cells. `value` in 0..max. */
export function InlineBar({ value, max = 1, color, className }: { value: number; max?: number; color?: string; className?: string }) {
  const w = Math.max(0, Math.min(100, (value / Math.max(1e-9, max)) * 100));
  return (
    <span className={cx(s.bar, className)} aria-hidden="true">
      <span className={s.barFill} style={{ width: `${w}%`, background: color ?? 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }} />
    </span>
  );
}

/** Number + inline bar underneath, for dense numeric cells. */
export function NumBar({ label, value, max = 1, color }: { label: ReactNode; value: number; max?: number; color?: string }) {
  return (
    <span className={s.numBar}>
      <span className={s.num}>{label}</span>
      <InlineBar value={value} max={max} color={color} />
    </span>
  );
}

/** W/L squares, most recent last. */
export function FormSquares({ form }: { form: ('W' | 'L')[] }) {
  const { t } = useT();
  if (form.length === 0) return <span className={s.dim}>–</span>;
  const text = form.map((r) => (r === 'W' ? t('stats.form.win') : t('stats.form.loss'))).join(' ');
  return (
    <span className={s.form} aria-label={t('stats.form.recent', { form: text })} title={text}>
      {form.map((r, i) => (
        <span key={i} className={cx(s.sq, r === 'W' ? s.sqWin : s.sqLoss)} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Mono value with a tooltip explaining the Wilson lower bound. */
export function WilsonValue({ value, children }: { value: string; children?: ReactNode }) {
  const { t } = useT();
  return (
    <abbr className={s.wilson} title={t('stats.wilson.hint')}>
      {children ?? value}
    </abbr>
  );
}

/* ---------------- Data table (CSS grid, horizontally scrollable) ---------------- */

export interface DataTableColumn<K extends string = string> {
  key: K;
  label: ReactNode;
  /** grid-template-columns track, e.g. '64px' or 'minmax(140px, 1.4fr)'. */
  width: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  title?: string;
}

export interface DataTableProps<K extends string = string> {
  columns: DataTableColumn<K>[];
  sortKey?: K;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: K) => void;
  children: ReactNode;
  className?: string;
  /** Accessible table name. */
  label?: string;
}

export function DataTable<K extends string = string>({ columns, sortKey, sortDir, onSort, children, className, label }: DataTableProps<K>) {
  const style = { '--cols': columns.map((c) => c.width).join(' ') } as CSSProperties;
  return (
    <div className={cx(s.tableWrap, className)}>
      <div className={s.table} role="table" aria-label={label} style={style}>
        <div className={cx(s.tr, s.thead)} role="row">
          {columns.map((c) => {
            const active = sortKey === c.key;
            const inner = (
              <>
                <span>{c.label}</span>
                {c.sortable ? <span className={cx(s.sortMark, active && s.sortActive)}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span> : null}
              </>
            );
            return (
              <div
                key={c.key}
                role="columnheader"
                aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cx(s.th, c.align && s[`al-${c.align}`])}
                title={c.title}
              >
                {c.sortable && onSort ? (
                  <button type="button" className={s.thBtn} onClick={() => onSort(c.key)}>
                    {inner}
                  </button>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}

export function TableRow({ children, onClick, className, label }: { children: ReactNode; onClick?: () => void; className?: string; label?: string }) {
  if (onClick) {
    return (
      <button type="button" role="row" className={cx(s.tr, s.trClick, className)} onClick={onClick} aria-label={label}>
        {children}
      </button>
    );
  }
  return (
    <div role="row" className={cx(s.tr, className)}>
      {children}
    </div>
  );
}

export function Td({ children, align, mono, className, title }: { children: ReactNode; align?: 'left' | 'right' | 'center'; mono?: boolean; className?: string; title?: string }) {
  return (
    <div role="cell" className={cx(s.td, align && s[`al-${align}`], mono && s.mono, className)} title={title}>
      {children}
    </div>
  );
}
