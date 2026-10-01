import { createContext, type ReactNode } from 'react';

export type ToastTone = 'default' | 'win' | 'loss' | 'warn';

export interface ToastInput {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Auto-dismiss delay; 0 keeps it until dismissed. Default 3500. */
  durationMs?: number;
}

export interface ToastItem extends ToastInput {
  id: number;
}

export interface ToastApi {
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
