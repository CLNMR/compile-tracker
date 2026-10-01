import type { CSSProperties } from 'react';
import { getProtocol } from '@/data/protocols';
import { SET_BY_ID } from '@/data/sets';
import { cx } from '@/components/ui/cx';
import { IconCheck, IconX } from '@/components/ui/icons';
import s from './ProtocolChip.module.css';

export interface ProtocolChipProps {
  protocolId: string;
  compiled?: boolean;
  size?: 'sm' | 'md';
  showSet?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  className?: string;
}

/** Inline pill with a gradient dot + protocol name, for dense lists. */
export function ProtocolChip({ protocolId, compiled, size = 'md', showSet, onClick, onRemove, selected, className }: ProtocolChipProps) {
  const p = getProtocol(protocolId);
  const vars = { '--p': p.colors.primary, '--s': p.colors.secondary } as CSSProperties;
  const cls = cx(s.root, s[size], compiled && s.compiled, selected && s.selected, onClick && s.clickable, className);
  const inner = (
    <>
      <span className={s.dot} aria-hidden="true" />
      <span className={s.name}>{p.name}</span>
      {showSet ? <span className={s.set}>{SET_BY_ID[p.set].short}</span> : null}
      {compiled ? <IconCheck size={12} strokeWidth={3} className={s.check} aria-label="compiled" /> : null}
    </>
  );
  const Tag = onClick ? 'button' : 'span';
  return (
    <span className={s.wrap} style={vars}>
      <Tag className={cls} onClick={onClick} type={onClick ? 'button' : undefined} aria-pressed={onClick && selected != null ? selected : undefined}>
        {inner}
      </Tag>
      {onRemove ? (
        <button type="button" className={s.remove} onClick={onRemove} aria-label={`Remove ${p.name}`}>
          <IconX size={12} strokeWidth={2.5} />
        </button>
      ) : null}
    </span>
  );
}
