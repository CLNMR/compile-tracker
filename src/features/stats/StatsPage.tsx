import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, IconChart, IconPlus, SegmentedControl, Spinner, Tabs } from '@/components/ui';
import { useUid } from '@/hooks/useAuth';
import { useStats } from '@/stats';
import type { Scope } from '@/types';
import { StatsFilterBar } from './StatsFilterBar';
import { DEFAULT_FILTER_STATE, toStatsFilter, type StatsFilterState } from './filterState';
import { useScope } from './useScope';
import { OverviewTab } from './tabs/OverviewTab';
import { PlayersTab } from './tabs/PlayersTab';
import { ProtocolsTab } from './tabs/ProtocolsTab';
import { CombosTab } from './tabs/CombosTab';
import { HeadToHeadTab } from './tabs/HeadToHeadTab';
import type { StatsTabProps } from './tabs/types';
import s from './StatsPage.module.css';

type TabId = 'overview' | 'players' | 'protocols' | 'combos' | 'h2h';

export default function StatsPage() {
  const uid = useUid();
  const [scope, setScope] = useScope();
  const [filter, setFilter] = useState<StatsFilterState>(DEFAULT_FILTER_STATE);
  const [tab, setTab] = useState<TabId>('overview');

  const statsFilter = useMemo(() => toStatsFilter(filter, scope, uid), [filter, scope, uid]);
  const { games, agg, loading, fromCache } = useStats(statsFilter);

  // H2H is Mine-only: fall back to Overview while All is selected (derived, no effect).
  const activeTab: TabId = tab === 'h2h' && scope === 'all' ? 'overview' : tab;

  const tabProps: StatsTabProps = { agg, games, minSample: filter.minSample, scope };

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div className={s.headRow}>
          <h1 className={s.title}>
            <IconChart size={18} className={s.titleIcon} />
            Stats
          </h1>
          <div className={s.headRight}>
            {fromCache ? (
              <Badge mono title="Showing data from the local cache; it refreshes when the server responds.">
                cached
              </Badge>
            ) : null}
            {!loading ? <Badge mono>{agg.games} games</Badge> : null}
            <SegmentedControl<Scope>
              size="sm"
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'mine', label: 'Mine' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
        </div>
      </header>

      <StatsFilterBar value={filter} onChange={setFilter} />

      <Tabs<TabId>
        label="Stats sections"
        value={activeTab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'players', label: 'Players' },
          { id: 'protocols', label: 'Protocols' },
          { id: 'combos', label: 'Combos' },
          { id: 'h2h', label: 'Head-to-Head', disabled: scope === 'all' },
        ]}
      />
      {scope === 'all' ? <p className={s.hint}>Head-to-Head is available in the Mine scope only — other players' games are pseudonymous.</p> : null}

      {loading && agg.games === 0 ? (
        <div className={s.loading}>
          <Spinner size={24} />
          <span className="mono muted">loading games…</span>
        </div>
      ) : agg.games === 0 ? (
        <EmptyState
          icon={<IconChart />}
          title="No games match"
          lines={[
            scope === 'mine' ? 'no games found in your collection.' : 'no games found.',
            { text: 'record a match or widen the filters to see stats.', tone: 'muted' },
          ]}
          action={
            <Button iconLeft={<IconPlus />} to="/games/new">
              New game
            </Button>
          }
        />
      ) : (
        <div className={s.body} key={activeTab}>
          {activeTab === 'overview' ? <OverviewTab {...tabProps} /> : null}
          {activeTab === 'players' ? <PlayersTab {...tabProps} /> : null}
          {activeTab === 'protocols' ? <ProtocolsTab {...tabProps} /> : null}
          {activeTab === 'combos' ? <CombosTab {...tabProps} /> : null}
          {activeTab === 'h2h' ? <HeadToHeadTab {...tabProps} /> : null}
        </div>
      )}
    </div>
  );
}
