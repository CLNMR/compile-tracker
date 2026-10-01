import type { Shape } from '../shape';
import type { auth as en } from '../en/auth';

export const auth: Shape<typeof en> = {
  linked: {
    title: 'Google-Konto verknüpft',
    description: 'Deine Daten folgen jetzt deiner Google-Anmeldung.',
  },
  linkFailed: {
    title: 'Konto konnte nicht verknüpft werden',
  },
  notSignedIn: 'Noch nicht angemeldet — versuch es gleich noch einmal.',
};
