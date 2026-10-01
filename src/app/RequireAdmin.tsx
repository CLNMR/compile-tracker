import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

/** Gate for admin-only routes (developer tools, kitchen sink). Non-admins are sent to Settings. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}
