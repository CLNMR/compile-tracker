import { collectionGroup, doc, getDoc, getDocs, increment, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/app';
import type { Source } from '@/analytics/source';
import { dayKey, parseCounterId, type CounterKind, type CounterRow } from '@/stats/growth';

/*
 * Cookie-free counters: `analytics/{day}/counters/{kind}_{source}` = { day, n }.
 * No uid, no device id — just one increment per event. The rules only allow +1 steps on whitelisted ids;
 * only admins can read them (collection-group query below).
 * Google links also bump the all-time total `analytics/total/counters/link` (no source split) = non-anonymous accounts.
 */

const totalAccountsRef = () => doc(db, 'analytics', 'total', 'counters', 'link');

export async function bumpCounter(kind: CounterKind, source: Source, at: Date = new Date()): Promise<void> {
  const day = dayKey(at);
  const batch = writeBatch(db);
  batch.set(doc(db, 'analytics', day, 'counters', `${kind}_${source}`), { day, n: increment(1) }, { merge: true });
  if (kind === 'link') batch.set(totalAccountsRef(), { day: 'total', n: increment(1) }, { merge: true });
  await batch.commit();
}

/** All Google-linked (non-anonymous) accounts ever. Admin only. Null if the total doc does not exist yet. */
export async function fetchAccountsTotal(): Promise<number | null> {
  const snap = await getDoc(totalAccountsRef());
  const n = (snap.data() as { n?: unknown } | undefined)?.n;
  return typeof n === 'number' ? n : null;
}

/** All counter rows from `fromDay` (inclusive, 'YYYY-MM-DD'). Admin only. */
export async function fetchCounters(fromDay: string): Promise<CounterRow[]> {
  const snap = await getDocs(query(collectionGroup(db, 'counters'), where('day', '>=', fromDay)));
  const rows: CounterRow[] = [];
  for (const d of snap.docs) {
    const parsed = parseCounterId(d.id);
    const data = d.data() as { day?: unknown; n?: unknown };
    if (!parsed || typeof data.day !== 'string' || typeof data.n !== 'number') continue;
    rows.push({ day: data.day, kind: parsed.kind, source: parsed.source, n: data.n });
  }
  return rows;
}
