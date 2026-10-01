/** Protocol card / chip / picker (`src/components/protocol`). Protocol names themselves come from `i18n/names.ts`. */
export const protocol = {
  card: {
    taken: 'Taken',
  },
  chip: {
    compiled: 'compiled',
    remove: 'Remove {name}',
  },
  picker: {
    title: 'Protocols',
    search: 'Search protocols…',
    searchLabel: 'Search protocols',
    selected_one: '{count} of {max} selected',
    selected_other: '{count} of {max} selected',
    maxReached: 'Maximum of {max} protocols selected. Deselect one first.',
    noMatch: 'no protocol matches “{query}”',
    setGroup: '{set} protocols',
  },
} as const;
