import { useId, useState } from 'react';
import { Badge, Button, Checkbox, Chip, IconChevron, Panel, SegmentedControl, TextField, useMediaQuery } from '@/components/ui';
import { SETS } from '@/data/sets';
import type { SetId } from '@/types';
import { activeFilterCount, matchPreset, MIN_SAMPLE_RANGE, presetRange, type DatePreset, type StatsFilterState } from './filterState';
import s from './StatsFilterBar.module.css';

export interface StatsFilterBarProps {
  value: StatsFilterState;
  onChange: (next: StatsFilterState) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'year', label: 'This year' },
];

/** Sets / date range / min-sample / test-data filter. Collapsible behind a "Filters" button on mobile. */
export function StatsFilterBar({ value, onChange }: StatsFilterBarProps) {
  const wide = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const rangeId = useId();
  const count = activeFilterCount(value);
  const expanded = wide || open;
  const preset = matchPreset(value);

  const patch = (p: Partial<StatsFilterState>) => onChange({ ...value, ...p });
  const toggleSet = (id: SetId) => patch({ sets: value.sets.includes(id) ? value.sets.filter((x) => x !== id) : [...value.sets, id] });

  return (
    <Panel padding="sm" className={s.root} as="div">
      {!wide ? (
        <div className={s.toggleRow}>
          <Button
            size="sm"
            variant={open ? 'subtle' : 'ghost'}
            onClick={() => setOpen((v) => !v)}
            iconRight={<IconChevron direction={open ? 'up' : 'down'} />}
            aria-expanded={open}
          >
            Filters
            {count > 0 ? (
              <Badge tone="accent" className={s.countBadge}>
                {count}
              </Badge>
            ) : null}
          </Button>
          {count > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, sets: [], from: '', to: '', includeTestData: true, minSample: 3 })}>
              Reset
            </Button>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div className={s.grid}>
          <div className={s.group}>
            <div className={s.groupHead}>
              <span className={s.groupLabel}>Sets</span>
              <SegmentedControl<'any' | 'only'>
                size="sm"
                label="Set match mode"
                value={value.setMode}
                onChange={(setMode) => patch({ setMode })}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'only', label: 'Only' },
                ]}
              />
            </div>
            <div className={s.chips}>
              {SETS.map((set) => (
                <Chip key={set.id} size="sm" selected={value.sets.includes(set.id)} onClick={() => toggleSet(set.id)} title={set.name}>
                  {set.short}
                </Chip>
              ))}
              {value.sets.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => patch({ sets: [] })}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className={s.group}>
            <div className={s.groupHead}>
              <span className={s.groupLabel}>Date range</span>
              <div className={s.presets}>
                {PRESETS.map((p) => (
                  <Chip key={p.value} size="sm" selected={preset === p.value} onClick={() => patch(presetRange(p.value))}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className={s.dates}>
              <TextField type="date" value={value.from} onChange={(from) => patch({ from })} inputProps={{ 'aria-label': 'From date', max: value.to || undefined }} />
              <span className={s.dateSep} aria-hidden="true">
                →
              </span>
              <TextField type="date" value={value.to} onChange={(to) => patch({ to })} inputProps={{ 'aria-label': 'To date', min: value.from || undefined }} />
            </div>
          </div>

          <div className={s.group}>
            <div className={s.groupHead}>
              <label htmlFor={rangeId} className={s.groupLabel}>
                Min sample
              </label>
              <Badge mono title="Minimum decks/games for combos and protocol win-rate ranking">
                ≥ {value.minSample}
              </Badge>
            </div>
            <input
              id={rangeId}
              type="range"
              className={s.range}
              min={MIN_SAMPLE_RANGE.min}
              max={MIN_SAMPLE_RANGE.max}
              step={1}
              value={value.minSample}
              onChange={(e) => patch({ minSample: Number(e.target.value) })}
              aria-valuetext={`${value.minSample} games`}
            />
            <Checkbox label="Include test data" checked={value.includeTestData} onChange={(includeTestData) => patch({ includeTestData })} className={s.check} />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
