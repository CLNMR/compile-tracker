import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SetId } from '@/types';
import { protocolsInSets, type ProtocolDef } from '@/data/protocols';
import { SETS } from '@/data/sets';
import { useT } from '@/i18n';
import { cx } from '@/components/ui/cx';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { TerminalLine } from '@/components/ui/Terminal';
import { IconSearch } from '@/components/ui/icons';
import { useMediaQuery } from '@/components/ui/useMediaQuery';
import { ProtocolCard, type ProtocolCardSize } from './ProtocolCard';
import s from './ProtocolPicker.module.css';

export interface ProtocolPickerProps {
  enabledSets: SetId[];
  /** Selected protocol ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  /** Ids taken by the other side: shown disabled with a "taken" overlay. */
  excluded?: string[];
  /** Defaults to the localized "Protocols". */
  title?: ReactNode;
  /** `auto` uses sm below 640px and md above. */
  cardSize?: ProtocolCardSize | 'auto';
  /** Hide the search field. */
  search?: boolean;
  className?: string;
}

export function ProtocolPicker({
  enabledSets,
  value,
  onChange,
  max = 3,
  excluded = [],
  title,
  cardSize = 'auto',
  search = true,
  className,
}: ProtocolPickerProps) {
  const { t, protocolName, sortProtocols, setName, setShort, number } = useT();
  const [q, setQ] = useState('');
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState('');
  const wide = useMediaQuery('(min-width: 640px)');
  const size: ProtocolCardSize = cardSize === 'auto' ? (wide ? 'md' : 'sm') : cardSize;

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 450);
    return () => window.clearTimeout(t);
  }, [shake]);

  // Matches the localized name or the English one (ids double as English names), sorted by localized name.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = protocolsInSets(enabledSets).filter(
      (p) => !needle || protocolName(p).toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle),
    );
    return SETS.map((set) => ({ set, items: sortProtocols(all.filter((p) => p.set === set.id)) })).filter((g) => g.items.length > 0);
  }, [enabledSets, q, protocolName, sortProtocols]);

  const excludedSet = useMemo(() => new Set(excluded), [excluded]);
  const selectedSet = useMemo(() => new Set(value), [value]);
  const full = value.length >= max;

  const toggle = (p: ProtocolDef) => {
    if (selectedSet.has(p.id)) {
      onChange(value.filter((id) => id !== p.id));
      setNotice('');
      return;
    }
    if (full) {
      setShake(true);
      setNotice(t('protocol.picker.maxReached', { max }));
      return;
    }
    onChange([...value, p.id].sort());
    setNotice('');
  };

  return (
    <div className={cx(s.root, className)}>
      <SectionHeader
        right={
          <span
            className={cx(s.counter, full && s.counterFull, shake && s.shake)}
            aria-live="polite"
            aria-label={t('protocol.picker.selected', { count: value.length, max })}
          >
            {number(value.length)} / {number(max)}
          </span>
        }
      >
        {title ?? t('protocol.picker.title')}
      </SectionHeader>

      {search ? (
        <TextField
          placeholder={t('protocol.picker.search')}
          value={q}
          onChange={setQ}
          leading={<IconSearch />}
          inputProps={{ type: 'search', autoComplete: 'off', 'aria-label': t('protocol.picker.searchLabel') }}
        />
      ) : null}

      <div className={s.live} aria-live="polite" role="status">
        {notice}
      </div>

      <div className={cx(s.groups, shake && s.shakeSoft)}>
        {groups.length === 0 ? (
          <TerminalLine tone="muted" cursor>
            {t('protocol.picker.noMatch', { query: q.trim() })}
          </TerminalLine>
        ) : null}
        {groups.map(({ set, items }) => (
          <section key={set.id} className={s.group} aria-label={setName(set)}>
            <SectionHeader size="sm" as="h3" right={<span className={s.groupCount}>{number(items.length)}</span>}>
              {setShort(set)}
            </SectionHeader>
            <div className={cx(s.grid, s[`grid-${size}`])} role="group" aria-label={t('protocol.picker.setGroup', { set: setShort(set) })}>
              {items.map((p) => {
                const taken = excludedSet.has(p.id);
                const selected = selectedSet.has(p.id);
                return (
                  <ProtocolCard
                    key={p.id}
                    protocolId={p.id}
                    size={size}
                    selected={selected}
                    disabled={taken}
                    overlayLabel={taken ? t('protocol.card.taken') : undefined}
                    onClick={() => toggle(p)}
                    className={cx(s.card, full && !selected && !taken && s.cardBlocked)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
