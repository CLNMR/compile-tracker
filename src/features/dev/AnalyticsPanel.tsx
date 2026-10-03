import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CANONICAL_ORIGIN, CF_CONFIGURED, GA_CONFIGURED, SOURCES, useConsentStore, type Source } from '@/analytics';
import { Button, Panel, SegmentedControl, StatTile, TerminalLine, useToast } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { useT } from '@/i18n';
import { fetchAccountsTotal, fetchCounters } from '@/repo/analytics';
import { dayKey, gameActivity, summarizeCounters, type CounterRow } from '@/stats/growth';
import { DataTable, Td, TableRow, type DataTableColumn } from '@/features/stats/Bits';
import {
  axisLineStyle,
  CHART_HEIGHT,
  chartColors,
  chartMargin,
  tickStyle,
  tooltipContentStyle,
  tooltipCursor,
  tooltipItemStyle,
  tooltipLabelStyle,
} from '@/features/stats/chartTheme';
import s from './AnalyticsPanel.module.css';

const RANGES = ['7', '30', '90'] as const;
type Range = (typeof RANGES)[number];
const MAX_DAYS = 90;
const DAY_MS = 86_400_000;

const SERIES = [
  { key: 'visit', color: chartColors.accent, label: 'dev.analytics.col.visits' },
  { key: 'newUser', color: chartColors.warn, label: 'dev.analytics.col.newUsers' },
  { key: 'game', color: chartColors.win, label: 'dev.analytics.col.games' },
] as const;

const TAGGED: { source: Source; medium: string }[] = [
  { source: 'reddit', medium: 'social' },
  { source: 'bgg', medium: 'forum' },
];

const isSource = (x: string): x is Source => (SOURCES as readonly string[]).includes(x);

