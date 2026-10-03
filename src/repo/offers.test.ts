import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/firebase/app', () => ({ app: {}, auth: {}, db: {}, useEmulators: false, ADMIN_UIDS: [] }));

import { offerTargets } from './offers';
import type { FriendDoc } from '@/types';

const friend = (uid: string, playerId?: string): FriendDoc => ({ uid, since: Timestamp.now(), ...(playerId ? { playerId } : {}) });
const game = (p1: string, p2: string, isTestData = false) => ({ p1: { playerId: p1 }, p2: { playerId: p2 }, isTestData });

describe('offerTargets', () => {
  it('offers to the friend linked to a side, with my side as the owner side', () => {
    expect(offerTargets(game('ME', 'BOB'), [friend('b', 'BOB'), friend('c')], 'ME')).toEqual([{ friendUid: 'b', friendSide: 'p2', ownerSide: 'p1' }]);
  });

  it('offers to both friends when two friends played each other, without an owner side', () => {
    expect(offerTargets(game('BOB', 'CAT'), [friend('b', 'BOB'), friend('c', 'CAT')], 'ME')).toEqual([
      { friendUid: 'b', friendSide: 'p1' },
      { friendUid: 'c', friendSide: 'p2' },
    ]);
  });

  it('never offers test data or games without linked players', () => {
    expect(offerTargets(game('ME', 'BOB', true), [friend('b', 'BOB')], 'ME')).toEqual([]);
    expect(offerTargets(game('ME', 'X'), [friend('b', 'BOB')], 'ME')).toEqual([]);
  });
});
