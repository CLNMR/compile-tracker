import { currentLocale, formatDate, formatNumber, formatPercent, formatYearMonth, i18n } from '@/i18n';

/**
 * Locale-aware formatting for the stats tabs. Every helper reads the locale active *now*,
 * so memoized call sites must list `locale` (from `useT()`) in their dependencies.
 */

/** 0.6123 → "61%" / "61 %" (or one decimal with digits = 1). */
export function pct(x: number, digits = 0): string {
  if (!Number.isFinite(x)) return '–';
  return formatPercent(x, currentLocale(), digits);
}

/** Locale-formatted number with fixed decimals. */
export function num(x: number, digits = 0): string {
  if (!Number.isFinite(x)) return '–';
  return formatNumber(x, currentLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "W" / "L" record string. */
export function record(wins: number, losses: number): string {
  return `${num(wins)}–${num(losses)}`;
}

/** Short local date, e.g. "Sep 3, 2026" / "3. Sept. 2026". */
export function shortDate(ms: number): string {
  return formatDate(ms, currentLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "2026-03" → "Mar 26" / "März 26". */
export function monthLabel(yearMonth: string): string {
  return formatYearMonth(yearMonth, currentLocale());
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

/** Streak as "W4" / "L2" / "–" (localized result letter). */
export function streakLabel(current: number): string {
  const { t } = i18n();
  if (current > 0) return `${t('stats.form.win')}${current}`;
  if (current < 0) return `${t('stats.form.loss')}${-current}`;
  return '–';
}