/** Admin: cookie-free source counters, activity from game data, tagged links and dashboard links. */
export function AnalyticsPanel() {
  const { t, number, percent, date } = useT();
  const toast = useToast();
  const consent = useConsentStore((st) => st.choice);
  const { games } = useGames('all');
  const [range, setRange] = useState<Range>('30');
  const [rows, setRows] = useState<CounterRow[] | null>(null);
  const [accountsTotal, setAccountsTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchCounters(dayKey(Date.now() - (MAX_DAYS - 1) * DAY_MS)), fetchAccountsTotal()])
      .then(([r, total]) => {
        if (!alive) return;
        setRows(r);
        setAccountsTotal(total);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const refresh = () => {
    setBusy(true);
    setNow(Date.now());
    setReloadKey((k) => k + 1);
  };

  const days = Number(range);
  const from = dayKey(now - (days - 1) * DAY_MS);
  const to = dayKey(now);
  const summary = useMemo(() => summarizeCounters(rows ?? [], from, to), [rows, from, to]);
  const activity = useMemo(() => gameActivity(games, Date.parse(`${from}T00:00:00Z`), now + 1), [games, from, now]);

  const sourceName = (src: string) => (isSource(src) ? t(`dev.analytics.source.${src}`) : src);
  const perVisit = (g: number, v: number) => (v > 0 ? number(g / v, { maximumFractionDigits: 2 }) : '–');
  const dayLabel = (d: string) => date(Date.parse(`${d}T12:00:00Z`), { day: 'numeric', month: 'short' });

  const cols: DataTableColumn[] = [
    { key: 'source', label: t('dev.analytics.col.source'), width: 'minmax(130px, 1.6fr)' },
    { key: 'visit', label: t('dev.analytics.col.visits'), width: 'minmax(64px, 1fr)', align: 'right' },
    { key: 'newUser', label: t('dev.analytics.col.newUsers'), width: 'minmax(80px, 1fr)', align: 'right' },
    { key: 'game', label: t('dev.analytics.col.games'), width: 'minmax(64px, 1fr)', align: 'right' },
    { key: 'link', label: t('dev.analytics.col.links'), width: 'minmax(64px, 1fr)', align: 'right' },
    { key: 'perVisit', label: t('dev.analytics.col.perVisit'), width: 'minmax(90px, 1fr)', align: 'right' },
  ];

  const tagged = (src: Source, medium: string) => `${CANONICAL_ORIGIN}/?utm_source=${src}&utm_medium=${medium}&utm_campaign=launch`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.push({ title: t('dev.analytics.links.copied'), description: text, tone: 'win' });
    } catch {
      toast.push({ title: t('settings.account.toast.clipboard'), description: text, tone: 'warn' });
    }
  };

  const projectId = String(import.meta.env.VITE_FB_PROJECT_ID ?? '');

  return (
    <Panel title={t('dev.analytics.title')}>
      <div className={s.stack}>
        <SegmentedControl
          size="sm"
          label={t('dev.analytics.range')}
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r, label: t('dev.analytics.days', { count: Number(r) }) }))}
        />
        <div className={s.tiles}>
          <StatTile
            size="sm"
            label={t('dev.analytics.activity.games')}
            value={number(activity.games)}
            sub={t('dev.analytics.activity.gamesSub', {
              guest: activity.games ? percent(activity.guestGames / activity.games, 0) : '–',
            })}
          />
          <StatTile size="sm" label={t('dev.analytics.activity.active')} value={number(activity.activeOwners)} sub={t('dev.analytics.activity.activeSub')} />
          {/* Accounts = Google-linked (non-anonymous), from the link counters. */}
          <StatTile
            size="sm"
            tone="accent"
            label={t('dev.analytics.activity.new')}
            value={rows ? number(summary.totals.link) : '–'}
            sub={t('dev.analytics.activity.newSub')}
          />
          <StatTile
            size="sm"
            label={t('dev.analytics.activity.all')}
            value={accountsTotal != null ? number(accountsTotal) : '–'}
            sub={t('dev.analytics.activity.allSub')}
          />
        </div>

        <div className={s.row}>
          <p className={s.muted}>{t('dev.analytics.countersNote')}</p>
          <Button size="sm" variant="subtle" onClick={refresh} loading={busy}>
            {t('dev.analytics.refresh')}
          </Button>
        </div>

        {error ? (
          <TerminalLine tone="loss" prompt="✗">
            {t('dev.analytics.failed', { error })}
          </TerminalLine>
        ) : rows === null ? (
          <TerminalLine tone="muted">{t('dev.analytics.loading')}</TerminalLine>
        ) : summary.sources.length === 0 ? (
          <TerminalLine tone="muted">{t('dev.analytics.empty')}</TerminalLine>
        ) : (
          <>
            <DataTable columns={cols} label={t('dev.analytics.tableLabel')}>
              {summary.sources.map((r) => (
                <TableRow key={r.source}>
                  <Td>{sourceName(r.source)}</Td>
                  <Td align="right" mono>{number(r.visit)}</Td>
                  <Td align="right" mono>{number(r.newUser)}</Td>
                  <Td align="right" mono>{number(r.game)}</Td>
                  <Td align="right" mono>{number(r.link)}</Td>
                  <Td align="right" mono>{perVisit(r.game, r.visit)}</Td>
                </TableRow>
              ))}
              <TableRow className={s.totalRow}>
                <Td>{t('dev.analytics.total')}</Td>
                <Td align="right" mono>{number(summary.totals.visit)}</Td>
                <Td align="right" mono>{number(summary.totals.newUser)}</Td>
                <Td align="right" mono>{number(summary.totals.game)}</Td>
                <Td align="right" mono>{number(summary.totals.link)}</Td>
                <Td align="right" mono>{perVisit(summary.totals.game, summary.totals.visit)}</Td>
              </TableRow>
            </DataTable>

            <div className={s.chartHead}>
              <span className={s.chartTitle}>{t('dev.analytics.perDay')}</span>
              <span className={s.legend}>
                {SERIES.map((x) => (
                  <span key={x.key} className={s.legendItem}>
                    <span className={s.swatch} style={{ background: x.color }} />
                    {t(x.label)}
                  </span>
                ))}
              </span>
            </div>
            <div className={s.chart}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={summary.days.map((d) => ({ ...d, label: dayLabel(d.day) }))} margin={chartMargin}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" tick={tickStyle} axisLine={axisLineStyle} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={tooltipCursor} />
                  {SERIES.map((x) => (
                    <Area
                      key={x.key}
                      type="monotone"
                      dataKey={x.key}
                      name={t(x.label)}
                      stroke={x.color}
                      fill={x.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <Panel padding="sm" tone="elevated" title={t('dev.analytics.links.title')}>
          <div className={s.stack}>
            <p className={s.muted}>{t('dev.analytics.links.hint')}</p>
            {TAGGED.map(({ source, medium }) => {
              const url = tagged(source, medium);
              return (
                <div key={source} className={s.linkRow}>
                  <span className={s.linkLabel}>{sourceName(source)}</span>
                  <code className={s.url}>{url}</code>
                  <Button size="sm" variant="ghost" onClick={() => void copy(url)}>
                    {t('common.actions.copy')}
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel padding="sm" tone="elevated" title={t('dev.analytics.tools.title')}>
          <div className={s.stack}>
            <TerminalLine tone={GA_CONFIGURED ? 'win' : 'warn'} prompt={GA_CONFIGURED ? '✓' : '!'}>
              {GA_CONFIGURED ? t('dev.analytics.tools.gaOn', { choice: consent ?? '–' }) : t('dev.analytics.tools.gaOff')}
            </TerminalLine>
            <TerminalLine tone={CF_CONFIGURED ? 'win' : 'warn'} prompt={CF_CONFIGURED ? '✓' : '!'}>
              {CF_CONFIGURED ? t('dev.analytics.tools.cfOn') : t('dev.analytics.tools.cfOff')}
            </TerminalLine>
            <div className={s.row}>
              <a className={s.ext} href="https://analytics.google.com/" target="_blank" rel="noreferrer">
                {t('dev.analytics.tools.ga')} ↗
              </a>
              <a className={s.ext} href={`https://console.firebase.google.com/project/${projectId}/analytics`} target="_blank" rel="noreferrer">
                {t('dev.analytics.tools.firebase')} ↗
              </a>
              <a className={s.ext} href="https://dash.cloudflare.com/?to=/:account/web-analytics" target="_blank" rel="noreferrer">
                {t('dev.analytics.tools.cloudflare')} ↗
              </a>
            </div>
          </div>
        </Panel>
      </div>
    </Panel>
  );
}
