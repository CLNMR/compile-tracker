import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deriveWinner, pseudonym, type GameDoc, type GameInput, type PlayerDoc, type SetId, type SideKey } from '@/types';
import { isKnownProtocol, protocolsInSets, setsOf } from '@/data/protocols';
import {
  Badge,
  Button,
  EmptyState,
  IconChevron,
  IconList,
  IconPlus,
  SectionHeader,
  SegmentedControl,
  Select,
  Spinner,
  TerminalLine,
  TextField,
  cx,
  useMediaQuery,
  useToast,
} from '@/components/ui';
import { ProtocolCard, ProtocolPicker } from '@/components/protocol';
import { useUid } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGames';
import { usePlayerLabel, usePlayers } from '@/hooks/usePlayers';
import { useSettings } from '@/hooks/useSettings';
import { useGamesStore } from '@/store/gamesStore';
import { createGame, InvalidGameError, updateGame } from '@/repo/games';
import { PlayerDialog } from '@/features/players/PlayerDialog';
import { fromDatetimeLocal, readJson, toDatetimeLocal, writeStorage } from './gameUtils';
import s from './NewGamePage.module.css';

const STORAGE_KEY = 'compile.newGame.v1';

type Step = 1 | 2 | 3;
type FirstPlayer = SideKey | 'unknown';

interface WizardState {
  step: Step;
  p1Id: string;
  p2Id: string;
  p1Protocols: string[];
  p2Protocols: string[];
  p1Compiled: string[];
  p2Compiled: string[];
  /** datetime-local string */
  playedAt: string;
  firstPlayer: FirstPlayer;
  isTestData: boolean;
}

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Players' },
  { n: 2, label: 'Protocols' },
  { n: 3, label: 'Result' },
];

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function blankState(now: Date): WizardState {
  return {
    step: 1,
    p1Id: '',
    p2Id: '',
    p1Protocols: [],
    p2Protocols: [],
    p1Compiled: [],
    p2Compiled: [],
    playedAt: toDatetimeLocal(now),
    firstPlayer: 'unknown',
    isTestData: false,
  };
}

/** Restore a previous draft from sessionStorage, dropping anything that no longer makes sense. */
function restoreDraft(players: PlayerDoc[], defaultPlayerId: string | undefined, now: Date): WizardState {
  const base = blankState(now);
  const activeIds = new Set(players.filter((p) => !p.archived).map((p) => p.id));
  if (defaultPlayerId && activeIds.has(defaultPlayerId)) base.p1Id = defaultPlayerId;

  const raw = readJson<Partial<WizardState>>('session', STORAGE_KEY);
  if (!raw || typeof raw !== 'object') return base;

  const pick = (v: unknown) => (isStringArray(v) ? v.filter(isKnownProtocol) : []);
  const p1Protocols = pick(raw.p1Protocols);
  const p2Protocols = pick(raw.p2Protocols);
  const st: WizardState = {
    ...base,
    step: raw.step === 2 || raw.step === 3 ? raw.step : 1,
    p1Id: typeof raw.p1Id === 'string' && activeIds.has(raw.p1Id) ? raw.p1Id : base.p1Id,
    p2Id: typeof raw.p2Id === 'string' && activeIds.has(raw.p2Id) ? raw.p2Id : '',
    p1Protocols,
    p2Protocols,
    p1Compiled: pick(raw.p1Compiled).filter((id) => p1Protocols.includes(id)),
    p2Compiled: pick(raw.p2Compiled).filter((id) => p2Protocols.includes(id)),
    playedAt: typeof raw.playedAt === 'string' && fromDatetimeLocal(raw.playedAt) ? raw.playedAt : base.playedAt,
    firstPlayer: raw.firstPlayer === 'p1' || raw.firstPlayer === 'p2' ? raw.firstPlayer : 'unknown',
    isTestData: Boolean(raw.isTestData),
  };
  if (st.p1Id && st.p1Id === st.p2Id) st.p2Id = '';
  return st;
}

