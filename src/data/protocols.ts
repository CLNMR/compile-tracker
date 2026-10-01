import type { ProtocolId, SetId } from '@/types';

export interface ProtocolDef {
  id: ProtocolId;
  name: string;
  set: SetId;
  /** Gradient pair used for the card "art" (original approximations, not official colours). */
  colors: { primary: string; secondary: string };
  /** Single glyph shown in the hex badge. */
  glyph: string;
}

const def = (
  name: string,
  set: SetId,
  primary: string,
  secondary: string,
  glyph: string,
): ProtocolDef => ({ id: name.toLowerCase(), name, set, colors: { primary, secondary }, glyph });

export const PROTOCOLS: readonly ProtocolDef[] = [
  // Main 1
  def('Darkness', 'MN01', '#5b2d8f', '#07050d', '◐'),
  def('Death', 'MN01', '#8a8a99', '#15151c', '☠'),
  def('Fire', 'MN01', '#ff6a2a', '#7a1500', '▲'),
  def('Gravity', 'MN01', '#8f5bff', '#24085a', '◉'),
  def('Life', 'MN01', '#3fe07a', '#0b5a2a', '❀'),
  def('Light', 'MN01', '#fff1a8', '#c9a227', '✦'),
  def('Metal', 'MN01', '#c2cad3', '#4a535e', '⬢'),
  def('Plague', 'MN01', '#b9e34a', '#3f5a08', '☣'),
  def('Psychic', 'MN01', '#ff5fd2', '#6e0b56', '◎'),
  def('Speed', 'MN01', '#ffe03a', '#1fd6ff', '»'),
  def('Spirit', 'MN01', '#ff8ad8', '#5a2bff', '✧'),
  def('Water', 'MN01', '#2fb6ff', '#0a3f8f', '≈'),
  // Main 2
  def('Chaos', 'MN02', '#ff4fa3', '#2a9bff', '҉'),
  def('Clarity', 'MN02', '#eafcff', '#36c9e8', '◇'),
  def('Corruption', 'MN02', '#9b4dff', '#3a0a2e', '▞'),
  def('Courage', 'MN02', '#ffb037', '#b3400f', '⚑'),
  def('Fear', 'MN02', '#4b3cff', '#0a0528', '◍'),
  def('Ice', 'MN02', '#bff3ff', '#2b6cb0', '❄'),
  def('Luck', 'MN02', '#2fe39a', '#0a5a3d', '✿'),
  def('Mirror', 'MN02', '#d9e6ee', '#4fb3d6', '◫'),
  def('Peace', 'MN02', '#c9f7d2', '#5aa36a', '○'),
  def('Smoke', 'MN02', '#9d9aa6', '#2a272f', '≋'),
  def('Time', 'MN02', '#f2c94c', '#1f7a7a', '◷'),
  def('War', 'MN02', '#ff3b3b', '#4a0a0a', '⚔'),
  // Main 3
  def('Ambush', 'MN03', '#55d66b', '#102a14', '◤'),
  def('Envy', 'MN03', '#6ee86e', '#1c4d1c', '◖'),
  def('Fulcrum', 'MN03', '#d2b48c', '#4d3b24', '◭'),
  def('Gluttony', 'MN03', '#ff9f1c', '#6a3a00', '◕'),
  def('Greed', 'MN03', '#ffd166', '#7a5a00', '◆'),
  def('Lust', 'MN03', '#ff6f91', '#6a0f33', '♡'),
  def('Momentum', 'MN03', '#55c8ff', '#143a66', '➤'),
  def('Nova', 'MN03', '#fff6c2', '#ff7a00', '✺'),
  def('Overwhelm', 'MN03', '#d84cff', '#2a0a4a', '▣'),
  def('Pride', 'MN03', '#b57bff', '#d4a017', '♛'),
  def('Sloth', 'MN03', '#7d8bb5', '#232a40', '◡'),
  def('Wrath', 'MN03', '#ff2e2e', '#2a0000', '✸'),
  // Aux 1
  def('Love', 'AX01', '#ff7ab6', '#8a1c4e', '❤'),
  def('Hate', 'AX01', '#c6262e', '#1a0506', '✖'),
  def('Apathy', 'AX01', '#8c8c8c', '#2b2b2b', '—'),
  // Aux 2
  def('Diversity', 'AX02', '#ff9a3c', '#3c8dff', '✱'),
  def('Assimilation', 'AX02', '#9fb3c8', '#2f3e4e', '▦'),
  def('Unity', 'AX02', '#f4f7ff', '#3d6bff', '◯'),
  // Aux 3
  def('Flexible', 'AX03', '#3fd9c8', '#0b4a44', '∿'),
  def('Inert', 'AX03', '#8795a1', '#1e252c', '▬'),
  def('Rigid', 'AX03', '#9aa5b1', '#3a3f45', '▮'),
];

export const PROTOCOL_BY_ID: Readonly<Record<ProtocolId, ProtocolDef>> = Object.fromEntries(
  PROTOCOLS.map((p) => [p.id, p]),
);

export const PROTOCOL_IDS: readonly ProtocolId[] = PROTOCOLS.map((p) => p.id);

export function getProtocol(id: ProtocolId): ProtocolDef {
  const p = PROTOCOL_BY_ID[id];
  if (!p) throw new Error(`Unknown protocol id: ${id}`);
  return p;
}

export function protocolsInSets(sets: readonly SetId[]): ProtocolDef[] {
  const s = new Set(sets);
  return PROTOCOLS.filter((p) => s.has(p.set));
}

/** Distinct sets touched by a list of protocol ids. */
export function setsOf(ids: readonly ProtocolId[]): SetId[] {
  return [...new Set(ids.map((id) => PROTOCOL_BY_ID[id]?.set).filter((x): x is SetId => !!x))];
}

export function isKnownProtocol(id: string): id is ProtocolId {
  return id in PROTOCOL_BY_ID;
}
