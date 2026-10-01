import { useMemo } from 'react';
import type { ProtocolDef } from '@/data/protocols';
import type { SetDef } from '@/data/sets';
import type { ProtocolId, SetId } from '@/types';
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRelative, formatYearMonth } from './format';
import { INTL_TAG, type Locale } from './locale';
import { protocolName, setName, setShort, sortByProtocolName } from './names';
import { currentLocale, useLocaleStore } from './store';
import { makeT, type TFunction, type TParams } from './translate';

export type { Locale } from './locale';
export { DEFAULT_LOCALE, INTL_TAG, LOCALES, isLocale, localeFromBrowser, matchLocale } from './locale';
export type { TKey } from './messages';
export type { TFunction, TParams } from './translate';
export { translate, interpolate } from './translate';
export { PROTOCOL_NAMES_DE, protocolName, setName, setShort, sortByProtocolName } from './names';
export { formatDate, formatDateTime, formatNumber, formatPercent, formatRelative, formatYearMonth } from './format';
export { currentLocale, useLocaleStore } from './store';

/** Everything a component needs to render text for one locale. Stable per locale (memoized). */
export interface I18n {
  locale: Locale;
  /** BCP-47 tag for `Intl` / `toLocaleString`. */
  intl: string;
  t: TFunction;
  protocolName: (p: ProtocolId | ProtocolDef) => string;
  sortProtocols: <T extends ProtocolId | ProtocolDef>(items: readonly T[]) => T[];
  setName: (s: SetId | SetDef) => string;
  setShort: (s: SetId | SetDef) => string;
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** `ratio` 0..1 → "53.2%" */
  percent: (ratio: number, digits?: number) => string;
  date: (d: Date | number, opts?: Intl.DateTimeFormatOptions) => string;
  dateTime: (d: Date | number) => string;
  yearMonth: (ym: string, opts?: Intl.DateTimeFormatOptions) => string;
  relative: (then: Date | number, now?: number) => string;
}

const cache = new Map<Locale, I18n>();

export function i18nFor(locale: Locale): I18n {
  let i = cache.get(locale);
  if (i) return i;
  i = {
    locale,
    intl: INTL_TAG[locale],
    t: makeT(locale),
    protocolName: (p) => protocolName(p, locale),
    sortProtocols: (items) => sortByProtocolName(items, locale),
    setName: (s) => setName(s, locale),
    setShort: (s) => setShort(s, locale),
    number: (n, opts) => formatNumber(n, locale, opts),
    percent: (r, digits) => formatPercent(r, locale, digits),
    date: (d, opts) => formatDate(d, locale, opts),
    dateTime: (d) => formatDateTime(d, locale),
    yearMonth: (ym, opts) => formatYearMonth(ym, locale, opts),
    relative: (then, now) => formatRelative(then, locale, now),
  };
  cache.set(locale, i);
  return i;
}

/** React hook: re-renders when the language changes. `const { t, protocolName } = useT();` */
export function useT(): I18n {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => i18nFor(locale), [locale]);
}

/** For non-React code (zustand stores, repo helpers): translate with the locale active right now. */
export const t = (key: Parameters<TFunction>[0], params?: TParams): string => makeT(currentLocale())(key, params);

/** Non-React access to the full helper set. */
export const i18n = (): I18n => i18nFor(currentLocale());
