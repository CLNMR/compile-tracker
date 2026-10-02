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
import { useT } from '@/i18n';
import { firstPlayerAdvantage, playerRecords, protocolUsage, useStats } from '@/stats';
import { GameCard } from '@/features/games/GameCard';
import { readStorage, writeStorage } from '@/features/games/gameUtils';
import { useNow } from '@/features/games/useNow';
import s from './HomePage.module.css';

const HINT_KEY = 'compile.hint.linkAccount.dismissed';

export default function HomePage() {
  const { t, number, percent } = useT();
  const uid = useUid();
  const { isAnonymous } = useAuth();
  const { players, loading: playersLoading } = usePlayers();
  const { defaultPlayerId } = useSettings();
  const label = usePlayerLabel();
  // Guests have no own players or games: the home screen shows everyone's games.
  const { games, agg, loading } = useStats({ scope: isAnonymous ? 'all' : 'mine', myUid: uid });
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
  const first = useMemo(() => firstPlayerAdvantage(agg), [agg]);

  const recent = games.slice(0, 5);
  const booting = loading || (!isAnonymous && playersLoading);
  const showHint = isAnonymous && !hintDismissed;

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <Wordmark size="lg" glitch />
        <div className={s.heroLines}>
          <TerminalLine tone="muted">{t('home.hero.tagline1')}</TerminalLine>
          <TerminalLine tone="muted">{t('home.hero.tagline2')}</TerminalLine>
          <TerminalLine cursor>{t('home.hero.awaiting')}</TerminalLine>
        </div>
        <div className={s.cta}>
          <Button size="lg" to="/games/new" iconLeft={<IconPlus />}>
            {t('home.actions.newGame')}
          </Button>
          {!isAnonymous ? (
            <Button size="lg" variant="ghost" to="/players" iconLeft={<IconUser />}>
              {t('home.actions.players')}
            </Button>
          ) : null}
        </div>
        <BinaryStrip length={40} seed={5} className={s.bits} />
      </header>

      {showHint ? (
        <div className={s.hint} role="status">
          <TerminalLine tone="warn" prompt="!">
            {t('home.hint.guestBefore')}
            <Link to="/settings">{t('home.hint.anonymousLink')}</Link>
            {t('home.hint.guestAfter')}
          </TerminalLine>
          <button type="button" className={s.hintClose} onClick={dismissHint} aria-label={t('home.hint.dismiss')}>
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
      ) : isAnonymous && games.length === 0 ? (
        <EmptyState
          icon={<IconList />}
          title={t('home.empty.noGames.title')}
          lines={[t('home.empty.guest.line1'), { text: t('home.empty.guest.line2'), tone: 'muted' }]}
          action={
            <Button to="/games/new" iconLeft={<IconPlus />}>
              {t('home.actions.newGame')}
            </Button>
          }
        />
      ) : players.length === 0 && games.length === 0 ? (
        <EmptyState
          icon={<IconUser />}
          title={t('home.empty.idle.title')}
          lines={[t('home.empty.idle.line1'), { text: t('home.empty.idle.line2'), tone: 'muted' }]}
          action={
            <Button to="/players" iconLeft={<IconPlus />}>
              {t('home.actions.createPlayers')}
            </Button>
          }
        />
      ) : games.length === 0 ? (
        <EmptyState
          icon={<IconList />}
          title={t('home.empty.noGames.title')}
          lines={[t('home.empty.noGames.ready', { count: players.length }), { text: t('home.empty.noGames.line2'), tone: 'muted' }]}
          action={
            <Button to="/games/new" iconLeft={<IconPlus />}>
              {t('home.actions.newGame')}
            </Button>
          }
        />
      ) : (
        <>
          <div className={s.tiles}>
            <StatTile label={t('home.tiles.gamesRecorded')} value={number(games.length)} sub={t('home.tiles.thisMonth', { count: thisMonth })} />
            {isAnonymous ? (
              <StatTile
                label={t('home.tiles.firstPlayer')}
                value={first.n > 0 ? percent(first.rate, 0) : '—'}
                sub={t('home.tiles.firstPlayerSub', { count: first.n })}
              />
            ) : (
              <StatTile
                label={me ? t('home.tiles.winRateFor', { name: label(me.playerId) }) : t('home.tiles.winRate')}
                value={me && me.games > 0 ? percent(me.rate, 0) : '—'}
                sub={me && me.games > 0 ? t('home.tiles.record', { wins: me.wins, losses: me.losses }) : t('home.tiles.setDefault')}
                tone={me && me.games > 0 ? (me.rate >= 0.5 ? 'win' : 'loss') : 'default'}
              />
            )}
            <StatTile
              label={t('home.tiles.mostUsed')}
              value={topProtocol && isKnownProtocol(topProtocol.id) ? <ProtocolChip protocolId={topProtocol.id} /> : '—'}
              sub={topProtocol ? t('home.tiles.decksShare', { count: topProtocol.decks, share: percent(topProtocol.share, 0) }) : undefined}
              tone="accent"
            />
          </div>

          <Panel
            title={t('home.recent.title')}
            headerRight={
              <Button size="sm" variant="ghost" to="/games" iconRight={<IconChevron direction="right" />}>
                {t('home.actions.allGames')}
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
