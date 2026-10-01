import type { Shape } from '../shape';
import type { protocol as en } from '../en/protocol';

export const protocol: Shape<typeof en> = {
  card: {
    taken: 'Vergeben',
  },
  chip: {
    compiled: 'kompiliert',
    remove: '{name} entfernen',
  },
  picker: {
    title: 'Protokolle',
    search: 'Protokolle suchen…',
    searchLabel: 'Protokolle suchen',
    selected_one: '{count} von {max} ausgewählt',
    selected_other: '{count} von {max} ausgewählt',
    maxReached: 'Mehr als {max} Protokolle gehen nicht. Wähl erst eins wieder ab.',
    noMatch: 'kein Protokoll passt zu „{query}“',
    setGroup: 'Protokolle aus {set}',
  },
};
