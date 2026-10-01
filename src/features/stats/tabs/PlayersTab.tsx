import { useMemo, useState } from 'react';
import { Badge, BarList, Dialog, Panel, StatTile } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { usePlayers } from '@/hooks/usePlayers';
import { playerRecords, rate, recentForm, streaks, type PlayerRecordRow } from '@/stats';
import { pseudonym } from '@/types';
import { DataTable, FormSquares, Td, TableRow, WilsonValue, type DataTableColumn } from '../Bits';
import { num, pct, record, streakLabel } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

const ALL_MIN_GAMES = 5;

const COLUMNS: DataTableColumn[] = [
  { key: 'player', label: 'Player', width: 'minmax(140px, 1.4fr)' },
  { key: 'games', label: 'Games', width: '64px', align: 'right' },
  { key: 'wl', label: 'W–L', width: '72px', align: 'right' },
  { key: 'rate', label: 'Win %', width: '68px', align: 'right' },
  { key: 'lower', label: 'Wilson', width: '72px', align: 'right', title: 'Wilson lower bound (95%)' },
  { key: 'first', label: 'First', width: '64px', align: 'right', title: 'Share of games where this player went first' },
  { key: 'comp', label: 'Compiled for / against', width: '150px', align: 'right', title: 'Average protocols compiled per game' },
  { key: 'fav', label: 'Favourite', width: '130px' },
  { key: 'best', label: 'Best', width: '130px', title: 'Highest win rate with at least 3 decks' },
  { key: 'form', label: 'Form', width: '140px' },
  { key: 'streak', label: 'Streak', width: '64px', align: 'right' },
];

export function PlayersTab({ agg, games, scope }: StatsTabProps) {
  const { byId } = usePlayers();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = playerRecords(agg);
    return scope === 'all' ? all.filter((r) => r.games >= ALL_MIN_GAMES) : all;
  }, [agg, scope]);

  const nameOf = (pid: string) => (scope === 'mine' ? (byId.get(pid)?.name ?? pseudonym(pid)) : pseudonym(pid));

  const openRow = openId ? rows.find((r) => r.playerId === openId) : undefined;

  return (
    <div className={t.stack}>
      <Panel
        title="Players"
        padding="sm"
        headerRight={
          <Badge mono title={scope === 'all' ? `Players with at least ${ALL_MIN_GAMES} games, ranked by Wilson lower bound` : 'Ranked by Wilson lower bound'}>
            {rows.length} {scope === 'all' ? `· ≥${ALL_MIN_GAMES} games` : ''}
          </Badge>
        }
      >
        {rows.length === 0 ? (
          <div className={t.empty}>{scope === 'all' ? `no player has ${ALL_MIN_GAMES}+ games in this selection.` : 'no players in this selection.'}</div>
        ) : (
          <DataTable columns={COLUMNS} label="Player records">
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
  const tone = streak > 0 ? 'win' : streak < 0 ? 'loss' : undefined;
  return (
    <TableRow onClick={onClick} label={onClick ? `${name}: open protocol breakdown` : undefined}>
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
            sub: `${d.wins} W · ${pct(r)} win rate`,
          };
        }),
    [decks],
  );
  return (
    <div className={t.stack}>
      <div className={t.tiles3}>
        <StatTile size="sm" label="Games" value={num(row.games)} sub={record(row.wins, row.losses)} />
        <StatTile size="sm" label="Win rate" value={pct(row.rate)} tone={row.rate >= 0.5 ? 'win' : 'loss'} />
        <StatTile size="sm" label="Wilson" value={pct(row.lower)} sub="lower bound" />
      </div>
      <div className={t.sectionLabel}>Protocols played</div>
      {items.length === 0 ? <div className={t.empty}>no decks</div> : <BarList items={items} format={(v) => `${num(v)} decks`} />}
    </div>
  );
}
