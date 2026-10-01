import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/i18n';
import { cx } from './cx';
import { IconX } from './icons';
import { ToastContext, type ToastApi, type ToastInput, type ToastItem } from './toastContext';
import s from './Toast.module.css';

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = ++counter;
      const duration = input.durationMs ?? 3500;
      setItems((list) => [...list.slice(-3), { ...input, id }]);
      if (duration > 0) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  const api = useMemo<ToastApi>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={s.viewport} role="region" aria-label={t('ui.toast.region')}>
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { t } = useT();
  const tone = item.tone ?? 'default';
  return (
    <div className={cx(s.toast, s[tone])} role={tone === 'loss' ? 'alert' : 'status'} aria-live={tone === 'loss' ? 'assertive' : 'polite'}>
      <span className={s.prompt} aria-hidden="true">
        {'>'}
      </span>
      <div className={s.body}>
        <div className={s.title}>{item.title}</div>
        {item.description != null ? <div className={s.desc}>{item.description}</div> : null}
      </div>
      <button type="button" className={s.close} onClick={onDismiss} aria-label={t('ui.toast.dismiss')}>
        <IconX size={14} />
      </button>
    </div>
  );
}
