import { useState } from 'react';
import {
  Badge,
  BarList,
  BinaryStrip,
  Button,
  Checkbox,
  Chip,
  ConfirmDialog,
  Dialog,
  EmptyState,
  HatchBar,
  IconButton,
  IconChart,
  IconCheck,
  IconChevron,
  IconDev,
  IconDownload,
  IconEdit,
  IconHome,
  IconLink,
  IconList,
  IconPlus,
  IconSettings,
  IconTrash,
  IconUser,
  IconX,
  LogoMark,
  Panel,
  SectionHeader,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  StatTile,
  Switch,
  Tabs,
  TerminalBlock,
  TerminalLine,
  TextField,
  ToastProvider,
  TraceLine,
  Wordmark,
  useToast,
} from '@/components/ui';
import { ProtocolCard, ProtocolChip, ProtocolPicker } from '@/components/protocol';
import { getProtocol, PROTOCOL_IDS } from '@/data/protocols';
import type { Scope, SetId } from '@/types';
import s from '@/styles/kitchen-sink.module.css';

/** Visual QA page for every design-system component. Mounted at /dev/ui by the router. */
export default function UiKitchenSink() {
  return (
    <ToastProvider>
      <div className={s.page}>
        <header className={s.hero}>
          <LogoMark size={56} title="Compile" />
          <Wordmark size="lg" />
          <TerminalLine cursor tone="muted">
            ui kitchen sink — every component, realistic states
          </TerminalLine>
          <BinaryStrip length={48} seed={11} />
        </header>

        <BrandSection />
        <TypeSection />
        <ButtonSection />
        <FormSection />
        <ChipSection />
        <NavSection />
        <StatsSection />
        <StateSection />
        <OverlaySection />
        <ProtocolSection />
        <PickerSection />
      </div>
    </ToastProvider>
  );
}

function BrandSection() {
  return (
    <Panel title="Brand">
      <div className={s.stack}>
        <div className={s.row}>
          <Wordmark size="sm" />
          <Wordmark size="md" />
        </div>
        <div className={s.row}>
          <LogoMark size={20} />
          <LogoMark size={28} />
          <LogoMark size={40} />
          <span className="muted mono">hover the wordmark to replay the glitch</span>
        </div>
        <SectionHeader right={<Badge mono>right slot</Badge>}>Section header</SectionHeader>
        <SectionHeader size="sm">Small header</SectionHeader>
        <HatchBar />
        <HatchBar tone="dim" height={4} />
        <HatchBar tone="win" height={3} />
        <TraceLine nodes="both" />
        <div className={s.row}>
          <BinaryStrip length={24} seed={1} />
          <BinaryStrip length={16} seed={2} />
        </div>
        <div className={s.row}>
          <Panel padding="sm" tone="elevated" className={s.nested}>
            nested elevated
          </Panel>
          <Panel padding="sm" tone="accent" className={s.nested}>
            accent tone
          </Panel>
        </div>
      </div>
    </Panel>
  );
}

