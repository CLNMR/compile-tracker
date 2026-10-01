export type Locale = 'en' | 'de';

export const LOCALES: readonly Locale[] = ['en', 'de'];
export const DEFAULT_LOCALE: Locale = 'en';
/** localStorage key holding an explicit user choice. Absent → follow the browser. */
export const LOCALE_STORAGE_KEY = 'compile.locale';

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Map a BCP-47 tag (`de-AT`, `en_GB`, `de`) onto a supported locale, or null. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
}

/** First supported language in the browser's preference list, else the default. */
export function localeFromBrowser(languages: readonly string[] = navigatorLanguages()): Locale {
  for (const tag of languages) {
    const m = matchLocale(tag);
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

export function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale | null): void {
  try {
    if (locale) localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    else localStorage.removeItem(LOCALE_STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — the choice lives for this session only */
  }
}

/** Explicit choice wins; otherwise infer from the browser; English as the last resort. */
export function detectLocale(): { locale: Locale; explicit: boolean } {
  const stored = readStoredLocale();
  if (stored) return { locale: stored, explicit: true };
  return { locale: localeFromBrowser(), explicit: false };
}

/** Intl-friendly tag for number/date formatting. */
export const INTL_TAG: Record<Locale, string> = { en: 'en-US', de: 'de-DE' };
