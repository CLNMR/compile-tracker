import type { CSSProperties, ReactNode } from 'react';
import { getProtocol } from '@/data/protocols';
import { SET_BY_ID } from '@/data/sets';
import { cx } from '@/components/ui/cx';
import { IconCheck } from '@/components/ui/icons';
import s from './ProtocolCard.module.css';

export type ProtocolCardSize = 'sm' | 'md' | 'lg';
export type ProtocolCardState = 'loading' | 'compiled';

export interface ProtocolCardProps {
  protocolId: string;
  size?: ProtocolCardSize;
  /** `loading` shows the front face with a LOADING… label; `compiled` flips to the COMPILED face. */
  state?: ProtocolCardState;
  /** Shown in the value box; defaults to the protocol glyph. */
  value?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Force button semantics even without onClick (e.g. controlled by a parent). */
  interactive?: boolean;
  showSet?: boolean;
  /** Hatched overlay with a label, e.g. "TAKEN". */
  overlayLabel?: string;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

/** Abstract Compile card: name tab, value box, hex glyph badge, gradient "art"; flips when compiled. */
export function ProtocolCard({
  protocolId,
  size = 'md',
  state,
  value,
  selected,
  disabled,
  onClick,
  interactive,
  showSet,
  overlayLabel,
  className,
  title,
  style,
}: ProtocolCardProps) {
  const p = getProtocol(protocolId);
  const set = SET_BY_ID[p.set];
  const isButton = interactive || !!onClick;
  const vars = { '--p': p.colors.primary, '--s': p.colors.secondary, ...style } as CSSProperties;
  const cls = cx(
    s.root,
    s[size],
    state === 'compiled' && s.compiled,
    state === 'loading' && s.loading,
    selected && s.selected,
    disabled && s.disabled,
    isButton && s.interactive,
    className,
  );

  const content = (
    <>
      <div className={s.inner}>
        <div className={cx(s.face, s.front)}>
          <div className={s.art} aria-hidden="true" />
          <div className={s.tab}>{p.name}</div>
          {size !== 'sm' ? (
            <div className={s.hex} aria-hidden="true">
              <span className={s.hexGlyph}>{p.glyph}</span>
            </div>
          ) : null}
          <div className={s.value} aria-hidden={value == null ? true : undefined}>
            {value ?? p.glyph}
          </div>
          {state === 'loading' ? <div className={s.status}>Loading…</div> : null}
          {showSet && size !== 'sm' ? <div className={s.set}>{set.short}</div> : null}
        </div>
        <div className={cx(s.face, s.back)} aria-hidden={state !== 'compiled' ? true : undefined}>
          <div className={cx(s.art, s.artDim)} aria-hidden="true" />
          <div className={s.tab}>{p.name}</div>
          <div className={s.compiledMark}>
            <IconCheck size={size === 'sm' ? 16 : 28} strokeWidth={2.5} />
            <span className={s.compiledText}>Compiled</span>
          </div>
        </div>
      </div>
      {overlayLabel ? (
        <div className={s.overlay}>
          <span>{overlayLabel}</span>
        </div>
      ) : null}
      {selected ? <span className={s.selectedMark} aria-hidden="true" /> : null}
    </>
  );

  const label = `${p.name}${state === 'compiled' ? ', compiled' : ''}${overlayLabel ? `, ${overlayLabel.toLowerCase()}` : ''}`;

  if (isButton) {
    return (
      <button
        type="button"
        className={cls}
        style={vars}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected != null ? selected : undefined}
        aria-label={label}
        title={title ?? p.name}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cls} style={vars} aria-label={label} role="img" title={title ?? p.name}>
      {content}
    </div>
  );
}