function TypeSection() {
  const [typing, setTyping] = useState(false);
  return (
    <Panel title="Terminal & type">
      <div className={s.stack}>
        <div className={s.stack}>
          <h1>Heading one</h1>
          <h2>Heading two</h2>
          <h3>Heading three</h3>
          <p>
            Body text in Inter. <a href="#main">A link</a>, <span className="mono">mono text</span>, <span className="muted">muted</span>.
          </p>
        </div>
        <TerminalLine>default line</TerminalLine>
        <TerminalLine tone="muted">muted line</TerminalLine>
        <TerminalLine tone="win" prompt="✓">compiled 3 protocols</TerminalLine>
        <TerminalLine tone="loss" prompt="✗">connection lost</TerminalLine>
        <TerminalLine tone="warn" prompt="!">emulator mode</TerminalLine>
        <TerminalLine cursor>awaiting input</TerminalLine>
        <TerminalBlock
          typing={typing}
          lines={[
            'generating test data…',
            { text: 'players: 4', tone: 'muted' },
            { text: 'games: 120', tone: 'muted' },
            { text: 'done.', tone: 'win', prompt: '✓' },
          ]}
        />
        <div>
          <Button size="sm" variant="ghost" onClick={() => setTyping((v) => !v)}>
            {typing ? 'Stop typing' : 'Replay typing'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ButtonSection() {
  const toast = useToast();
  return (
    <Panel title="Buttons">
      <div className={s.stack}>
        <div className={s.row}>
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className={s.row}>
          <Button size="sm" iconLeft={<IconPlus />}>
            Small
          </Button>
          <Button size="md" iconRight={<IconChevron direction="right" />}>
            Medium
          </Button>
          <Button size="lg" iconLeft={<IconCheck />}>
            Large
          </Button>
        </div>
        <div className={s.row}>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="ghost" to="/dev/ui" iconLeft={<IconLink />}>
            Link button
          </Button>
          <Button variant="subtle" onClick={() => toast.push({ title: 'Game saved', description: 'Fire · Water · Life vs Death · Metal · Light', tone: 'win' })}>
            Toast: win
          </Button>
          <Button variant="subtle" onClick={() => toast.push({ title: 'Could not save', description: 'Offline — retrying when back online.', tone: 'loss' })}>
            Toast: loss
          </Button>
          <Button variant="subtle" onClick={() => toast.push({ title: 'Heads up', tone: 'warn', durationMs: 0 })}>
            Toast: sticky
          </Button>
        </div>
        <Button fullWidth variant="primary" iconLeft={<IconPlus />}>
          Full width
        </Button>
        <div className={s.row}>
          <IconButton label="Home">
            <IconHome />
          </IconButton>
          <IconButton label="Add" variant="primary">
            <IconPlus />
          </IconButton>
          <IconButton label="Edit" variant="subtle">
            <IconEdit />
          </IconButton>
          <IconButton label="Delete" variant="danger">
            <IconTrash />
          </IconButton>
          <IconButton label="Loading" loading>
            <IconDownload />
          </IconButton>
          <IconButton label="Small" size="sm">
            <IconX />
          </IconButton>
        </div>
        <div className={s.row} aria-label="all icons">
          <IconHome />
          <IconPlus />
          <IconList />
          <IconChart />
          <IconSettings />
          <IconDev />
          <IconUser />
          <IconTrash />
          <IconEdit />
          <IconCheck />
          <IconX />
          <IconChevron />
          <IconLink />
          <IconDownload />
        </div>
      </div>
    </Panel>
  );
}

function FormSection() {
  const [name, setName] = useState('');
  const [set, setSet] = useState('MN01');
  const [date, setDate] = useState('2026-10-01');
  const [player, setPlayer] = useState('');
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(false);
  return (
    <Panel title="Form controls">
      <div className={s.formGrid}>
        <TextField label="Player name" placeholder="e.g. Ada" value={name} onChange={setName} hint="Only you can see names." required />
        <TextField label="With error" value="Ada" inputProps={{ readOnly: true }} error="A player with this name already exists." />
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <TextField label="Disabled" value="read only" disabled inputProps={{ readOnly: true }} />
        <Select
          label="Default set"
          value={set}
          onChange={setSet}
          options={[
            { value: 'MN01', label: 'Main 1' },
            { value: 'MN02', label: 'Main 2' },
            { value: 'MN03', label: 'Main 3' },
            { value: 'AX01', label: 'Aux 1', disabled: true },
          ]}
          hint="Custom listbox, themed."
        />
        <Select label="Placeholder" value={player} onChange={setPlayer} placeholder="Choose a player…" options={[{ value: 'a', label: 'Ada' }]} />
        <div className={s.stack}>
          <Checkbox label="Main 1" description="12 protocols" checked={checked} onChange={setChecked} />
          <Checkbox label="Indeterminate" indeterminate />
          <Checkbox label="Disabled" disabled defaultChecked />
        </div>
        <div className={s.stack}>
          <Switch label="Include test data" description="Shown with a badge" checked={on} onChange={setOn} />
          <Switch label="Small" size="sm" checked={!on} onChange={(v) => setOn(!v)} />
          <Switch label="Disabled" checked disabled onChange={() => {}} />
        </div>
      </div>
    </Panel>
  );
}

function ChipSection() {
  const [chips, setChips] = useState(['Fire', 'Water', 'Life']);
  return (
    <Panel title="Chips & badges">
      <div className={s.stack}>
        <div className={s.row}>
          <Chip>Default</Chip>
          <Chip tone="accent">Accent</Chip>
          <Chip tone="win" icon={<IconCheck />}>
            Win
          </Chip>
          <Chip tone="loss">Loss</Chip>
          <Chip tone="warn">Warn</Chip>
          <Chip size="sm">Small</Chip>
          <Chip onClick={() => {}} selected>
            Clickable
          </Chip>
        </div>
        <div className={s.row}>
          {chips.map((c) => (
            <Chip key={c} tone="accent" onRemove={() => setChips((l) => l.filter((x) => x !== c))}>
              {c}
            </Chip>
          ))}
          {chips.length < 3 ? (
            <Button size="sm" variant="ghost" onClick={() => setChips(['Fire', 'Water', 'Life'])}>
              Reset
            </Button>
          ) : null}
        </div>
        <div className={s.row}>
          <Badge>Default</Badge>
          <Badge tone="accent" dot>
            Live
          </Badge>
          <Badge tone="win">Win</Badge>
          <Badge tone="loss">Loss</Badge>
          <Badge tone="warn">Test data</Badge>
          <Badge mono>P-A3F9</Badge>
        </div>
        <div className={s.row}>
          {PROTOCOL_IDS.slice(0, 6).map((id, i) => (
            <ProtocolChip key={id} protocolId={id} compiled={i % 2 === 0} />
          ))}
          <ProtocolChip protocolId="chaos" size="sm" showSet />
          <ProtocolChip protocolId="nova" onClick={() => {}} selected />
          <ProtocolChip protocolId="unity" onRemove={() => {}} />
        </div>
      </div>
    </Panel>
  );
}

function NavSection() {
  const [scope, setScope] = useState<Scope>('mine');
  const [tab, setTab] = useState('overview');
  return (
    <Panel title="Segmented & tabs">
      <div className={s.stack}>
        <div className={s.row}>
          <SegmentedControl<Scope>
            label="Scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'mine', label: 'Mine' },
              { value: 'all', label: 'All' },
            ]}
          />
          <SegmentedControl
            size="sm"
            value="b"
            onChange={() => {}}
            options={[
              { value: 'a', label: 'Week' },
              { value: 'b', label: 'Month' },
              { value: 'c', label: 'Year', disabled: true },
            ]}
          />
        </div>
        <SegmentedControl<Scope>
          fullWidth
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My games' },
            { value: 'all', label: 'All games' },
          ]}
        />
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'protocols', label: 'Protocols', badge: 45 },
            { id: 'players', label: 'Players' },
            { id: 'matchups', label: 'Matchups' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'disabled', label: 'Disabled', disabled: true },
          ]}
        />
        <TerminalLine tone="muted">active tab: {tab}</TerminalLine>
      </div>
    </Panel>
  );
}

