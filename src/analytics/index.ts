import { useEmulators } from '@/firebase/app';
import { bumpCounter } from '@/repo/analytics';
import type { CounterKind } from '@/stats/growth';
import { loadCloudflareBeacon } from './cloudflare';
import { useConsentStore } from './consent';
import { disableGa, enableGa, gaEvent, gaUserProperties } from './ga';
import { detectSource, type Source } from './source';

export { useConsentStore, type ConsentChoice } from './consent';
export { SOURCES, type Source } from './source';

/*
 * Three layers:
 *  1. Firestore counters (visits / new users / games / Google links per source and day) — cookie-free, everyone.
 *  2. Cloudflare Web Analytics — cookie-free page views, referrers, countries; no utm tags.
 *  3. Google Analytics — full sessions and events, only after consent.
 */

const env = import.meta.env;
const MEASUREMENT_ID = (env.VITE_FB_MEASUREMENT_ID as string | undefined)?.trim() || '';
const CF_TOKEN = (env.VITE_CF_BEACON_TOKEN as string | undefined)?.trim() || '';

/** Google Analytics is wired up in this build (production with a measurement id). The banner only shows then. */
export const GA_CONFIGURED = env.PROD && !useEmulators && !!MEASUREMENT_ID;
export const CF_CONFIGURED = env.PROD && !useEmulators && !!CF_TOKEN;
/** Counters are written in production and against the emulators, never from `vite dev` on the live project. */
const COUNTERS_ENABLED = env.PROD || useEmulators;

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

/** Captured once at load, before the router touches the URL. */
const landing = {
  href: typeof location !== 'undefined' ? location.href : '',
  source: (typeof location !== 'undefined'
    ? detectSource({ search: location.search, referrer: document.referrer, standalone: isStandalone(), ownHost: location.hostname })
    : 'direct') as Source,
};

/** Source of this visit (utm tag → installed app → referrer → direct). */
export const visitSource = (): Source => landing.source;

let started = false;
let admin = false;
let visitCounted = false;
/** The landing URL (with its utm tags) goes out with the first page view after consent, whenever that is. */
let landingSent = false;
let currentPath: string | null = null;

function count(kind: CounterKind) {
  if (!COUNTERS_ENABLED || admin) return;
  bumpCounter(kind, landing.source).catch((e: unknown) => console.warn(`[analytics] counter ${kind} failed`, e));
}

/** Call once at startup: loads Cloudflare and follows the consent choice for GA. */
export function startAnalytics() {
  if (started) return;
  started = true;
  if (CF_CONFIGURED) loadCloudflareBeacon(CF_TOKEN);
  if (!GA_CONFIGURED) return;
  const apply = (choice: string | null) => {
    if (choice !== 'granted') return disableGa();
    enableGa();
    if (!landingSent && currentPath) sendPageView(currentPath);
  };
  apply(useConsentStore.getState().choice);
  useConsentStore.subscribe((st, prev) => {
    if (st.choice !== prev.choice) apply(st.choice);
  });
}

/** Signed in (anonymous or Google). Counts the visit once per page load and tags GA with the account type. */
export function recordSession({ isAnonymous, isAdmin }: { isAnonymous: boolean; isAdmin: boolean }) {
  admin = isAdmin;
  if (!visitCounted) {
    visitCounted = true;
    count('visit');
  }
  gaUserProperties({ account_type: isAnonymous ? 'guest' : 'google', display_mode: isStandalone() ? 'standalone' : 'browser' });
}

/** A brand-new anonymous identity was created on this device. */
export function recordNewUser() {
  count('newUser');
}

export function recordGameSaved({ guest }: { guest: boolean }) {
  count('game');
  gaEvent('game_saved', { guest });
}

export function recordGoogleLinked() {
  count('link');
  gaEvent('google_linked');
}

export function recordPlayerCreated() {
  gaEvent('player_created');
}

function sendPageView(path: string) {
  const href = landingSent ? location.href : landing.href;
  landingSent = true;
  gaEvent('page_view', { page_location: href, page_path: path, page_title: document.title });
}

/** SPA route change. */
export function recordPageView(path: string) {
  currentPath = path;
  if (GA_CONFIGURED && useConsentStore.getState().choice === 'granted') sendPageView(path);
}

if (typeof window !== 'undefined') {
  window.addEventListener('appinstalled', () => gaEvent('app_installed'));
}
