import type { CSSProperties } from 'react';

/** Recharts styling that follows the design tokens. Single-series charts: no legend, recessive grid. */
export const CHART_HEIGHT = 220;

export const chartColors = {
  accent: 'var(--accent)',
  accentStrong: 'var(--accent-strong)',
  grid: 'var(--bg-elev-3)',
  axis: 'var(--bg-elev-3)',
  tickText: 'var(--text-dim)',
  win: 'var(--win)',
  loss: 'var(--loss)',
  warn: 'var(--warn)',
  muted: 'var(--text-muted)',
};

/** Props for `<XAxis tick=… />` / `<YAxis tick=… />`. */
export const tickStyle = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  fill: chartColors.tickText,
};

export const axisLineStyle = { stroke: chartColors.axis };

export const tooltipContentStyle: CSSProperties = {
  background: 'var(--bg-elev-2)',
  border: '1px solid var(--line-dim)',
  borderRadius: 0,
  padding: '8px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
};

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 4,
};

export const tooltipItemStyle: CSSProperties = {
  color: 'var(--text)',
  padding: 0,
};

export const tooltipCursor = { stroke: 'var(--line-dim)', strokeWidth: 1 };
export const tooltipBarCursor = { fill: 'var(--accent-soft)' };

export const chartMargin = { top: 8, right: 8, bottom: 0, left: -16 };
