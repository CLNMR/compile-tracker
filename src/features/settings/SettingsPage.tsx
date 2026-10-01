import { useMemo, useState } from 'react';
import { Badge, Button, ConfirmDialog, Panel, Select, Switch, TerminalLine, useToast } from '@/components/ui';
import { SETS } from '@/data/sets';
import { protocolsInSets } from '@/data/protocols';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import type { SetId } from '@/types';
import s from './SettingsPage.module.css';

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1.0';
const MIN_PROTOCOLS = 6;

/** /settings — protocol sets, default player, account, install, data, about. */
export default function SettingsPage() {
  return (
    <div className={s.page}>
      <ProtocolSetsPanel />
      <MePanel />
      <AccountPanel />
      <InstallPanel />
      <DataPanel />
      <AboutPanel />
    </div>
  );
}

function ProtocolSetsPanel() {
  const { enabledSets, setEnabledSets } = useSettings();
  const toast = useToast();
  const enabledCount = protocolsInSets(enabledSets).length;

  const toggle = (id: SetId, on: boolean) => {
    if (on) {
      if (!enabledSets.includes(id)) void setEnabledSets([...enabledSets, id]);
      return;
    }
    if (enabledSets.length <= 1) {
      toast.push({ title: 'At least one set must stay enabled', tone: 'warn' });
      return;
    }
    void setEnabledSets(enabledSets.filter((x) => x !== id));
  };

  return (
    <Panel title="Protocol sets" headerRight={<Badge mono>{enabledCount} protocols</Badge>}>
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
                    {set.name}
                    <Badge tone={set.kind === 'main' ? 'accent' : 'default'}>{set.kind}</Badge>
                  </span>
                }
                description={`${set.year} · ${count} protocol${count === 1 ? '' : 's'}`}
              />
            </div>
          );
        })}
      </div>
      <div className={s.summary}>
        <TerminalLine tone="muted">
          {enabledCount} protocol{enabledCount === 1 ? '' : 's'} enabled across {enabledSets.length} set{enabledSets.length === 1 ? '' : 's'}
        </TerminalLine>
        {enabledCount < MIN_PROTOCOLS ? (
          <TerminalLine tone="warn" prompt="!">
            a game needs {MIN_PROTOCOLS} distinct protocols — enable more sets to record games
          </TerminalLine>
        ) : null}
      </div>
    </Panel>
  );
}

function MePanel() {
  const { players } = usePlayers();
  const { defaultPlayerId, setDefaultPlayerId } = useSettings();
  const active = useMemo(() => players.filter((p) => !p.archived), [players]);
  const options = [{ value: '', label: 'No default' }, ...active.map((p) => ({ value: p.id, label: p.name }))];
  // A default pointing at an archived/deleted player falls back to "No default" in the control.
  const value = active.some((p) => p.id === defaultPlayerId) ? (defaultPlayerId ?? '') : '';

  return (
    <Panel title="Me">
      <Select
        label="Default player"
        value={value}
        onChange={(v) => void setDefaultPlayerId(v || undefined)}
        options={options}
        hint={active.length ? 'Pre-selected as Player 1 when recording a game.' : 'Add players first — they appear here.'}
        disabled={active.length === 0}
      />
    </Panel>
  );
}

