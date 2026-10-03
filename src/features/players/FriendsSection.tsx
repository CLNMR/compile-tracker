import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Timestamp } from 'firebase/firestore';
import {
  Button,
  ConfirmDialog,
  Dialog,
  IconButton,
  IconCamera,
  IconEdit,
  IconLink,
  IconPlus,
  IconQr,
  IconTrash,
  Panel,
  Select,
  Skeleton,
  TerminalLine,
  TextField,
  useToast,
} from '@/components/ui';
import { useAuth, useUid } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { useT } from '@/i18n';
import { addFriend, claimHandle, HandleError, lookupHandle, removeFriend, setFriendPlayer, suggestHandle } from '@/repo/friends';
import { offerPastGames, withdrawPendingOffers } from '@/repo/offers';
import { useFriendsStore } from '@/store/friendsStore';
import { HANDLE_RE, normalizeHandle, type FriendDoc } from '@/types';
import { friendLink } from './friendLink';
import { ScanQrDialog, ShowQrDialog } from './QrDialogs';
import s from './FriendsSection.module.css';

/** Select value for "not linked" (the Select treats '' as no selection). */
const NO_PLAYER = 'none';

type ErrorCode = 'invalid' | 'taken' | 'notFound' | 'self' | 'already' | 'needHandle';

/** Friends on the Players page: my handle (text + QR), add by handle or QR, list with player links. */
export function FriendsSection() {
  const { t } = useT();
  const { handle, friends, handles, loading } = useFriendsStore();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState<{ uid: string; handle: string } | null>(null);
  const [linking, setLinking] = useState<FriendDoc | null>(null);
  const [removing, setRemoving] = useState<FriendDoc | null>(null);

  // Deep link /add/:handle → /players?add=handle
  const deepLink = params.get('add');

  return (
    <Panel title={t('friends.title')}>
      <div className={s.stack}>
        <p className={s.muted}>{t('friends.intro')}</p>
        {loading ? (
          <Skeleton height={64} radius={0} />
        ) : (
          <>
            <HandleBlock handle={handle} />
            <AddFriendForm
              disabled={!handle}
              initial={deepLink ?? ''}
              onConsumedInitial={() => {
                params.delete('add');
                setParams(params, { replace: true });
              }}
              friends={friends}
              onFound={setAdding}
            />
            <FriendList friends={friends} handles={handles} onLink={setLinking} onRemove={setRemoving} />
          </>
        )}
      </div>

      <AddFriendDialog target={adding} onClose={() => setAdding(null)} />
      <LinkPlayerDialog friend={linking} handle={linking ? handles[linking.uid] : undefined} onClose={() => setLinking(null)} />
      <RemoveFriendDialog friend={removing} handle={removing ? handles[removing.uid] : undefined} onClose={() => setRemoving(null)} />
    </Panel>
  );
}

/* ---------- my handle ---------- */

