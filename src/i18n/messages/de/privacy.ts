import type { Shape } from '../shape';
import type { privacy as en } from '../en/privacy';

export const privacy: Shape<typeof en> = {
  banner: {
    title: 'Statistik',
    body: 'Dürfen wir Google Analytics nutzen, um zu sehen, woher Besucher kommen und welche Funktionen genutzt werden? Dabei werden Cookies gesetzt. Keine Werbung, keine Spielernamen. Du kannst das jederzeit in den Einstellungen ändern.',
    accept: 'Erlauben',
    decline: 'Ablehnen',
  },
  settings: {
    title: 'Datenschutz',
    ga: 'Google Analytics',
    gaDesc: 'Sitzungen, Herkunft der Besucher und Funktionsnutzung. Setzt Cookies; keine Werbung.',
    status: {
      granted: 'statistik: auf diesem Gerät erlaubt',
      denied: 'statistik: auf diesem Gerät abgelehnt',
      unset: 'statistik: noch nicht entschieden',
    },
    cookieFree:
      'Immer aktiv und ohne Cookies: anonyme tägliche Zählungen von Besuchen, neuen Nutzern und gespeicherten Spielen je Quelle (z. B. Reddit) sowie Seitenaufruf-Statistiken von Cloudflare. Keine Namen, keine Geräte-IDs.',
  },
};
