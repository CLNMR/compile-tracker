import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, ConfirmDialog, Panel, Select, Switch, TerminalLine, useToast } from '@/components/ui';
import { SETS } from '@/data/sets';
import { protocolsInSets } from '@/data/protocols';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { isLocale, localeFromBrowser, useLocaleStore, useT } from '@/i18n';
import type { SetId } from '@/types';
import s from './SettingsPage.module.css';

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1.0';
const MIN_PROTOCOLS = 6;

/** /settings — protocol sets, default player, language, account, install, data, about. */
export default function SettingsPage() {
  return (
    <div className={s.page}>
      <ProtocolSetsPanel />
      <MePanel />
      <LanguagePanel />
      <AccountPanel />
      <InstallPanel />
      <DataPanel />
      <AboutPanel />
    </div>
  );
}

function ProtocolSetsPanel() {
  const { t, setName } = useT();
  const { enabledSets, setEnabledSets } = useSettings();
  const toast = useToast();
  const enabledCount = protocolsInSets(enabledSets).length;

  const toggle = (id: SetId, on: boolean) => {
    if (on) {
      if (!enabledSets.includes(id)) void setEnabledSets([...enabledSets, id]);
      return;
    }
    if (enabledSets.length <= 1) {
      toast.push({ title: t('settings.protocolSets.atLeastOne'), tone: 'warn' });
      return;
    }
    void setEnabledSets(enabledSets.filter((x) => x !== id));
  };

  return (
    <Panel title={t('settings.protocolSets.title')} headerRight={<Badge mono>{t('settings.protocolSets.protocolCount', { count: enabledCount })}</Badge>}>
      <div className={s.setList}>
        {SETS.map((set) => {
          const count = protocolsInSets([set.id]).length;
          return (
            <div key={set.id} className={s.setRow}>
              <Switch
                checked={enabledSets.includes(set.id)}
                onChange={(on) => toggle(set.id, on)}
                label={
                  <span className={s.setLabel}>
                    {setName(set)}
                    <Badge tone={set.kind === 'main' ? 'accent' : 'default'}>{t(`common.setKind.${set.kind}`)}</Badge>
                  </span>
                }
                description={`${set.year} · ${t('settings.protocolSets.protocolCount', { count })}`}
              />
            </div>
          );
        })}
      </div>
      <div className={s.summary}>
        <TerminalLine tone="muted">
          {t('settings.protocolSets.enabled', { count: enabledCount })} {t('settings.protocolSets.across', { count: enabledSets.length })}
        </TerminalLine>
        {enabledCount < MIN_PROTOCOLS ? (
          <TerminalLine tone="warn" prompt="!">
            {t('settings.protocolSets.needMore', { min: MIN_PROTOCOLS })}
          </TerminalLine>
        ) : null}
      </div>
    </Panel>
  );
}

function MePanel() {
  const { t } = useT();
  const { players } = usePlayers();
  const { defaultPlayerId, setDefaultPlayerId } = useSettings();
  const active = useMemo(() => players.filter((p) => !p.archived), [players]);
  const options = [{ value: '', label: t('settings.me.noDefault') }, ...active.map((p) => ({ value: p.id, label: p.name }))];
  // A default pointing at an archived/deleted player falls back to "No default" in the control.
  const value = active.some((p) => p.id === defaultPlayerId) ? (defaultPlayerId ?? '') : '';

  return (
    <Panel title={t('settings.me.title')}>
      <Select
        label={t('settings.me.defaultPlayer')}
        value={value}
        onChange={(v) => void setDefaultPlayerId(v || undefined)}
        options={options}
        hint={active.length ? t('settings.me.hintActive') : t('settings.me.hintEmpty')}
        disabled={active.length === 0}
      />
    </Panel>
  );
}

