import { PROTOCOL_BY_ID, type ProtocolDef } from '@/data/protocols';
import { SET_BY_ID, type SetDef } from '@/data/sets';
import type { ProtocolId, SetId } from '@/types';
import type { Locale } from './locale';

/**
 * German protocol names. English names live on `ProtocolDef.name` (they double as ids).
 * Keep every protocol listed: `protocolName()` falls back to English only for unknown ids.
 */
export const PROTOCOL_NAMES_DE: Readonly<Record<ProtocolId, string>> = {
  // Main 1
  darkness: 'Dunkelheit',
  death: 'Tod',
  fire: 'Feuer',
  gravity: 'Schwerkraft',
  life: 'Leben',
  light: 'Licht',
  metal: 'Metall',
  plague: 'Seuche',
  psychic: 'Psyche',
  speed: 'Geschwindigkeit',
  spirit: 'Geist',
  water: 'Wasser',
  // Main 2
  chaos: 'Chaos',
  clarity: 'Klarheit',
  corruption: 'Korruption',
  courage: 'Mut',
  fear: 'Furcht',
  ice: 'Eis',
  luck: 'Glück',
  mirror: 'Spiegel',
  peace: 'Frieden',
  smoke: 'Rauch',
  time: 'Zeit',
  war: 'Krieg',
  // Main 3
  ambush: 'Hinterhalt',
  envy: 'Neid',
  fulcrum: 'Drehpunkt',
  gluttony: 'Völlerei',
  greed: 'Gier',
  lust: 'Wollust',
  momentum: 'Schwung',
  nova: 'Nova',
  overwhelm: 'Überwältigung',
  pride: 'Hochmut',
  sloth: 'Faulheit',
  wrath: 'Zorn',
  // Aux 1
  love: 'Liebe',
  hate: 'Hass',
  apathy: 'Apathie',
  // Aux 2
  diversity: 'Vielfalt',
  assimilation: 'Assimilation',
  unity: 'Einheit',
  // Aux 3
  flexible: 'Flexibel',
  inert: 'Träge',
  rigid: 'Starr',
};

const PROTOCOL_NAMES: Record<Locale, Readonly<Record<ProtocolId, string>> | null> = {
  en: null, // → ProtocolDef.name
  de: PROTOCOL_NAMES_DE,
};

/** Localized display name of a protocol. Unknown ids come back unchanged so stale data still renders. */
export function protocolName(p: ProtocolId | ProtocolDef, locale: Locale): string {
  const def = typeof p === 'string' ? PROTOCOL_BY_ID[p] : p;
  if (!def) return typeof p === 'string' ? p : '';
  return PROTOCOL_NAMES[locale]?.[def.id] ?? def.name;
}

interface SetNames {
  name: string;
  short: string;
}

/** Set titles are product names and stay as printed on the box; only the German `kind` wording differs (see `common.setKind`). */
const SET_NAMES: Record<Locale, Partial<Record<SetId, SetNames>>> = {
  en: {},
  de: {},
};

export function setName(s: SetId | SetDef, locale: Locale): string {
  const def = typeof s === 'string' ? SET_BY_ID[s] : s;
  return SET_NAMES[locale][def.id]?.name ?? def.name;
}

export function setShort(s: SetId | SetDef, locale: Locale): string {
  const def = typeof s === 'string' ? SET_BY_ID[s] : s;
  return SET_NAMES[locale][def.id]?.short ?? def.short;
}

/** Protocols sorted by their localized name. */
export function sortByProtocolName<T extends ProtocolId | ProtocolDef>(items: readonly T[], locale: Locale): T[] {
  const collator = new Intl.Collator(locale);
  return [...items].sort((a, b) => collator.compare(protocolName(a, locale), protocolName(b, locale)));
}
