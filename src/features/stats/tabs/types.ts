import type { Agg } from '@/stats';
import type { GameDoc, Scope } from '@/types';

export interface StatsTabProps {
  agg: Agg;
  /** The filtered games the aggregate was built from. */
  games: GameDoc[];
  minSample: number;
  scope: Scope;
}
