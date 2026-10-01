import { useMemo, useState } from 'react';
import { Badge, BarList, Dialog, Panel, StatTile } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { usePlayers } from '@/hooks/usePlayers';
import { useT, type TFunction } from '@/i18n';
import { playerRecords, rate, recentForm, streaks, type PlayerRecordRow } from '@/stats';
import { pseudonym } from '@/types';
import { DataTable, FormSquares, Td, TableRow, WilsonValue, type DataTableColumn } from '../Bits';
import { num, pct, record, streakLabel } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

const ALL_MIN_GAMES = 5;

const columns = (tr: TFunction): DataTableColumn[] => [
  { key: 'player', label: tr('stats.players.col.player'), width: 'minmax(140px, 1.4fr)' },
  { key: 'games', label: tr('stats.players.col.games'), width: '64px', align: 'right' },
  { key: 'wl', label: tr('stats.players.col.wl'), width: '72px', align: 'right' },
  { key: 'rate', label: tr('stats.players.col.rate'), width: '68px', align: 'right' },
  { key: 'lower', label: tr('stats.wilson.label'), width: '72px', align: 'right', title: tr('stats.wilson.lowerBound95') },
  { key: 'first', label: tr('stats.players.col.first'), width: '64px', align: 'right', title: tr('stats.players.col.firstHint') },
  { key: 'comp', label: tr('stats.players.col.compiled'), width: '150px', align: 'right', title: tr('stats.players.col.compiledHint') },
  { key: 'fav', label: tr('stats.players.col.favourite'), width: '130px' },
  { key: 'best', label: tr('stats.players.col.best'), width: '130px', title: tr('stats.players.col.bestHint') },
  { key: 'form', label: tr('stats.players.col.form'), width: '140px' },
  { key: 'streak', label: tr('stats.players.col.streak'), width: '64px', align: 'right' },
];

export function PlayersTab({ agg, games, scope }: StatsTabProps) {
  const { t: tr } = useT();
  const { byId } = usePlayers();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = playerRecords(agg);
    return scope === 'all' ? all.filter((r) => r.games >= ALL_MIN_GAMES) : all;
  }, [agg, scope]);
  const cols = useMemo(() => columns(tr), [tr]);

  const nameOf = (pid: string) => (scope === 'mine' ? (byId.get(pid)?.name ?? pseudonym(pid)) : pseudonym(pid));

  const openRow = openId ? rows.find((r) => r.playerId === openId) : undefined;

  return (
    <div className={t.stack}>
      <Panel
        title={tr('stats.players.title')}
        padding="sm"
        headerRight={
          <Badge mono title={scope === 'all' ? tr('stats.players.rankedMinHint', { count: ALL_MIN_GAMES }) : tr('stats.players.rankedHint')}>
            {num(rows.length)} {scope === 'all' ? tr('stats.players.minBadge', { count: ALL_MIN_GAMES }) : ''}
          </Badge>
        }
      >
        {rows.length === 0 ? (
          <div className={t.empty}>{scope === 'all' ? tr('stats.players.emptyAll', { count: ALL_MIN_GAMES }) : tr('stats.players.emptyMine')}</div>
        ) : (
          <DataTable columns={cols} label={tr('stats.players.tableLabel')}>
            {rows.map((r) => (
              <PlayerRow
                key={r.playerId}
                row={r}
                name={nameOf(r.playerId)}
                form={recentForm(games, r.playerId)}
                streak={streaks(games, r.playerId).current}
                onClick={scope === 'mine' ? () => setOpenId(r.playerId) : undefined}
              />
            ))}
          </DataTable>
        )}
      </Panel>

      <Dialog open={!!openRow} onClose={() => setOpenId(null)} title={openRow ? nameOf(openRow.playerId) : ''} width={560}>
        {openRow ? <PlayerDetail row={openRow} decks={agg.byPlayer[openRow.playerId]?.protocolDecks ?? {}} /> : null}
      </Dialog>
    </div>
  );
}

function PlayerRow({ row, name, form, streak, onClick }: { row: PlayerRecordRow; name: string; form: ('W' | 'L')[]; streak: number; onClick?: () => void }) {
  const { t: tr } = useT();
  const tone = streak > 0 ? 'win' : streak < 0 ? 'loss' : undefined;
  return (
    <TableRow onClick={onClick} label={onClick ? tr('stats.players.openBreakdown', { name }) : undefined}>
      <Td title={name}>{name}</Td>
      <Td align="right" mono>
        {num(row.games)}
      </Td>
      <Td align="right" mono>
        {record(row.wins, row.losses)}
      </Td>
      <Td align="right" mono>
        {pct(row.rate)}
      </Td>
      <Td align="right">
        <WilsonValue value={pct(row.lower)} />
      </Td>
      <Td align="right" mono>
        {pct(row.firstRate)}
      </Td>
      <Td align="right" mono>
        {num(row.avgCompiledFor, 2)} / {num(row.avgCompiledAgainst, 2)}
      </Td>
      <Td>{row.favourite && isKnownProtocol(row.favourite) ? <ProtocolChip protocolId={row.favourite} size="sm" /> : <span className="muted">–</span>}</Td>
      <Td>{row.best && isKnownProtocol(row.best) ? <ProtocolChip protocolId={row.best} size="sm" /> : <span className="muted">–</span>}</Td>
      <Td>
        <FormSquares form={form} />
      </Td>
      <Td align="right">
        <Badge tone={tone} mono>
          {streakLabel(streak)}
        </Badge>
      </Td>
    </TableRow>
  );
}

function PlayerDetail({ row, decks }: { row: PlayerRecordRow; decks: Record<string, { decks: number; wins: number }> }) {
  const { t: tr } = useT();
  // `tr` is stable per locale, so listing it also refreshes the locale-bound pct() output.
  const items = useMemo(
    () =>
      Object.entries(decks)
        .filter(([id]) => isKnownProtocol(id))
        .sort((a, b) => b[1].decks - a[1].decks || b[1].wins - a[1].wins || (a[0] < b[0] ? -1 : 1))
        .map(([id, d]) => {
          const p = getProtocol(id);
          const r = rate(d.wins, d.decks);
          return {
            key: id,
            label: <ProtocolChip protocolId={id} size="sm" />,
            value: d.decks,
            color: `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`,
            sub: tr('stats.players.detail.deckSub', { wins: d.wins, rate: pct(r) }),
          };
        }),
    [decks, tr],
  );
  return (
    <div className={t.stack}>
      <div className={t.tiles3}>
        <StatTile size="sm" label={tr('stats.players.detail.games')} value={num(row.games)} sub={record(row.wins, row.losses)} />
        <StatTile size="sm" label={tr('common.game.winRate')} value={pct(row.rate)} tone={row.rate >= 0.5 ? 'win' : 'loss'} />
        <StatTile size="sm" label={tr('stats.wilson.label')} value={pct(row.lower)} sub={tr('stats.wilson.lowerBound')} />
      </div>
      <div className={t.sectionLabel}>{tr('stats.players.detail.protocolsPlayed')}</div>
      {items.length === 0 ? (
        <div className={t.empty}>{tr('stats.players.detail.noDecks')}</div>
      ) : (
        <BarList items={items} format={(v) => tr('stats.units.decks', { count: v })} />
      )}
    </div>
  );
}
