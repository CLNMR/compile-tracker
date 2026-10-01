import { useEffect, useState, type ReactNode } from 'react';
import { cx } from './cx';
import s from './Terminal.module.css';

export type TerminalTone = 'default' | 'muted' | 'win' | 'loss' | 'warn';

export interface TerminalLineProps {
  children?: ReactNode;
  /** Prompt glyph; default `>`. */
  prompt?: string;
  /** Show a blinking block cursor after the text. */
  cursor?: boolean;
  tone?: TerminalTone;
  className?: string;
}

export function TerminalLine({ children, prompt = '>', cursor = false, tone = 'default', className }: TerminalLineProps) {
  return (
    <div className={cx(s.line, s[tone], className)}>
      <span className={s.prompt} aria-hidden="true">
        {prompt}
      </span>
      <span className={s.text}>
        {children}
        {cursor ? <span className={s.cursor} aria-hidden="true" /> : null}
      </span>
    </div>
  );
}

export interface TerminalBlockLine {
  text: ReactNode;
  tone?: TerminalTone;
  prompt?: string;
}

export interface TerminalBlockProps {
  lines: Array<ReactNode | TerminalBlockLine>;
  /** Reveal lines one after another. Off by default. */
  typing?: boolean;
  /** Delay between lines when typing (ms). */
  intervalMs?: number;
  /** Show the cursor on the last visible line. */
  cursor?: boolean;
  tone?: TerminalTone;
  className?: string;
}

function isLineObj(l: ReactNode | TerminalBlockLine): l is TerminalBlockLine {
  return typeof l === 'object' && l !== null && !Array.isArray(l) && 'text' in (l as object);
}

export function TerminalBlock({ lines, typing = false, intervalMs = 350, cursor = true, tone = 'default', className }: TerminalBlockProps) {
  const [shown, setShown] = useState(0);
  const [prevTyping, setPrevTyping] = useState(typing);
  if (typing !== prevTyping) {
    // restart the reveal whenever typing is toggled
    setPrevTyping(typing);
    setShown(0);
  }

  useEffect(() => {
    if (!typing) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) window.clearInterval(id);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [typing, intervalMs, lines.length]);

  const visible = typing ? lines.slice(0, shown) : lines;
  return (
    <div className={cx(s.block, className)} role="log" aria-live={typing ? 'polite' : undefined}>
      {visible.map((l, i) => {
        const obj = isLineObj(l) ? l : { text: l };
        return (
          <TerminalLine key={i} prompt={obj.prompt} tone={obj.tone ?? tone} cursor={cursor && i === visible.length - 1}>
            {obj.text}
          </TerminalLine>
        );
      })}
      {visible.length === 0 ? <TerminalLine tone={tone} cursor /> : null}
    </div>
  );
}