function AccountPanel() {
  const { user, uid, isAnonymous, linkGoogle, signInWithExistingGoogle, signOut } = useAuth();
  const toast = useToast();
  const [linking, setLinking] = useState(false);
  const [switchCredential, setSwitchCredential] = useState<unknown>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const googleEmail = user?.providerData.find((p) => p.providerId === 'google.com')?.email ?? user?.email ?? null;

  const onLink = async () => {
    setLinking(true);
    try {
      const res = await linkGoogle();
      if (res.ok) {
        toast.push({ title: 'Google account linked', description: 'Your data now follows your Google sign-in.', tone: 'win' });
        return;
      }
      if (res.reason === 'credential-already-in-use') {
        setSwitchCredential(res.credential);
        return;
      }
      if (res.reason === 'error') toast.push({ title: 'Could not link account', description: res.message, tone: 'loss' });
    } finally {
      setLinking(false);
    }
  };

  const onSwitch = async () => {
    setSwitching(true);
    try {
      await signInWithExistingGoogle(switchCredential);
      setSwitchCredential(null);
      toast.push({ title: 'Switched to your Google account', tone: 'win' });
    } catch (e) {
      toast.push({ title: 'Could not switch account', description: (e as Error).message, tone: 'loss' });
    } finally {
      setSwitching(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      toast.push({ title: 'Signed out', description: 'A fresh anonymous identity was created.', tone: 'default' });
    } catch (e) {
      toast.push({ title: 'Sign-out failed', description: (e as Error).message, tone: 'loss' });
    } finally {
      setSigningOut(false);
    }
  };

  const copyUid = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      toast.push({ title: 'uid copied', tone: 'win' });
    } catch {
      toast.push({ title: 'Clipboard unavailable', description: 'Select the id and copy it manually.', tone: 'warn' });
    }
  };

  return (
    <Panel title="Account" headerRight={<Badge tone={isAnonymous ? 'warn' : 'win'} dot>{isAnonymous ? 'anonymous' : 'google'}</Badge>}>
      <div className={s.stack}>
        {isAnonymous ? (
          <TerminalLine tone="muted">identity: anonymous — data is bound to this device</TerminalLine>
        ) : (
          <TerminalLine tone="win" prompt="✓">
            identity: google{googleEmail ? ` — ${googleEmail}` : ''}
          </TerminalLine>
        )}

        <div className={s.row}>
          {isAnonymous ? (
            <Button onClick={() => void onLink()} loading={linking}>
              Link Google account
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setConfirmSignOut(true)}>
            Sign out
          </Button>
        </div>

        <div className={s.uidRow}>
          <code className={s.uid} title="Your user id">
            {uid ?? '—'}
          </code>
          <Button size="sm" variant="subtle" onClick={() => void copyUid()} disabled={!uid}>
            Copy
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={switchCredential != null}
        onClose={() => (switching ? undefined : setSwitchCredential(null))}
        onConfirm={onSwitch}
        title="Google account already in use"
        confirmLabel="Switch to that account"
        loading={switching}
      >
        This Google account already has Compile Tracker data. You can switch to it now — the games and players recorded under your current
        anonymous identity stay behind on this device's old identity and will not be merged.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => (signingOut ? undefined : setConfirmSignOut(false))}
        onConfirm={onSignOut}
        title="Sign out?"
        confirmLabel="Sign out"
        danger={isAnonymous}
        loading={signingOut}
      >
        {isAnonymous
          ? 'You are anonymous. Signing out creates a new anonymous identity, and the data bound to this one becomes unreachable unless you link a Google account first.'
          : 'A new anonymous identity is created for this device. Sign in with Google again to get back to your data.'}
      </ConfirmDialog>
    </Panel>
  );
}

function InstallPanel() {
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onInstall = async () => {
    setBusy(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') toast.push({ title: 'Installing…', tone: 'win' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Install">
      <div className={s.stack}>
        {installed ? (
          <TerminalLine tone="win" prompt="✓">
            running as installed app
          </TerminalLine>
        ) : canInstall ? (
          <>
            <TerminalLine tone="muted">install for offline use and a home-screen icon</TerminalLine>
            <div>
              <Button onClick={() => void onInstall()} loading={busy}>
                Install app
              </Button>
            </div>
          </>
        ) : ios ? (
          <TerminalLine tone="muted">on iOS: tap Share → "Add to Home Screen"</TerminalLine>
        ) : (
          <TerminalLine tone="muted">install from your browser menu ("Install app" / "Add to Home screen")</TerminalLine>
        )}
      </div>
    </Panel>
  );
}

function DataPanel() {
  const { uid, isAdmin } = useAuth();
  const { games } = useGames('all');
  const { players } = usePlayers();
  const mine = useMemo(() => games.filter((g) => g.ownerUid === uid).length, [games, uid]);

  return (
    <Panel title="Data">
      <div className={s.stack}>
        <div className={s.counts}>
          <Count label="my games" value={mine} />
          <Count label="my players" value={players.length} />
          <Count label="games in db" value={games.length} />
        </div>
        {isAdmin ? (
          <div className={s.row}>
            <Button variant="ghost" to="/dev">
              Developer tools
            </Button>
            <Button variant="subtle" to="/dev/ui">
              UI kitchen sink
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className={s.count}>
      <span className={s.countValue}>{value.toLocaleString()}</span>
      <span className={s.countLabel}>{label}</span>
    </div>
  );
}

function AboutPanel() {
  return (
    <Panel title="About" headerRight={<Badge mono>v{APP_VERSION}</Badge>}>
      <div className={s.stack}>
        <TerminalLine tone="muted">compile tracker · version {APP_VERSION}</TerminalLine>
        <p className={s.about}>
          Compile is a game by Michael Yang, published by Greater Than Games. This is an unofficial fan tool and is not affiliated with or endorsed
          by either.
        </p>
      </div>
    </Panel>
  );
}
