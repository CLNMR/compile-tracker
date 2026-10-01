import { INTL_TAG, type Locale } from './locale';

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: Locale, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(opts ?? {})}`;
  let f = numberCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(INTL_TAG[locale], opts);
    numberCache.set(key, f);
  }
  return f;
}

function dateFormat(locale: Locale, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(opts ?? {})}`;
  let f = dateCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(INTL_TAG[locale], opts);
    dateCache.set(key, f);
  }
  return f;
}

export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return numberFormat(locale, opts).format(n);
}

/** `0.5321` → `53.2 %` (de) / `53.2%` (en). `ratio` is 0..1. */
export function formatPercent(ratio: number, locale: Locale, digits = 1): string {
  return numberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(ratio);
}

export function formatDate(d: Date | number, locale: Locale, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return dateFormat(locale, opts).format(d);
}

export function formatDateTime(d: Date | number, locale: Locale): string {
  return dateFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** `'2026-03'` → `Mar 26` / `März 26`. */
export function formatYearMonth(yearMonth: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' }): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  return dateFormat(locale, { ...opts, timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
}

const relCache = new Map<Locale, Intl.RelativeTimeFormat>();

/** "3 days ago" / "vor 3 Tagen" for a past instant, falling back to a short date beyond ~4 weeks. */
export function formatRelative(then: Date | number, locale: Locale, now: number = Date.now()): string {
  let rtf = relCache.get(locale);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(INTL_TAG[locale], { numeric: 'auto' });
    relCache.set(locale, rtf);
  }
  const ms = (typeof then === 'number' ? then : then.getTime()) - now;
  const s = Math.round(ms / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 28) return rtf.format(Math.round(s / 86400), 'day');
  return formatDate(then, locale);
}