function HandleBlock({ handle }: { handle: string | null }) {
  const { t } = useT();
  const uid = useUid();
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => handle ?? suggestHandle(user?.displayName || user?.email));
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await claimHandle(uid, value, handle ?? undefined);
      toast.push({ title: t('friends.handle.claimed'), description: `@${saved}`, tone: 'win' });
      setEditing(false);
    } catch (err) {
      if (err instanceof HandleError && (err.code === 'invalid' || err.code === 'taken')) setError(err.code);
      else toast.push({ title: t('friends.errors.failed'), description: (err as Error).message, tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!handle) return;
    const link = friendLink(handle);
    try {
      await navigator.clipboard.writeText(link);
      toast.push({ title: t('friends.handle.copied'), description: link, tone: 'win' });
    } catch {
      toast.push({ title: t('settings.account.toast.clipboard'), description: link, tone: 'warn' });
    }
  };

  if (handle && !editing) {
    return (
      <div className={s.handleRow}>
        <div className={s.handleId}>
          <span className={s.label}>{t('friends.handle.title')}</span>
          <span className={s.handle}>@{handle}</span>
        </div>
        <div className={s.actions}>
          <Button size="sm" variant="ghost" iconLeft={<IconQr />} onClick={() => setShowQr(true)}>
            {t('friends.handle.showQr')}
          </Button>
          <Button size="sm" variant="ghost" iconLeft={<IconLink />} onClick={() => void copy()}>
            {t('friends.handle.copyLink')}
          </Button>
          <IconButton
            label={t('friends.handle.change')}
            size="sm"
            onClick={() => {
              setValue(handle);
              setError(null);
              setEditing(true);
            }}
          >
            <IconEdit />
          </IconButton>
        </div>
        <ShowQrDialog open={showQr} onClose={() => setShowQr(false)} handle={handle} />
      </div>
    );
  }

  return (
    <form className={s.form} onSubmit={(e) => void submit(e)}>
      <TextField
        className={s.grow}
        label={t('friends.handle.title')}
        hint={handle ? t('friends.handle.rules') : t('friends.handle.claimHint')}
        error={error ? t(`friends.errors.${error}`) : undefined}
        leading="@"
        value={value}
        onChange={(v) => setValue(normalizeHandle(v))}
        inputProps={{ autoComplete: 'off', autoCapitalize: 'off', spellCheck: false, maxLength: 20 }}
      />
      <div className={s.formButtons}>
        {handle ? (
          <Button variant="subtle" onClick={() => setEditing(false)} disabled={busy}>
            {t('common.actions.cancel')}
          </Button>
        ) : null}
        <Button type="submit" loading={busy} disabled={!HANDLE_RE.test(value)}>
          {handle ? t('friends.handle.save') : t('friends.handle.claim')}
        </Button>
      </div>
    </form>
  );
}

/* ---------- add by handle / QR ---------- */

interface AddFriendFormProps {
  disabled: boolean;
  initial: string;
  onConsumedInitial: () => void;
  friends: FriendDoc[];
  onFound: (target: { uid: string; handle: string }) => void;
}

function AddFriendForm({ disabled, initial, onConsumedInitial, friends, onFound }: AddFriendFormProps) {
  const { t } = useT();
  const uid = useUid();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const find = async (raw: string) => {
    const handle = normalizeHandle(raw);
    setError(null);
    if (!HANDLE_RE.test(handle)) return setError('invalid');
    setBusy(true);
    try {
      const friendUid = await lookupHandle(handle);
      if (!friendUid) return setError('notFound');
      if (friendUid === uid) return setError('self');
      if (friends.some((f) => f.uid === friendUid)) return setError('already');
      setValue('');
      onFound({ uid: friendUid, handle });
    } catch {
      setError('notFound');
    } finally {
      setBusy(false);
    }
  };

  // A deep link pre-fills the handle and looks it up once my own handle exists.
  useEffect(() => {
    if (!initial || disabled) return;
    onConsumedInitial();
    // async: the lookup's state updates belong to the request, not to this render
    void Promise.resolve(initial).then(find);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, disabled]);

  return (
    <>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void find(value);
        }}
      >
        <TextField
          className={s.grow}
          label={t('friends.add.label')}
          hint={disabled ? t('friends.add.needHandle') : undefined}
          error={error ? t(`friends.errors.${error}`) : undefined}
          leading="@"
          placeholder={t('friends.add.placeholder')}
          value={value}
          onChange={setValue}
          disabled={disabled}
          inputProps={{ autoComplete: 'off', autoCapitalize: 'off', spellCheck: false, maxLength: 24 }}
        />
        <div className={s.formButtons}>
          <Button variant="ghost" iconLeft={<IconCamera />} onClick={() => setScanning(true)} disabled={disabled}>
            {t('friends.add.scan')}
          </Button>
          <Button type="submit" iconLeft={<IconPlus />} loading={busy} disabled={disabled || !value.trim()}>
            {t('friends.add.submit')}
          </Button>
        </div>
      </form>
      <ScanQrDialog
        open={scanning}
        onClose={() => setScanning(false)}
        onHandle={(h) => {
          setScanning(false);
          setValue(h);
          void find(h);
        }}
      />
    </>
  );
}

