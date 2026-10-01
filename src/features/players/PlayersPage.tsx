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
import { useT } from '@/i18n';
import { deletePlayer, setPlayerArchived } from '@/repo/players';
import { playerRecords, recentForm, useStats, type PlayerRecordRow } from '@/stats';
import { PlayerDialog } from './PlayerDialog';
import s from './PlayersPage.module.css';

type DialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'rename'; player: PlayerDoc } | { kind: 'delete'; player: PlayerDoc };

export default function PlayersPage() {
  const { t } = useT();
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
      toast.push({ title: archived ? t('players.toast.archived') : t('players.toast.restored'), description: p.name });
    } catch (e) {
      toast.push({ title: t('players.toast.updateFailed'), description: (e as Error).message, tone: 'loss' });
    } finally {
      setBusyId(null);
    }
  };

  const onSetMe = async (p: PlayerDoc) => {
    try {
      await setDefaultPlayerId(defaultPlayerId === p.id ? undefined : p.id);
      toast.push({ title: defaultPlayerId === p.id ? t('players.toast.defaultCleared') : t('players.toast.youAre', { name: p.name }), tone: 'win' });
    } catch (e) {
      toast.push({ title: t('players.toast.settingFailed'), description: (e as Error).message, tone: 'loss' });
    }
  };

  const onDelete = async (p: PlayerDoc) => {
    setBusyId(p.id);
    try {
      await deletePlayer(uid, p.id);
      if (defaultPlayerId === p.id) await setDefaultPlayerId(undefined);
      toast.push({ title: t('players.toast.deleted'), description: t('players.toast.deletedDesc', { name: p.name, pseudonym: pseudonym(p.id) }) });
      close();
    } catch (e) {
      toast.push({ title: t('players.toast.deleteFailed'), description: (e as Error).message, tone: 'loss' });
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
            {t('players.newPlayer')}
          </Button>
        }
      >
        {t('players.title')}
      </SectionHeader>

      <TerminalLine tone="muted">{t('players.privacy', { example: pseudonym('a3f9x') })}</TerminalLine>

      {loading ? (
        <div className={s.list} aria-busy="true">
          <Skeleton height={72} radius={0} />
          <Skeleton height={72} radius={0} />
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          icon={<IconUser />}
          title={t('players.empty.title')}
          lines={[t('players.empty.line1'), { text: t('players.empty.line2'), tone: 'muted' }]}
          action={
            <Button iconLeft={<IconPlus />} onClick={() => setDialog({ kind: 'create' })}>
              {t('players.createPlayer')}
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 ? (
            <ul className={s.list}>{active.map(row)}</ul>
          ) : (
            <EmptyState compact lines={[t('players.empty.allArchived')]} />
          )}

          {archived.length > 0 ? (
            <section className={s.archived}>
              <button type="button" className={s.archivedToggle} onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
                <IconChevron direction={showArchived ? 'up' : 'down'} size={16} />
                <span>{t('players.archivedSection')}</span>
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
        title={t('players.deleteDialog.title')}
        confirmLabel={t('players.deleteDialog.confirm')}
        danger
        loading={dialog.kind === 'delete' && busyId === dialog.player.id}
      >
        {dialog.kind === 'delete' ? (
          <>
            <p>
              <strong>{dialog.player.name}</strong> {t('players.deleteDialog.body')} <span className="mono">{pseudonym(dialog.player.id)}</span>.
            </p>
            <p className={s.hint}>{t('players.deleteDialog.hint')}</p>
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
  const { t, number, percent } = useT();
  const games = record?.games ?? 0;
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const pct = games > 0 ? percent(wins / games, 0) : null;
  const formText = form.map((r) => (r === 'W' ? t('players.row.formWin') : t('players.row.formLoss'))).join(' ');

  return (
    <li className={cx(s.row, player.archived && s.rowArchived, isMe && s.rowMe)}>
      <div className={s.identity}>
        <div className={s.nameLine}>
          <span className={s.name}>{player.name}</span>
          {isMe ? <Badge tone="accent">{t('players.row.me')}</Badge> : null}
          {player.archived ? <Badge mono>{t('common.game.archived')}</Badge> : null}
        </div>
        <span className={s.pseudonym} title={t('players.row.pseudonymTitle')}>
          {pseudonym(player.id)}
        </span>
      </div>

      <div className={s.record} aria-label={t('players.row.recordAria', { wins, losses })}>
        <span className={s.wl}>
          <span className={s.w}>{number(wins)}</span>
          <span className={s.dash}>–</span>
          <span className={s.l}>{number(losses)}</span>
        </span>
        <span className={s.pct}>{pct ?? '—'}</span>
        <span className={s.form} aria-label={form.length ? t('players.row.formAria', { form: formText }) : t('players.row.noGamesAria')}>
          {form.length === 0 ? (
            <span className={s.formEmpty}>{t('players.row.noGames')}</span>
          ) : (
            form.map((r, i) => <span key={i} className={cx(s.sq, r === 'W' ? s.sqW : s.sqL)} />)
          )}
        </span>
      </div>

      <div className={s.actions}>
        {!player.archived ? (
          <Button
            size="sm"
            variant={isMe ? 'subtle' : 'ghost'}
            iconLeft={<IconUser />}
            onClick={onSetMe}
            aria-pressed={isMe}
            title={isMe ? t('players.row.clearDefault') : t('players.row.useAsDefault')}
          >
            {isMe ? t('players.row.meButton') : t('players.row.setAsMe')}
          </Button>
        ) : null}
        <IconButton label={t('common.actions.rename')} size="sm" onClick={onRename} disabled={busy}>
          <IconEdit />
        </IconButton>
        <Switch
          size="sm"
          checked={player.archived}
          onChange={onArchive}
          disabled={busy}
          label={<span className={s.switchLabel}>{t('players.row.archived')}</span>}
          className={s.switch}
        />
        <IconButton label={t('common.actions.delete')} size="sm" variant="danger" onClick={onDelete} disabled={busy}>
          <IconTrash />
        </IconButton>
      </div>
    </li>
  );
}
