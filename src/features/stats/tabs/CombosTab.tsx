import { useMemo, useState } from 'react';
import { Badge, Panel, SegmentedControl } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { isKnownProtocol } from '@/data/protocols';
import { useT, type TFunction } from '@/i18n';
import { bestCombos, type ComboRow } from '@/stats';
import { cx } from '@/components/ui';
import { DataTable, InlineBar, Td, TableRow, WilsonValue, type DataTableColumn } from '../Bits';
import { num, pct } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

type RankBy = 'wilson' | 'raw';
const TOP = 20;

const columns = (tr: TFunction, k: 2 | 3): DataTableColumn[] => [
  { key: 'rank', label: tr('stats.units.rank'), width: '44px', title: tr('stats.wilson.hint') },
  { key: 'ids', label: k === 2 ? tr('stats.combos.col.pair') : tr('stats.combos.col.deck'), width: k === 2 ? 'minmax(190px, 1.6fr)' : 'minmax(280px, 2fr)' },
  { key: 'decks', label: tr('stats.combos.col.decks'), width: '64px', align: 'right' },
  { key: 'wins', label: tr('stats.combos.col.wins'), width: '48px', align: 'right' },
  { key: 'rate', label: tr('stats.combos.col.rate'), width: '72px', align: 'right' },
  { key: 'lower', label: tr('stats.wilson.label'), width: '72px', align: 'right', title: tr('stats.wilson.hint') },
  { key: 'bar', label: '', width: '90px' },
];

function rank(rows: ComboRow[], by: RankBy): ComboRow[] {
  if (by === 'wilson') return rows; // bestCombos already sorts by lower
  return [...rows].sort((a, b) => b.rate - a.rate || b.decks - a.decks || b.lower - a.lower || (a.key < b.key ? -1 : 1));
}

export function CombosTab({ agg, minSample }: StatsTabProps) {
  const { t: tr } = useT();
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
        <span className={t.sub}>{tr('stats.combos.summary', { min: minSample, pairs: pairsAll.length, decks: decksAll.length })}</span>
        <SegmentedControl<RankBy>
          size="sm"
          label={tr('stats.combos.rankBy')}
          value={rankBy}
          onChange={setRankBy}
          options={[
            { value: 'wilson', label: tr('stats.wilson.label') },
            { value: 'raw', label: tr('stats.combos.rankRaw') },
          ]}
        />
      </div>

      <div className={t.twoCol}>
        <Panel title={tr('stats.combos.bestPairs')} padding="sm" headerRight={<Badge mono>{tr('stats.units.top', { count: Math.min(TOP, pairs.length) })}</Badge>}>
          <ComboTable rows={pairs} k={2} rankBy={rankBy} emptyText={tr('stats.combos.emptyPairs', { count: minSample })} />
        </Panel>
        <Panel title={tr('stats.combos.bestDecks')} padding="sm" headerRight={<Badge mono>{tr('stats.units.top', { count: Math.min(TOP, decks.length) })}</Badge>}>
          <ComboTable rows={decks} k={3} rankBy={rankBy} emptyText={tr('stats.combos.emptyDecks', { count: minSample })} />
        </Panel>
      </div>

      <Panel padding="sm">
        <details className={t.details}>
          <summary>{tr('stats.combos.worstPairs')}</summary>
          <div className={t.detailsBody}>
            <ComboTable rows={worst} k={2} rankBy="raw" worst emptyText={tr('stats.combos.emptyWorst')} />
          </div>
        </details>
      </Panel>
    </div>
  );
}

function ComboTable({ rows, k, rankBy, worst, emptyText }: { rows: ComboRow[]; k: 2 | 3; rankBy: RankBy; worst?: boolean; emptyText: string }) {
  const { t: tr } = useT();
  const cols = useMemo(() => columns(tr, k), [tr, k]);
  if (rows.length === 0) return <div className={t.empty}>{emptyText}</div>;
  return (
    <DataTable columns={cols} label={k === 2 ? tr('stats.combos.pairs') : tr('stats.combos.decks')}>
      {rows.map((c, i) => (
        <TableRow key={c.key}>
          <Td>
            <span className={cx(t.rank, i === 0 && !worst && t.rankTop)} title={rankBy === 'wilson' ? tr('stats.wilson.hint') : tr('stats.combos.rankedByRaw')}>
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
