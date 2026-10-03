import { useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import {
  Badge,
  Button,
  EmptyState,
  IconCheck,
  IconChevron,
  IconInbox,
  IconX,
  SectionHeader,
  Select,
  Skeleton,
  TerminalLine,
  useToast,
} from '@/components/ui';
import { useAuth, useUid } from '@/hooks/useAuth';
import { friendLinks } from '@/hooks/useGames';
import { useOfferedGames, type OfferedGame } from '@/hooks/useOffers';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { useT } from '@/i18n';
import { setOfferStatus } from '@/repo/offers';
import { useFriendsStore } from '@/store/friendsStore';
import { remapOffered } from '@/stats/perspective';
import type { OfferStatus } from '@/types';
import { GameCard } from './GameCard';
import s from './OffersPage.module.css';

export default function OffersPage() {
  const { isAnonymous } = useAuth();
  if (isAnonymous) return <Navigate to="/" replace />;
  return <Offers />;
}

function Offers() {
  const { t } = useT();
  const uid = useUid();
  const toast = useToast();
  const { pending, accepted, declined, loading } = useOfferedGames();
  const { defaultPlayerId } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (ids: string[], status: OfferStatus, key: string) => {
    setBusy(key);
    try {
      await setOfferStatus(uid, ids, status);
      toast.push({ title: t(status === 'accepted' ? 'friends.offers.toast.accepted' : 'friends.offers.toast.declined', { count: ids.length }), tone: status === 'accepted' ? 'win' : 'default' });
    } catch (e) {
      toast.push({ title: t('friends.offers.failed'), description: (e as Error).message, tone: 'loss' });
    } finally {
      setBusy(null);
    }
  };

  const canAccept = !!defaultPlayerId;

  return (
    <div className={s.page}>
      <SectionHeader
        as="h1"
        right={
          pending.length > 1 ? (
            <Button
              size="sm"
              iconLeft={<IconCheck />}
              disabled={!canAccept}
              loading={busy === 'all'}
              onClick={() => void decide(pending.map((o) => o.game.id), 'accepted', 'all')}
            >
              {t('friends.offers.acceptAll')}
            </Button>
          ) : null
        }
      >
        {t('friends.offers.title')}
      </SectionHeader>

      <TerminalLine tone="muted">{t('friends.offers.intro')}</TerminalLine>
      {!canAccept && pending.length > 0 ? <ChooseMe /> : null}

      {loading ? (
        <Skeleton height={120} radius={0} />
      ) : pending.length === 0 ? (
        <EmptyState compact icon={<IconInbox />} lines={[t('friends.offers.empty')]} />
      ) : (
        <ul className={s.list}>
          {pending.map((o) => (
            <OfferRow key={o.game.id} item={o}>
              <Button size="sm" variant="subtle" iconLeft={<IconX />} disabled={busy === o.game.id} onClick={() => void decide([o.game.id], 'declined', o.game.id)}>
                {t('friends.offers.decline')}
              </Button>
              <Button size="sm" iconLeft={<IconCheck />} disabled={!canAccept || busy === o.game.id} onClick={() => void decide([o.game.id], 'accepted', o.game.id)}>
                {t('friends.offers.accept')}
              </Button>
            </OfferRow>
          ))}
        </ul>
      )}

      <Decided title={t('friends.offers.accepted')} items={accepted}>
        {(o) => (
          <Button size="sm" variant="subtle" iconLeft={<IconX />} loading={busy === o.game.id} onClick={() => void decide([o.game.id], 'declined', o.game.id)}>
            {t('friends.offers.decline')}
          </Button>
        )}
      </Decided>
      <Decided title={t('friends.offers.declined')} items={declined}>
        {(o) => (
          <Button size="sm" variant="ghost" iconLeft={<IconCheck />} disabled={!canAccept} loading={busy === o.game.id} onClick={() => void decide([o.game.id], 'accepted', o.game.id)}>
            {t('friends.offers.accept')}
          </Button>
        )}
      </Decided>
    </div>
  );
}

/** Accepting needs a "me" player: the side offered to me becomes that player. */
function ChooseMe() {
  const { t } = useT();
  const { players } = usePlayers();
  const { setDefaultPlayerId } = useSettings();
  const options = players.filter((p) => !p.archived).map((p) => ({ value: p.id, label: p.name, text: p.name }));
  return (
    <div className={s.chooseMe}>
      <TerminalLine tone="warn" prompt="!">
        {t('friends.offers.needMe')}
      </TerminalLine>
      {options.length > 0 ? (
        <Select label={t('friends.offers.meLabel')} placeholder={t('friends.offers.mePlaceholder')} options={options} onChange={(id) => void setDefaultPlayerId(id)} />
      ) : (
        <Button size="sm" variant="ghost" to="/players">
          {t('friends.offers.createMe')}
        </Button>
      )}
    </div>
  );
}

function OfferRow({ item, children }: { item: OfferedGame; children: ReactNode }) {
  const { t } = useT();
  const uid = useUid();
  const handles = useFriendsStore((st) => st.handles);
  const friends = useFriendsStore((st) => st.friends);
  const { defaultPlayerId } = useSettings();
  // Show the game as it will appear in my stats.
  const view = useMemo(() => {
    return remapOffered(item.game, item.offer, uid, friendLinks(friends), defaultPlayerId);
  }, [item, uid, friends, defaultPlayerId]);
  const handle = handles[item.offer.ownerUid];
  return (
    <li className={s.item}>
      <div className={s.from}>
        <Badge mono>{handle ? t('friends.offers.from', { handle }) : t('friends.offers.fromUnknown')}</Badge>
        <div className={s.buttons}>{children}</div>
      </div>
      <GameCard game={view} dense />
    </li>
  );
}

function Decided({ title, items, children }: { title: string; items: OfferedGame[]; children: (o: OfferedGame) => ReactNode }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <section className={s.decided}>
      <button type="button" className={s.toggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <IconChevron direction={open ? 'up' : 'down'} size={16} />
        <span>{title}</span>
        <Badge mono>{items.length}</Badge>
      </button>
      {open ? (
        <ul className={s.list}>
          {items.map((o) => (
            <OfferRow key={o.game.id} item={o}>
              {children(o)}
            </OfferRow>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