function stateFromGame(game: GameDoc): WizardState {
  return {
    step: 1,
    p1Id: game.p1.playerId,
    p2Id: game.p2.playerId,
    p1Protocols: [...game.p1.protocols],
    p2Protocols: [...game.p2.protocols],
    p1Compiled: [...game.p1.compiled],
    p2Compiled: [...game.p2.compiled],
    playedAt: toDatetimeLocal(game.playedAt.toDate()),
    firstPlayer: game.firstPlayer ?? 'unknown',
    isTestData: game.isTestData,
  };
}

export default function NewGamePage() {
  const { id } = useParams();
  const uid = useUid();
  const editing = id != null;
  const game = useGame(id);
  const gamesReady = useGamesStore((st) => st.ready);
  const { players, loading: playersLoading } = usePlayers();
  const { defaultPlayerId, loading: settingsLoading } = useSettings();

  if (playersLoading || settingsLoading || (editing && !gamesReady && !game)) {
    return (
      <div className={s.center}>
        <Spinner size={28} label="Loading" />
      </div>
    );
  }

  if (editing) {
    if (!game) {
      return (
        <EmptyState
          icon={<IconList />}
          title="Not found"
          lines={['no game at this address.']}
          action={
            <Button to="/games" variant="ghost">
              All games
            </Button>
          }
        />
      );
    }
    if (game.ownerUid !== uid) {
      return (
        <EmptyState
          title="Access denied"
          lines={['this game was recorded by someone else.', { text: 'only the owner can edit it.', tone: 'muted' }]}
          action={
            <Button to={`/games/${game.id}`} variant="ghost">
              View game
            </Button>
          }
        />
      );
    }
    return <Wizard key={game.id} game={game} makeInitial={() => stateFromGame(game)} />;
  }

  return <Wizard makeInitial={() => restoreDraft(players, defaultPlayerId, new Date())} />;
}

interface WizardProps {
  /** Present in edit mode. */
  game?: GameDoc;
  makeInitial: () => WizardState;
}

