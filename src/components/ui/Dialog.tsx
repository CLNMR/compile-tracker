import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useT } from '@/i18n';
import { cx } from './cx';
import { Button } from './Button';
import { IconButton } from './Button';
import { IconX } from './icons';
import { TextField } from './TextField';
import s from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
  /** Max width; default 480px. */
  width?: number | string;
  className?: string;
}

/** Native `<dialog>` modal with chamfered chrome. Esc and backdrop click close it. */
export function Dialog({ open, onClose, title, children, footer, danger, width = 480, className }: DialogProps) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={cx(s.dialog, danger && s.danger, className)}
      style={{ maxWidth: width }}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={onBackdrop}
    >
      <div className={s.frame}>
        <header className={s.header}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <IconButton label={t('common.actions.close')} size="sm" onClick={onClose} className={s.close}>
            <IconX />
          </IconButton>
        </header>
        <div className={s.body}>{children}</div>
        {footer ? <footer className={s.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** When set, the user must type this exact text to enable the confirm button. */
  requireText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel,
  danger,
  requireText,
  loading,
}: ConfirmDialogProps) {
  const { t } = useT();
  const [typed, setTyped] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    // reset the typed confirmation whenever the dialog opens/closes
    setPrevOpen(open);
    setTyped('');
  }
  const ok = !requireText || typed.trim() === requireText;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      danger={danger}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            {cancelLabel ?? t('common.actions.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => void onConfirm()} disabled={!ok} loading={loading}>
            {confirmLabel ?? t('common.actions.confirm')}
          </Button>
        </>
      }
    >
      {children}
      {requireText ? (
        <TextField
          className={s.requireField}
          label={
            <>
              {t('ui.dialog.typeToConfirm.before')} <code className={s.code}>{requireText}</code> {t('ui.dialog.typeToConfirm.after')}
            </>
          }
          value={typed}
          onChange={setTyped}
          inputProps={{ autoComplete: 'off', spellCheck: false, autoCapitalize: 'off' }}
        />
      ) : null}
    </Dialog>
  );
}
