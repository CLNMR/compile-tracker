import type { CSSProperties, ReactNode } from 'react';
import { getProtocol } from '@/data/protocols';
import { SET_BY_ID } from '@/data/sets';
import { useT } from '@/i18n';
import { cx } from '@/components/ui/cx';
import { IconCheck } from '@/components/ui/icons';
import { ProtocolGlyph } from './ProtocolGlyph';
import s from './ProtocolCard.module.css';

export type ProtocolCardSize = 'sm' | 'md' | 'lg';
export type ProtocolCardState = 'loading' | 'compiled';

/** Names longer than this (per size) get a tighter, wrapping name tab; the 46px sm tab fits ~6 Orbitron caps. */
const LONG_NAME: Record<ProtocolCardSize, number> = { sm: 6, md: 8, lg: 9 };
/** "COMPILED" fits every face as-is; "KOMPILIERT" needs tighter tracking. */
const LONG_COMPILED = 8;

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
  const { t, protocolName, setShort } = useT();
  const p = getProtocol(protocolId);
  const set = SET_BY_ID[p.set];
  const name = protocolName(p);
  const longName = name.length > LONG_NAME[size] || undefined;
  const compiledText = t('common.game.compiled');
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
          <div className={s.tab} data-long={longName}>
            {name}
          </div>
          {size !== 'sm' ? (
            <div className={s.hex} aria-hidden="true">
              <ProtocolGlyph protocolId={p.id} className={s.hexGlyph} />
            </div>
          ) : null}
          {value == null ? (
            <div className={cx(s.value, s.glyphBox)} aria-hidden="true">
              <ProtocolGlyph protocolId={p.id} />
            </div>
          ) : (
            <div className={s.value}>{value}</div>
          )}
          {state === 'loading' ? <div className={s.status}>{t('common.game.loading')}</div> : null}
          {showSet && size !== 'sm' ? <div className={s.set}>{setShort(set)}</div> : null}
        </div>
        <div className={cx(s.face, s.back)} aria-hidden={state !== 'compiled' ? true : undefined}>
          <div className={cx(s.art, s.artDim)} aria-hidden="true" />
          <div className={s.tab} data-long={longName}>
            {name}
          </div>
          <div className={s.compiledMark}>
            <IconCheck size={size === 'sm' ? 16 : 28} strokeWidth={2.5} />
            <span className={s.compiledText} data-long={compiledText.length > LONG_COMPILED || undefined}>
              {compiledText}
            </span>
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

  const label = [name, state === 'compiled' ? compiledText.toLowerCase() : null, overlayLabel?.toLowerCase()]
    .filter(Boolean)
    .join(', ');

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
        title={title ?? name}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cls} style={vars} aria-label={label} role="img" title={title ?? name}>
      {content}
    </div>
  );
}
