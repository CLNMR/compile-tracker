/** 0.6123 → "61%" (or "61.2%" with digits = 1). */
export function pct(x: number, digits = 0): string {
  if (!Number.isFinite(x)) return '–';
  return `${(x * 100).toFixed(digits)}%`;
}

/** Locale-formatted number with fixed decimals. */
export function num(x: number, digits = 0): string {
  if (!Number.isFinite(x)) return '–';
  return x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "W" / "L" record string. */
export function record(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

/** Short local date, e.g. "3 Sep 2026". */
export function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "2026-03" → "Mar 26". */
export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Local-date `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse `YYYY-MM-DD` as a local date; undefined when empty/invalid. */
export function fromDateInput(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Streak as "W4" / "L2" / "–". */
export function streakLabel(current: number): string {
  if (current > 0) return `W${current}`;
  if (current < 0) return `L${-current}`;
  return '–';
}

export const WILSON_HINT =
  'Wilson lower bound (95%): a conservative win-rate estimate that penalises small samples, so 1/1 ranks below 8/10.';
