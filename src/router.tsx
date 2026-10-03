import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { createBrowserRouter, Outlet, useLocation } from 'react-router';
import { AppShell, NAV_ITEMS, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { RouteError } from '@/app/RouteError';
import { EmulatorBanner } from '@/features/dev/EmulatorBanner';
import { RequireAdmin } from '@/app/RequireAdmin';
import { ConsentBanner } from '@/app/ConsentBanner';
import { recordPageView } from '@/analytics';
import { LegalLinks } from '@/features/legal/LegalLinks';
import { usePendingOfferCount } from '@/hooks/useOffers';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));
const NewGamePage = lazy(() => import('@/features/games/NewGamePage'));
const GamesPage = lazy(() => import('@/features/games/GamesPage'));
const GameDetailPage = lazy(() => import('@/features/games/GameDetailPage'));
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const DevToolsPage = lazy(() => import('@/features/dev/DevToolsPage'));
const UiKitchenSink = lazy(() => import('@/features/dev/UiKitchenSink'));
const LegalPage = lazy(() => import('@/features/legal/LegalPage'));
const OffersPage = lazy(() => import('@/features/games/OffersPage'));
const AddFriendPage = lazy(() => import('@/features/players/AddFriendPage'));

const page = (el: ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>;

const GUEST_NAV_ITEMS = NAV_ITEMS.filter((it) => !it.accountOnly);

function Layout() {
  const isAnonymous = useAuthStore((st) => st.isAnonymous);
  const { pathname } = useLocation();
  useEffect(() => recordPageView(pathname), [pathname]);
  const pending = usePendingOfferCount();
  const items = useMemo(
    () => (isAnonymous ? GUEST_NAV_ITEMS : NAV_ITEMS.map((it) => (it.to === '/games' && pending > 0 ? { ...it, badge: pending } : it))),
    [isAnonymous, pending],
  );
  return (
    <AppShell banner={<EmulatorBanner />} items={items}>
      <Outlet />
      <LegalLinks />
      <ConsentBanner />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<HomePage />) },
      { path: 'players', element: page(<PlayersPage />) },
      { path: 'games', element: page(<GamesPage />) },
      { path: 'games/new', element: page(<NewGamePage />) },
      { path: 'games/offers', element: page(<OffersPage />) },
      { path: 'add/:handle', element: page(<AddFriendPage />) },
      { path: 'games/:id', element: page(<GameDetailPage />) },
      { path: 'games/:id/edit', element: page(<NewGamePage />) },
      { path: 'stats', element: page(<StatsPage />) },
      { path: 'settings', element: page(<SettingsPage />) },
      { path: 'privacy', element: page(<LegalPage kind="privacy" />) },
      { path: 'datenschutz', element: page(<LegalPage kind="privacy" />) },
      { path: 'imprint', element: page(<LegalPage kind="imprint" />) },
      { path: 'impressum', element: page(<LegalPage kind="imprint" />) },
      { path: 'dev', element: <RequireAdmin>{page(<DevToolsPage />)}</RequireAdmin> },
      { path: 'dev/ui', element: <RequireAdmin>{page(<UiKitchenSink />)}</RequireAdmin> },
    ],
  },
]);
