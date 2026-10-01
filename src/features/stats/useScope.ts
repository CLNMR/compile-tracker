import { useCallback, useSyncExternalStore } from 'react';
import type { Scope } from '@/types';

/** Shared with the Games page: both read/write the same key. */
export const SCOPE_STORAGE_KEY = 'compile.scope';

const listeners = new Set<() => void>();

function read(): Scope {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(SCOPE_STORAGE_KEY) : null;
    return v === 'all' ? 'all' : 'mine';
  } catch {
    return 'mine';
  }
}

function write(s: Scope): void {
  try {
    localStorage.setItem(SCOPE_STORAGE_KEY, s);
  } catch {
    /* private mode / quota — keep in-memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SCOPE_STORAGE_KEY) cb();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** localStorage-backed Mine/All scope, synced across components and tabs. */
export function useScope(): [Scope, (s: Scope) => void] {
  const scope = useSyncExternalStore(subscribe, read, () => 'mine' as Scope);
  const set = useCallback((s: Scope) => write(s), []);
  return [scope, set];
}
