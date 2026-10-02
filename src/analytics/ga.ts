import type { Analytics } from 'firebase/analytics';
import { app } from '@/firebase/app';

/*
 * Google Analytics 4 via Firebase. Loaded lazily and only after consent ("basic" consent mode):
 * before that nothing is requested from Google and no cookie is set.
 */

type Params = Record<string, string | number | boolean | undefined>;

let analytics: Analytics | null = null;
let loading: Promise<void> | null = null;
let enabled = false;
/** Calls made while the SDK is still loading. */
let queue: ((a: Analytics) => void)[] = [];

async function load(): Promise<void> {
  const mod = await import('firebase/analytics');
  if (!(await mod.isSupported())) {
    queue = [];
    return;
  }
  mod.setConsent({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  // Page views are sent manually (SPA routes + landing URL with its utm tags).
  analytics = mod.initializeAnalytics(app, { config: { send_page_view: false } });
  mod.setAnalyticsCollectionEnabled(analytics, enabled);
  const a = analytics;
  queue.splice(0).forEach((fn) => fn(a));
}

function withGa(fn: (a: Analytics, mod: typeof import('firebase/analytics')) => void) {
  if (!enabled) return;
  void import('firebase/analytics').then((mod) => {
    if (analytics) fn(analytics, mod);
    else queue.push((a) => fn(a, mod));
  });
}

export function enableGa() {
  enabled = true;
  if (analytics) void import('firebase/analytics').then((m) => analytics && m.setAnalyticsCollectionEnabled(analytics, true));
  loading ??= load().catch((e: unknown) => console.warn('[analytics] GA failed to load', e));
}

/** Consent withdrawn: stop collection and remove the GA cookies. The SDK cannot be unloaded. */
export function disableGa() {
  enabled = false;
  queue = [];
  if (analytics) void import('firebase/analytics').then((m) => analytics && m.setAnalyticsCollectionEnabled(analytics, false));
  deleteGaCookies();
}

export function gaEvent(name: string, params?: Params) {
  withGa((a, mod) => mod.logEvent(a, name, params));
}

export function gaUserProperties(props: Record<string, string>) {
  withGa((a, mod) => mod.setUserProperties(a, props));
}

function deleteGaCookies() {
  if (typeof document === 'undefined') return;
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim();
    if (!name || !/^_ga(_|$)|^_gid$/.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
  }
}