/** Per-device language choice (localStorage via the locale store); '' means "follow the browser". */
function LanguagePanel() {
  const { t } = useT();
  const locale = useLocaleStore((st) => st.locale);
  const explicit = useLocaleStore((st) => st.explicit);
  const setLocale = useLocaleStore((st) => st.setLocale);
  const resetToBrowser = useLocaleStore((st) => st.resetToBrowser);
  const browser = localeFromBrowser();

  const options = [
    { value: '', label: t('common.language.auto', { name: t(`common.language.${browser}`) }) },
    { value: 'en', label: t('common.language.en') },
    { value: 'de', label: t('common.language.de') },
  ];

  return (
    <Panel title={t('common.language.label')}>
      <div className={s.stack}>
        <Select
          label={t('common.language.label')}
          value={explicit ? locale : ''}
          onChange={(v) => (isLocale(v) ? setLocale(v) : resetToBrowser())}
          options={options}
          hint={t('settings.language.hint')}
        />
        <TerminalLine tone="muted">{t('settings.language.status', { locale, browser })}</TerminalLine>
      </div>
    </Panel>
  );
}

function AccountPanel() {
  const { t } = useT();
  const { user, uid, isAnonymous, linkGoogle, switchToExistingGoogle, switchRequest, clearSwitchRequest, redirectNotice, clearRedirectNotice, signOut } =
    useAuth();
  const toast = useToast();
  const [linking, setLinking] = useState(false);
  const [switching, setSwitching] = useState(false);

  // A redirect-based link finished while the page reloaded: report it once.
  useEffect(() => {
    if (!redirectNotice) return;
    clearRedirectNotice();
    toast.push({ title: redirectNotice.title, description: redirectNotice.description, tone: redirectNotice.tone, durationMs: 8000 });
  }, [redirectNotice, clearRedirectNotice, toast]);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const googleEmail = user?.providerData.find((p) => p.providerId === 'google.com')?.email ?? user?.email ?? null;

  const onLink = async () => {
    setLinking(true);
    try {
      const res = await linkGoogle();
      if (res.ok) {
        toast.push({ title: t('auth.linked.title'), description: t('auth.linked.description'), tone: 'win' });
        return;
      }
      if (res.reason === 'switch-required') return; // store set switchRequest → dialog below opens
      if (res.reason === 'redirecting') {
        toast.push({ title: t('settings.account.toast.redirecting'), tone: 'default' });
        return;
      }
      if (res.reason === 'error') toast.push({ title: t('auth.linkFailed.title'), description: `${res.message} (${res.code})`, tone: 'loss', durationMs: 8000 });
    } finally {
      setLinking(false);
    }
  };

  const onSwitch = async () => {
    setSwitching(true);
    try {
      await switchToExistingGoogle();
      toast.push({ title: t('settings.account.toast.switched'), tone: 'win' });
    } catch (e) {
      toast.push({ title: t('settings.account.toast.switchFailed'), description: (e as Error).message, tone: 'loss' });
    } finally {
      setSwitching(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      toast.push({ title: t('settings.account.toast.signedOut'), description: t('settings.account.toast.signedOutDesc'), tone: 'default' });
    } catch (e) {
      toast.push({ title: t('settings.account.toast.signOutFailed'), description: (e as Error).message, tone: 'loss' });
    } finally {
      setSigningOut(false);
    }
  };

  const copyUid = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      toast.push({ title: t('settings.account.toast.uidCopied'), tone: 'win' });
    } catch {
      toast.push({ title: t('settings.account.toast.clipboard'), description: t('settings.account.toast.clipboardDesc'), tone: 'warn' });
    }
  };

  return (
    <Panel
      title={t('settings.account.title')}
      headerRight={
        <Badge tone={isAnonymous ? 'warn' : 'win'} dot>
          {isAnonymous ? t('settings.account.anonymous') : t('settings.account.google')}
        </Badge>
      }
    >
      <div className={s.stack}>
        {isAnonymous ? (
          <TerminalLine tone="muted">{t('settings.account.identityAnonymous')}</TerminalLine>
        ) : (
          <TerminalLine tone="win" prompt="✓">
            {t('settings.account.identityGoogle')}
            {googleEmail ? ` — ${googleEmail}` : ''}
          </TerminalLine>
        )}

        <div className={s.row}>
          {isAnonymous ? (
            <Button onClick={() => void onLink()} loading={linking}>
              {t('settings.account.linkGoogle')}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setConfirmSignOut(true)}>
            {t('settings.account.signOut')}
          </Button>
        </div>

        <div className={s.uidRow}>
          <code className={s.uid} title={t('settings.account.uidTitle')}>
            {uid ?? '—'}
          </code>
          <Button size="sm" variant="subtle" onClick={() => void copyUid()} disabled={!uid}>
            {t('common.actions.copy')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={switchRequest != null}
        onClose={() => (switching ? undefined : clearSwitchRequest())}
        onConfirm={onSwitch}
        title={t('settings.account.switchDialog.title')}
        confirmLabel={t('settings.account.switchDialog.confirm')}
        loading={switching}
      >
        {switchRequest?.email ? <code>{switchRequest.email}</code> : t('settings.account.switchDialog.thisAccount')} {t('settings.account.switchDialog.body')}
        {switchRequest && !switchRequest.credential ? ` ${t('settings.account.switchDialog.reconfirm')}` : ''}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => (signingOut ? undefined : setConfirmSignOut(false))}
        onConfirm={onSignOut}
        title={t('settings.account.signOutDialog.title')}
        confirmLabel={t('settings.account.signOutDialog.confirm')}
        danger={isAnonymous}
        loading={signingOut}
      >
        {isAnonymous ? t('settings.account.signOutDialog.anonymousBody') : t('settings.account.signOutDialog.googleBody')}
      </ConfirmDialog>
    </Panel>
  );
}

