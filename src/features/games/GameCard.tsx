import { Link } from 'react-router';
import type { GameDoc, SideKey } from '@/types';
import { isKnownProtocol } from '@/data/protocols';
import { Badge, cx } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { usePlayerLabel } from '@/hooks/usePlayers';
import { formatDateTime, formatRelative, sideLabel } from './gameUtils';
import { useNow } from './useNow';
import s from './GameCard.module.css';

export interface GameCardProps {
  game: GameDoc;
  /** Tighter paddings and small chips (home page, lists). */
  dense?: boolean;
  className?: string;
}

/** Compact summary of one game; the whole card links to its detail page. */
export function GameCard({ game, dense, className }: GameCardProps) {
  const label = usePlayerLabel();
  const now = useNow();
  const playedAt = game.playedAt.toDate();
  const winnerName = sideLabel(game, game.winner, label);

  return (
    <Link
      to={`/games/${game.id}`}
      className={cx(s.root, dense && s.dense, className)}
      aria-label={`${sideLabel(game, 'p1', label)} vs ${sideLabel(game, 'p2', label)}, ${winnerName} wins, ${formatDateTime(playedAt)}`}
    >
      <div className={s.head}>
        <time className={s.date} dateTime={playedAt.toISOString()} title={formatDateTime(playedAt)}>
          {formatRelative(playedAt, now)}
        </time>
        <span className={s.badges}>
          {game.isTestData ? <Badge tone="warn">test</Badge> : null}
        </span>
      </div>

      <div className={s.sides}>
        <Side game={game} side="p1" dense={dense} />
        <span className={s.vs} aria-hidden="true">
          vs
        </span>
        <Side game={game} side="p2" dense={dense} />
      </div>
    </Link>
  );
}

function Side({ game, side, dense }: { game: GameDoc; side: SideKey; dense?: boolean }) {
  const label = usePlayerLabel();
  const data = side === 'p1' ? game.p1 : game.p2;
  const won = game.winner === side;
  const first = game.firstPlayer === side;
  const compiled = new Set(data.compiled);

  return (
    <div className={cx(s.side, won && s.won)}>
      <div className={s.sideHead}>
        <span className={cx(s.name, won && s.nameWon)}>{sideLabel(game, side, label)}</span>
        {first ? (
          <Badge mono title="Went first">
            1st
          </Badge>
        ) : null}
        {won ? <Badge tone="win">win</Badge> : null}
      </div>
      <div className={s.chips}>
        {data.protocols.map((id) =>
          isKnownProtocol(id) ? (
            <ProtocolChip key={id} protocolId={id} compiled={compiled.has(id)} size={dense ? 'sm' : 'md'} />
          ) : (
            <Badge key={id} mono title="Unknown protocol">
              {id}
            </Badge>
          ),
        )}
      </div>
    </div>
  );
}
