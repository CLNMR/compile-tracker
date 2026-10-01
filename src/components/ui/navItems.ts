import type { ReactNode } from 'react';
import { IconChart, IconHome, IconList, IconPlus, IconSettings, type IconProps } from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: (p: IconProps) => ReactNode;
  /** Exact match only (for `/` and `/games`). */
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/games/new', label: 'New game', icon: IconPlus },
  { to: '/games', label: 'Games', icon: IconList, end: true },
  { to: '/stats', label: 'Stats', icon: IconChart },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];
