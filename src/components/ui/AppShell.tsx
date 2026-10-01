import { createElement, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
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
  return (
    <div className={s.root}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>

      <header className={s.top}>
        <div className={s.topInner}>
          <Link to="/" className={s.brand} aria-label="Compile Tracker — home">
            <LogoMark size={24} />
            <Wordmark size="sm" />
          </Link>
          {topRight ? <div className={s.topRight}>{topRight}</div> : null}
        </div>
      </header>

      <nav className={s.rail} aria-label="Primary">
        <ul className={s.railList}>
          {items.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end} className={({ isActive }) => cx(s.railLink, isActive && s.active)}>
                <span className={s.navIcon}>{createElement(it.icon, { size: 20 })}</span>
                <span className={s.navLabel}>{it.label}</span>
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

      <nav className={s.tabbar} aria-label="Primary">
        <ul className={s.tabList}>
          {items.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end} className={({ isActive }) => cx(s.tabLink, isActive && s.active)}>
                <span className={s.navIcon}>{createElement(it.icon, { size: 22 })}</span>
                <span className={s.tabLabel}>{it.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
