import { useMemo, useState } from 'react';
import { Badge, BarList, Chip, Dialog, Panel, StatTile } from '@/components/ui';
import { ProtocolCard, ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { SETS } from '@/data/sets';
import { useT, type TFunction } from '@/i18n';
import { bestCombos, counterPicks, protocolCompileRate, protocolMatchups, protocolUsage, protocolWinRate, type Agg } from '@/stats';
import type { ProtocolId, SetId } from '@/types';
import { DataTable, NumBar, Td, TableRow, WilsonValue, type DataTableColumn } from '../Bits';
import { nextSort } from '../sort';
import { num, pct } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

type SortKey = 'usage' | 'share' | 'rate' | 'lower' | 'compile';

interface Row {
  id: ProtocolId;
  set: SetId;
  decks: number;
  share: number;
  wins: number;
  rate: number;
  lower: number;
  /** False when below the min-sample threshold (win rate shown muted, Wilson hidden). */
  ranked: boolean;
  compiled: number;
  /** Decks with known compile data (winner-only games excluded). */
  compileDecks: number;
  compileRate: number;
}

const columns = (tr: TFunction): DataTableColumn<SortKey | 'protocol' | 'set'>[] => [
  { key: 'protocol', label: tr('stats.protocols.col.protocol'), width: 'minmax(150px, 1.4fr)' },
  { key: 'set', label: tr('stats.protocols.col.set'), width: '76px' },
  { key: 'usage', label: tr('stats.protocols.col.decks'), width: '96px', align: 'right', sortable: true },
  { key: 'share', label: tr('stats.protocols.col.share'), width: '96px', align: 'right', sortable: true, title: tr('stats.protocols.col.shareHint') },
  { key: 'rate', label: tr('stats.protocols.col.rate'), width: '110px', align: 'right', sortable: true },
  { key: 'lower', label: tr('stats.wilson.label'), width: '84px', align: 'right', sortable: true, title: tr('stats.wilson.lowerBound95') },
  { key: 'compile', label: tr('stats.protocols.col.compile'), width: '110px', align: 'right', sortable: true, title: tr('stats.protocols.col.compileHint') },
];

function buildRows(agg: Agg, minSample: number): Row[] {
  const usage = protocolUsage(agg);
  const wr = new Map(protocolWinRate(agg, 1).map((r) => [r.id, r]));
  const cr = new Map(protocolCompileRate(agg, 1).map((r) => [r.id, r]));
  return usage
    .filter((u) => isKnownProtocol(u.id))
    .map((u) => {
      const w = wr.get(u.id);
      const c = cr.get(u.id);
      return {
        id: u.id,
        set: getProtocol(u.id).set,
        decks: u.decks,
        share: u.share,
        wins: w?.wins ?? 0,
        rate: w?.rate ?? 0,
        lower: w?.lower ?? 0,
        ranked: u.decks >= minSample,
        compiled: c?.compiled ?? 0,
        compileDecks: c?.decks ?? 0,
        compileRate: c?.rate ?? 0,
      };
    });
}

export function ProtocolsTab({ agg, minSample }: StatsTabProps) {
  const { t: tr, protocolName, setName, setShort } = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'usage', dir: 'desc' });
  const [setFilter, setSetFilter] = useState<SetId[]>([]);
  const [openId, setOpenId] = useState<ProtocolId | null>(null);

  const rows = useMemo(() => buildRows(agg, minSample), [agg, minSample]);
  const maxDecks = useMemo(() => Math.max(1, ...rows.map((r) => r.decks)), [rows]);
  const cols = useMemo(() => columns(tr), [tr]);

  const visible = useMemo(() => {
    const filtered = setFilter.length ? rows.filter((r) => setFilter.includes(r.set)) : rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (r: Row): number => {
      switch (sort.key) {
        case 'usage':
          return r.decks;
        case 'share':
          return r.share;
        case 'rate':
          // Unranked rows always sink to the bottom, regardless of direction.
          return r.ranked ? r.rate : dir === 1 ? Infinity : -Infinity;
        case 'lower':
          return r.ranked ? r.lower : dir === 1 ? Infinity : -Infinity;
        case 'compile':
          return r.compileRate;
      }
    };
    return [...filtered].sort((a, b) => {
      const d = (val(a) - val(b)) * dir;
      if (d !== 0 && Number.isFinite(d)) return d;
      return b.decks - a.decks || (a.id < b.id ? -1 : 1);
    });
  }, [rows, setFilter, sort]);

  const toggleSet = (id: SetId) => setSetFilter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const setsPresent = useMemo(() => new Set(rows.map((r) => r.set)), [rows]);

  return (
    <div className={t.stack}>
      <Panel
        title={tr('stats.protocols.title')}
        padding="sm"
        headerRight={
          <Badge mono title={tr('stats.protocols.rankedHint', { count: minSample })}>
            {num(visible.length)} · {tr('stats.units.min', { count: minSample })}
          </Badge>
        }
      >
        <div className={t.stack}>
          <div className={t.chips}>
            {SETS.filter((set) => setsPresent.has(set.id)).map((set) => (
              <Chip key={set.id} size="sm" selected={setFilter.includes(set.id)} onClick={() => toggleSet(set.id)} title={setName(set)}>
                {setShort(set)}
              </Chip>
            ))}
            {setFilter.length > 0 ? (
              <Chip size="sm" onClick={() => setSetFilter([])}>
                {tr('common.actions.clear')}
              </Chip>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <div className={t.empty}>{tr('stats.protocols.empty')}</div>
          ) : (
            <DataTable columns={cols} sortKey={sort.key} sortDir={sort.dir} onSort={(k) => setSort((cur) => nextSort(cur, k as SortKey))} label={tr('stats.protocols.tableLabel')}>
              {visible.map((r) => {
                const p = getProtocol(r.id);
                const grad = `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`;
                return (
                  <TableRow key={r.id} onClick={() => setOpenId(r.id)} label={tr('stats.protocols.openDetails', { name: protocolName(p) })}>
                    <Td>
                      <ProtocolChip protocolId={r.id} size="sm" />
                    </Td>
                    <Td>
                      <Badge mono>{setShort(r.set)}</Badge>
                    </Td>
                    <Td align="right">
                      <NumBar label={num(r.decks)} value={r.decks} max={maxDecks} color={grad} />
                    </Td>
                    <Td align="right">
                      <NumBar label={pct(r.share)} value={r.share} max={0.5} color={grad} />
                    </Td>
                    <Td
                      align="right"
                      className={r.ranked ? undefined : 'muted'}
                      title={
                        r.ranked
                          ? tr('stats.protocols.wonOf', { wins: r.wins, decks: r.decks })
                          : tr('stats.protocols.belowMin', { decks: r.decks, min: minSample })
                      }
                    >
                      <NumBar label={pct(r.rate)} value={r.rate} max={1} color={r.ranked ? (r.rate >= 0.5 ? 'var(--win)' : 'var(--loss)') : 'var(--text-dim)'} />
                    </Td>
                    <Td align="right">{r.ranked ? <WilsonValue value={pct(r.lower)} /> : <span className="muted mono">–</span>}</Td>
                    <Td align="right">
                      {r.compileDecks > 0 ? (
                        <NumBar label={pct(r.compileRate)} value={r.compileRate} max={1} color="var(--accent)" />
                      ) : (
                        <span className="muted mono">–</span>
                      )}
                    </Td>
                  </TableRow>
                );
              })}
            </DataTable>
          )}
        </div>
      </Panel>

      <Dialog open={!!openId} onClose={() => setOpenId(null)} title={tr('stats.protocols.detail.title')} width={600}>
        {openId ? <ProtocolDetail agg={agg} id={openId} minSample={minSample} row={rows.find((r) => r.id === openId)} /> : null}
      </Dialog>
    </div>
  );
}

