import { useState, type ReactNode } from 'react';
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
import { useUid } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { useGamesStore } from '@/store/gamesStore';
import { filterKey, useStats, type StatsFilter } from '@/stats';
import { GameCard } from './GameCard';
import { readStorage, writeStorage } from './gameUtils';
import s from './GamesPage.module.css';

const SCOPE_KEY = 'compile.scope';
const PAGE = 50;

const isScope = (v: string | null): v is Scope => v === 'mine' || v === 'all';
const isSetId = (v: string): v is SetId => (ALL_SET_IDS as string[]).includes(v);

/** Protocols grouped by set, for the `<optgroup>` select. */
const PROTOCOL_GROUPS = SETS.map((set) => ({
  set,
  items: PROTOCOLS.filter((p) => p.set === set.id).sort((a, b) => a.name.localeCompare(b.name)),
}));

export default function GamesPage() {
  const uid = useUid();
  const { players } = usePlayers();
  const ready = useGamesStore((st) => st.ready);
  const hasPendingWrites = useGamesStore((st) => st.hasPendingWrites);
  const fromCache = useGamesStore((st) => st.fromCache);

  const [scope, setScopeState] = useState<Scope>(() => {
    const v = readStorage('local', SCOPE_KEY);
    return isScope(v) ? v : 'mine';
  });
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
    { value: '', label: 'All players' },
    ...players.map((p) => ({ value: p.id, label: p.archived ? `${p.name} (archived)` : p.name })),
  ];

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          <span className={s.headRight}>
            {hasPendingWrites ? <Badge mono tone="accent" dot>syncing…</Badge> : fromCache ? <Badge mono>cached</Badge> : null}
            {ready ? <span className={s.count}>{games.length}</span> : null}
          </span>
        }
      >
        Games
      </SectionHeader>

      <div className={s.toolbar}>
        <SegmentedControl<Scope>
          label="Scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Button to="/games/new" size="sm" iconLeft={<IconPlus />} className={s.newBtn}>
          New game
        </Button>
      </div>

      <div className={s.filters}>
        {scope === 'mine' ? <Select label="Player" value={playerId} onChange={setPlayerId} options={playerOptions} /> : null}
        <Select label="Protocol" value={protocolId} onChange={setProtocolId} options={[{ value: '', label: 'All protocols' }]}>
          {PROTOCOL_GROUPS.map(({ set, items }) => (
            <optgroup key={set.id} label={set.short}>
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Select
          label="Set"
          value={setId}
          onChange={setSetId}
          options={[{ value: '', label: 'All sets' }, ...SETS.map((st) => ({ value: st.id, label: st.name }))]}
        />
        <Checkbox className={s.check} label="Include test data" checked={includeTest} onChange={setIncludeTest} />
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
          title="No games yet"
          lines={
            scope === 'mine'
              ? ['no games recorded.', { text: 'compile your first match to start the log.', tone: 'muted' }]
              : ['the shared log is empty.', { text: 'nobody has recorded a game yet.', tone: 'muted' }]
          }
          action={
            <Button iconLeft={<IconPlus />} to="/games/new">
              New game
            </Button>
          }
        />
      ) : games.length === 0 ? (
        <EmptyState
          compact
          lines={['nothing matches these filters.']}
          action={
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <>
          <GameList games={visible} />
          {hasMore ? (
            <div className={s.more}>
              <TerminalLine tone="muted">
                showing {visible.length} of {games.length}
              </TerminalLine>
              <Button variant="ghost" onClick={() => setPage({ key, n: shown + PAGE })}>
                Load more
              </Button>
            </div>
          ) : filtersActive ? (
            <TerminalLine tone="muted" className={s.foot}>
              {games.length} of {unfiltered.length} games match.
            </TerminalLine>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Newest first with a small month separator whenever `yearMonth` changes. */
function GameList({ games }: { games: ReturnType<typeof useStats>['games'] }) {
  const out: ReactNode[] = [];
  let month = '';
  for (const g of games) {
    if (g.yearMonth !== month) {
      month = g.yearMonth;
      out.push(
        <SectionHeader key={`m-${month}`} size="sm" as="h2" className={s.month}>
          {month}
        </SectionHeader>,
      );
    }
    out.push(<GameCard key={g.id} game={g} />);
  }
  return <div className={s.list}>{out}</div>;
}
