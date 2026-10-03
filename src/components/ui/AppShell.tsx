import { createElement, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useT } from '@/i18n';
import { cx } from './cx';
import { LogoMark } from './LogoMark';
import { Wordmark } from './Wordmark';
import { NAV_ITEMS, type NavItem } from './navItems';
import s from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
  /** Right slot of the top bar (scope toggle, user menu…). */
  topRight?: ReactNode;
  /** Banner rendered under the top bar (e.g. emulator / offline notice). */
  banner?: ReactNode;
  items?: NavItem[];
}

/** Top bar + bottom tab bar (<768px) or left side rail (≥768px). */
export function AppShell({ children, topRight, banner, items = NAV_ITEMS }: AppShellProps) {
  const { t } = useT();
  const labelOf = (it: NavItem) => it.label ?? t(it.labelKey);

  return (
    <div className={s.root}>
      <a href="#main" className={s.skip}>
        {t('ui.shell.skipToContent')}
      </a>

      <header className={s.top}>
        <div className={s.topInner}>
          <Link to="/" className={s.brand} aria-label={t('ui.shell.brand')}>
            <LogoMark size={24} />
            <Wordmark size="sm" />
          </Link>
          {topRight ? <div className={s.topRight}>{topRight}</div> : null}
        </div>
      </header>

      <nav className={s.rail} aria-label={t('ui.shell.primaryNav')}>
        <ul className={s.railList}>
          {items.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end} className={({ isActive }) => cx(s.railLink, isActive && s.active)}>
                <NavIcon item={it} size={20} />
                <span className={s.navLabel}>{labelOf(it)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className={s.railFoot} aria-hidden="true">
          <span className={s.railBits}>0110110010</span>
        </div>
      </nav>

      <div className={s.contentWrap}>
        {banner ? <div className={s.banner}>{banner}</div> : null}
        <main id="main" className={s.main} tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className={s.tabbar} aria-label={t('ui.shell.primaryNav')}>
        <ul className={s.tabList}>
          {items.map((it) => {
            const label = labelOf(it);
            return (
              <li key={it.to}>
                <NavLink to={it.to} end={it.end} className={({ isActive }) => cx(s.tabLink, isActive && s.active)}>
                  <NavIcon item={it} size={22} />
                  <span className={s.tabLabel} data-long={label.length > 8 || undefined}>
                    {label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavIcon({ item, size }: { item: NavItem; size: number }) {
  return (
    <span className={s.navIcon}>
      {createElement(item.icon, { size })}
      {item.badge ? (
        <span className={s.navBadge} aria-label={String(item.badge)}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </span>
  );
}
