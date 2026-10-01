import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { IconCheck, IconChevron } from './icons';
import f from './Field.module.css';
import s from './Select.module.css';

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  /** Options with the same group label are rendered under a group header. */
  group?: string;
  /** Plain-text version of `label` used for type-ahead; defaults to `label` when it is a string. */
  text?: string;
}

export interface SelectProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Forwarded to the trigger button (id, name, aria-label…). */
  selectProps?: { id?: string; name?: string; 'aria-label'?: string };
  className?: string;
}

interface Pos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  above: boolean;
}

const LIST_MAX = 300;
const GAP = 6;

/**
 * Custom select rendered with the app's chrome (the native popup can't be themed).
 * Button + portal'd listbox; keyboard: ↑↓ Home End Enter Space Esc, type-ahead.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { label, hint, error, options, value, onChange, placeholder, disabled, required, selectProps, className },
  ref,
) {
  const auto = useId();
  const id = selectProps?.id ?? auto;
  const listId = `${id}-list`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [active, setActive] = useState(-1);
  const typeahead = useRef({ text: '', at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Group boundaries, preserving first-seen order.
  const grouped = useMemo(() => {
    const out: { group?: string; items: { option: SelectOption; index: number }[] }[] = [];
    options.forEach((option, index) => {
      const last = out[out.length - 1];
      if (last && last.group === option.group) last.items.push({ option, index });
      else out.push({ group: option.group, items: [{ option, index }] });
    });
    return out;
  }, [options]);

  const setRefs = (el: HTMLButtonElement | null) => {
    triggerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const below = vh - r.bottom - GAP - 8;
    const aboveSpace = r.top - GAP - 8;
    const above = below < Math.min(LIST_MAX, 180) && aboveSpace > below;
    const maxHeight = Math.max(120, Math.min(LIST_MAX, above ? aboveSpace : below));
    setPos({
      top: above ? r.top - GAP : r.bottom + GAP,
      left: r.left,
      width: r.width,
      maxHeight,
      above,
    });
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    place();
    setActive(selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, place, selectedIndex, options]);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choose = (index: number) => {
    const o = options[index];
    if (!o || o.disabled) return;
    onChange?.(o.value);
    close();
  };

  // Reposition on scroll/resize while open; close on outside pointer down.
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, place, close]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const edge = (dir: 1 | -1) => {
    const list = dir === 1 ? options.map((_, i) => i) : options.map((_, i) => i).reverse();
    return list.find((i) => !options[i].disabled) ?? -1;
  };

  const onType = (ch: string) => {
    const now = Date.now();
    const st = typeahead.current;
    st.text = now - st.at < 600 ? st.text + ch : ch;
    st.at = now;
    const q = st.text.toLowerCase();
    const start = open ? active : selectedIndex;
    for (let n = 1; n <= options.length; n++) {
      const i = (start + n) % options.length;
      const o = options[i];
      const text = (o.text ?? (typeof o.label === 'string' ? o.label : '')).toLowerCase();
      if (!o.disabled && text.startsWith(q)) {
        if (open) setActive(i);
        else onChange?.(o.value);
        return;
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => move(a, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => move(a, -1));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(edge(1));
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(edge(-1));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) openList();
        else choose(active);
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        if (open) close(false);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          onType(e.key);
        }
    }
  };

  // Render the list inside an open <dialog> (top layer) when the trigger lives in one.
  const portalTarget = open ? (triggerRef.current?.closest('dialog') as HTMLElement | null) ?? document.body : null;

  return (
    <div className={cx(f.root, !!error && f.invalid, className)}>
      {label != null ? (
        <label htmlFor={id} className={f.label} onClick={() => triggerRef.current?.focus()}>
          {label}
          {required ? ' *' : null}
        </label>
      ) : null}
      <div className={cx(f.control, s.control, open && s.open, disabled && s.disabled)}>
        <button
          ref={setRefs}
          type="button"
          id={id}
          name={selectProps?.name}
          className={cx(f.input, s.trigger)}
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-label={selectProps?.['aria-label']}
          aria-describedby={[errId, hintId].filter(Boolean).join(' ') || undefined}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onKeyDown}
        >
          <span className={cx(s.value, !selected && s.placeholder)}>{selected ? selected.label : (placeholder ?? '—')}</span>
        </button>
        <IconChevron size={18} className={cx(f.chevron, s.chevron)} />
      </div>
      {error ? (
        <div id={errId} className={f.error} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div id={hintId} className={f.hint}>
          {hint}
        </div>
      ) : null}

      {open && pos && portalTarget
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={label != null ? undefined : id}
              className={cx(s.list, pos.above && s.listAbove)}
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
              onKeyDown={onKeyDown}
            >
              {grouped.map((g, gi) => {
                const items = g.items.map(({ option, index }) => (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === selectedIndex}
                    aria-disabled={option.disabled || undefined}
                    className={cx(s.option, index === active && s.active, index === selectedIndex && s.selected, option.disabled && s.optionDisabled)}
                    onPointerMove={() => !option.disabled && setActive(index)}
                    onClick={() => choose(index)}
                  >
                    <span className={s.optionLabel}>{option.label}</span>
                    {index === selectedIndex ? <IconCheck size={16} className={s.check} /> : null}
                  </li>
                ));
                return g.group ? (
                  <li key={`g-${gi}`} role="presentation" className={s.group}>
                    <div className={s.groupLabel} role="presentation">
                      {g.group}
                    </div>
                    <ul role="group" aria-label={g.group} className={s.groupList}>
                      {items}
                    </ul>
                  </li>
                ) : (
                  items
                );
              })}
            </ul>,
            portalTarget,
          )
        : null}
    </div>
  );
});
