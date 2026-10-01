import type { GameDoc, ProtocolId, SetId } from '@/types';
import { PROTOCOL_BY_ID } from '@/data/protocols';

export interface StatsFilter {
  scope: 'mine' | 'all';
  myUid: string;
  /** Empty or undefined = no set filter. */
  sets?: SetId[];
  /** 'any': at least one of the 6 protocols is from `sets`; 'only': all 6 are. Default 'any'. */
  setMode?: 'any' | 'only';
  /** Inclusive, from the start of that day (local time). */
  from?: Date;
  /** Inclusive, to the end of that day (local time). */
  to?: Date;
  /** Default true. */
  includeTestData?: boolean;
  /** Game must involve this player. */
  playerId?: string;
  /** Game must include this protocol on either side. */
  protocolId?: ProtocolId;
}

const startOfDayMs = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const endOfDayMs = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function filterGames(games: readonly GameDoc[], f: StatsFilter): GameDoc[] {
  const includeTest = f.includeTestData ?? true;
  const setFilter = f.sets && f.sets.length > 0 ? new Set<SetId>(f.sets) : null;
  const only = (f.setMode ?? 'any') === 'only';
  const fromMs = f.from ? startOfDayMs(f.from) : -Infinity;
  const toMs = f.to ? endOfDayMs(f.to) : Infinity;
  const inSets = (id: ProtocolId): boolean => {
    const def = PROTOCOL_BY_ID[id];
    return !!def && !!setFilter && setFilter.has(def.set);
  };

  return games.filter((g) => {
    if (f.scope === 'mine' && g.ownerUid !== f.myUid) return false;
    if (!includeTest && g.isTestData) return false;
    const ms = g.playedAt.toMillis();
    if (ms < fromMs || ms > toMs) return false;
    if (f.playerId && g.p1.playerId !== f.playerId && g.p2.playerId !== f.playerId) return false;
    if (f.protocolId && !g.allProtocols.includes(f.protocolId)) return false;
    if (setFilter) {
      const ok = only ? g.allProtocols.every(inSets) : g.allProtocols.some(inSets);
      if (!ok) return false;
    }
    return true;
  });
}

/** Stable string identifying a filter's semantics; suitable as a memo key. */
export function filterKey(f: StatsFilter): string {
  return [
    f.scope,
    f.myUid,
    f.sets && f.sets.length > 0 ? [...f.sets].sort().join(',') : '',
    f.setMode ?? 'any',
    f.from ? dayKey(f.from) : '',
    f.to ? dayKey(f.to) : '',
    (f.includeTestData ?? true) ? '1' : '0',
    f.playerId ?? '',
    f.protocolId ?? '',
  ].join('|');
}