function InstallPanel() {
  const { t } = useT();
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onInstall = async () => {
    setBusy(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') toast.push({ title: t('settings.install.installing'), tone: 'win' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={t('settings.install.title')}>
      <div className={s.stack}>
        {installed ? (
          <TerminalLine tone="win" prompt="✓">
            {t('settings.install.running')}
          </TerminalLine>
        ) : canInstall ? (
          <>
            <TerminalLine tone="muted">{t('settings.install.offer')}</TerminalLine>
            <div>
              <Button onClick={() => void onInstall()} loading={busy}>
                {t('settings.install.button')}
              </Button>
            </div>
          </>
        ) : ios ? (
          <TerminalLine tone="muted">{t('settings.install.ios')}</TerminalLine>
        ) : (
          <TerminalLine tone="muted">{t('settings.install.browser')}</TerminalLine>
        )}
      </div>
    </Panel>
  );
}

function DataPanel() {
  const { t } = useT();
  const { uid, isAdmin } = useAuth();
  const { games } = useGames('all');
  const { players } = usePlayers();
  const mine = useMemo(() => games.filter((g) => g.ownerUid === uid).length, [games, uid]);

  return (
    <Panel title={t('settings.data.title')}>
      <div className={s.stack}>
        <div className={s.counts}>
          <Count label={t('settings.data.myGames')} value={mine} />
          <Count label={t('settings.data.myPlayers')} value={players.length} />
          <Count label={t('settings.data.gamesInDb')} value={games.length} />
        </div>
        {isAdmin ? (
          <div className={s.row}>
            <Button variant="ghost" to="/dev">
              {t('settings.data.devTools')}
            </Button>
            <Button variant="subtle" to="/dev/ui">
              {t('settings.data.kitchenSink')}
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  const { number } = useT();
  return (
    <div className={s.count}>
      <span className={s.countValue}>{number(value)}</span>
      <span className={s.countLabel}>{label}</span>
    </div>
  );
}

function AboutPanel() {
  const { t } = useT();
  return (
    <Panel title={t('settings.about.title')} headerRight={<Badge mono>v{APP_VERSION}</Badge>}>
      <div className={s.stack}>
        <TerminalLine tone="muted">{t('settings.about.version', { version: APP_VERSION })}</TerminalLine>
        <p className={s.about}>{t('settings.about.attribution')}</p>
      </div>
    </Panel>
  );
}
