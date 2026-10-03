import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button, Panel, Spinner, TerminalLine, TextField, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { EmailAuthError, useAuthStore } from '@/store/authStore';
import s from './AuthAction.module.css';

const MIN_PASSWORD = 6;

/** An action code can be used once; StrictMode and re-renders must not apply it twice. */
const applied = new Map<string, Promise<void>>();
const checked = new Map<string, Promise<string>>();

/** Same-origin path from the email's continueUrl, else the Players page. */
function nextPath(raw: string | null): string {
  try {
    const url = new URL(raw ?? '', location.origin);
    return url.origin === location.origin ? `${url.pathname}${url.search}` : '/players';
  } catch {
    return '/players';
  }
}

/** /auth/action — target of the verification and password reset emails (Firebase action handler). */
export default function AuthActionPage() {
  const { t } = useT();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const code = params.get('oobCode') ?? '';
  const next = nextPath(params.get('continueUrl'));

  return (
    <div className={s.page}>
      {code && mode === 'verifyEmail' ? (
        <VerifyEmail code={code} next={next} />
      ) : code && mode === 'resetPassword' ? (
        <ResetPassword code={code} />
      ) : (
        <Panel title={t('auth.action.title')}>
          <Invalid />
        </Panel>
      )}
    </div>
  );
}

function Invalid({ message }: { message?: string }) {
  const { t } = useT();
  return (
    <div className={s.stack}>
      <TerminalLine tone="loss" prompt="!">
        {message ?? t('auth.action.invalid')}
      </TerminalLine>
      <div className={s.row}>
        <Button to="/settings">{t('auth.action.toSettings')}</Button>
      </div>
    </div>
  );
}

const errorText = (e: unknown, t: ReturnType<typeof useT>['t']) =>
  e instanceof EmailAuthError && e.code !== 'other' ? t(`settings.account.email.errors.${e.code}`) : (e as Error).message;

function VerifyEmail({ code, next }: { code: string; next: string }) {
  const { t } = useT();
  const applyVerifyCode = useAuthStore((st) => st.applyVerifyCode);
  const [state, setState] = useState<{ status: 'working' } | { status: 'done' } | { status: 'error'; message: string }>({ status: 'working' });

  useEffect(() => {
    let p = applied.get(code);
    if (!p) {
      p = applyVerifyCode(code);
      applied.set(code, p);
    }
    let alive = true;
    p.then(
      () => alive && setState({ status: 'done' }),
      (e: unknown) => alive && setState({ status: 'error', message: errorText(e, t) }),
    );
    return () => {
      alive = false;
    };
  }, [code, applyVerifyCode, t]);

  return (
    <Panel title={t('auth.action.verifyTitle')}>
      {state.status === 'working' ? (
        <div className={s.row}>
          <Spinner size={16} />
          <TerminalLine tone="muted">{t('auth.action.verifying')}</TerminalLine>
        </div>
      ) : state.status === 'done' ? (
        <div className={s.stack}>
          <TerminalLine tone="win" prompt="✓">
            {t('auth.action.verified')}
          </TerminalLine>
          <p className={s.muted}>{t('auth.action.verifiedHint')}</p>
          <div className={s.row}>
            <Button to={next}>{t('auth.action.continue')}</Button>
          </div>
        </div>
      ) : (
        <div className={s.stack}>
          <Invalid message={state.message} />
          <p className={s.muted}>{t('auth.action.verifyRetry')}</p>
        </div>
      )}
    </Panel>
  );
}

function ResetPassword({ code }: { code: string }) {
  const { t } = useT();
  const { user, isAnonymous, checkResetCode, confirmReset, signInWithEmail } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let p = checked.get(code);
    if (!p) {
      p = checkResetCode(code);
      checked.set(code, p);
    }
    let alive = true;
    p.then(
      (e) => alive && setEmail(e),
      (e: unknown) => alive && setCheckError(errorText(e, t)),
    );
    return () => {
      alive = false;
    };
  }, [code, checkResetCode, t]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(t('settings.account.email.errors.weakPassword'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmReset(code, password);
      setDone(true);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      toast.push({ title: t('settings.account.email.signedIn'), tone: 'win' });
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  const signedInHere = !!email && !isAnonymous && user?.email?.toLowerCase() === email.toLowerCase();

  return (
    <Panel title={t('auth.action.resetTitle')}>
      {checkError ? (
        <div className={s.stack}>
          <Invalid message={checkError} />
          <p className={s.muted}>{t('auth.action.resetRetry')}</p>
        </div>
      ) : !email ? (
        <div className={s.row}>
          <Spinner size={16} />
          <TerminalLine tone="muted">{t('auth.action.checking')}</TerminalLine>
        </div>
      ) : done ? (
        <div className={s.stack}>
          <TerminalLine tone="win" prompt="✓">
            {t('auth.action.resetDone')}
          </TerminalLine>
          {signedInHere ? (
            <div className={s.row}>
              <Button to="/">{t('auth.action.continue')}</Button>
            </div>
          ) : (
            <>
              {isAnonymous ? <p className={s.muted}>{t('settings.account.email.signInHint')}</p> : null}
              {error ? (
                <TerminalLine tone="loss" prompt="!">
                  {error}
                </TerminalLine>
              ) : null}
              <div className={s.row}>
                <Button onClick={() => void signIn()} loading={busy}>
                  {t('auth.action.signInAs', { email })}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <form className={s.stack} onSubmit={(e) => void submit(e)} noValidate>
          <TerminalLine tone="muted">{t('auth.action.resetFor', { email })}</TerminalLine>
          {/* lets password managers attach the new password to the right account */}
          <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
          <TextField
            label={t('auth.action.newPassword')}
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
            required
            hint={t('settings.account.email.passwordHint', { min: MIN_PASSWORD })}
            inputProps={{ autoComplete: 'new-password', name: 'password', autoFocus: true }}
          />
          {error ? (
            <TerminalLine tone="loss" prompt="!">
              {error}
            </TerminalLine>
          ) : null}
          <div className={s.row}>
            <Button type="submit" loading={busy}>
              {t('auth.action.savePassword')}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
