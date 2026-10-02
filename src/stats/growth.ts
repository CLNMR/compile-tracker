import type { GameDoc } from '@/types';
import { isGuestPlayer } from '@/types';

/* Admin analytics: the cookie-free per-source counters plus activity derived from the games themselves. */

export const COUNTER_KINDS = ['visit', 'newUser', 'game', 'link'] as const;
export type CounterKind = (typeof COUNTER_KINDS)[number];

/** One counter doc: `analytics/{day}/counters/{kind}_{source}` → `{ n }`. */
export interface CounterRow {
  day: string;
  kind: CounterKind;
  source: string;
  n: number;
}

export type CounterTotals = Record<CounterKind, number>;
export interface SourceSummary extends CounterTotals {
  source: string;
}
export interface DaySummary extends CounterTotals {
  day: string;
}

const zero = (): CounterTotals => ({ visit: 0, newUser: 0, game: 0, link: 0 });

/** UTC calendar day 'YYYY-MM-DD' — the counter partition key. */
export const dayKey = (d: Date | number): string => new Date(d).toISOString().slice(0, 10);

/** Every day from `from` to `to` inclusive (both 'YYYY-MM-DD'). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) out.push(dayKey(t));
  return out;
}

/** Parse a counter doc id `{kind}_{source}`; null for anything unexpected. */
export function parseCounterId(id: string): { kind: CounterKind; source: string } | null {
  const i = id.indexOf('_');
  if (i <= 0) return null;
  const kind = id.slice(0, i) as CounterKind;
  if (!COUNTER_KINDS.includes(kind)) return null;
  return { kind, source: id.slice(i + 1) };
}

/** Totals per source (sorted by visits, then games) and a gap-free daily series for `from..to`. */
export function summarizeCounters(rows: readonly CounterRow[], from: string, to: string) {
  const bySource = new Map<string, CounterTotals>();
  const byDay = new Map<string, CounterTotals>(daysBetween(from, to).map((d) => [d, zero()]));
  const totals = zero();
  for (const r of rows) {
    if (r.day < from || r.day > to) continue;
    const s = bySource.get(r.source) ?? zero();
    s[r.kind] += r.n;
    bySource.set(r.source, s);
    const d = byDay.get(r.day);
    if (d) d[r.kind] += r.n;
    totals[r.kind] += r.n;
  }
  const sources: SourceSummary[] = [...bySource]
    .map(([source, t]) => ({ source, ...t }))
    .sort((a, b) => b.visit - a.visit || b.game - a.game || a.source.localeCompare(b.source));
  const days: DaySummary[] = [...byDay].map(([day, t]) => ({ day, ...t }));
  return { sources, days, totals };
}

const createdMs = (g: GameDoc): number => {
  const c = g.createdAt as { toMillis?: () => number } | null | undefined;
  return typeof c?.toMillis === 'function' ? c.toMillis() : g.playedAt.toMillis();
};

export interface GameActivity {
  /** Real (non-test) games recorded in the window. */
  games: number;
  /** Of those, recorded by guests (Alpha vs Beta). */
  guestGames: number;
  /** Distinct accounts that recorded at least one game in the window. */
  activeOwners: number;
  /** Accounts whose first ever game falls into the window. */
  newOwners: number;
  /** Distinct accounts with at least one game, ever. */
  allOwners: number;
}

/** Activity by record time (`createdAt`), not play date — "what happened in the app" in `[fromMs, toMs)`. */
export function gameActivity(games: readonly GameDoc[], fromMs: number, toMs: number): GameActivity {
  const first = new Map<string, number>();
  const active = new Set<string>();
  let n = 0;
  let guest = 0;
  for (const g of games) {
    if (g.isTestData) continue;
    const ms = createdMs(g);
    const prev = first.get(g.ownerUid);
    if (prev === undefined || ms < prev) first.set(g.ownerUid, ms);
    if (ms < fromMs || ms >= toMs) continue;
    n++;
    if (isGuestPlayer(g.p1.playerId)) guest++;
    active.add(g.ownerUid);
  }
  let newOwners = 0;
  for (const ms of first.values()) if (ms >= fromMs && ms < toMs) newOwners++;
  return { games: n, guestGames: guest, activeOwners: active.size, newOwners, allOwners: first.size };
}
