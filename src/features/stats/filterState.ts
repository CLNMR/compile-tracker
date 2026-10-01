import type { StatsFilter } from '@/stats';
import type { Scope, SetId } from '@/types';
import { fromDateInput, toDateInput } from './format';

export type DatePreset = 'all' | '30d' | '90d' | 'year';

/** UI state of the filter bar (strings for the date inputs). */
export interface StatsFilterState {
  sets: SetId[];
  setMode: 'any' | 'only';
  /** `YYYY-MM-DD` or ''. */
  from: string;
  to: string;
  /** Minimum decks/games for combos and protocol win-rate ranking. */
  minSample: number;
  includeTestData: boolean;
}

export const DEFAULT_MIN_SAMPLE = 3;
export const MIN_SAMPLE_RANGE = { min: 1, max: 20 } as const;

export const DEFAULT_FILTER_STATE: StatsFilterState = {
  sets: [],
  setMode: 'any',
  from: '',
  to: '',
  minSample: DEFAULT_MIN_SAMPLE,
  includeTestData: true,
};

/** Number of filters that differ from the default (for the mobile "Filters" badge). */
export function activeFilterCount(f: StatsFilterState): number {
  let n = 0;
  if (f.sets.length > 0) n++;
  if (f.from || f.to) n++;
  if (f.minSample !== DEFAULT_MIN_SAMPLE) n++;
  if (!f.includeTestData) n++;
  return n;
}

export function presetRange(preset: DatePreset, now = new Date()): Pick<StatsFilterState, 'from' | 'to'> {
  if (preset === 'all') return { from: '', to: '' };
  const to = toDateInput(now);
  if (preset === 'year') return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to };
  const days = preset === '30d' ? 30 : 90;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return { from: toDateInput(d), to };
}

/** Which preset the current from/to matches, if any. */
export function matchPreset(f: Pick<StatsFilterState, 'from' | 'to'>, now = new Date()): DatePreset | null {
  for (const p of ['all', '30d', '90d', 'year'] as const) {
    const r = presetRange(p, now);
    if (r.from === f.from && r.to === f.to) return p;
  }
  return null;
}

export function toStatsFilter(state: StatsFilterState, scope: Scope, myUid: string): StatsFilter {
  return {
    scope,
    myUid,
    sets: state.sets.length ? state.sets : undefined,
    setMode: state.setMode,
    from: fromDateInput(state.from),
    to: fromDateInput(state.to),
    includeTestData: state.includeTestData,
  };
}
