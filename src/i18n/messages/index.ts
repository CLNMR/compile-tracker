import type { Locale } from '../locale';
import { de } from './de';
import { en } from './en';
import type { Shape } from './shape';

export type Messages = Shape<typeof en>;

export const MESSAGES: Record<Locale, Messages> = { en, de };

type Join<A extends string, B extends string> = A extends '' ? B : `${A}.${B}`;
type Leaves<T, P extends string = ''> = T extends string
  ? P
  : { [K in keyof T & string]: Leaves<T[K], Join<P, K>> }[keyof T & string];
/** `foo_one` / `foo_other` collapse to `foo`; `t('foo', { count })` picks the form. */
type StripPlural<K extends string> = K extends `${infer B}_one` ? B : K extends `${infer B}_other` ? B : K;

/** Every addressable message key, e.g. `'games.list.title'`. */
export type TKey = StripPlural<Leaves<Messages>>;
