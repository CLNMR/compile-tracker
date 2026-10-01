import { useCallback, useEffect, useRef, useState } from 'react';
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

type Log = (text: string, tone?: TerminalTone) => void;

/** /dev — test-data generator, resets, admin and emulator helpers with a shared terminal log. */
export default function DevToolsPage() {
  const { isAdmin } = useAuth();
  const [lines, setLines] = useState<TerminalBlockLine[]>([{ text: 'developer tools ready.', tone: 'muted' }]);
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
        <SectionHeader as="h1">Developer tools</SectionHeader>
        <TerminalLine tone="warn">these actions write to the shared database</TerminalLine>
      </div>

      <Panel title="Log" headerRight={<Badge mono>{lines.length}</Badge>} padding="sm">
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
      log(`generate: ${nGames} games · ${nPlayers} players · ${nDays} days · seed ${nSeed} · sets ${enabledSets.join(',')}`);

      const wanted = TEST_PLAYER_NAMES.slice(0, nPlayers);
      const byName = new Map(players.map((p) => [p.name, p.id]));
      const missing = wanted.filter((n) => !byName.has(n));
      log(`players: ${wanted.length - missing.length} existing, ${missing.length} to create`, 'muted');
      if (missing.length) {
        const ids = await createPlayers(uid, missing);
        missing.forEach((n, i) => byName.set(n, ids[i]));
        log(`created ${missing.join(', ')}`, 'muted');
      }
      const playerIds = wanted.map((n) => byName.get(n)!);

      const inputs = generateGames({ games: nGames, playerIds, enabledSets, seed: nSeed, days: nDays });
      log(`generated ${inputs.length} games, writing in batches of 400…`, 'muted');

      const written = await writeGamesBatch(uid, inputs, (n) => log(`wrote ${n} / ${inputs.length}`));
      log(`done — ${written} test games written`, 'win');
      toast.push({ title: 'Test data generated', description: `${written} games · ${playerIds.length} players`, tone: 'win' });
    } catch (e) {
      log(`generate failed: ${errMsg(e)}`, 'loss');
      toast.push({ title: 'Generation failed', description: errMsg(e), tone: 'loss' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel title="Generate test data" headerRight={<Badge mono tone={tooFewProtocols ? 'warn' : 'default'}>{protocolCount} protocols</Badge>}>
      <div className={s.stack}>
        <div className={s.fields}>
          <TextField
            label="Games"
            type="number"
            value={games}
            onChange={setGames}
            disabled={running}
            inputProps={{ min: LIMITS.games.min, max: LIMITS.games.max, inputMode: 'numeric' }}
            error={nGames == null ? `${LIMITS.games.min}–${LIMITS.games.max}` : undefined}
          />
          <TextField
            label="Players"
            type="number"
            value={playerCount}
            onChange={setPlayerCount}
            disabled={running}
            inputProps={{ min: LIMITS.players.min, max: LIMITS.players.max, inputMode: 'numeric' }}
            error={nPlayers == null ? `${LIMITS.players.min}–${LIMITS.players.max}` : undefined}
          />
          <TextField
            label="Days"
            type="number"
            value={days}
            onChange={setDays}
            disabled={running}
            inputProps={{ min: LIMITS.days.min, max: LIMITS.days.max, inputMode: 'numeric' }}
            error={nDays == null ? `${LIMITS.days.min}–${LIMITS.days.max}` : undefined}
          />
          <TextField
            className={s.seedField}
            label="Seed"
            value={seed}
            onChange={setSeed}
            disabled={running}
            inputProps={{ inputMode: 'numeric', spellCheck: false }}
            error={nSeed == null ? 'non-negative integer' : undefined}
            trailing={
              <Button size="sm" variant="ghost" onClick={() => setSeed(String(randomSeed()))} disabled={running}>
                reroll
              </Button>
            }
          />
        </div>

        <p className={s.muted}>
          Uses players named {TEST_PLAYER_NAMES.slice(0, 3).join(', ')}, … (created if missing) and the protocol sets enabled in Settings. Games
          are flagged as test data. Same seed → identical games.
        </p>

        {tooFewProtocols ? (
          <TerminalLine tone="warn" prompt="!">
            only {protocolCount} protocols enabled — enable sets in Settings until at least {MIN_PROTOCOLS} are available
          </TerminalLine>
        ) : null}

        <div className={s.row}>
          <Button onClick={() => void run()} disabled={running || !valid || tooFewProtocols || !uid}>
            Generate
          </Button>
          {running ? (
            <>
              <Spinner label="Generating" />
              <span className="muted mono">writing…</span>
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
        log('reset: deleting my test games…');
        const n = await deleteMyTestGames(uid, (d) => log(`deleted ${d}`, 'muted'));
        log(`removed ${n} test games`, 'win');
        toast.push({ title: 'Test data deleted', description: `${n} games removed`, tone: 'win' });
      } else if (kind === 'all') {
        log('reset: deleting ALL my games…');
        const g = await deleteMyGames(uid, (d) => log(`deleted ${d}`, 'muted'));
        log(`removed ${g} games`, 'muted');
        const p = await deleteAllPlayers(uid);
        log(`removed ${p} players`, 'muted');
        if (alsoSettings) {
          await deleteUserSettings(uid);
          log('settings reset to defaults', 'muted');
        } else if (defaultPlayerId) {
          await setDefaultPlayerId(undefined);
          log('cleared default player', 'muted');
        }
        log(`done — ${g} games, ${p} players${alsoSettings ? ', settings' : ''} removed`, 'win');
        toast.push({ title: 'All my data deleted', description: `${g} games · ${p} players`, tone: 'win' });
      } else {
        log('purge: deleting test games from ALL users…', 'warn');
        const n = await deleteAllTestGames((d) => log(`deleted ${d}`, 'muted'));
        log(`purged ${n} global test games`, 'win');
        toast.push({ title: 'Global test data purged', description: `${n} games removed`, tone: 'win' });
      }
      setOpen(null);
      setAlsoSettings(false);
    } catch (e) {
      log(`reset failed: ${errMsg(e)}`, 'loss');
      toast.push({ title: 'Reset failed', description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Reset">
      <div className={s.resetGrid}>
        <div className={s.resetItem}>
          <p>Removes games you own that are flagged as test data. Players and real games stay.</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('test')} disabled={!uid}>
            Delete my test data
          </Button>
        </div>
        <div className={s.resetItem}>
          <p>Removes every game and player you own. Optionally resets your settings too.</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('all')} disabled={!uid}>
            Delete ALL my data
          </Button>
        </div>
        <div className={s.resetItem}>
          <p>Removes test-flagged games from every user. The security rules allow this for everyone.</p>
          <Button variant="danger" size="sm" onClick={() => setOpen('global')} disabled={!uid}>
            Purge global test data
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={open === 'test'}
        onClose={close}
        onConfirm={() => runReset('test')}
        title="Delete my test data"
        confirmLabel="Delete test games"
        danger
        requireText="RESET"
        loading={busy}
      >
        Deletes all games you own with <code>isTestData = true</code>. Your players and real games are untouched. There is no undo.
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'all'}
        onClose={close}
        onConfirm={() => runReset('all')}
        title="Delete ALL my data"
        confirmLabel="Delete everything"
        danger
        requireText="RESET"
        loading={busy}
      >
        <div className={s.dialogStack}>
          <p>Deletes every game and every player under your identity — test data and real games alike. There is no undo.</p>
          <Checkbox label="Also reset my settings" description="Enabled sets and default player go back to defaults" checked={alsoSettings} onChange={setAlsoSettings} disabled={busy} />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'global'}
        onClose={close}
        onConfirm={() => runReset('global')}
        title="Purge global test data"
        confirmLabel="Purge"
        danger
        requireText="RESET"
        loading={busy}
      >
        Deletes test-flagged games from <strong>all users</strong>, not just yours. The Firestore rules permit any signed-in user to delete
        <code> isTestData</code> games, so this is safe for real data but affects everyone's test sets.
      </ConfirmDialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */

function AdminPanel({ log }: { log: Log }) {
  const toast = useToast();
  const [gameId, setGameId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = gameId.trim();

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteGame(id);
      log(`admin: deleted game ${id}`, 'win');
      toast.push({ title: 'Game deleted', description: id, tone: 'win' });
      setGameId('');
      setConfirm(false);
    } catch (e) {
      log(`admin: delete ${id} failed: ${errMsg(e)}`, 'loss');
      toast.push({ title: 'Delete failed', description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Admin" headerRight={<Badge tone="accent" dot>admin</Badge>}>
      <div className={s.stack}>
        <Panel padding="sm" tone="elevated" title="Rebuild stats / global snapshot">
          <div className={s.stack}>
            <p className={s.muted}>Reserved for the &gt;5k games fallback (precomputed global snapshot). Not implemented yet.</p>
            <div>
              <Button size="sm" variant="subtle" disabled>
                Rebuild snapshot
              </Button>
            </div>
          </div>
        </Panel>

        <Panel padding="sm" tone="elevated" title="Delete any game by id">
          <div className={s.stack}>
            <TextField
              label="Game id"
              value={gameId}
              onChange={setGameId}
              placeholder="games/{id}"
              disabled={busy}
              inputProps={{ spellCheck: false, autoComplete: 'off', autoCapitalize: 'off' }}
              hint="Rules must allow admins to delete games they do not own."
            />
            <div>
              <Button size="sm" variant="danger" onClick={() => setConfirm(true)} disabled={!id || busy}>
                Delete game
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => (busy ? undefined : setConfirm(false))}
        onConfirm={onDelete}
        title="Delete game"
        confirmLabel="Delete"
        danger
        loading={busy}
      >
        Permanently deletes <code>games/{id}</code>, whoever owns it.
      </ConfirmDialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */

function EmulatorPanel({ log }: { log: Log }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const projectId = import.meta.env.VITE_FB_PROJECT_ID;

  const nuke = async () => {
    setBusy(true);
    const url = `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`;
    try {
      log(`emulator: DELETE ${url}`, 'warn');
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      log('emulator database wiped', 'win');
      toast.push({ title: 'Emulator database nuked', tone: 'win' });
    } catch (e) {
      log(`emulator nuke failed: ${errMsg(e)}`, 'loss');
      toast.push({ title: 'Nuke failed', description: errMsg(e), tone: 'loss' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Emulator" tone="accent" headerRight={<Badge tone="warn" dot>local</Badge>}>
      <div className={s.stack}>
        <TerminalLine tone="warn" prompt="!">
          connected to local emulators — auth 127.0.0.1:9099 · firestore 127.0.0.1:8080
        </TerminalLine>
        <p className={s.muted}>Wipes every document in the emulator's Firestore (project {projectId}). Local only; nothing touches production.</p>
        <div className={s.row}>
          <Button variant="danger" onClick={() => void nuke()} loading={busy}>
            Nuke emulator database
          </Button>
        </div>
      </div>
    </Panel>
  );
}
