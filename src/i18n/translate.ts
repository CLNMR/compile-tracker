import { INTL_TAG, type Locale } from './locale';
import { MESSAGES, type Messages, type TKey } from './messages';

export type TParams = Readonly<Record<string, string | number | undefined | null>>;

const pluralCache = new Map<Locale, Intl.PluralRules>();
function pluralRules(locale: Locale): Intl.PluralRules {
  let r = pluralCache.get(locale);
  if (!r) {
    r = new Intl.PluralRules(INTL_TAG[locale]);
    pluralCache.set(locale, r);
  }
  return r;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** Replace `{name}` with `params.name`; numbers are formatted for the locale. Unknown names are left as-is. */
export function interpolate(template: string, params: TParams | undefined, locale: Locale): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (m, name: string) => {
    const v = params[name];
    if (v === undefined || v === null) return m;
    return typeof v === 'number' ? v.toLocaleString(INTL_TAG[locale]) : v;
  });
}

type Node = string | { readonly [k: string]: Node };

function lookup(messages: Messages, key: string, params: TParams | undefined, locale: Locale): string | undefined {
  const parts = key.split('.');
  let node: Node | undefined = messages as unknown as Node;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node || typeof node === 'string') return undefined;
    node = node[parts[i]];
  }
  if (!node || typeof node === 'string') return undefined;
  const last = parts[parts.length - 1];
  const count = params?.count;
  if (typeof count === 'number') {
    const category = pluralRules(locale).select(count);
    const form = node[`${last}_${category}`] ?? node[`${last}_other`];
    if (typeof form === 'string') return form;
  }
  const leaf = node[last];
  return typeof leaf === 'string' ? leaf : undefined;
}

/**
 * Resolve `key` in `locale`, falling back to English and finally to the key itself.
 * `params.count` selects `key_one` / `key_other`; every `{placeholder}` is interpolated.
 */
export function translate(locale: Locale, key: TKey, params?: TParams): string {
  const hit = lookup(MESSAGES[locale], key, params, locale) ?? lookup(MESSAGES.en, key, params, 'en');
  if (hit === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}" (${locale})`);
    return key;
  }
  return interpolate(hit, params, locale);
}

export type TFunction = (key: TKey, params?: TParams) => string;

export const makeT =
  (locale: Locale): TFunction =>
  (key, params) =>
    translate(locale, key, params);
