import type { ReactNode } from 'react';
import type { TKey } from '@/i18n';
import { IconChart, IconHome, IconList, IconPlus, IconSettings, IconUser, type IconProps } from './icons';

export interface NavItem {
  to: string;
  /** Message key rendered via `t()`; e.g. `'ui.nav.home'`. */
  labelKey: TKey;
  /** Optional literal label for custom items; wins over `labelKey` when given. */
  label?: string;
  icon: (p: IconProps) => ReactNode;
  /** Exact match only (for `/` and `/games`). */
  end?: boolean;
  /** Hidden while anonymous (needs named players / own data). */
  accountOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'ui.nav.home', icon: IconHome, end: true },
  { to: '/games/new', labelKey: 'ui.nav.newGame', icon: IconPlus },
  { to: '/games', labelKey: 'ui.nav.games', icon: IconList, end: true },
  { to: '/stats', labelKey: 'ui.nav.stats', icon: IconChart },
  { to: '/players', labelKey: 'ui.nav.players', icon: IconUser, accountOnly: true },
  { to: '/settings', labelKey: 'ui.nav.settings', icon: IconSettings },
];