/* ---------- list ---------- */

function FriendList({
  friends,
  handles,
  onLink,
  onRemove,
}: {
  friends: FriendDoc[];
  handles: Record<string, string>;
  onLink: (f: FriendDoc) => void;
  onRemove: (f: FriendDoc) => void;
}) {
  const { t } = useT();
  const { byId } = usePlayers();
  const sorted = useMemo(() => [...friends].sort((a, b) => (handles[a.uid] ?? '').localeCompare(handles[b.uid] ?? '')), [friends, handles]);

  if (friends.length === 0) return <TerminalLine tone="muted">{t('friends.list.empty')}</TerminalLine>;

  return (
    <ul className={s.list}>
      {sorted.map((f) => {
        const player = f.playerId ? byId.get(f.playerId) : undefined;
        return (
          <li key={f.uid} className={s.friend}>
            <div className={s.friendId}>
              <span className={s.handle}>{handles[f.uid] ? `@${handles[f.uid]}` : '…'}</span>
              <span className={s.muted}>{player ? t('friends.list.linked', { name: player.name }) : t('friends.list.notLinked')}</span>
            </div>
            <div className={s.actions}>
              <Button size="sm" variant="ghost" iconLeft={<IconLink />} onClick={() => onLink(f)}>
                {player ? t('friends.list.change') : t('friends.list.link')}
              </Button>
              <IconButton label={t('friends.list.remove')} size="sm" variant="danger" onClick={() => onRemove(f)}>
                <IconTrash />
              </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- dialogs ---------- */

/** Players I can link to a friend: active, not "me", not linked to another friend. */
function usePlayerOptions(current?: string) {
  const { t } = useT();
  const { players } = usePlayers();
  const { defaultPlayerId } = useSettings();
  const friends = useFriendsStore((st) => st.friends);
  return useMemo(() => {
    const taken = new Set(friends.map((f) => f.playerId).filter((id) => id && id !== current));
    return [
      { value: NO_PLAYER, label: t('friends.addDialog.linkNone') },
      ...players
        .filter((p) => !p.archived && p.id !== defaultPlayerId && !taken.has(p.id))
        .map((p) => ({ value: p.id, label: p.name, text: p.name })),
    ];
  }, [players, defaultPlayerId, friends, current, t]);
}

/** My own games (not accepted offers) — the ones I can offer to a friend. */
function useOwnGames() {
  const uid = useUid();
  const { games } = useGames('mine');
  return useMemo(() => games.filter((g) => g.ownerUid === uid && !g.sharedBy), [games, uid]);
}

function useOfferPast() {
  const { t } = useT();
  const uid = useUid();
  const toast = useToast();
  const own = useOwnGames();
  const { defaultPlayerId } = useSettings();
  return async (friend: FriendDoc, handle: string) => {
    const n = await offerPastGames(uid, friend, own, defaultPlayerId);
    if (n > 0) toast.push({ title: t('friends.toast.offered', { count: n, handle }), tone: 'win' });
  };
}

function AddFriendDialog({ target, onClose }: { target: { uid: string; handle: string } | null; onClose: () => void }) {
  const { t } = useT();
  const uid = useUid();
  const toast = useToast();
  const options = usePlayerOptions();
  const offerPast = useOfferPast();
  const [playerId, setPlayerId] = useState(NO_PLAYER);
  const [busy, setBusy] = useState(false);
  const linked = playerId === NO_PLAYER ? undefined : playerId;

  const [prev, setPrev] = useState(target);
  if (prev !== target) {
    setPrev(target);
    setPlayerId(NO_PLAYER);
    setBusy(false);
  }

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await addFriend(uid, target.uid, linked);
      toast.push({ title: t('friends.toast.added', { handle: target.handle }), tone: 'win' });
      if (linked) await offerPast({ uid: target.uid, since: Timestamp.now(), playerId: linked }, target.handle);
      onClose();
    } catch (e) {
      toast.push({ title: t('friends.errors.failed'), description: (e as Error).message, tone: 'loss' });
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!target}
      onClose={() => (busy ? undefined : onClose())}
      title={t('friends.addDialog.title')}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={busy}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={() => void confirm()} loading={busy}>
            {t('friends.addDialog.confirm')}
          </Button>
        </>
      }
    >
      {target ? (
        <div className={s.stack}>
          <p>{t('friends.addDialog.body', { handle: target.handle })}</p>
          <Select
            label={t('friends.addDialog.linkLabel')}
            hint={t('friends.addDialog.linkHint', { handle: target.handle })}
            options={options}
            value={playerId}
            onChange={setPlayerId}
          />
        </div>
      ) : null}
    </Dialog>
  );
}

function LinkPlayerDialog({ friend, handle, onClose }: { friend: FriendDoc | null; handle?: string; onClose: () => void }) {
  const { t } = useT();
  const uid = useUid();
  const toast = useToast();
  const { byId } = usePlayers();
  const options = usePlayerOptions(friend?.playerId);
  const offerPast = useOfferPast();
  const [playerId, setPlayerId] = useState(NO_PLAYER);
  const [busy, setBusy] = useState(false);

  const [prev, setPrev] = useState(friend);
  if (prev !== friend) {
    setPrev(friend);
    setPlayerId(friend?.playerId ?? NO_PLAYER);
    setBusy(false);
  }

  const save = async () => {
    if (!friend) return;
    const next = playerId === NO_PLAYER ? null : playerId;
    if (next === (friend.playerId ?? null)) return onClose();
    setBusy(true);
    try {
      await setFriendPlayer(uid, friend.uid, next);
      if (friend.playerId) await withdrawPendingOffers(uid, friend.uid);
      if (next) {
        toast.push({ title: t('friends.toast.linked', { name: byId.get(next)?.name ?? '' }), tone: 'win' });
        await offerPast({ ...friend, playerId: next }, handle ?? '');
      } else {
        toast.push({ title: t('friends.toast.unlinked') });
      }
      onClose();
    } catch (e) {
      toast.push({ title: t('friends.errors.failed'), description: (e as Error).message, tone: 'loss' });
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!friend}
      onClose={() => (busy ? undefined : onClose())}
      title={t('friends.linkDialog.title', { handle: handle ?? '' })}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={busy}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            {t('friends.linkDialog.save')}
          </Button>
        </>
      }
    >
      <Select
        label={t('friends.addDialog.linkLabel')}
        hint={t('friends.addDialog.linkHint', { handle: handle ?? '' })}
        options={options}
        value={playerId}
        onChange={setPlayerId}
      />
    </Dialog>
  );
}

function RemoveFriendDialog({ friend, handle, onClose }: { friend: FriendDoc | null; handle?: string; onClose: () => void }) {
  const { t } = useT();
  const uid = useUid();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!friend) return;
    setBusy(true);
    try {
      await removeFriend(uid, friend.uid);
      toast.push({ title: t('friends.toast.removed', { handle: handle ?? '' }) });
      onClose();
    } catch (e) {
      toast.push({ title: t('friends.errors.failed'), description: (e as Error).message, tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={!!friend}
      onClose={() => (busy ? undefined : onClose())}
      onConfirm={remove}
      title={t('friends.removeDialog.title')}
      confirmLabel={t('friends.removeDialog.confirm')}
      danger
      loading={busy}
    >
      <p>{t('friends.removeDialog.body', { handle: handle ?? '' })}</p>
    </ConfirmDialog>
  );
}
