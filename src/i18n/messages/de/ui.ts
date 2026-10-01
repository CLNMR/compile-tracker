import type { Shape } from '../shape';
import type { ui as en } from '../en/ui';

export const ui: Shape<typeof en> = {
  nav: {
    home: 'Start',
    newGame: 'Neues Spiel',
    games: 'Spiele',
    stats: 'Statistiken',
    players: 'Spieler',
    settings: 'Einstellungen',
    dev: 'Entwickler',
  },
  shell: {
    skipToContent: 'Zum Inhalt springen',
    brand: 'Compile Tracker — Startseite',
    primaryNav: 'Hauptnavigation',
  },
  dialog: {
    typeToConfirm: {
      before: 'Gib',
      after: 'ein, um zu bestätigen',
    },
  },
  chip: {
    remove: 'Entfernen',
  },
  toast: {
    region: 'Benachrichtigungen',
    dismiss: 'Ausblenden',
  },
  select: {
    noOptions: 'keine Optionen',
  },
  field: {
    required: 'Pflichtfeld',
  },
  spinner: {
    loading: 'Lädt',
  },
};
