import { Timestamp } from 'firebase/firestore';
import { yearMonthOf, type GameDoc, type GameInput, type GameSide, type SideKey } from '@/types';

export interface MkGameInput {
  id?: string;
  ownerUid?: string;
  playedAt?: Date | Timestamp;
  p1?: Partial<GameSide>;
  p2?: Partial<GameSide>;
  winner?: SideKey;
  firstPlayer?: SideKey;
  /** Winner only: the loser's compiled list is forced empty. */
  compileUnknown?: boolean;
  isTestData?: boolean;
}

let seq = 0;

/**
 * Build a valid `GameDoc` from a partial description. Defaults: A (fire, life, water)
 * beats B (death, gravity, metal). A side's `compiled` defaults to all 3 for the winner
 * and [] for the loser.
 */
export function mkGame(partial: MkGameInput = {}): GameDoc {
  const winner = partial.winner ?? 'p1';
  const side = (key: SideKey, defaults: GameSide, over?: Partial<GameSide>): GameSide => {
    const protocols = [...(over?.protocols ?? defaults.protocols)].sort();
    const compiled = winner === key && (partial.compileUnknown || !over?.compiled) ? [...protocols] : partial.compileUnknown ? [] : [...(over?.compiled ?? [])].sort();
    return { playerId: over?.playerId ?? defaults.playerId, protocols, compiled };
  };
  const p1 = side('p1', { playerId: 'A', protocols: ['fire', 'life', 'water'], compiled: [] }, partial.p1);
  const p2 = side('p2', { playerId: 'B', protocols: ['death', 'gravity', 'metal'], compiled: [] }, partial.p2);
  const playedAt =
    partial.playedAt instanceof Timestamp
      ? partial.playedAt
      : Timestamp.fromDate(partial.playedAt ?? new Date(2025, 0, 1, 12));
  const id = partial.id ?? `g${++seq}`;
  const game: GameDoc = {
    id,
    schemaVersion: 1,
    ownerUid: partial.ownerUid ?? 'u1',
    playedAt,
    yearMonth: yearMonthOf(playedAt.toDate()),
    p1,
    p2,
    winner,
    allProtocols: [...p1.protocols, ...p2.protocols].sort(),
    isTestData: partial.isTestData ?? false,
    createdAt: playedAt,
  };
  if (partial.firstPlayer) game.firstPlayer = partial.firstPlayer;
  if (partial.compileUnknown) game.compileUnknown = true;
  return game;
}

/**
 * Four hand-built games with known outcomes, shared by the stats tests.
 *
 * G1 2025-01-10  A (fire, life, water)   beats B (death, gravity, metal), B compiled [death], A first.      owner u1
 * G2 2025-01-20  B (death, light, metal) beats A (fire, plague, speed),   A compiled [fire, speed], B first. owner u1
 * G3 2025-03-05  C (fire, life, water)   beats B (death, gravity, metal), B compiled [], B first.           owner u2, test data
 * G4 2025-03-15  A (fire, speed, water)  beats C (darkness, death, spirit), C compiled [darkness, death].  owner u1
 */
export const FIXTURE_GAMES: readonly GameDoc[] = [
  mkGame({
    id: 'G1',
    playedAt: new Date(2025, 0, 10, 12),
    p1: { playerId: 'A', protocols: ['fire', 'water', 'life'] },
    p2: { playerId: 'B', protocols: ['death', 'gravity', 'metal'], compiled: ['death'] },
    winner: 'p1',
    firstPlayer: 'p1',
  }),
  mkGame({
    id: 'G2',
    playedAt: new Date(2025, 0, 20, 12),
    p1: { playerId: 'A', protocols: ['fire', 'plague', 'speed'], compiled: ['speed', 'fire'] },
    p2: { playerId: 'B', protocols: ['death', 'light', 'metal'] },
    winner: 'p2',
    firstPlayer: 'p2',
  }),
  mkGame({
    id: 'G3',
    ownerUid: 'u2',
    isTestData: true,
    playedAt: new Date(2025, 2, 5, 12),
    p1: { playerId: 'B', protocols: ['death', 'gravity', 'metal'] },
    p2: { playerId: 'C', protocols: ['fire', 'water', 'life'] },
    winner: 'p2',
    firstPlayer: 'p1',
  }),
  mkGame({
    id: 'G4',
    playedAt: new Date(2025, 2, 15, 12),
    p1: { playerId: 'A', protocols: ['fire', 'water', 'speed'] },
    p2: { playerId: 'C', protocols: ['darkness', 'death', 'spirit'], compiled: ['darkness', 'death'] },
    winner: 'p1',
  }),
];

/** Turn generator output into `GameDoc`s without touching Firestore. */
export function docsFromInputs(inputs: readonly GameInput[], ownerUid = 'u1'): GameDoc[] {
  return inputs.map((input, i) =>
    mkGame({
      id: `gen${i}`,
      ownerUid,
      playedAt: input.playedAt,
      p1: input.p1,
      p2: input.p2,
      winner: input.winner,
      firstPlayer: input.firstPlayer,
      isTestData: input.isTestData ?? false,
    }),
  );
}
