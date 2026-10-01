import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge, BarList, Panel, Select, IconChevron } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
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
  const { players, byId } = usePlayers();
  const { defaultPlayerId } = useSettings();
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  // Players that appear in the filtered games, so the selects only offer meaningful choices.
  const options = useMemo(() => {
    const seen = new Set(Object.keys(agg.byPlayer));
    const list = players.filter((p) => seen.has(p.id)).map((p) => ({ value: p.id, label: p.name + (p.archived ? ' (archived)' : '') }));
    // Unknown ids (e.g. deleted players) still get a pseudonym option.
    for (const id of seen) if (!byId.has(id)) list.push({ value: id, label: pseudonym(id) });
    return list.sort((x, y) => (agg.byPlayer[y.value]?.games ?? 0) - (agg.byPlayer[x.value]?.games ?? 0));
  }, [agg, players, byId]);

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
      <Panel title="Head-to-Head">
        <div className={t.empty}>you need games between at least two of your players.</div>
      </Panel>
    );
  }

  return (
    <div className={t.stack}>
      <Panel padding="sm">
        <div className={t.h2hSelects}>
          <Select label="Player A" value={a ?? ''} onChange={setSelA} options={options.map((o) => ({ ...o, disabled: o.value === b }))} />
          <button type="button" className={t.vs} onClick={swap} title="Swap players" aria-label="Swap players">
            VS <IconChevron direction="right" size={14} />
          </button>
          <Select label="Player B" value={b ?? ''} onChange={setSelB} options={options.map((o) => ({ ...o, disabled: o.value === a }))} />
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
                <div className={cx(t.scoreNum, h2h.aWins >= h2h.bWins ? t.scoreA : t.scoreLead)}>{h2h.aWins}</div>
              </div>
              <div className={t.scoreDash}>–</div>
              <div>
                <div className={t.scoreName} title={nameOf(b)}>
                  {nameOf(b)}
                </div>
                <div className={cx(t.scoreNum, h2h.bWins >= h2h.aWins ? t.scoreB : t.scoreLead)}>{h2h.bWins}</div>
              </div>
              <div className={t.scoreSub}>
                {h2h.games === 0 ? 'no games between these players in this selection' : `${num(h2h.games)} games · ${nameOf(a)} wins ${pct(rate(h2h.aWins, h2h.games))}`}
              </div>
            </div>
          </Panel>

          {h2h.games > 0 ? (
            <>
              <div className={t.twoCol}>
                <ProtocolBreakdown title={nameOf(a)} agg={subAgg} pid={a} />
                <ProtocolBreakdown title={nameOf(b)} agg={subAgg} pid={b} />
              </div>

              <Panel title="Recent games" padding="sm" headerRight={<Badge mono>{Math.min(RECENT, between.length)} / {between.length}</Badge>}>
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
                              W
                            </Badge>
                            {nameOf(winnerId)}
                            <span className="muted mono"> · loser compiled {loserSide.compiled.length}</span>
                            {g.isTestData ? <Badge tone="warn">test</Badge> : null}
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
          sub: `${r.wins} / ${r.decks} decks`,
        };
      });
  }, [agg, pid]);
  return (
    <Panel title={title} headerRight={<Badge mono>win rate per protocol</Badge>}>
      {items.length === 0 ? <div className={t.empty}>no decks</div> : <BarList items={items} format={(v) => pct(v)} />}
    </Panel>
  );
}
