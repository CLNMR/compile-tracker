import type { Shape } from '../shape';
import type { auth as en } from '../en/auth';

export const auth: Shape<typeof en> = {
  linked: {
    title: 'Google-Konto verknüpft',
    description: 'Deine Daten folgen jetzt deiner Google-Anmeldung.',
  },
  linkedEmail: {
    title: 'Konto erstellt',
    description: 'Deine Daten folgen jetzt deiner E-Mail-Anmeldung. Bestätige den Link, den wir an {email} geschickt haben, um Freunde freizuschalten.',
  },
  verify: {
    pending: 'e-mail noch nicht bestätigt — wir haben einen link an {email} geschickt.',
    check: 'Ich habe bestätigt',
    resend: 'E-Mail erneut senden',
    sent: 'Bestätigungs-E-Mail gesendet',
    sentDesc: 'Schau in {email} nach, auch im Spam-Ordner.',
    sendFailed: 'E-Mail konnte nicht gesendet werden',
    done: 'E-Mail bestätigt',
    notYet: 'Noch nicht bestätigt',
    notYetDesc: 'Öffne den Link in der E-Mail und versuch es dann erneut.',
  },
  action: {
    title: 'E-Mail-Link',
    invalid: 'Dieser Link ist ungültig oder unvollständig.',
    toSettings: 'Einstellungen öffnen',
    verifyTitle: 'E-Mail bestätigen',
    verifying: 'deine e-mail wird bestätigt…',
    verified: 'e-mail bestätigt.',
    verifiedHint: 'Freunde sind freigeschaltet. Hast du dich in der installierten App oder auf einem anderen Gerät registriert, wechsle dorthin zurück; die App merkt es von selbst.',
    verifyRetry: 'Fordere in Einstellungen → Konto einen neuen Link an.',
    continue: 'Weiter',
    resetTitle: 'Neues Passwort',
    checking: 'link wird geprüft…',
    resetFor: 'neues passwort für {email}',
    newPassword: 'Neues Passwort',
    savePassword: 'Passwort speichern',
    resetDone: 'passwort geändert.',
    resetRetry: 'Fordere einen neuen Link an: Einstellungen → Konto → E-Mail & Passwort → Passwort vergessen?',
    signInAs: 'Als {email} anmelden',
  },
  linkFailed: {
    title: 'Konto konnte nicht verknüpft werden',
  },
  notSignedIn: 'Noch nicht angemeldet — versuch es gleich noch einmal.',
};