function StatsSection() {
  const items = ['fire', 'water', 'life', 'death', 'speed'].map((id, i) => {
    const p = getProtocol(id);
    return {
      key: id,
      label: <ProtocolChip protocolId={id} size="sm" />,
      value: [31, 24, 18, 12, 7][i] ?? 0,
      color: `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`,
      sub: i === 0 ? 'most picked' : undefined,
    };
  });
  return (
    <Panel title="Stats">
      <div className={s.stack}>
        <div className={s.tiles}>
          <StatTile label="Games" value={128} sub="+6 this week" />
          <StatTile label="Win rate" value="61%" tone="win" sub="78 / 128" />
          <StatTile label="Losses" value={50} tone="loss" />
          <StatTile label="Streak" value="W4" tone="accent" />
          <StatTile label="Avg. compiled" value="2.1" size="sm" />
          <StatTile label="Best protocol" value="Fire" size="lg" tone="warn" sub="71% win" />
        </div>
        <BarList items={items} format={(v) => `${v} games`} />
        <BarList
          items={[
            { key: 'a', label: 'Ada', value: 0.72, max: 1, onClick: () => {} },
            { key: 'b', label: 'P-9F2C', value: 0.41, max: 1, color: 'var(--text-muted)', onClick: () => {} },
          ]}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>
    </Panel>
  );
}

function StateSection() {
  return (
    <Panel title="Loading & empty">
      <div className={s.stack}>
        <div className={s.row}>
          <Spinner />
          <Spinner size={28} />
          <span className="muted mono">spinner</span>
        </div>
        <Skeleton height={18} width="40%" />
        <Skeleton lines={3} />
        <div className={s.row}>
          <Skeleton width={56} height={76} radius={6} />
          <Skeleton width={56} height={76} radius={6} />
          <Skeleton width={56} height={76} radius={6} />
        </div>
        <EmptyState
          icon={<IconList />}
          title="No games yet"
          lines={['no games found.', { text: 'record your first match to see stats.', tone: 'muted' }]}
          action={
            <Button iconLeft={<IconPlus />} to="/games/new">
              New game
            </Button>
          }
        />
        <EmptyState compact lines={['nothing matches these filters.']} />
      </div>
    </Panel>
  );
}

