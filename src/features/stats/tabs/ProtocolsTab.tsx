import { useMemo, useState } from 'react';
import { Badge, BarList, Chip, Dialog, Panel, StatTile } from '@/components/ui';
import { ProtocolCard, ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { SET_BY_ID, SETS } from '@/data/sets';
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
  compileRate: number;
}

const COLUMNS: DataTableColumn<SortKey | 'protocol' | 'set'>[] = [
  { key: 'protocol', label: 'Protocol', width: 'minmax(150px, 1.4fr)' },
  { key: 'set', label: 'Set', width: '76px' },
  { key: 'usage', label: 'Decks', width: '96px', align: 'right', sortable: true },
  { key: 'share', label: 'Usage %', width: '96px', align: 'right', sortable: true, title: 'Share of all decks' },
  { key: 'rate', label: 'Deck win %', width: '110px', align: 'right', sortable: true },
  { key: 'lower', label: 'Wilson', width: '84px', align: 'right', sortable: true, title: 'Wilson lower bound (95%)' },
  { key: 'compile', label: 'Compile %', width: '110px', align: 'right', sortable: true, title: 'How often the protocol itself was compiled by its deck' },
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
        compileRate: c?.rate ?? 0,
      };
    });
}

export function ProtocolsTab({ agg, minSample }: StatsTabProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'usage', dir: 'desc' });
  const [setFilter, setSetFilter] = useState<SetId[]>([]);
  const [openId, setOpenId] = useState<ProtocolId | null>(null);

  const rows = useMemo(() => buildRows(agg, minSample), [agg, minSample]);
  const maxDecks = useMemo(() => Math.max(1, ...rows.map((r) => r.decks)), [rows]);

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
        title="Protocols"
        padding="sm"
        headerRight={
          <Badge mono title={`Win rate and Wilson are ranked only with ≥ ${minSample} decks`}>
            {visible.length} · min {minSample}
          </Badge>
        }
      >
        <div className={t.stack}>
          <div className={t.chips}>
            {SETS.filter((set) => setsPresent.has(set.id)).map((set) => (
              <Chip key={set.id} size="sm" selected={setFilter.includes(set.id)} onClick={() => toggleSet(set.id)} title={set.name}>
                {set.short}
              </Chip>
            ))}
            {setFilter.length > 0 ? (
              <Chip size="sm" onClick={() => setSetFilter([])}>
                Clear
              </Chip>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <div className={t.empty}>no protocols in this selection.</div>
          ) : (
            <DataTable columns={COLUMNS} sortKey={sort.key} sortDir={sort.dir} onSort={(k) => setSort((cur) => nextSort(cur, k as SortKey))} label="Protocol stats">
              {visible.map((r) => {
                const p = getProtocol(r.id);
                const grad = `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`;
                return (
                  <TableRow key={r.id} onClick={() => setOpenId(r.id)} label={`${p.name}: open details`}>
                    <Td>
                      <ProtocolChip protocolId={r.id} size="sm" />
                    </Td>
                    <Td>
                      <Badge mono>{SET_BY_ID[r.set].short}</Badge>
                    </Td>
                    <Td align="right">
                      <NumBar label={num(r.decks)} value={r.decks} max={maxDecks} color={grad} />
                    </Td>
                    <Td align="right">
                      <NumBar label={pct(r.share)} value={r.share} max={0.5} color={grad} />
                    </Td>
                    <Td align="right" className={r.ranked ? undefined : 'muted'} title={r.ranked ? `${r.wins} / ${r.decks} decks won` : `below min sample (${r.decks} < ${minSample})`}>
                      <NumBar label={pct(r.rate)} value={r.rate} max={1} color={r.ranked ? (r.rate >= 0.5 ? 'var(--win)' : 'var(--loss)') : 'var(--text-dim)'} />
                    </Td>
                    <Td align="right">{r.ranked ? <WilsonValue value={pct(r.lower)} /> : <span className="muted mono">–</span>}</Td>
                    <Td align="right">
                      <NumBar label={pct(r.compileRate)} value={r.compileRate} max={1} color="var(--accent)" />
                    </Td>
                  </TableRow>
                );
              })}
            </DataTable>
          )}
        </div>
      </Panel>

      <Dialog open={!!openId} onClose={() => setOpenId(null)} title="Protocol detail" width={600}>
        {openId ? <ProtocolDetail agg={agg} id={openId} minSample={minSample} row={rows.find((r) => r.id === openId)} /> : null}
      </Dialog>
    </div>
  );
}

function ProtocolDetail({ agg, id, minSample, row }: { agg: Agg; id: ProtocolId; minSample: number; row?: Row }) {
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
            sub: `${m.games} games`,
          };
        }),
    [agg, id],
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
          <StatTile size="sm" label="Decks" value={num(row?.decks ?? 0)} sub={row ? `${pct(row.share)} of all` : undefined} />
          <StatTile size="sm" label="Win rate" value={pct(row?.rate ?? 0)} tone={(row?.rate ?? 0) >= 0.5 ? 'win' : 'loss'} sub={row ? `Wilson ${pct(row.lower)}` : undefined} />
          <StatTile size="sm" label="Compiled" value={pct(row?.compileRate ?? 0)} sub={row ? `${num(row.compiled)} / ${num(row.decks)}` : undefined} />
        </div>
      </div>

      <div className={t.sectionLabel}>Matchups — win rate vs decks with…</div>
      {matchups.length === 0 ? <div className={t.empty}>not enough games (min 2 per matchup)</div> : <BarList items={matchups} format={(v) => pct(v)} />}

      <div className={t.sectionLabel}>Counter picks — beats this protocol most often (≥ {minSample} games)</div>
      {counters.length === 0 ? (
        <div className={t.empty}>no clear counters yet</div>
      ) : (
        <ul className={t.list}>
          {counters.map((c) => (
            <li key={c.id} className={t.listRow}>
              <span className={t.ids}>
                <ProtocolChip protocolId={c.id} size="sm" />
              </span>
              <span className={t.listNum}>
                {pct(c.winRateAgainst)} · {c.games} g
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={t.sectionLabel}>Best pairs with it (≥ {minSample} decks)</div>
      {pairs.length === 0 ? (
        <div className={t.empty}>no pairs above the sample threshold</div>
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
                {pct(c.rate)} · <WilsonValue value={pct(c.lower)} /> · {c.decks} d
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
