import type { Shape } from '../shape';
import type { settings as en } from '../en/settings';

export const settings: Shape<typeof en> = {
  protocolSets: {
    title: 'Protokoll-Sets',
    protocolCount_one: '{count} Protokoll',
    protocolCount_other: '{count} Protokolle',
    enabled_one: '{count} protokoll aktiv',
    enabled_other: '{count} protokolle aktiv',
    across_one: 'in {count} set',
    across_other: 'in {count} sets',
    needMore: 'ein spiel braucht {min} verschiedene protokolle — aktiviere weitere sets, um spiele zu erfassen',
    atLeastOne: 'Mindestens ein Set muss aktiv bleiben',
  },
  me: {
    title: 'Ich',
    defaultPlayer: 'Standardspieler',
    noDefault: 'Kein Standard',
    hintActive: 'Wird beim Erfassen eines Spiels als Spieler 1 vorausgewählt.',
    hintEmpty: 'Leg zuerst Spieler an — sie erscheinen dann hier.',
  },
  language: {
    hint: 'Gilt sofort. Auch Protokollnamen werden übersetzt.',
    status: 'sprache: {locale} · browser: {browser}',
  },
  account: {
    title: 'Konto',
    anonymous: 'anonym',
    google: 'google',
    identityAnonymous: 'identität: anonymer gast — spiele werden als Alpha gegen Beta erfasst. verknüpfe google, um spieler zu benennen und eigene statistiken zu sehen.',
    identityGoogle: 'identität: google',
    linkGoogle: 'Google-Konto verknüpfen',
    signOut: 'Abmelden',
    uidTitle: 'Deine Nutzer-ID',
    toast: {
      redirecting: 'Weiterleitung zu Google…',
      switched: 'Zu deinem Google-Konto gewechselt',
      switchFailed: 'Kontowechsel fehlgeschlagen',
      signedOut: 'Abgemeldet',
      signedOutDesc: 'Eine neue anonyme Identität wurde erstellt.',
      signOutFailed: 'Abmelden fehlgeschlagen',
      uidCopied: 'uid kopiert',
      clipboard: 'Zwischenablage nicht verfügbar',
      clipboardDesc: 'Markiere die ID und kopiere sie von Hand.',
    },
    switchDialog: {
      title: 'Google-Konto wird bereits verwendet',
      confirm: 'Zu diesem Konto wechseln',
      thisAccount: 'Dieses Google-Konto',
      body: 'hat bereits Compile-Tracker-Daten unter einer anderen Identität. Du kannst jetzt wechseln — die Spiele und Spieler deiner aktuellen anonymen Identität bleiben bei der alten Identität dieses Geräts und werden nicht zusammengeführt.',
      reconfirm: 'Google wird dich noch einmal bitten, das Konto zu bestätigen.',
    },
    signOutDialog: {
      title: 'Abmelden?',
      confirm: 'Abmelden',
      anonymousBody:
        'Du bist anonym. Beim Abmelden wird eine neue anonyme Identität erstellt — die Daten dieser Identität sind dann nicht mehr erreichbar, es sei denn, du verknüpfst vorher ein Google-Konto.',
      googleBody: 'Für dieses Gerät wird eine neue anonyme Identität erstellt. Melde dich wieder mit Google an, um zu deinen Daten zurückzukehren.',
    },
  },
  install: {
    title: 'Installieren',
    running: 'läuft als installierte app',
    offer: 'installieren für offline-nutzung und ein symbol auf dem startbildschirm',
    button: 'App installieren',
    ios: 'unter iOS: Teilen → „Zum Home-Bildschirm“ antippen',
    browser: 'über das browser-menü installieren („App installieren“ / „Zum Startbildschirm hinzufügen“)',
    installing: 'Wird installiert…',
  },
  data: {
    title: 'Daten',
    myGames: 'meine spiele',
    myPlayers: 'meine spieler',
    gamesInDb: 'spiele in der db',
    devTools: 'Entwicklerwerkzeuge',
    kitchenSink: 'UI-Baukasten',
  },
  about: {
    title: 'Über',
    version: 'compile tracker · version {version}',
    attribution:
      'Compile ist ein Spiel von Michael Yang, erschienen bei Greater Than Games. Dies ist ein inoffizielles Fan-Tool, das weder mit dem Autor noch mit dem Verlag in Verbindung steht oder von ihnen unterstützt wird.',
  },
};
