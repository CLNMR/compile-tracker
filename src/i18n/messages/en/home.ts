export const home = {
  hero: {
    tagline1: 'solve for sentience.',
    tagline2: 'six protocols. two players. one compile.',
    awaiting: 'awaiting input',
  },
  actions: {
    newGame: 'New game',
    players: 'Players',
    createPlayers: 'Create players',
    allGames: 'All games',
  },
  hint: {
    /** Rendered as `{before}<Link>{link}</Link>{after}`. */
    anonymousBefore: 'you are anonymous — link a Google account in ',
    anonymousLink: 'Settings',
    anonymousAfter: ' to keep your data across devices.',
    dismiss: 'Dismiss hint',
  },
  empty: {
    idle: {
      title: 'System idle',
      line1: 'no players registered.',
      line2: 'add yourself and an opponent, then compile your first game.',
    },
    noGames: {
      title: 'No games yet',
      ready_one: '{count} player ready.',
      ready_other: '{count} players ready.',
      line2: 'record your first match to unlock stats.',
    },
  },
  tiles: {
    gamesRecorded: 'Games recorded',
    thisMonth: '{count} this month',
    winRate: 'Win rate',
    winRateFor: 'Win rate · {name}',
    record: '{wins} W · {losses} L',
    setDefault: 'set a default player',
    mostUsed: 'Most used protocol',
    decksShare_one: '{count} deck · {share}',
    decksShare_other: '{count} decks · {share}',
  },
  recent: {
    title: 'Recent games',
  },
} as const;
