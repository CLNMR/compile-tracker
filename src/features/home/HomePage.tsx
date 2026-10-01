import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { yearMonthOf } from '@/types';
import { isKnownProtocol } from '@/data/protocols';
import {
  BinaryStrip,
  Button,
  EmptyState,
  IconChevron,
  IconList,
  IconPlus,
  IconUser,
  IconX,
  Panel,
  Skeleton,
  StatTile,
  TerminalLine,
  Wordmark,
} from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { useAuth, useUid } from '@/hooks/useAuth';
import { usePlayerLabel, usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { playerRecords, protocolUsage, useStats } from '@/stats';
import { GameCard } from '@/features/games/GameCard';
import { readStorage, writeStorage } from '@/features/games/gameUtils';
import { useNow } from '@/features/games/useNow';
import s from './HomePage.module.css';

const HINT_KEY = 'compile.hint.linkAccount.dismissed';

export default function HomePage() {
  const uid = useUid();
  const { isAnonymous } = useAuth();
  const { players, loading: playersLoading } = usePlayers();
  const { defaultPlayerId } = useSettings();
  const label = usePlayerLabel();
  const { games, agg, loading } = useStats({ scope: 'mine', myUid: uid });
  const now = useNow();
  const thisMonth = agg.byMonth[yearMonthOf(new Date(now))]?.games ?? 0;

  const [hintDismissed, setHintDismissed] = useState(() => readStorage('local', HINT_KEY) === '1');
  const dismissHint = () => {
    setHintDismissed(true);
    writeStorage('local', HINT_KEY, '1');
  };

  const records = useMemo(() => playerRecords(agg), [agg]);
  const myIds = useMemo(() => new Set(players.map((p) => p.id)), [players]);
  // "Me" = the default player, else my most-played player.
  const me = useMemo(() => {
    if (defaultPlayerId && myIds.has(defaultPlayerId)) {
      return records.find((r) => r.playerId === defaultPlayerId) ?? { playerId: defaultPlayerId, games: 0, wins: 0, losses: 0, rate: 0 };
    }
    return records.filter((r) => myIds.has(r.playerId)).sort((a, b) => b.games - a.games)[0];
  }, [defaultPlayerId, myIds, records]);
  const topProtocol = useMemo(() => protocolUsage(agg)[0], [agg]);

  const recent = games.slice(0, 5);
  const booting = loading || playersLoading;
  const showHint = isAnonymous && games.length >= 3 && !hintDismissed;

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <Wordmark size="lg" glitch />
        <div className={s.heroLines}>
          <TerminalLine tone="muted">solve for sentience.</TerminalLine>
          <TerminalLine tone="muted">six protocols. two players. one compile.</TerminalLine>
          <TerminalLine cursor>awaiting input</TerminalLine>
        </div>
        <div className={s.cta}>
          <Button size="lg" to="/games/new" iconLeft={<IconPlus />}>
            New game
          </Button>
          <Button size="lg" variant="ghost" to="/players" iconLeft={<IconUser />}>
            Players
          </Button>
        </div>
        <BinaryStrip length={40} seed={5} className={s.bits} />
      </header>

      {showHint ? (
        <div className={s.hint} role="status">
          <TerminalLine tone="warn" prompt="!">
            you are anonymous — link a Google account in <Link to="/settings">Settings</Link> to keep your data across devices.
          </TerminalLine>
          <button type="button" className={s.hintClose} onClick={dismissHint} aria-label="Dismiss hint">
            <IconX size={14} />
          </button>
        </div>
      ) : null}

      {booting ? (
        <div className={s.tiles} aria-busy="true">
          <Skeleton height={82} radius={0} />
          <Skeleton height={82} radius={0} />
          <Skeleton height={82} radius={0} />
        </div>
      ) : players.length === 0 && games.length === 0 ? (
        <EmptyState
          icon={<IconUser />}
          title="System idle"
          lines={['no players registered.', { text: 'add yourself and an opponent, then compile your first game.', tone: 'muted' }]}
          action={
            <Button to="/players" iconLeft={<IconPlus />}>
              Create players
            </Button>
          }
        />
      ) : games.length === 0 ? (
        <EmptyState
          icon={<IconList />}
          title="No games yet"
          lines={[`${players.length} player${players.length === 1 ? '' : 's'} ready.`, { text: 'record your first match to unlock stats.', tone: 'muted' }]}
          action={
            <Button to="/games/new" iconLeft={<IconPlus />}>
              New game
            </Button>
          }
        />
      ) : (
        <>
          <div className={s.tiles}>
            <StatTile label="Games recorded" value={games.length} sub={`${thisMonth} this month`} />
            <StatTile
              label={me ? `Win rate · ${label(me.playerId)}` : 'Win rate'}
              value={me && me.games > 0 ? `${Math.round(me.rate * 100)}%` : '—'}
              sub={me && me.games > 0 ? `${me.wins} W · ${me.losses} L` : 'set a default player'}
              tone={me && me.games > 0 ? (me.rate >= 0.5 ? 'win' : 'loss') : 'default'}
            />
            <StatTile
              label="Most used protocol"
              value={topProtocol && isKnownProtocol(topProtocol.id) ? <ProtocolChip protocolId={topProtocol.id} /> : '—'}
              sub={topProtocol ? `${topProtocol.decks} decks · ${Math.round(topProtocol.share * 100)}%` : undefined}
              tone="accent"
            />
          </div>

          <Panel
            title="Recent games"
            headerRight={
              <Button size="sm" variant="ghost" to="/games" iconRight={<IconChevron direction="right" />}>
                All games
              </Button>
            }
          >
            <div className={s.recent}>
              {recent.map((g) => (
                <GameCard key={g.id} game={g} dense />
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
