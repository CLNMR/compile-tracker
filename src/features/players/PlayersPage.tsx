import { useMemo, useState } from 'react';
import { pseudonym, type PlayerDoc } from '@/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  IconChevron,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUser,
  SectionHeader,
  Skeleton,
  Switch,
  TerminalLine,
  cx,
  useToast,
} from '@/components/ui';
import { useUid } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { deletePlayer, setPlayerArchived } from '@/repo/players';
import { playerRecords, recentForm, useStats, type PlayerRecordRow } from '@/stats';
import { PlayerDialog } from './PlayerDialog';
import s from './PlayersPage.module.css';

type DialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'rename'; player: PlayerDoc } | { kind: 'delete'; player: PlayerDoc };

export default function PlayersPage() {
  const uid = useUid();
  const toast = useToast();
  const { players, loading } = usePlayers();
  const { defaultPlayerId, setDefaultPlayerId } = useSettings();
  const { games, agg } = useStats({ scope: 'mine', myUid: uid });

  const records = useMemo(() => new Map(playerRecords(agg).map((r) => [r.playerId, r])), [agg]);
  const active = players.filter((p) => !p.archived);
  const archived = players.filter((p) => p.archived);

  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const close = () => setDialog({ kind: 'closed' });

  const onArchive = async (p: PlayerDoc, archived: boolean) => {
    setBusyId(p.id);
    try {
      await setPlayerArchived(uid, p.id, archived);
      if (archived && defaultPlayerId === p.id) await setDefaultPlayerId(undefined);
      toast.push({ title: archived ? 'Player archived' : 'Player restored', description: p.name });
    } catch (e) {
      toast.push({ title: 'Could not update player', description: (e as Error).message, tone: 'loss' });
    } finally {
      setBusyId(null);
    }
  };

  const onSetMe = async (p: PlayerDoc) => {
    try {
      await setDefaultPlayerId(defaultPlayerId === p.id ? undefined : p.id);
      toast.push({ title: defaultPlayerId === p.id ? 'Default player cleared' : `You are ${p.name}`, tone: 'win' });
    } catch (e) {
      toast.push({ title: 'Could not save setting', description: (e as Error).message, tone: 'loss' });
    }
  };

  const onDelete = async (p: PlayerDoc) => {
    setBusyId(p.id);
    try {
      await deletePlayer(uid, p.id);
      if (defaultPlayerId === p.id) await setDefaultPlayerId(undefined);
      toast.push({ title: 'Player deleted', description: `${p.name} now shows as ${pseudonym(p.id)}` });
      close();
    } catch (e) {
      toast.push({ title: 'Could not delete player', description: (e as Error).message, tone: 'loss' });
    } finally {
      setBusyId(null);
    }
  };

  const row = (p: PlayerDoc) => (
    <PlayerRow
      key={p.id}
      player={p}
      record={records.get(p.id)}
      form={recentForm(games, p.id, 10)}
      isMe={defaultPlayerId === p.id}
      busy={busyId === p.id}
      onRename={() => setDialog({ kind: 'rename', player: p })}
      onArchive={(v) => void onArchive(p, v)}
      onDelete={() => setDialog({ kind: 'delete', player: p })}
      onSetMe={() => void onSetMe(p)}
    />
  );

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          <Button size="sm" iconLeft={<IconPlus />} onClick={() => setDialog({ kind: 'create' })}>
            New player
          </Button>
        }
      >
        Players
      </SectionHeader>

      <TerminalLine tone="muted">names stay on this device's account — other users only see pseudonyms like {pseudonym('a3f9x')}.</TerminalLine>

      {loading ? (
        <div className={s.list} aria-busy="true">
          <Skeleton height={72} radius={0} />
          <Skeleton height={72} radius={0} />
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<IconUser />}
          title="No players yet"
          lines={['no players registered.', { text: 'add yourself and your opponents to start recording games.', tone: 'muted' }]}
          action={
            <Button iconLeft={<IconPlus />} onClick={() => setDialog({ kind: 'create' })}>
              Create player
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 ? (
            <ul className={s.list}>{active.map(row)}</ul>
          ) : (
            <EmptyState compact lines={['all players are archived.']} />
          )}

          {archived.length > 0 ? (
            <section className={s.archived}>
              <button type="button" className={s.archivedToggle} onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
                <IconChevron direction={showArchived ? 'up' : 'down'} size={16} />
                <span>Archived</span>
                <Badge mono>{archived.length}</Badge>
              </button>
              {showArchived ? <ul className={cx(s.list, s.listArchived)}>{archived.map(row)}</ul> : null}
            </section>
          ) : null}
        </>
      )}

      <PlayerDialog open={dialog.kind === 'create'} onClose={close} />
      <PlayerDialog open={dialog.kind === 'rename'} onClose={close} player={dialog.kind === 'rename' ? dialog.player : undefined} />
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        onClose={close}
        onConfirm={() => (dialog.kind === 'delete' ? onDelete(dialog.player) : undefined)}
        title="Delete player?"
        confirmLabel="Delete"
        danger
        loading={dialog.kind === 'delete' && busyId === dialog.player.id}
      >
        {dialog.kind === 'delete' ? (
          <>
            <p>
              <strong>{dialog.player.name}</strong> will be removed from your players. Games are kept, but will show this player as the pseudonym{' '}
              <span className="mono">{pseudonym(dialog.player.id)}</span>.
            </p>
            <p className={s.hint}>Prefer archiving if you just want to hide them from the pickers.</p>
          </>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

interface PlayerRowProps {
  player: PlayerDoc;
  record?: PlayerRecordRow;
  form: ('W' | 'L')[];
  isMe: boolean;
  busy: boolean;
  onRename: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
  onSetMe: () => void;
}

function PlayerRow({ player, record, form, isMe, busy, onRename, onArchive, onDelete, onSetMe }: PlayerRowProps) {
  const games = record?.games ?? 0;
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const pct = games > 0 ? Math.round((wins / games) * 100) : null;

  return (
    <li className={cx(s.row, player.archived && s.rowArchived, isMe && s.rowMe)}>
      <div className={s.identity}>
        <div className={s.nameLine}>
          <span className={s.name}>{player.name}</span>
          {isMe ? <Badge tone="accent">me</Badge> : null}
          {player.archived ? <Badge mono>archived</Badge> : null}
        </div>
        <span className={s.pseudonym} title="Pseudonym shown to other users">
          {pseudonym(player.id)}
        </span>
      </div>

      <div className={s.record} aria-label={`${wins} wins, ${losses} losses`}>
        <span className={s.wl}>
          <span className={s.w}>{wins}</span>
          <span className={s.dash}>–</span>
          <span className={s.l}>{losses}</span>
        </span>
        <span className={s.pct}>{pct == null ? '—' : `${pct}%`}</span>
        <span className={s.form} aria-label={form.length ? `recent form ${form.join(' ')}` : 'no games yet'}>
          {form.length === 0 ? <span className={s.formEmpty}>no games</span> : form.map((r, i) => <span key={i} className={cx(s.sq, r === 'W' ? s.sqW : s.sqL)} />)}
        </span>
      </div>

      <div className={s.actions}>
        {!player.archived ? (
          <Button size="sm" variant={isMe ? 'subtle' : 'ghost'} iconLeft={<IconUser />} onClick={onSetMe} aria-pressed={isMe} title={isMe ? 'Clear default player' : 'Use as default player'}>
            {isMe ? 'Me' : 'Set as me'}
          </Button>
        ) : null}
        <IconButton label="Rename" size="sm" onClick={onRename} disabled={busy}>
          <IconEdit />
        </IconButton>
        <Switch size="sm" checked={player.archived} onChange={onArchive} disabled={busy} label={<span className={s.switchLabel}>Archived</span>} className={s.switch} />
        <IconButton label="Delete" size="sm" variant="danger" onClick={onDelete} disabled={busy}>
          <IconTrash />
        </IconButton>
      </div>
    </li>
  );
}
