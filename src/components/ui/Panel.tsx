import type { ElementType, ReactNode } from 'react';
import { cx } from './cx';
import { SectionHeader } from './SectionHeader';
import s from './Panel.module.css';

export interface PanelProps {
  title?: ReactNode;
  /** Slot at the right end of the header trace line. */
  headerRight?: ReactNode;
  children?: ReactNode;
  as?: ElementType;
  padding?: 'none' | 'sm' | 'md';
  /** Softer surface for nested panels. */
  tone?: 'default' | 'elevated' | 'accent';
  className?: string;
  id?: string;
}

/** Chamfered container with a 1px magenta border. */
export function Panel({
  title,
  headerRight,
  children,
  as: Tag = 'section',
  padding = 'md',
  tone = 'default',
  className,
  id,
}: PanelProps) {
  return (
    <Tag id={id} className={cx(s.root, s[`pad-${padding}`], tone !== 'default' && s[tone], className)}>
      <div className={s.body}>
        {title != null ? (
          <SectionHeader className={s.header} right={headerRight}>
            {title}
          </SectionHeader>
        ) : null}
        {children}
      </div>
    </Tag>
  );
}
