import { create } from 'zustand';
import { detectLocale, writeStoredLocale, type Locale } from './locale';

interface LocaleState {
  locale: Locale;
  /** True when the user picked a language; false while we follow the browser. */
  explicit: boolean;
  /** Pick a language (persisted). */
  setLocale: (locale: Locale) => void;
  /** Forget the explicit choice and follow the browser again. */
  resetToBrowser: () => void;
}

function applyDocumentLang(locale: Locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

const initial = detectLocale();
applyDocumentLang(initial.locale);

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initial.locale,
  explicit: initial.explicit,

  setLocale: (locale) => {
    writeStoredLocale(locale);
    applyDocumentLang(locale);
    set({ locale, explicit: true });
  },

  resetToBrowser: () => {
    writeStoredLocale(null);
    const next = detectLocale();
    applyDocumentLang(next.locale);
    set({ locale: next.locale, explicit: false });
  },
}));

/** Current locale for non-React code (stores, repo helpers, formatters). */
export const currentLocale = (): Locale => useLocaleStore.getState().locale;
