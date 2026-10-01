import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge, BarList, Panel, Select, IconChevron } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { useT } from '@/i18n';
import { aggregate, headToHead, rate, type Agg } from '@/stats';
import { pseudonym, type GameDoc } from '@/types';
import { cx } from '@/components/ui';
import { num, pct, shortDate } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

const RECENT = 10;

/** Most frequent opponent of `pid` according to the h2h table; null when none. */
function topOpponent(agg: Agg, pid: string): string | null {
  let best: string | null = null;
  let n = 0;
  for (const [key, h] of Object.entries(agg.h2h)) {
    const [a, b] = key.split('|');
    if (a !== pid && b !== pid) continue;
    const other = a === pid ? b : a;
    if (h.games > n) {
      n = h.games;
      best = other;
    }
  }
  return best;
}

export function HeadToHeadTab({ agg, games }: StatsTabProps) {
  const { t: tr } = useT();
  const { players, byId } = usePlayers();
  const { defaultPlayerId } = useSettings();
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  // Players that appear in the filtered games, so the selects only offer meaningful choices.
  const options = useMemo(() => {
    const seen = new Set(Object.keys(agg.byPlayer));
    const list = players.filter((p) => seen.has(p.id)).map((p) => ({ value: p.id, label: p.name + (p.archived ? tr('stats.h2h.archivedSuffix') : '') }));
    // Unknown ids (e.g. deleted players) still get a pseudonym option.
    for (const id of seen) if (!byId.has(id)) list.push({ value: id, label: pseudonym(id) });
    return list.sort((x, y) => (agg.byPlayer[y.value]?.games ?? 0) - (agg.byPlayer[x.value]?.games ?? 0));
  }, [agg, players, byId, tr]);

  const nameOf = (pid: string) => byId.get(pid)?.name ?? pseudonym(pid);

  // Derived defaults: my default player (or the most active one) vs their most frequent opponent.
  const a = useMemo(() => {
    if (selA && agg.byPlayer[selA]) return selA;
    if (defaultPlayerId && agg.byPlayer[defaultPlayerId]) return defaultPlayerId;
    return options[0]?.value ?? null;
  }, [selA, defaultPlayerId, agg, options]);
  const b = useMemo(() => {
    if (selB && selB !== a && agg.byPlayer[selB]) return selB;
    const top = a ? topOpponent(agg, a) : null;
    if (top) return top;
    return options.find((o) => o.value !== a)?.value ?? null;
  }, [selB, a, agg, options]);

  const h2h = a && b ? headToHead(agg, a, b) : null;

  const between = useMemo(() => {
    if (!a || !b) return [] as GameDoc[];
    return games
      .filter((g) => (g.p1.playerId === a && g.p2.playerId === b) || (g.p1.playerId === b && g.p2.playerId === a))
      .sort((x, y) => y.playedAt.toMillis() - x.playedAt.toMillis());
  }, [games, a, b]);
  const subAgg = useMemo(() => aggregate(between), [between]);

  const swap = () => {
    if (!a || !b) return;
    setSelA(b);
    setSelB(a);
  };

  if (options.length < 2) {
    return (
      <Panel title={tr('stats.h2h.title')}>
        <div className={t.empty}>{tr('stats.h2h.needTwo')}</div>
      </Panel>
    );
  }

  return (
    <div className={t.stack}>
      <Panel padding="sm">
        <div className={t.h2hSelects}>
          <Select label={tr('stats.h2h.playerA')} value={a ?? ''} onChange={setSelA} options={options.map((o) => ({ ...o, disabled: o.value === b }))} />
          <button type="button" className={t.vs} onClick={swap} title={tr('stats.h2h.swap')} aria-label={tr('stats.h2h.swap')}>
            {tr('stats.h2h.vs')} <IconChevron direction="right" size={14} />
          </button>
          <Select label={tr('stats.h2h.playerB')} value={b ?? ''} onChange={setSelB} options={options.map((o) => ({ ...o, disabled: o.value === a }))} />
        </div>
      </Panel>

      {a && b && h2h ? (
        <>
          <Panel>
            <div className={t.score}>
              <div>
                <div className={t.scoreName} title={nameOf(a)}>
                  {nameOf(a)}
                </div>
                <div className={cx(t.scoreNum, h2h.aWins >= h2h.bWins ? t.scoreA : t.scoreLead)}>{num(h2h.aWins)}</div>
              </div>
              <div className={t.scoreDash}>–</div>
              <div>
                <div className={t.scoreName} title={nameOf(b)}>
                  {nameOf(b)}
                </div>
                <div className={cx(t.scoreNum, h2h.bWins >= h2h.aWins ? t.scoreB : t.scoreLead)}>{num(h2h.bWins)}</div>
              </div>
              <div className={t.scoreSub}>
                {h2h.games === 0
                  ? tr('stats.h2h.noGames')
                  : tr('stats.h2h.summary', { games: tr('common.game.games', { count: h2h.games }), name: nameOf(a), rate: pct(rate(h2h.aWins, h2h.games)) })}
              </div>
            </div>
          </Panel>

          {h2h.games > 0 ? (
            <>
              <div className={t.twoCol}>
                <ProtocolBreakdown title={nameOf(a)} agg={subAgg} pid={a} />
                <ProtocolBreakdown title={nameOf(b)} agg={subAgg} pid={b} />
              </div>

              <Panel
                title={tr('stats.h2h.recentGames')}
                padding="sm"
                headerRight={
                  <Badge mono>
                    {num(Math.min(RECENT, between.length))} / {num(between.length)}
                  </Badge>
                }
              >
                <ul className={t.gameList}>
                  {between.slice(0, RECENT).map((g) => {
                    const winnerId = (g.winner === 'p1' ? g.p1 : g.p2).playerId;
                    const loserSide = g.winner === 'p1' ? g.p2 : g.p1;
                    return (
                      <li key={g.id}>
                        <Link to={`/games/${g.id}`} className={t.gameRow}>
                          <span className={t.gameDate}>{shortDate(g.playedAt.toMillis())}</span>
                          <span className={t.gameWinner}>
                            <Badge tone="win" mono>
                              {tr('stats.form.win')}
                            </Badge>
                            {nameOf(winnerId)}
                            <span className="muted mono"> {tr('stats.h2h.loserCompiled', { count: loserSide.compiled.length })}</span>
                            {g.isTestData ? <Badge tone="warn">{tr('stats.h2h.test')}</Badge> : null}
                          </span>
                          <IconChevron direction="right" size={16} className={t.gameArrow} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ProtocolBreakdown({ title, agg, pid }: { title: string; agg: Agg; pid: string }) {
  const { t: tr } = useT();
  const items = useMemo(() => {
    const decks = agg.byPlayer[pid]?.protocolDecks ?? {};
    return Object.entries(decks)
      .filter(([id]) => isKnownProtocol(id))
      .map(([id, d]) => ({ id, ...d, rate: rate(d.wins, d.decks) }))
      .sort((x, y) => y.rate - x.rate || y.decks - x.decks || (x.id < y.id ? -1 : 1))
      .map((r) => {
        const p = getProtocol(r.id);
        return {
          key: r.id,
          label: <ProtocolChip protocolId={r.id} size="sm" />,
          value: r.rate,
          max: 1,
          color: `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`,
          sub: tr('stats.h2h.deckSub', { wins: r.wins, decks: r.decks }),
        };
      });
  }, [agg, pid, tr]);
  return (
    <Panel title={title} headerRight={<Badge mono>{tr('stats.h2h.perProtocol')}</Badge>}>
      {items.length === 0 ? <div className={t.empty}>{tr('stats.h2h.noDecks')}</div> : <BarList items={items} format={(v) => pct(v)} />}
    </Panel>
  );
}
