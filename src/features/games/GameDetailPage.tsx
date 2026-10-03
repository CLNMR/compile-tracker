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
import { useT } from '@/i18n';
import { useGame } from '@/hooks/useGames';
import { useGamesStore } from '@/store/gamesStore';
import { useUid } from '@/hooks/useAuth';
import { usePlayerLabel } from '@/hooks/usePlayers';
import { deleteGame } from '@/repo/games';
import { formatRelative, ownerPseudonym, sideLabel } from './gameUtils';
import { useNow } from './useNow';
import s from './GameDetailPage.module.css';

export default function GameDetailPage() {
  const { t } = useT();
  const { id } = useParams();
  const game = useGame(id);
  const ready = useGamesStore((st) => st.ready);

  if (!game && !ready) {
    return (
      <div className={s.center}>
        <Spinner size={28} label={t('games.detail.loading')} />
      </div>
    );
  }
  if (!game) {
    return (
      <EmptyState
        icon={<IconList />}
        title={t('games.notFound.title')}
        lines={[t('games.notFound.line1'), { text: t('games.notFound.line2'), tone: 'muted' }]}
        action={
          <Button to="/games" variant="ghost">
            {t('games.notFound.allGames')}
          </Button>
        }
      />
    );
  }
  return <GameDetail game={game} />;
}

function GameDetail({ game }: { game: GameDoc }) {
  const { t, locale, dateTime } = useT();
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
      toast.push({ title: t('games.detail.toast.deleted'), tone: 'default' });
      navigate('/games', { replace: true });
    } catch (e) {
      setDeleting(false);
      setConfirm(false);
      toast.push({ title: t('games.detail.toast.deleteFailed'), description: (e as Error).message, tone: 'loss' });
    }
  };

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          <span className={s.headRight}>
            {game.isTestData ? <Badge tone="warn">{t('games.card.test')}</Badge> : null}
            <time dateTime={playedAt.toISOString()} title={dateTime(playedAt)}>
              {formatRelative(playedAt, locale, now)}
            </time>
          </span>
        }
      >
        {t('games.detail.title')}
      </SectionHeader>

      <TerminalLine tone="win" prompt=">" className={s.banner}>
        {t('games.detail.bannerPrefix')}
        <strong>{winnerName}</strong>
        {t('games.detail.bannerSuffix')}
      </TerminalLine>

      <div className={s.sides}>
        <SidePanel game={game} side="p1" size={wide ? 'lg' : 'md'} />
        <div className={s.vs} aria-hidden="true">
          {t('games.card.vs')}
        </div>
        <SidePanel game={game} side="p2" size={wide ? 'lg' : 'md'} />
      </div>

      <Panel title={t('games.detail.meta.title')} padding="sm" tone="elevated">
        <dl className={s.meta}>
          <dt>{t('games.detail.meta.playedAt')}</dt>
          <dd>{dateTime(playedAt)}</dd>
          <dt>{t('games.detail.meta.firstPlayer')}</dt>
          <dd>{firstName ?? <span className={s.dim}>{t('games.detail.meta.unknown')}</span>}</dd>
          {game.compileUnknown ? (
            <>
              <dt>{t('games.detail.meta.compiled')}</dt>
              <dd className={s.dim}>{t('games.detail.meta.winnerOnly')}</dd>
            </>
          ) : null}
          <dt>{t('games.detail.meta.recordedBy')}</dt>
          <dd>{isOwner ? t('games.detail.meta.you') : <span className="mono">{ownerPseudonym(game.ownerUid)}</span>}</dd>
          <dt>{t('games.detail.meta.gameId')}</dt>
          <dd className="mono">{game.id}</dd>
        </dl>
      </Panel>

      {isOwner ? (
        <div className={s.actions}>
          <Button to={`/games/${game.id}/edit`} variant="ghost" iconLeft={<IconEdit />}>
            {t('common.actions.edit')}
          </Button>
          <Button variant="danger" iconLeft={<IconTrash />} onClick={() => setConfirm(true)}>
            {t('common.actions.delete')}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onClose={() => (deleting ? undefined : setConfirm(false))}
        onConfirm={onDelete}
        title={t('games.detail.deleteDialog.title')}
        confirmLabel={t('common.actions.delete')}
        danger
        loading={deleting}
      >
        {t('games.detail.deleteDialog.body')}
      </ConfirmDialog>
    </div>
  );
}

function SidePanel({ game, side, size }: { game: GameDoc; side: SideKey; size: 'md' | 'lg' }) {
  const { t } = useT();
  const label = usePlayerLabel();
  const data = side === 'p1' ? game.p1 : game.p2;
  const won = game.winner === side;
  const first = game.firstPlayer === side;
  const compiled = new Set(data.compiled);
  const name = sideLabel(game, side, label);

  return (
    <section
      className={cx(s.side, won && s.sideWon)}
      aria-label={
        won
          ? t('games.detail.sideAriaWinner', { name })
          : game.compileUnknown
            ? t('games.detail.sideAriaUnknown', { name })
            : t('games.detail.sideAriaCompiled', { name, compiled: data.compiled.length })
      }
    >
      <header className={s.sideHead}>
        <span className={s.sideKey}>{side === 'p1' ? 'P1' : 'P2'}</span>
        <span className={cx(s.sideName, won && s.sideNameWon)}>{name}</span>
        <span className={s.sideBadges}>
          {first ? (
            <Badge mono title={t('games.card.wentFirst')}>
              {t('games.card.first')}
            </Badge>
          ) : null}
          {won ? (
            <Badge tone="win">{t('games.card.winner')}</Badge>
          ) : game.compileUnknown ? (
            <Badge mono title={t('games.card.compiledUnknownTitle')}>
              {t('games.card.compiledUnknown')}
            </Badge>
          ) : (
            <Badge mono>{t('games.card.compiledOf', { compiled: data.compiled.length })}</Badge>
          )}
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
