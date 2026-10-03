import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, SegmentedControl, TerminalLine, TextField, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { EmailAuthError } from '@/store/authStore';
import s from './SettingsPage.module.css';

export type EmailMode = 'create' | 'signIn';

const MIN_PASSWORD = 6;

/** Create an email/password account from the anonymous identity, or sign in to an existing one. */
export function EmailAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { createEmailAccount, signInWithEmail, sendPasswordReset } = useAuth();
  const toast = useToast();
  const formId = useId();
  const [mode, setMode] = useState<EmailMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setPassword('');
    setError(null);
  }

  const message = (e: unknown) =>
    e instanceof EmailAuthError && e.code !== 'other' ? t(`settings.account.email.errors.${e.code}`) : (e as Error).message;

  const close = () => (busy ? undefined : onClose());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && password.length < MIN_PASSWORD) {
      setError(t('settings.account.email.errors.weakPassword'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        await createEmailAccount(email, password);
        toast.push({ title: t('auth.linkedEmail.title'), description: t('auth.linkedEmail.description', { email: email.trim() }), tone: 'win' });
      } else {
        await signInWithEmail(email, password);
        toast.push({ title: t('settings.account.email.signedIn'), tone: 'win' });
      }
      onClose();
    } catch (err) {
      if (err instanceof EmailAuthError && err.code === 'emailInUse' && mode === 'create') setMode('signIn');
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setError(t('settings.account.email.errors.resetNeedsEmail'));
      return;
    }
    setResetting(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      toast.push({ title: t('settings.account.email.resetSent'), description: t('settings.account.email.resetSentDesc', { email: email.trim() }), tone: 'win', durationMs: 8000 });
    } catch (err) {
      setError(message(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('settings.account.email.title')}
      footer={
        <>
          <Button variant="subtle" onClick={close} disabled={busy}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {mode === 'create' ? t('settings.account.email.create') : t('settings.account.email.signIn')}
          </Button>
        </>
      }
    >
      <form id={formId} className={s.stack} onSubmit={(e) => void submit(e)} noValidate>
        <SegmentedControl
          fullWidth
          label={t('settings.account.email.title')}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: 'create', label: t('settings.account.email.modeCreate') },
            { value: 'signIn', label: t('settings.account.email.modeSignIn') },
          ]}
        />
        <TerminalLine tone={mode === 'create' ? 'muted' : 'warn'} prompt={mode === 'create' ? undefined : '!'}>
          {mode === 'create' ? t('settings.account.email.createHint') : t('settings.account.email.signInHint')}
        </TerminalLine>
        <TextField
          label={t('settings.account.email.email')}
          type="email"
          value={email}
          onChange={setEmail}
          required
          inputProps={{ autoComplete: 'email', autoCapitalize: 'off', spellCheck: false, inputMode: 'email', name: 'email' }}
        />
        <TextField
          label={t('settings.account.email.password')}
          type="password"
          value={password}
          onChange={setPassword}
          required
          hint={mode === 'create' ? t('settings.account.email.passwordHint', { min: MIN_PASSWORD }) : undefined}
          inputProps={{ autoComplete: mode === 'create' ? 'new-password' : 'current-password', name: 'password' }}
        />
        {error ? (
          <TerminalLine tone="loss" prompt="!">
            {error}
          </TerminalLine>
        ) : null}
        {mode === 'signIn' ? (
          <div>
            <Button variant="subtle" size="sm" onClick={() => void reset()} loading={resetting} disabled={busy}>
              {t('settings.account.email.forgot')}
            </Button>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
