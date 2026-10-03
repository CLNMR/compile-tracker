import type { GameDoc, GameSide, SideKey } from '@/types';
import { INTL_TAG, translate, type Locale } from '@/i18n';

/* ---------- dates ---------- */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const rtfCache = new Map<Locale, Intl.RelativeTimeFormat>();
function relativeFormat(locale: Locale): Intl.RelativeTimeFormat {
  let f = rtfCache.get(locale);
  if (!f) {
    f = new Intl.RelativeTimeFormat(INTL_TAG[locale], { numeric: 'auto' });
    rtfCache.set(locale, f);
  }
  return f;
}

/**
 * Coarse relative label in the app language: "just now", "5 minutes ago", "yesterday", "3 weeks ago", "in 2 hours"…
 * Absolute dates/times come from `useT().dateTime` / `i18n().dateTime`.
 */
export function formatRelative(date: Date, locale: Locale, now: Date | number = Date.now()): string {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diff = date.getTime() - nowMs;
  const sign = diff < 0 ? -1 : 1;
  const abs = Math.abs(diff);
  const rtf = relativeFormat(locale);

  if (abs < MIN) return translate(locale, 'games.time.justNow');
  if (abs < HOUR) return rtf.format(sign * Math.floor(abs / MIN), 'minute');
  if (abs < DAY) return rtf.format(sign * Math.floor(abs / HOUR), 'hour');
  const days = Math.floor(abs / DAY);
  if (days < 14) return rtf.format(sign * days, 'day');
  if (days < 60) return rtf.format(sign * Math.floor(days / 7), 'week');
  if (days < 365) return rtf.format(sign * Math.floor(days / 30), 'month');
  return rtf.format(sign * Math.floor(days / 365), 'year');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time value for `<input type="datetime-local">` (minute precision). */
export function toDatetimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a datetime-local string back into a local Date; null when invalid. */
export function fromDatetimeLocal(str: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------- sides ---------- */

export type LabelFn = (playerId: string, ownerUid?: string) => string;

export function sideOf(game: Pick<GameDoc, 'p1' | 'p2'>, key: SideKey): GameSide {
  return key === 'p1' ? game.p1 : game.p2;
}

/** Display label for one side of a game (real name for own players, pseudonym otherwise). */
export function sideLabel(game: Pick<GameDoc, 'p1' | 'p2' | 'ownerUid' | 'sharedBy'>, key: SideKey, label: LabelFn): string {
  // Accepted offers are remapped to my player ids.
  return label(sideOf(game, key).playerId, game.sharedBy ? undefined : game.ownerUid);
}

/** Label of the winning side. */
export function winnerLabel(game: Pick<GameDoc, 'p1' | 'p2' | 'ownerUid' | 'sharedBy' | 'winner'>, label: LabelFn): string {
  return sideLabel(game, game.winner, label);
}

/** Short pseudonymous owner label for games recorded by other users. */
export function ownerPseudonym(ownerUid: string): string {
  return `P-${ownerUid.slice(0, 4).toUpperCase()}`;
}

/* ---------- storage ---------- */

export function readStorage(storage: 'local' | 'session', key: string): string | null {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage;
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(storage: 'local' | 'session', key: string, value: string | null): void {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* private mode / quota — ignore */
  }
}

export function readJson<T>(storage: 'local' | 'session', key: string): T | null {
  const raw = readStorage(storage, key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