function Wizard({ game, makeInitial }: WizardProps) {
  const uid = useUid();
  const navigate = useNavigate();
  const toast = useToast();
  const label = usePlayerLabel();
  const { players, byId } = usePlayers();
  const { enabledSets } = useSettings();
  const editing = !!game;
  const sideBySide = useMediaQuery('(min-width: 900px)');
  const narrow = useMediaQuery('(max-width: 419px)');

  const [st, setSt] = useState<WizardState>(makeInitial);
  const [saving, setSaving] = useState(false);
  const [newPlayerFor, setNewPlayerFor] = useState<SideKey | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const patch = (p: Partial<WizardState>) => setSt((cur) => ({ ...cur, ...p }));

  // Draft persistence (new games only).
  useEffect(() => {
    if (editing) return;
    writeStorage('session', STORAGE_KEY, JSON.stringify(st));
  }, [st, editing]);

  /* ---------- derived ---------- */
  const active = players.filter((p) => !p.archived);
  const playerOptions = (selected: string) => {
    const opts = active.map((p) => ({ value: p.id, label: p.name }));
    if (selected && !active.some((p) => p.id === selected)) {
      const p = byId.get(selected);
      opts.push({ value: selected, label: p ? `${p.name} (archived)` : pseudonym(selected) });
    }
    return opts;
  };
  const p1Name = st.p1Id ? label(st.p1Id) : 'Player 1';
  const p2Name = st.p2Id ? label(st.p2Id) : 'Player 2';

  const step1Ok = !!st.p1Id && !!st.p2Id && st.p1Id !== st.p2Id;
  const overlap = st.p1Protocols.some((id) => st.p2Protocols.includes(id));
  const step2Ok = st.p1Protocols.length === 3 && st.p2Protocols.length === 3 && !overlap;
  const winner = deriveWinner({ compiled: st.p1Compiled }, { compiled: st.p2Compiled });
  const playedAt = fromDatetimeLocal(st.playedAt);
  const step3Ok = winner != null && playedAt != null;

  const enabledCount = protocolsInSets(enabledSets).length;
  // Keep protocols from disabled sets visible when editing an older game.
  const pickerSets: SetId[] = [...new Set<SetId>([...enabledSets, ...setsOf([...st.p1Protocols, ...st.p2Protocols])])];

  const canEnter = (n: Step) => (n === 1 ? true : n === 2 ? step1Ok : step1Ok && step2Ok);
  const stepOk = st.step === 1 ? step1Ok : st.step === 2 ? step2Ok : step3Ok;

  /* ---------- handlers ---------- */
  const goTo = (n: Step) => {
    if (!canEnter(n)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    patch({ step: n });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (!stepOk) {
      setShowErrors(true);
      return;
    }
    goTo((st.step + 1) as Step);
  };
  const back = () => goTo((st.step - 1) as Step);

  const setProtocols = (side: SideKey, ids: string[]) => {
    const sorted = [...ids].sort();
    if (side === 'p1') patch({ p1Protocols: sorted, p1Compiled: st.p1Compiled.filter((id) => sorted.includes(id)) });
    else patch({ p2Protocols: sorted, p2Compiled: st.p2Compiled.filter((id) => sorted.includes(id)) });
  };

  const toggleCompiled = (side: SideKey, id: string) => {
    const key = side === 'p1' ? 'p1Compiled' : 'p2Compiled';
    const cur = st[key];
    patch({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].sort() });
  };

  const swapPlayers = () => patch({ p1Id: st.p2Id, p2Id: st.p1Id });

  const buildInput = (): GameInput | null => {
    if (!winner || !playedAt) return null;
    return {
      playedAt,
      p1: { playerId: st.p1Id, protocols: st.p1Protocols, compiled: st.p1Compiled },
      p2: { playerId: st.p2Id, protocols: st.p2Protocols, compiled: st.p2Compiled },
      winner,
      firstPlayer: st.firstPlayer === 'unknown' ? undefined : st.firstPlayer,
      isTestData: st.isTestData,
    };
  };

  const save = async (andNew: boolean) => {
    const input = buildInput();
    if (!input || !step1Ok || !step2Ok) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      let savedId: string;
      if (game) {
        await updateGame(uid, game.id, input, game.createdAt);
        savedId = game.id;
      } else {
        savedId = await createGame(uid, input);
      }
      toast.push({ title: 'Game compiled', description: `${p1Name} vs ${p2Name} — ${winner === 'p1' ? p1Name : p2Name} wins`, tone: 'win' });
      if (andNew && !editing) {
        setSt((cur) => ({
          ...blankState(new Date()),
          step: 2,
          p1Id: cur.p1Id,
          p2Id: cur.p2Id,
          isTestData: cur.isTestData,
        }));
        setShowErrors(false);
        window.scrollTo({ top: 0 });
      } else {
        if (!editing) writeStorage('session', STORAGE_KEY, null);
        navigate(`/games/${savedId}`, { replace: editing });
      }
    } catch (e) {
      if (e instanceof InvalidGameError) toast.push({ title: 'Invalid game', description: e.message, tone: 'loss' });
      else toast.push({ title: 'Could not save', description: (e as Error).message, tone: 'loss', durationMs: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (editing && game) {
      navigate(`/games/${game.id}`);
      return;
    }
    writeStorage('session', STORAGE_KEY, null);
    navigate('/games');
  };

  const cardStyle = narrow ? ({ '--cw': '104px', '--ch': '146px' } as CSSProperties) : undefined;

  /* ---------- render ---------- */
  return (
    <div className={s.page}>
      <SectionHeader as="h1" right={editing ? <Badge mono>editing</Badge> : null}>
        {editing ? 'Edit game' : 'New game'}
      </SectionHeader>

      <ol className={s.stepper} aria-label="Steps">
        {STEPS.map(({ n, label: name }) => {
          const current = n === st.step;
          const done = n < st.step;
          return (
            <li key={n} className={cx(s.stepItem, current && s.stepCurrent, done && s.stepDone)}>
              <button
                type="button"
                className={s.stepBtn}
                onClick={() => goTo(n)}
                disabled={!canEnter(n)}
                aria-current={current ? 'step' : undefined}
              >
                <span className={s.stepNum}>0{n}</span>
                <span className={s.stepLabel}>{name}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {st.step === 1 ? (
        <section className={s.step} aria-label="Players">
          <div className={s.playerGrid}>
            <div className={s.playerField}>
              <Select
                label="Player 1"
                value={st.p1Id}
                onChange={(v) => patch({ p1Id: v })}
                placeholder="Choose a player…"
                options={playerOptions(st.p1Id)}
                error={showErrors && !st.p1Id ? 'Pick player 1.' : undefined}
              />
              <Button size="sm" variant="ghost" iconLeft={<IconPlus />} onClick={() => setNewPlayerFor('p1')}>
                New player
              </Button>
            </div>
            <button type="button" className={s.swap} onClick={swapPlayers} disabled={!st.p1Id && !st.p2Id} aria-label="Swap players" title="Swap players">
              ⇄
            </button>
            <div className={s.playerField}>
              <Select
                label="Player 2"
                value={st.p2Id}
                onChange={(v) => patch({ p2Id: v })}
                placeholder="Choose a player…"
                options={playerOptions(st.p2Id)}
                error={
                  showErrors && !st.p2Id ? 'Pick player 2.' : st.p1Id && st.p2Id && st.p1Id === st.p2Id ? 'A player cannot face themselves.' : undefined
                }
              />
              <Button size="sm" variant="ghost" iconLeft={<IconPlus />} onClick={() => setNewPlayerFor('p2')}>
                New player
              </Button>
            </div>
          </div>
          {active.length < 2 ? (
            <TerminalLine tone="warn" prompt="!">
              you need at least two players. <Link to="/players">Manage players</Link>
            </TerminalLine>
          ) : null}
        </section>
      ) : null}

      {st.step === 2 ? (
        <section className={s.step} aria-label="Protocols">
          {enabledCount < 6 ? (
            <TerminalLine tone="warn" prompt="!">
              only {enabledCount} protocols enabled — a game needs 6. <Link to="/settings">Enable more sets in Settings</Link>
            </TerminalLine>
          ) : null}
          {showErrors && !step2Ok ? (
            <TerminalLine tone="loss" prompt="✗">
              {overlap ? 'both sides share a protocol — pick 6 distinct ones.' : 'each side needs exactly 3 protocols.'}
            </TerminalLine>
          ) : null}
          <div className={cx(s.pickers, sideBySide && s.pickersWide)}>
            <ProtocolPicker
              title={p1Name}
              enabledSets={pickerSets}
              value={st.p1Protocols}
              onChange={(ids) => setProtocols('p1', ids)}
              excluded={st.p2Protocols}
            />
            <ProtocolPicker
              title={p2Name}
              enabledSets={pickerSets}
              value={st.p2Protocols}
              onChange={(ids) => setProtocols('p2', ids)}
              excluded={st.p1Protocols}
            />
          </div>
        </section>
      ) : null}

      {st.step === 3 ? (
        <section className={s.step} aria-label="Result">
          <div className={s.resultMeta}>
            <TextField
              label="Played at"
              type="datetime-local"
              value={st.playedAt}
              onChange={(v) => patch({ playedAt: v })}
              error={!playedAt ? 'Enter a valid date and time.' : undefined}
              inputProps={{ max: '9999-12-31T23:59' }}
            />
            <div className={s.firstField}>
              <span className={s.fieldLabel}>First player</span>
              <SegmentedControl<FirstPlayer>
                fullWidth
                label="First player"
                value={st.firstPlayer}
                onChange={(v) => patch({ firstPlayer: v })}
                options={[
                  { value: 'p1', label: <span className={s.segLabel}>{p1Name}</span> },
                  { value: 'p2', label: <span className={s.segLabel}>{p2Name}</span> },
                  { value: 'unknown', label: <span className={s.segLabel}>unknown</span> },
                ]}
              />
            </div>
          </div>

          <TerminalLine tone="muted">tap a card to mark it compiled. the side with all 3 wins.</TerminalLine>

          <div className={cx(s.sides, sideBySide && s.sidesWide)}>
            {(['p1', 'p2'] as const).map((side) => {
              const protocols = side === 'p1' ? st.p1Protocols : st.p2Protocols;
              const compiled = side === 'p1' ? st.p1Compiled : st.p2Compiled;
              const name = side === 'p1' ? p1Name : p2Name;
              const won = winner === side;
              return (
                <section key={side} className={cx(s.side, won && s.sideWon)} aria-label={`${name} result`}>
                  <header className={s.sideHead}>
                    <span className={s.sideKey}>{side.toUpperCase()}</span>
                    <span className={cx(s.sideName, won && s.sideNameWon)}>{name}</span>
                    <span className={s.sideBadges}>
                      {won ? <Badge tone="win">winner</Badge> : <Badge mono>{compiled.length} / 3</Badge>}
                    </span>
                  </header>
                  <div className={s.cards}>
                    {protocols.map((id) => (
                      <ProtocolCard
                        key={id}
                        protocolId={id}
                        size="md"
                        interactive
                        state={compiled.includes(id) ? 'compiled' : 'loading'}
                        onClick={() => toggleCompiled(side, id)}
                        style={cardStyle}
                        title={compiled.includes(id) ? 'Compiled — tap to undo' : 'Tap to mark as compiled'}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {winner == null ? (
            <TerminalLine tone={showErrors ? 'loss' : 'muted'} prompt={showErrors ? '✗' : '>'}>
              {st.p1Compiled.length === 3 && st.p2Compiled.length === 3
                ? 'both sides compiled all 3 — only one side can win.'
                : 'no winner yet — mark all 3 protocols of the winning side as compiled.'}
            </TerminalLine>
          ) : (
            <TerminalLine tone="win" prompt="✓">
              compile successful — {winner === 'p1' ? p1Name : p2Name} wins
            </TerminalLine>
          )}
        </section>
      ) : null}

      <footer className={s.footer}>
        <div className={s.footerInner}>
          {st.step > 1 ? (
            <Button variant="subtle" onClick={back} disabled={saving} iconLeft={<IconChevron direction="left" />}>
              Back
            </Button>
          ) : (
            <Button variant="subtle" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <span className={s.footerSpacer} />
          {st.step < 3 ? (
            <Button onClick={next} iconRight={<IconChevron direction="right" />} disabled={!stepOk && showErrors}>
              Next
            </Button>
          ) : (
            <>
              {!editing ? (
                <Button variant="ghost" onClick={() => void save(true)} disabled={!step3Ok || saving} className={s.saveNew}>
                  Save &amp; new
                </Button>
              ) : null}
              <Button onClick={() => void save(false)} loading={saving} disabled={!step3Ok}>
                {editing ? 'Save changes' : 'Compile game'}
              </Button>
            </>
          )}
        </div>
      </footer>

      <PlayerDialog
        open={newPlayerFor != null}
        onClose={() => setNewPlayerFor(null)}
        onSaved={(id) => {
          if (newPlayerFor === 'p1') patch({ p1Id: id });
          else if (newPlayerFor === 'p2') patch({ p2Id: id });
        }}
      />
    </div>
  );
}
