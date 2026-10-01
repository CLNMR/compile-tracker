/** Generic design-system components (`src/components/ui`) and the app shell. */
export const ui = {
  nav: {
    home: 'Home',
    newGame: 'New game',
    games: 'Games',
    stats: 'Stats',
    players: 'Players',
    settings: 'Settings',
    dev: 'Dev tools',
  },
  shell: {
    skipToContent: 'Skip to content',
    brand: 'Compile Tracker — home',
    primaryNav: 'Primary',
  },
  dialog: {
    /** Rendered as "{before} <code>RESET</code> {after}". Close/confirm/cancel come from `common.actions`. */
    typeToConfirm: {
      before: 'Type',
      after: 'to confirm',
    },
  },
  chip: {
    remove: 'Remove',
  },
  toast: {
    region: 'Notifications',
    dismiss: 'Dismiss',
  },
  select: {
    noOptions: 'no options',
  },
  field: {
    required: 'required',
  },
  spinner: {
    loading: 'Loading',
  },
} as const;
