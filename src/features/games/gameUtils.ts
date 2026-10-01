import type { GameDoc, GameSide, SideKey } from '@/types';

/* ---------- dates ---------- */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Coarse relative label: "just now", "5 min ago", "yesterday", "3 days ago", "in 2 hours"… */
export function formatRelative(date: Date, now: Date | number = Date.now()): string {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diff = nowMs - date.getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const wrap = (s: string) => (future ? `in ${s}` : `${s} ago`);

  if (abs < MIN) return 'just now';
  if (abs < HOUR) return wrap(`${Math.floor(abs / MIN)} min`);
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    return wrap(`${h} hour${h === 1 ? '' : 's'}`);
  }
  const days = Math.floor(abs / DAY);
  if (days === 1) return future ? 'tomorrow' : 'yesterday';
  if (days < 14) return wrap(`${days} days`);
  if (days < 60) return wrap(`${Math.floor(days / 7)} weeks`);
  if (days < 365) {
    const m = Math.floor(days / 30);
    return wrap(`${m} month${m === 1 ? '' : 's'}`);
  }
  const y = Math.floor(days / 365);
  return wrap(`${y} year${y === 1 ? '' : 's'}`);
}

const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Absolute, locale-aware "Oct 1, 2026, 9:30 PM". */
export function formatDateTime(date: Date): string {
  return dateTimeFmt.format(date);
}

export function formatDate(date: Date): string {
  return dateFmt.format(date);
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
export function sideLabel(game: Pick<GameDoc, 'p1' | 'p2' | 'ownerUid'>, key: SideKey, label: LabelFn): string {
  return label(sideOf(game, key).playerId, game.ownerUid);
}

/** Label of the winning side. */
export function winnerLabel(game: Pick<GameDoc, 'p1' | 'p2' | 'ownerUid' | 'winner'>, label: LabelFn): string {
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
