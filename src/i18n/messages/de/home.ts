import type { Shape } from '../shape';
import type { home as en } from '../en/home';

export const home: Shape<typeof en> = {
  hero: {
    tagline1: 'löse nach bewusstsein auf.',
    tagline2: 'sechs protokolle. zwei spieler. ein compile.',
    awaiting: 'warte auf eingabe',
  },
  actions: {
    newGame: 'Neues Spiel',
    players: 'Spieler',
    createPlayers: 'Spieler anlegen',
    allGames: 'Alle Spiele',
  },
  hint: {
    anonymousLink: 'einstellungen',
    guestBefore: 'gastmodus — spiele werden als Alpha gegen Beta erfasst. verknüpfe in den ',
    guestAfter: ' ein google-konto, um benannte spieler und eigene statistiken zu führen.',
    dismiss: 'Hinweis ausblenden',
  },
  empty: {
    idle: {
      title: 'System im Leerlauf',
      line1: 'keine spieler registriert.',
      line2: 'leg dich und einen gegner an, dann kompiliere dein erstes spiel.',
    },
    noGames: {
      title: 'Noch keine Spiele',
      ready_one: '{count} spieler bereit.',
      ready_other: '{count} spieler bereit.',
      line2: 'erfasse deine erste partie, um statistiken freizuschalten.',
    },
    guest: {
      line1: 'noch keine spiele erfasst.',
      line2: 'wähle protokolle für Alpha und Beta, dann kompiliere dein erstes spiel.',
    },
  },
  tiles: {
    gamesRecorded: 'Erfasste Spiele',
    thisMonth: '{count} diesen Monat',
    winRate: 'Siegquote',
    winRateFor: 'Siegquote · {name}',
    record: '{wins} S · {losses} N',
    setDefault: 'Standardspieler festlegen',
    mostUsed: 'Meistgespieltes Protokoll',
    firstPlayer: 'Startspieler gewinnt',
    firstPlayerSub_one: '{count} Spiel mit bekanntem Start',
    firstPlayerSub_other: '{count} Spiele mit bekanntem Start',
    decksShare_one: '{count} Deck · {share}',
    decksShare_other: '{count} Decks · {share}',
  },
  recent: {
    title: 'Letzte Spiele',
  },
};
