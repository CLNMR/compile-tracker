import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Panel,
  SectionHeader,
  Spinner,
  TerminalBlock,
  TerminalLine,
  TextField,
  useToast,
  type TerminalBlockLine,
  type TerminalTone,
} from '@/components/ui';
import { protocolsInSets } from '@/data/protocols';
import { generateGames, TEST_PLAYER_NAMES } from '@/devtools/generate';
import { useEmulators } from '@/firebase/app';
import { useAuth } from '@/hooks/useAuth';
import { usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { useT } from '@/i18n';
import { deleteAllTestGames, deleteGame, deleteMyGames, deleteMyTestGames, writeGamesBatch } from '@/repo/games';
import { createPlayers, deleteAllPlayers } from '@/repo/players';
import { deleteUserSettings } from '@/repo/users';
import s from './DevToolsPage.module.css';

const MIN_PROTOCOLS = 6;
const LIMITS = {
  games: { min: 1, max: 2000, def: 200 },
  players: { min: 2, max: TEST_PLAYER_NAMES.length, def: 6 },
  days: { min: 1, max: 3650, def: 540 },
} as const;

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Fill `{slot}` placeholders of an (untranslated-placeholder) message with React nodes. */
function fill(template: string, slots: Record<string, ReactNode>): ReactNode {
  return template.split(/\{(\w+)\}/g).map((part, i) => (i % 2 === 1 ? <Fragment key={i}>{slots[part] ?? `{${part}}`}</Fragment> : part));
}

type Log = (text: string, tone?: TerminalTone) => void;

/** /dev — test-data generator, resets, admin and emulator helpers with a shared terminal log. */
export default function DevToolsPage() {
  const { t } = useT();
  const { isAdmin } = useAuth();
  const [lines, setLines] = useState<TerminalBlockLine[]>(() => [{ text: t('dev.ready'), tone: 'muted' }]);
  const log = useCallback<Log>((text, tone = 'default') => {
    setLines((cur) => [...cur, { text, tone, prompt: tone === 'win' ? '✓' : tone === 'loss' ? '✗' : tone === 'warn' ? '!' : '>' }]);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className={s.page}>
      <div className={s.head}>
        <SectionHeader as="h1">{t('dev.title')}</SectionHeader>
        <TerminalLine tone="warn">{t('dev.warning')}</TerminalLine>
      </div>

      <Panel title={t('dev.log')} headerRight={<Badge mono>{lines.length}</Badge>} padding="sm">
        <div ref={scrollRef} className={s.logScroll}>
          <TerminalBlock lines={lines} cursor className={s.logBlock} />
        </div>
      </Panel>

      <GeneratePanel log={log} />
      <ResetPanel log={log} />
      {isAdmin ? <AdminPanel log={log} /> : null}
      {useEmulators ? <EmulatorPanel log={log} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function parseInt_(v: string, lim: { min: number; max: number }): number | null {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < lim.min || n > lim.max) return null;
  return n;
}

function GeneratePanel({ log }: { log: Log }) {
  const { t } = useT();
  const { uid } = useAuth();
  const { enabledSets } = useSettings();
  const { players } = usePlayers();
  const toast = useToast();

  const [games, setGames] = useState(String(LIMITS.games.def));
  const [playerCount, setPlayerCount] = useState(String(LIMITS.players.def));
  const [days, setDays] = useState(String(LIMITS.days.def));
  const [seed, setSeed] = useState(() => String(randomSeed()));
  const [running, setRunning] = useState(false);

  const nGames = parseInt_(games, LIMITS.games);
  const nPlayers = parseInt_(playerCount, LIMITS.players);
  const nDays = parseInt_(days, LIMITS.days);
  const nSeed = /^\d+$/.test(seed.trim()) ? Number.parseInt(seed, 10) >>> 0 : null;

  const protocolCount = protocolsInSets(enabledSets).length;
  const tooFewProtocols = protocolCount < MIN_PROTOCOLS;
  const valid = nGames != null && nPlayers != null && nDays != null && nSeed != null;

  const run = async () => {
    if (!uid || !valid || tooFewProtocols) return;
    setRunning(true);
    try {
      log(t('dev.generate.log.start', { games: nGames, players: nPlayers, days: nDays, seed: String(nSeed), sets: enabledSets.join(',') }));

      const wanted = TEST_PLAYER_NAMES.slice(0, nPlayers);
      const byName = new Map(players.map((p) => [p.name, p.id]));
      const missing = wanted.filter((n) => !byName.has(n));
      log(t('dev.generate.log.players', { existing: wanted.length - missing.length, missing: missing.length }), 'muted');
      if (missing.length) {
        const ids = await createPlayers(uid, missing);
        missing.forEach((n, i) => byName.set(n, ids[i]));
        log(t('dev.generate.log.created', { names: missing.join(', ') }), 'muted');
      }
      const playerIds = wanted.map((n) => byName.get(n)!);

      const inputs = generateGames({ games: nGames, playerIds, enabledSets, seed: nSeed, days: nDays });
      log(t('dev.generate.log.generated', { count: inputs.length }), 'muted');

      const written = await writeGamesBatch(uid, inputs, (n) => log(t('dev.generate.log.wrote', { n, total: inputs.length })));
      log(t('dev.generate.log.done', { count: written }), 'win');
      toast.push({
        title: t('dev.generate.toast.done'),
        description: t('dev.generate.toast.doneDesc', { games: written, players: playerIds.length }),
        tone: 'win',
      });
    } catch (e) {
      log(t('dev.generate.log.failed', { error: errMsg(e) }), 'loss');
      toast.push({ title: t('dev.generate.toast.failed'), description: errMsg(e), tone: 'loss' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel
      title={t('dev.generate.title')}
      headerRight={
        <Badge mono tone={tooFewProtocols ? 'warn' : 'default'}>
          {t('dev.generate.protocolCount', { count: protocolCount })}
        </Badge>
      }
    >
      <div className={s.stack}>
        <div className={s.fields}>
          <TextField
            label={t('dev.generate.games')}
            type="number"
            value={games}
            onChange={setGames}
            disabled={running}
            inputProps={{ min: LIMITS.games.min, max: LIMITS.games.max, inputMode: 'numeric' }}
            error={nGames == null ? t('dev.generate.range', { min: LIMITS.games.min, max: LIMITS.games.max }) : undefined}
          />
          <TextField
            label={t('dev.generate.players')}
            type="number"
            value={playerCount}
            onChange={setPlayerCount}
            disabled={running}
            inputProps={{ min: LIMITS.players.min, max: LIMITS.players.max, inputMode: 'numeric' }}
            error={nPlayers == null ? t('dev.generate.range', { min: LIMITS.players.min, max: LIMITS.players.max }) : undefined}
          />
          <TextField
            label={t('dev.generate.days')}
            type="number"
            value={days}
            onChange={setDays}
            disabled={running}
            inputProps={{ min: LIMITS.days.min, max: LIMITS.days.max, inputMode: 'numeric' }}
            error={nDays == null ? t('dev.generate.range', { min: LIMITS.days.min, max: LIMITS.days.max }) : undefined}
          />
          <TextField
            className={s.seedField}
            label={t('dev.generate.seed')}
            value={seed}
            onChange={setSeed}
            disabled={running}
            inputProps={{ inputMode: 'numeric', spellCheck: false }}
            error={nSeed == null ? t('dev.generate.seedError') : undefined}
            trailing={
              <Button size="sm" variant="ghost" onClick={() => setSeed(String(randomSeed()))} disabled={running}>
                {t('dev.generate.reroll')}
              </Button>
            }
          />
        </div>

        <p className={s.muted}>{t('dev.generate.hint', { names: TEST_PLAYER_NAMES.slice(0, 3).join(', ') })}</p>

        {tooFewProtocols ? (
          <TerminalLine tone="warn" prompt="!">
            {t('dev.generate.tooFew', { count: protocolCount, min: MIN_PROTOCOLS })}
          </TerminalLine>
        ) : null}

        <div className={s.row}>
          <Button onClick={() => void run()} disabled={running || !valid || tooFewProtocols || !uid}>
            {t('dev.generate.run')}
          </Button>
          {running ? (
            <>
              <Spinner label={t('dev.generate.running')} />
              <span className="muted mono">{t('dev.generate.writing')}</span>
            </>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */

type ResetKind = 'test' | 'all' | 'global';

function ResetPanel({ log }: { log: Log }) {
  const { t } = useT();
  const { uid } = useAuth();
  const { defaultPlayerId, setDefaultPlayerId } = useSettings();
  const toast = useToast();
  const [open, setOpen] = useState<ResetKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [alsoSettings, setAlsoSettings] = useState(false);

  const close = () => {
    if (busy) return;
    setOpen(null);
    setAlsoSettings(false);
  };

  const runReset = async (kind: ResetKind) => {
    if (!uid) return;
    setBusy(true);
    try {
      if (kind === 'test') {
        log(t('dev.reset.log.testStart'));
        const n = await deleteMyTestGames(uid, (d) => log(t('dev.reset.log.deleted', { count: d }), 'muted'));
        log(t('dev.reset.log.testDone', { count: n }), 'win');
        toast.push({ title: t('dev.reset.toast.testDone'), description: t('dev.reset.toast.gamesRemoved', { count: n }), tone: 'win' });
      } else if (kind === 'all') {
        log(t('dev.reset.log.allStart'));
        const g = await deleteMyGames(uid, (d) => log(t('dev.reset.log.deleted', { count: d }), 'muted'));
        log(t('dev.reset.log.gamesRemoved', { count: g }), 'muted');
        const p = await deleteAllPlayers(uid);
        log(t('dev.reset.log.playersRemoved', { count: p }), 'muted');
        if (alsoSettings) {
          await deleteUserSettings(uid);
          log(t('dev.reset.log.settingsReset'), 'muted');
        } else if (defaultPlayerId) {
          await setDefaultPlayerId(undefined);
          log(t('dev.reset.log.defaultPlayerCleared'), 'muted');
        }
        log(t(alsoSettings ? 'dev.reset.log.allDoneSettings' : 'dev.reset.log.allDone', { games: g, players: p }), 'win');
        toast.push({ title: t('dev.reset.toast.allDone'), description: t('dev.reset.toast.allDoneDesc', { games: g, players: p }), tone: 'win' });
      } else {
        log(t('dev.reset.log.globalStart'), 'warn');
        const n = await deleteAllTestGames((d) => log(t('dev.reset.log.deleted', { count: d }), 'muted'));
        log(t('dev.reset.log.globalDone', { count: n }), 'win');
        toast.push({ title: t('dev.reset.toast.globalDone'), description: t('dev.reset.toast.gamesRemoved', { count: n }), tone: 'win' });
      }
      setOpen(null);
      setAlsoSettings(false);
    } catch (e) {
      log(t('dev.reset.log.failed', { error: errMsg(e) }), 'loss');
      toast.push({ title: t('dev.reset.toast.failed'), description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={t('dev.reset.title')}>
      <div className={s.resetGrid}>
        <div className={s.resetItem}>
          <p>{t('dev.reset.test.desc')}</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('test')} disabled={!uid}>
            {t('dev.reset.test.button')}
          </Button>
        </div>
        <div className={s.resetItem}>
          <p>{t('dev.reset.all.desc')}</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('all')} disabled={!uid}>
            {t('dev.reset.all.button')}
          </Button>
        </div>
        <div className={s.resetItem}>
          <p>{t('dev.reset.global.desc')}</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('global')} disabled={!uid}>
            {t('dev.reset.global.button')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={open === 'test'}
        onClose={close}
        onConfirm={() => runReset('test')}
        title={t('dev.reset.test.button')}
        confirmLabel={t('dev.reset.test.confirm')}
        danger
        requireText="RESET"
        loading={busy}
      >
        {fill(t('dev.reset.test.body'), { flag: <code>isTestData = true</code> })}
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'all'}
        onClose={close}
        onConfirm={() => runReset('all')}
        title={t('dev.reset.all.button')}
        confirmLabel={t('dev.reset.all.confirm')}
        danger
        requireText="RESET"
        loading={busy}
      >
        <div className={s.dialogStack}>
          <p>{t('dev.reset.all.body')}</p>
          <Checkbox
            label={t('dev.reset.all.alsoSettings')}
            description={t('dev.reset.all.alsoSettingsDesc')}
            checked={alsoSettings}
            onChange={setAlsoSettings}
            disabled={busy}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'global'}
        onClose={close}
        onConfirm={() => runReset('global')}
        title={t('dev.reset.global.button')}
        confirmLabel={t('dev.reset.global.confirm')}
        danger
        requireText="RESET"
        loading={busy}
      >
        {fill(t('dev.reset.global.body'), { all: <strong>{t('dev.reset.global.allUsers')}</strong>, flag: <code>isTestData</code> })}
      </ConfirmDialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */

function AdminPanel({ log }: { log: Log }) {
  const { t } = useT();
  const toast = useToast();
  const [gameId, setGameId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = gameId.trim();

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteGame(id);
      log(t('dev.admin.log.deleted', { id }), 'win');
      toast.push({ title: t('dev.admin.toast.deleted'), description: id, tone: 'win' });
      setGameId('');
      setConfirm(false);
    } catch (e) {
      log(t('dev.admin.log.failed', { id, error: errMsg(e) }), 'loss');
      toast.push({ title: t('dev.admin.toast.failed'), description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title={t('dev.admin.title')}
      headerRight={
        <Badge tone="accent" dot>
          {t('dev.admin.badge')}
        </Badge>
      }
    >
      <div className={s.stack}>
        <Panel padding="sm" tone="elevated" title={t('dev.admin.rebuildTitle')}>
          <div className={s.stack}>
            <p className={s.muted}>{t('dev.admin.rebuildDesc')}</p>
            <div>
              <Button size="sm" variant="subtle" disabled>
                {t('dev.admin.rebuildButton')}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel padding="sm" tone="elevated" title={t('dev.admin.deleteTitle')}>
          <div className={s.stack}>
            <TextField
              label={t('dev.admin.gameId')}
              value={gameId}
              onChange={setGameId}
              placeholder="games/{id}"
              disabled={busy}
              inputProps={{ spellCheck: false, autoComplete: 'off', autoCapitalize: 'off' }}
              hint={t('dev.admin.gameIdHint')}
            />
            <div>
              <Button size="sm" variant="danger" onClick={() => setConfirm(true)} disabled={!id || busy}>
                {t('dev.admin.deleteGame')}
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => (busy ? undefined : setConfirm(false))}
        onConfirm={onDelete}
        title={t('dev.admin.deleteGame')}
        confirmLabel={t('common.actions.delete')}
        danger
        loading={busy}
      >
        {fill(t('dev.admin.deleteBody'), { path: <code>games/{id}</code> })}
      </ConfirmDialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */

function EmulatorPanel({ log }: { log: Log }) {
  const { t } = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const projectId = import.meta.env.VITE_FB_PROJECT_ID;

  const nuke = async () => {
    setBusy(true);
    const url = `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`;
    try {
      log(t('dev.emulator.log.request', { url }), 'warn');
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      log(t('dev.emulator.log.wiped'), 'win');
      toast.push({ title: t('dev.emulator.toast.nuked'), tone: 'win' });
    } catch (e) {
      log(t('dev.emulator.log.failed', { error: errMsg(e) }), 'loss');
      toast.push({ title: t('dev.emulator.toast.failed'), description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title={t('dev.emulator.title')}
      tone="accent"
      headerRight={
        <Badge tone="warn" dot>
          {t('dev.emulator.badge')}
        </Badge>
      }
    >
      <div className={s.stack}>
        <TerminalLine tone="warn" prompt="!">
          {t('dev.emulator.connected')}
        </TerminalLine>
        <p className={s.muted}>{t('dev.emulator.desc', { project: String(projectId) })}</p>
        <div className={s.row}>
          <Button variant="danger" onClick={() => void nuke()} loading={busy}>
            {t('dev.emulator.nuke')}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
