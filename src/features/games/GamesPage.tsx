import { useMemo, useState, type ReactNode } from 'react';
import type { Scope, SetId } from '@/types';
import { PROTOCOLS } from '@/data/protocols';
import { ALL_SET_IDS, SETS } from '@/data/sets';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  IconList,
  IconPlus,
  SectionHeader,
  SegmentedControl,
  Select,
  Skeleton,
  TerminalLine,
} from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth, useUid } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { useGamesStore } from '@/store/gamesStore';
import { filterKey, useStats, type StatsFilter } from '@/stats';
import { GameCard } from './GameCard';
import { OffersBanner } from './OffersBanner';
import { readStorage, writeStorage } from './gameUtils';
import s from './GamesPage.module.css';

const SCOPE_KEY = 'compile.scope';
const PAGE = 50;

const isScope = (v: string | null): v is Scope => v === 'mine' || v === 'all';
const isSetId = (v: string): v is SetId => (ALL_SET_IDS as string[]).includes(v);

export default function GamesPage() {
  const { t, number, protocolName, sortProtocols, setName, setShort } = useT();
  const uid = useUid();
  const { players } = usePlayers();
  const ready = useGamesStore((st) => st.ready);
  const hasPendingWrites = useGamesStore((st) => st.hasPendingWrites);
  const fromCache = useGamesStore((st) => st.fromCache);

  const { isAnonymous, isAdmin } = useAuth();
  const [storedScope, setScopeState] = useState<Scope>(() => {
    const v = readStorage('local', SCOPE_KEY);
    return isScope(v) ? v : 'mine';
  });
  // Guests have no "my games" view: always the shared list.
  const scope: Scope = isAnonymous ? 'all' : storedScope;
  const [playerId, setPlayerId] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [setId, setSetId] = useState('');
  const [includeTest, setIncludeTest] = useState(true);

  const setScope = (v: Scope) => {
    setScopeState(v);
    writeStorage('local', SCOPE_KEY, v);
  };

  const filter: StatsFilter = {
    scope,
    myUid: uid,
    playerId: scope === 'mine' && playerId ? playerId : undefined,
    protocolId: protocolId || undefined,
    sets: isSetId(setId) ? [setId] : undefined,
    includeTestData: includeTest,
  };
  const key = filterKey(filter);
  const { games } = useStats(filter);
  const { games: unfiltered } = useStats({ scope, myUid: uid });

  // Page size is tied to the filter it was grown for; a new filter starts over.
  const [page, setPage] = useState({ key, n: PAGE });
  const shown = page.key === key ? page.n : PAGE;
  const visible = games.slice(0, shown);
  const hasMore = games.length > shown;
  const filtersActive = !!filter.playerId || !!filter.protocolId || !!filter.sets || !includeTest;

  const resetFilters = () => {
    setPlayerId('');
    setProtocolId('');
    setSetId('');
    setIncludeTest(true);
  };

  const playerOptions = [
    { value: '', label: t('games.list.filters.allPlayers') },
    ...players.map((p) => ({ value: p.id, label: p.archived ? `${p.name} (${t('common.game.archived')})` : p.name })),
  ];

  /** Protocols grouped by set, for the `<optgroup>` select; names and order follow the app language. */
  const protocolOptions = useMemo(
    () => [
      { value: '', label: t('games.list.filters.allProtocols') },
      ...SETS.flatMap((set) =>
        sortProtocols(PROTOCOLS.filter((p) => p.set === set.id)).map((p) => ({ value: p.id, label: protocolName(p), group: setShort(set) })),
      ),
    ],
    [t, sortProtocols, protocolName, setShort],
  );

  const setOptions = [{ value: '', label: t('games.list.filters.allSets') }, ...SETS.map((st) => ({ value: st.id, label: setName(st) }))];

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          <span className={s.headRight}>
            {hasPendingWrites ? (
              <Badge mono tone="accent" dot>
                {t('common.status.syncing')}
              </Badge>
            ) : fromCache ? (
              <Badge mono>{t('common.status.cached')}</Badge>
            ) : null}
            {ready ? <span className={s.count}>{number(games.length)}</span> : null}
          </span>
        }
      >
        {t('games.list.title')}
      </SectionHeader>

      {!isAnonymous ? <OffersBanner /> : null}

      <div className={s.toolbar}>
        {!isAnonymous ? (
          <SegmentedControl<Scope>
            label={t('common.scope.label')}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'mine', label: t('common.scope.mine') },
              { value: 'all', label: t('common.scope.all') },
            ]}
          />
        ) : null}
        <Button to="/games/new" size="sm" iconLeft={<IconPlus />} className={s.newBtn}>
          {t('games.list.newGame')}
        </Button>
      </div>

      <div className={s.filters}>
        {scope === 'mine' ? <Select label={t('games.list.filters.player')} value={playerId} onChange={setPlayerId} options={playerOptions} /> : null}
        <Select label={t('games.list.filters.protocol')} value={protocolId} onChange={setProtocolId} options={protocolOptions} />
        <Select label={t('games.list.filters.set')} value={setId} onChange={setSetId} options={setOptions} />
        {/* only admins have test data (the source drops it for everyone else) */}
        {isAdmin ? <Checkbox className={s.check} label={t('games.list.filters.includeTestData')} checked={includeTest} onChange={setIncludeTest} /> : null}
      </div>

      {!ready ? (
        <div className={s.list} aria-busy="true">
          <Skeleton height={96} radius={0} />
          <Skeleton height={96} radius={0} />
          <Skeleton height={96} radius={0} />
        </div>
      ) : unfiltered.length === 0 ? (
        <EmptyState
          icon={<IconList />}
          title={t('games.list.empty.title')}
          lines={
            scope === 'mine'
              ? [t('games.list.empty.mineLine1'), { text: t('games.list.empty.mineLine2'), tone: 'muted' }]
              : [t('games.list.empty.allLine1'), { text: t('games.list.empty.allLine2'), tone: 'muted' }]
          }
          action={
            <Button iconLeft={<IconPlus />} to="/games/new">
              {t('games.list.newGame')}
            </Button>
          }
        />
      ) : games.length === 0 ? (
        <EmptyState
          compact
          lines={[t('games.list.empty.noMatch')]}
          action={
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('games.list.filters.reset')}
            </Button>
          }
        />
      ) : (
        <>
          <GameList games={visible} />
          {hasMore ? (
            <div className={s.more}>
              <TerminalLine tone="muted">{t('games.list.showing', { shown: visible.length, total: games.length })}</TerminalLine>
              <Button variant="ghost" onClick={() => setPage({ key, n: shown + PAGE })}>
                {t('common.actions.loadMore')}
              </Button>
            </div>
          ) : filtersActive ? (
            <TerminalLine tone="muted" className={s.foot}>
              {t('games.list.matchCount', { count: games.length, total: unfiltered.length })}
            </TerminalLine>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Newest first with a small month separator whenever `yearMonth` changes. */
function GameList({ games }: { games: ReturnType<typeof useStats>['games'] }) {
  const { yearMonth } = useT();
  const out: ReactNode[] = [];
  let month = '';
  for (const g of games) {
    if (g.yearMonth !== month) {
      month = g.yearMonth;
      out.push(
        <SectionHeader key={`m-${month}`} size="sm" as="h2" className={s.month}>
          {yearMonth(month, { month: 'long', year: 'numeric' })}
        </SectionHeader>,
      );
    }
    out.push(<GameCard key={g.id} game={g} />);
  }
  return <div className={s.list}>{out}</div>;
}
