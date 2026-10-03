import { useState } from 'react';
import { Button, TerminalLine, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { EmailAuthError } from '@/store/authStore';
import s from './AuthAction.module.css';

/** "Confirm your email" with resend + re-check, for email accounts that are not verified yet. */
export function VerifyEmailNotice({ reason }: { reason?: string }) {
  const { t } = useT();
  const { user, sendVerification, refreshVerification } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const email = user?.email ?? '';

  const resend = async () => {
    setSending(true);
    try {
      await sendVerification();
      toast.push({ title: t('auth.verify.sent'), description: t('auth.verify.sentDesc', { email }), tone: 'win', durationMs: 8000 });
    } catch (e) {
      const code = e instanceof EmailAuthError ? e.code : 'other';
      toast.push({
        title: t('auth.verify.sendFailed'),
        description: code === 'tooManyRequests' ? t('settings.account.email.errors.tooManyRequests') : (e as Error).message,
        tone: 'loss',
      });
    } finally {
      setSending(false);
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      const ok = await refreshVerification();
      toast.push(ok ? { title: t('auth.verify.done'), tone: 'win' } : { title: t('auth.verify.notYet'), description: t('auth.verify.notYetDesc'), tone: 'warn' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={s.notice} role="status">
      <TerminalLine tone="warn" prompt="!">
        {t('auth.verify.pending', { email })}
      </TerminalLine>
      {reason ? <p className={s.muted}>{reason}</p> : null}
      <div className={s.row}>
        <Button size="sm" onClick={() => void check()} loading={checking}>
          {t('auth.verify.check')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void resend()} loading={sending}>
          {t('auth.verify.resend')}
        </Button>
      </div>
    </div>
  );
}
