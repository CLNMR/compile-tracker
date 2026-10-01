import type { SetId } from '@/types';

export interface SetDef {
  id: SetId;
  name: string;
  short: string;
  kind: 'main' | 'aux';
  year: number;
}

export const SETS: readonly SetDef[] = [
  { id: 'MN01', name: 'Compile: Main 1', short: 'Main 1', kind: 'main', year: 2024 },
  { id: 'MN02', name: 'Compile: Main 2', short: 'Main 2', kind: 'main', year: 2025 },
  { id: 'MN03', name: 'Compile: Main 3', short: 'Main 3', kind: 'main', year: 2026 },
  { id: 'AX01', name: 'Compile: Aux 1', short: 'Aux 1', kind: 'aux', year: 2024 },
  { id: 'AX02', name: 'Compile: Aux 2', short: 'Aux 2', kind: 'aux', year: 2025 },
  { id: 'AX03', name: 'Compile: Aux 3', short: 'Aux 3', kind: 'aux', year: 2026 },
];

export const SET_BY_ID: Readonly<Record<SetId, SetDef>> = Object.fromEntries(
  SETS.map((s) => [s.id, s]),
) as Record<SetId, SetDef>;

export const DEFAULT_ENABLED_SETS: SetId[] = ['MN01'];
export const ALL_SET_IDS: SetId[] = SETS.map((s) => s.id);
