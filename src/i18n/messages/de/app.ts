import type { Shape } from '../shape';
import type { app as en } from '../en/app';

export const app: Shape<typeof en> = {
  boot: {
    flicker: 'sicht flackert… blinzeln? vielleicht.',
    identity: 'identität wird hergestellt',
  },
  authFailed: 'auth fehlgeschlagen: {error}',
  reload: {
    message: 'neue version kompiliert — neu laden zum anwenden',
    reload: 'Neu laden',
    later: 'Später',
  },
  error: {
    title: 'Segfault',
    unknown: 'unbekannter fehler',
    void: 'die leere erstreckt sich nach vorn, hinten, unten, oben.',
    home: 'Zur Startseite',
  },
};
