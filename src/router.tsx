import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { AppShell, Spinner } from '@/components/ui';
import { RouteError } from '@/app/RouteError';
import { EmulatorBanner } from '@/features/dev/EmulatorBanner';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));
const NewGamePage = lazy(() => import('@/features/games/NewGamePage'));
const GamesPage = lazy(() => import('@/features/games/GamesPage'));
const GameDetailPage = lazy(() => import('@/features/games/GameDetailPage'));
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const DevToolsPage = lazy(() => import('@/features/dev/DevToolsPage'));
const UiKitchenSink = lazy(() => import('@/features/dev/UiKitchenSink'));

const page = (el: ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>;

function Layout() {
  return (
    <AppShell banner={<EmulatorBanner />}>
      <Outlet />
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
      { path: 'games/:id', element: page(<GameDetailPage />) },
      { path: 'games/:id/edit', element: page(<NewGamePage />) },
      { path: 'stats', element: page(<StatsPage />) },
      { path: 'settings', element: page(<SettingsPage />) },
      { path: 'dev', element: page(<DevToolsPage />) },
      { path: 'dev/ui', element: page(<UiKitchenSink />) },
    ],
  },
]);
