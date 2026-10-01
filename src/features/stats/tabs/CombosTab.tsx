import { useMemo, useState } from 'react';
import { Badge, Panel, SegmentedControl } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { isKnownProtocol } from '@/data/protocols';
import { bestCombos, type ComboRow } from '@/stats';
import { cx } from '@/components/ui';
import { DataTable, InlineBar, Td, TableRow, WilsonValue, type DataTableColumn } from '../Bits';
import { num, pct, WILSON_HINT } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

type RankBy = 'wilson' | 'raw';
const TOP = 20;

const columns = (k: 2 | 3): DataTableColumn[] => [
  { key: 'rank', label: '#', width: '44px', title: WILSON_HINT },
  { key: 'ids', label: k === 2 ? 'Pair' : 'Deck', width: k === 2 ? 'minmax(190px, 1.6fr)' : 'minmax(280px, 2fr)' },
  { key: 'decks', label: 'Decks', width: '64px', align: 'right' },
  { key: 'wins', label: 'W', width: '48px', align: 'right' },
  { key: 'rate', label: 'Win %', width: '72px', align: 'right' },
  { key: 'lower', label: 'Wilson', width: '72px', align: 'right', title: WILSON_HINT },
  { key: 'bar', label: '', width: '90px' },
];

function rank(rows: ComboRow[], by: RankBy): ComboRow[] {
  if (by === 'wilson') return rows; // bestCombos already sorts by lower
  return [...rows].sort((a, b) => b.rate - a.rate || b.decks - a.decks || b.lower - a.lower || (a.key < b.key ? -1 : 1));
}

export function CombosTab({ agg, minSample }: StatsTabProps) {
  const [rankBy, setRankBy] = useState<RankBy>('wilson');

  const pairsAll = useMemo(() => bestCombos(agg, 2, minSample).filter((c) => c.ids.every(isKnownProtocol)), [agg, minSample]);
  const decksAll = useMemo(() => bestCombos(agg, 3, minSample).filter((c) => c.ids.every(isKnownProtocol)), [agg, minSample]);

  const pairs = useMemo(() => rank(pairsAll, rankBy).slice(0, TOP), [pairsAll, rankBy]);
  const decks = useMemo(() => rank(decksAll, rankBy).slice(0, TOP), [decksAll, rankBy]);
  const worst = useMemo(
    () => [...pairsAll].sort((a, b) => a.rate - b.rate || b.decks - a.decks || a.lower - b.lower || (a.key < b.key ? -1 : 1)).slice(0, 10),
    [pairsAll],
  );

  return (
    <div className={t.stack}>
      <div className={t.toolbar}>
        <span className={t.sub}>
          Combos with ≥ {minSample} decks · {pairsAll.length} pairs · {decksAll.length} decks
        </span>
        <SegmentedControl<RankBy>
          size="sm"
          label="Rank by"
          value={rankBy}
          onChange={setRankBy}
          options={[
            { value: 'wilson', label: 'Wilson' },
            { value: 'raw', label: 'Raw win %' },
          ]}
        />
      </div>

      <div className={t.twoCol}>
        <Panel title="Best pairs" padding="sm" headerRight={<Badge mono>top {Math.min(TOP, pairs.length)}</Badge>}>
          <ComboTable rows={pairs} k={2} rankBy={rankBy} emptyText={`no pairs with ≥ ${minSample} decks — lower the min sample.`} />
        </Panel>
        <Panel title="Best decks" padding="sm" headerRight={<Badge mono>top {Math.min(TOP, decks.length)}</Badge>}>
          <ComboTable rows={decks} k={3} rankBy={rankBy} emptyText={`no 3-protocol decks with ≥ ${minSample} decks — lower the min sample.`} />
        </Panel>
      </div>

      <Panel padding="sm">
        <details className={t.details}>
          <summary>Worst pairs</summary>
          <div className={t.detailsBody}>
            <ComboTable rows={worst} k={2} rankBy="raw" worst emptyText="nothing to show." />
          </div>
        </details>
      </Panel>
    </div>
  );
}

function ComboTable({ rows, k, rankBy, worst, emptyText }: { rows: ComboRow[]; k: 2 | 3; rankBy: RankBy; worst?: boolean; emptyText: string }) {
  if (rows.length === 0) return <div className={t.empty}>{emptyText}</div>;
  const cols = columns(k);
  return (
    <DataTable columns={cols} label={k === 2 ? 'Pairs' : 'Decks'}>
      {rows.map((c, i) => (
        <TableRow key={c.key}>
          <Td>
            <span className={cx(t.rank, i === 0 && !worst && t.rankTop)} title={rankBy === 'wilson' ? WILSON_HINT : 'Ranked by raw win rate'}>
              {i + 1}
            </span>
          </Td>
          <Td>
            <span className={t.ids}>
              {c.ids.map((id) => (
                <ProtocolChip key={id} protocolId={id} size="sm" />
              ))}
            </span>
          </Td>
          <Td align="right" mono>
            {num(c.decks)}
          </Td>
          <Td align="right" mono>
            {num(c.wins)}
          </Td>
          <Td align="right" mono>
            {pct(c.rate)}
          </Td>
          <Td align="right">
            <WilsonValue value={pct(c.lower)} />
          </Td>
          <Td>
            <InlineBar value={rankBy === 'wilson' ? c.lower : c.rate} max={1} color={worst ? 'var(--loss)' : c.rate >= 0.5 ? 'var(--win)' : 'var(--warn)'} />
          </Td>
        </TableRow>
      ))}
    </DataTable>
  );
}
