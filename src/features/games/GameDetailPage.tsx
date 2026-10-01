import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { GameDoc, SideKey } from '@/types';
import { isKnownProtocol } from '@/data/protocols';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconEdit,
  IconList,
  IconTrash,
  Panel,
  SectionHeader,
  Spinner,
  TerminalLine,
  cx,
  useMediaQuery,
  useToast,
} from '@/components/ui';
import { ProtocolCard } from '@/components/protocol';
import { useGame } from '@/hooks/useGames';
import { useGamesStore } from '@/store/gamesStore';
import { useUid } from '@/hooks/useAuth';
import { usePlayerLabel } from '@/hooks/usePlayers';
import { deleteGame } from '@/repo/games';
import { formatDateTime, formatRelative, ownerPseudonym, sideLabel } from './gameUtils';
import { useNow } from './useNow';
import s from './GameDetailPage.module.css';

export default function GameDetailPage() {
  const { id } = useParams();
  const game = useGame(id);
  const ready = useGamesStore((st) => st.ready);

  if (!game && !ready) {
    return (
      <div className={s.center}>
        <Spinner size={28} label="Loading game" />
      </div>
    );
  }
  if (!game) {
    return (
      <EmptyState
        icon={<IconList />}
        title="Not found"
        lines={['no game at this address.', { text: 'it may have been deleted, or never compiled.', tone: 'muted' }]}
        action={
          <Button to="/games" variant="ghost">
            All games
          </Button>
        }
      />
    );
  }
  return <GameDetail game={game} />;
}

function GameDetail({ game }: { game: GameDoc }) {
  const uid = useUid();
  const label = usePlayerLabel();
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow();
  const wide = useMediaQuery('(min-width: 720px)');
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = game.ownerUid === uid;
  const playedAt = game.playedAt.toDate();
  const winnerName = sideLabel(game, game.winner, label);
  const firstName = game.firstPlayer ? sideLabel(game, game.firstPlayer, label) : null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteGame(game.id);
      toast.push({ title: 'Game deleted', tone: 'default' });
      navigate('/games', { replace: true });
    } catch (e) {
      setDeleting(false);
      setConfirm(false);
      toast.push({ title: 'Could not delete', description: (e as Error).message, tone: 'loss' });
    }
  };

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          <span className={s.headRight}>
            {game.isTestData ? <Badge tone="warn">test</Badge> : null}
            <time dateTime={playedAt.toISOString()} title={formatDateTime(playedAt)}>
              {formatRelative(playedAt, now)}
            </time>
          </span>
        }
      >
        Game
      </SectionHeader>

      <TerminalLine tone="win" prompt=">" className={s.banner}>
        compile successful — <strong>{winnerName}</strong> wins
      </TerminalLine>

      <div className={s.sides}>
        <SidePanel game={game} side="p1" size={wide ? 'lg' : 'md'} />
        <div className={s.vs} aria-hidden="true">
          vs
        </div>
        <SidePanel game={game} side="p2" size={wide ? 'lg' : 'md'} />
      </div>

      <Panel title="Meta" padding="sm" tone="elevated">
        <dl className={s.meta}>
          <dt>played at</dt>
          <dd>{formatDateTime(playedAt)}</dd>
          <dt>first player</dt>
          <dd>{firstName ?? <span className={s.dim}>unknown</span>}</dd>
          <dt>recorded by</dt>
          <dd>{isOwner ? 'you' : <span className="mono">{ownerPseudonym(game.ownerUid)}</span>}</dd>
          <dt>game id</dt>
          <dd className="mono">{game.id}</dd>
        </dl>
      </Panel>

      {isOwner ? (
        <div className={s.actions}>
          <Button to={`/games/${game.id}/edit`} variant="ghost" iconLeft={<IconEdit />}>
            Edit
          </Button>
          <Button variant="danger" iconLeft={<IconTrash />} onClick={() => setConfirm(true)}>
            Delete
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onClose={() => (deleting ? undefined : setConfirm(false))}
        onConfirm={onDelete}
        title="Delete game?"
        confirmLabel="Delete"
        danger
        loading={deleting}
      >
        This removes the game and its result from every statistic. There is no undo.
      </ConfirmDialog>
    </div>
  );
}

function SidePanel({ game, side, size }: { game: GameDoc; side: SideKey; size: 'md' | 'lg' }) {
  const label = usePlayerLabel();
  const data = side === 'p1' ? game.p1 : game.p2;
  const won = game.winner === side;
  const first = game.firstPlayer === side;
  const compiled = new Set(data.compiled);

  return (
    <section className={cx(s.side, won && s.sideWon)} aria-label={`${sideLabel(game, side, label)} — ${won ? 'winner' : `compiled ${data.compiled.length} of 3`}`}>
      <header className={s.sideHead}>
        <span className={s.sideKey}>{side === 'p1' ? 'P1' : 'P2'}</span>
        <span className={cx(s.sideName, won && s.sideNameWon)}>{sideLabel(game, side, label)}</span>
        <span className={s.sideBadges}>
          {first ? (
            <Badge mono title="Went first">
              1st
            </Badge>
          ) : null}
          {won ? <Badge tone="win">winner</Badge> : <Badge mono>{data.compiled.length} / 3</Badge>}
        </span>
      </header>
      <div className={s.cards}>
        {data.protocols.map((id) =>
          isKnownProtocol(id) ? (
            <ProtocolCard key={id} protocolId={id} size={size} state={compiled.has(id) ? 'compiled' : 'loading'} showSet />
          ) : (
            <Badge key={id} mono>
              {id}
            </Badge>
          ),
        )}
      </div>
    </section>
  );
}
