import { useAuthStore } from '@/store/authStore';

/** Convenience selector over the auth store. */
export function useAuth() {
  return useAuthStore();
}

/** Non-null uid for screens rendered only after auth bootstrapped. */
export function useUid(): string {
  const uid = useAuthStore((s) => s.uid);
  if (!uid) throw new Error('useUid called before auth resolved');
  return uid;
}
