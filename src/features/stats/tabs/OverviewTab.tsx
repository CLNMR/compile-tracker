import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarList, Panel, StatTile } from '@/components/ui';
import { ProtocolChip } from '@/components/protocol';
import { getProtocol, isKnownProtocol } from '@/data/protocols';
import { useT } from '@/i18n';
import { avgLoserCompiled, firstPlayerAdvantage, gamesOverTime, loserCompiledDistribution, protocolUsage } from '@/stats';
import {
  axisLineStyle,
  CHART_HEIGHT,
  chartColors,
  chartMargin,
  tickStyle,
  tooltipBarCursor,
  tooltipContentStyle,
  tooltipCursor,
  tooltipItemStyle,
  tooltipLabelStyle,
} from '../chartTheme';
import { monthLabel, num, pct } from '../format';
import type { StatsTabProps } from './types';
import t from './tabs.module.css';

export function OverviewTab({ agg }: StatsTabProps) {
  const { t: tr } = useT();
  const fp = firstPlayerAdvantage(agg);
  const loserAvg = avgLoserCompiled(agg);
  const distinct = Object.keys(agg.byProtocol).length;

  // No manual memo: these derive calls are cheap over an already-aggregated `Agg`,
  // and re-running them per render keeps every label in the current locale.
  const series = gamesOverTime(agg).map((r) => ({ ...r, label: monthLabel(r.yearMonth) }));
  const usage = protocolUsage(agg)
    .filter((r) => isKnownProtocol(r.id))
    .slice(0, 10)
    .map((r) => {
      const p = getProtocol(r.id);
      return {
        key: r.id,
        label: <ProtocolChip protocolId={r.id} size="sm" />,
        value: r.decks,
        color: `linear-gradient(90deg, ${p.colors.secondary}, ${p.colors.primary})`,
        sub: tr('stats.overview.shareOfDecks', { share: pct(r.share) }),
      };
    });
  const dist = loserCompiledDistribution(agg).map((d) => ({ ...d, label: tr('stats.overview.compiledN', { count: d.compiled }) }));
  const distColors = [chartColors.loss, chartColors.warn, chartColors.win];

  return (
    <div className={t.stack}>
      <div className={t.tiles}>
        <StatTile label={tr('stats.overview.games')} value={num(agg.games)} />
        <StatTile
          label={tr('stats.overview.fpWinRate')}
          value={fp.n > 0 ? pct(fp.rate) : '–'}
          sub={fp.n > 0 ? tr('stats.overview.sampleN', { n: fp.n }) : tr('stats.overview.fpUnknown')}
          tone={fp.n > 0 ? (fp.rate > 0.55 ? 'warn' : fp.rate < 0.45 ? 'accent' : 'default') : 'default'}
        />
        <StatTile label={tr('stats.overview.loserCompiledAvg')} value={agg.compileKnown > 0 ? num(loserAvg, 2) : '–'} sub={tr('stats.overview.perLoss')} />
        <StatTile label={tr('stats.overview.protocolsSeen')} value={num(distinct)} sub={tr('stats.overview.distinct')} />
      </div>

      <Panel title={tr('stats.overview.gamesOverTime')}>
        {series.length === 0 ? (
          <div className={t.chartEmpty}>{tr('stats.overview.noDatedGames')}</div>
        ) : (
          <div className={t.chart}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={series} margin={chartMargin}>
                <defs>
                  <linearGradient id="statsGamesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={tickStyle} axisLine={axisLineStyle} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} width={40} tickFormatter={(v) => num(Number(v))} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={tooltipCursor}
                  formatter={(v) => [num(Number(v)), tr('stats.overview.seriesGames')]}
                />
                <Area
                  type="monotone"
                  dataKey="games"
                  name={tr('stats.overview.seriesGames')}
                  stroke={chartColors.accent}
                  strokeWidth={2}
                  fill="url(#statsGamesFill)"
                  dot={series.length <= 24 ? { r: 3, fill: chartColors.accentStrong, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: chartColors.accentStrong, stroke: 'var(--bg)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className={t.twoCol}>
        <Panel title={tr('stats.overview.mostUsed')}>
          {usage.length === 0 ? (
            <div className={t.empty}>{tr('stats.overview.noProtocols')}</div>
          ) : (
            <BarList items={usage} format={(v) => tr('stats.units.decks', { count: v })} />
          )}
        </Panel>

        <Panel title={tr('stats.overview.closeLosses')}>
          <div className={t.chart}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={dist} margin={chartMargin} barCategoryGap="28%">
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={tickStyle} axisLine={axisLineStyle} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} width={40} tickFormatter={(v) => num(Number(v))} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={tooltipBarCursor}
                  formatter={(v, _n, item) => {
                    const row = item?.payload as (typeof dist)[number] | undefined;
                    return [tr('stats.overview.lossTooltip', { count: Number(v), share: pct(row?.share ?? 0) }), tr('stats.overview.lossSeries')];
                  }}
                />
                <Bar dataKey="games" name={tr('stats.overview.lossSeries')} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {dist.map((d) => (
                    <Cell key={d.compiled} fill={distColors[d.compiled]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className={t.sub}>{tr('stats.overview.closeLossesNote')}</p>
        </Panel>
      </div>
    </div>
  );
}