function ProtocolDetail({ agg, id, minSample, row }: { agg: Agg; id: ProtocolId; minSample: number; row?: Row }) {
  const { t: tr } = useT();
  const matchups = useMemo(
    () =>
      protocolMatchups(agg, id)
        .filter((m) => m.games >= 2 && isKnownProtocol(m.id))
        .map((m) => {
          const p = getProtocol(m.id);
          return {
            key: m.id,
            label: <ProtocolChip protocolId={m.id} size="sm" />,
            value: m.rate,
            max: 1,
            color: m.rate >= 0.5 ? `linear-gradient(90deg, ${p.colors.secondary}, var(--win))` : `linear-gradient(90deg, ${p.colors.secondary}, var(--loss))`,
            sub: tr('common.game.games', { count: m.games }),
          };
        }),
    [agg, id, tr],
  );
  const counters = useMemo(() => counterPicks(agg, id, minSample).filter((c) => isKnownProtocol(c.id) && c.winRateAgainst > 0.5).slice(0, 6), [agg, id, minSample]);
  const pairs = useMemo(
    () =>
      bestCombos(agg, 2, minSample)
        .filter((c) => c.ids.includes(id) && c.ids.every(isKnownProtocol))
        .slice(0, 6),
    [agg, id, minSample],
  );

  return (
    <div className={t.stack}>
      <div className={t.detailHead}>
        <ProtocolCard protocolId={id} size="lg" showSet value={row ? pct(row.rate) : undefined} />
        <div className={t.detailTiles}>
          <StatTile size="sm" label={tr('stats.protocols.detail.decks')} value={num(row?.decks ?? 0)} sub={row ? tr('stats.protocols.detail.shareOfAll', { share: pct(row.share) }) : undefined} />
          <StatTile
            size="sm"
            label={tr('common.game.winRate')}
            value={pct(row?.rate ?? 0)}
            tone={(row?.rate ?? 0) >= 0.5 ? 'win' : 'loss'}
            sub={row ? tr('stats.protocols.detail.wilsonSub', { value: pct(row.lower) }) : undefined}
          />
          <StatTile
            size="sm"
            label={tr('common.game.compiled')}
            value={row?.compileDecks ? pct(row.compileRate) : '–'}
            sub={row ? tr('stats.protocols.detail.compiledOf', { compiled: row.compiled, decks: row.compileDecks }) : undefined}
          />
        </div>
      </div>

      <div className={t.sectionLabel}>{tr('stats.protocols.detail.matchups')}</div>
      {matchups.length === 0 ? <div className={t.empty}>{tr('stats.protocols.detail.matchupsEmpty')}</div> : <BarList items={matchups} format={(v) => pct(v)} />}

      <div className={t.sectionLabel}>{tr('stats.protocols.detail.counters', { count: minSample })}</div>
      {counters.length === 0 ? (
        <div className={t.empty}>{tr('stats.protocols.detail.countersEmpty')}</div>
      ) : (
        <ul className={t.list}>
          {counters.map((c) => (
            <li key={c.id} className={t.listRow}>
              <span className={t.ids}>
                <ProtocolChip protocolId={c.id} size="sm" />
              </span>
              <span className={t.listNum}>
                {pct(c.winRateAgainst)} · {tr('stats.units.gamesShort', { count: c.games })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={t.sectionLabel}>{tr('stats.protocols.detail.pairs', { count: minSample })}</div>
      {pairs.length === 0 ? (
        <div className={t.empty}>{tr('stats.protocols.detail.pairsEmpty')}</div>
      ) : (
        <ul className={t.list}>
          {pairs.map((c) => (
            <li key={c.key} className={t.listRow}>
              <span className={t.ids}>
                {c.ids.map((pid) => (
                  <ProtocolChip key={pid} protocolId={pid} size="sm" />
                ))}
              </span>
              <span className={t.listNum}>
                {pct(c.rate)} · <WilsonValue value={pct(c.lower)} /> · {tr('stats.units.decksShort', { count: c.decks })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
