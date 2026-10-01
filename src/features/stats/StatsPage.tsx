import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, IconChart, IconPlus, SegmentedControl, Spinner, Tabs } from '@/components/ui';
import { useUid } from '@/hooks/useAuth';
import { useT } from '@/i18n';
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
  const { t } = useT();
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
            {t('stats.title')}
          </h1>
          <div className={s.headRight}>
            {fromCache ? (
              <Badge mono title={t('stats.cachedHint')}>
                {t('common.status.cached')}
              </Badge>
            ) : null}
            {!loading ? <Badge mono>{t('common.game.games', { count: agg.games })}</Badge> : null}
            <SegmentedControl<Scope>
              size="sm"
              label={t('common.scope.label')}
              value={scope}
              onChange={setScope}
              options={[
                { value: 'mine', label: t('common.scope.mine') },
                { value: 'all', label: t('common.scope.all') },
              ]}
            />
          </div>
        </div>
      </header>

      <StatsFilterBar value={filter} onChange={setFilter} />

      <Tabs<TabId>
        label={t('stats.tabs.label')}
        value={activeTab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: t('stats.tabs.overview') },
          { id: 'players', label: t('stats.tabs.players') },
          { id: 'protocols', label: t('stats.tabs.protocols') },
          { id: 'combos', label: t('stats.tabs.combos') },
          { id: 'h2h', label: t('stats.tabs.h2h'), disabled: scope === 'all' },
        ]}
      />
      {scope === 'all' ? <p className={s.hint}>{t('stats.h2hMineOnly')}</p> : null}

      {loading && agg.games === 0 ? (
        <div className={s.loading}>
          <Spinner size={24} />
          <span className="mono muted">{t('stats.loadingGames')}</span>
        </div>
      ) : agg.games === 0 ? (
        <EmptyState
          icon={<IconChart />}
          title={t('stats.empty.title')}
          lines={[scope === 'mine' ? t('stats.empty.mine') : t('stats.empty.all'), { text: t('stats.empty.hint'), tone: 'muted' }]}
          action={
            <Button iconLeft={<IconPlus />} to="/games/new">
              {t('stats.empty.newGame')}
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