function OverlaySection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [danger, setDanger] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Panel title="Dialogs">
      <div className={s.row}>
        <Button variant="subtle" onClick={() => setOpen(true)}>
          Dialog
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          Confirm
        </Button>
        <Button variant="danger" onClick={() => setDanger(true)}>
          Danger + type to confirm
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit player"
        footer={
          <>
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </>
        }
      >
        <TextField label="Name" value="Ada" inputProps={{ readOnly: true }} />
        <Checkbox label="Archived" />
      </Dialog>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          await new Promise((r) => setTimeout(r, 800));
          setBusy(false);
          setConfirm(false);
          toast.push({ title: 'Linked Google account', tone: 'win' });
        }}
        title="Link Google account?"
        confirmLabel="Link"
        loading={busy}
      >
        Your anonymous data will be kept and attached to your Google account.
      </ConfirmDialog>

      <ConfirmDialog
        open={danger}
        onClose={() => setDanger(false)}
        onConfirm={() => {
          setDanger(false);
          toast.push({ title: 'Database reset', description: '120 games removed.', tone: 'loss' });
        }}
        title="Reset database"
        confirmLabel="Reset everything"
        danger
        requireText="RESET"
      >
        This permanently deletes all games and players you own. There is no undo.
      </ConfirmDialog>
    </Panel>
  );
}

function ProtocolSection() {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({ fire: true });
  const trio = ['fire', 'water', 'life'];
  return (
    <Panel title="Protocol cards">
      <div className={s.stack}>
        <SectionHeader size="sm" as="h3">
          Sizes
        </SectionHeader>
        <div className={s.rowEnd}>
          <ProtocolCard protocolId="psychic" size="sm" />
          <ProtocolCard protocolId="psychic" size="md" showSet />
          <ProtocolCard protocolId="psychic" size="lg" showSet value="71%" />
        </div>

        <SectionHeader size="sm" as="h3">
          States (tap to flip)
        </SectionHeader>
        <div className={s.row}>
          {trio.map((id) => (
            <ProtocolCard
              key={id}
              protocolId={id}
              size="md"
              state={flipped[id] ? 'compiled' : 'loading'}
              onClick={() => setFlipped((f) => ({ ...f, [id]: !f[id] }))}
            />
          ))}
          <ProtocolCard protocolId="death" size="md" selected interactive />
          <ProtocolCard protocolId="metal" size="md" disabled overlayLabel="Taken" />
          <ProtocolCard protocolId="light" size="md" value={12} />
        </div>

        <SectionHeader size="sm" as="h3">
          Small grid
        </SectionHeader>
        <div className={s.smGrid}>
          {PROTOCOL_IDS.slice(0, 24).map((id, i) => (
            <ProtocolCard key={id} protocolId={id} size="sm" state={i % 5 === 0 ? 'compiled' : undefined} selected={i === 3} />
          ))}
        </div>

        <SectionHeader size="sm" as="h3">
          All protocols (md)
        </SectionHeader>
        <div className={s.mdGrid}>
          {PROTOCOL_IDS.map((id) => (
            <ProtocolCard key={id} protocolId={id} size="md" showSet value={`${(id.length * 7) % 100}%`} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function PickerSection() {
  const [sets, setSets] = useState<SetId[]>(['MN01', 'MN02']);
  const [p1, setP1] = useState<string[]>(['fire']);
  const [p2, setP2] = useState<string[]>([]);
  const toggleSet = (id: SetId) => setSets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <Panel title="Protocol picker" headerRight={<Badge mono>{p1.length + p2.length} / 6</Badge>}>
      <div className={s.stack}>
        <div className={s.row}>
          {(['MN01', 'MN02', 'MN03', 'AX01', 'AX02', 'AX03'] as SetId[]).map((id) => (
            <Checkbox key={id} label={id} checked={sets.includes(id)} onChange={() => toggleSet(id)} />
          ))}
        </div>
        <div className={s.pickers}>
          <ProtocolPicker title="Player 1" enabledSets={sets} value={p1} onChange={setP1} excluded={p2} />
          <ProtocolPicker title="Player 2" enabledSets={sets} value={p2} onChange={setP2} excluded={p1} />
        </div>
        <div className={s.row}>
          {p1.map((id) => (
            <ProtocolChip key={id} protocolId={id} onRemove={() => setP1((l) => l.filter((x) => x !== id))} />
          ))}
          <span className="muted mono">vs</span>
          {p2.map((id) => (
            <ProtocolChip key={id} protocolId={id} onRemove={() => setP2((l) => l.filter((x) => x !== id))} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
