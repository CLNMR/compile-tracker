export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** Toggles direction when the same key is chosen again; otherwise switches key with `defaultDir`. */
export function nextSort<K extends string>(cur: SortState<K>, key: K, defaultDir: SortDir = 'desc'): SortState<K> {
  if (cur.key === key) return { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' };
  return { key, dir: defaultDir };
}
