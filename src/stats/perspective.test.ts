import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { mkGame } from '@/test/fixtures';
import { friendPlayerId, type OfferDoc, type OfferStatus, type SideKey } from '@/types';
import { myGames, remapOffered } from './perspective';
import { aggregate } from './aggregate';
import { filterGames } from './filters';

const ME = 'me';
const OWNER = 'owner';

const offer = (gameId: string, status: OfferStatus, friendSide: SideKey = 'p2', ownerSide?: SideKey): OfferDoc => ({
  gameId,
  ownerUid: OWNER,
  friendSide,
  ...(ownerSide ? { ownerSide } : {}),
  status,
  offeredAt: Timestamp.now(),
});

// Owner recorded: their "me" player OA (p1) beat their player OB (p2), who is me.
const shared = mkGame({ id: 'S1', ownerUid: OWNER, p1: { playerId: 'OA' }, p2: { playerId: 'OB', compiled: ['death'] } });
const mine = mkGame({ id: 'M1', ownerUid: ME, p1: { playerId: 'ME' }, p2: { playerId: 'X' } });
const other = mkGame({ id: 'O1', ownerUid: 'stranger' });

describe('remapOffered', () => {
  it('maps my side to my player and the owner side to my player linked to the owner', () => {
    const g = remapOffered(shared, offer('S1', 'accepted', 'p2', 'p1'), ME, new Map([[OWNER, 'FRIEND']]), 'ME');
    expect(g.p2.playerId).toBe('ME');
    expect(g.p1.playerId).toBe('FRIEND');
    expect(g.sharedBy).toBe(OWNER);
    expect(g.p2.compiled).toEqual(['death']);
    expect(shared.p2.playerId).toBe('OB'); // input untouched
  });

  it('falls back to synthetic friend ids without links or a me player', () => {
    const g = remapOffered(shared, offer('S1', 'accepted', 'p2', 'p1'), ME, new Map());
    expect(g.p2.playerId).toBe(friendPlayerId(ME));
    expect(g.p1.playerId).toBe(friendPlayerId(OWNER));
  });

  it('keeps the owner pseudonym for a side that is neither me nor the owner', () => {
    const g = remapOffered(shared, offer('S1', 'accepted', 'p2'), ME, new Map([[OWNER, 'FRIEND']]), 'ME');
    expect(g.p1.playerId).toBe('OA');
  });
});

describe('myGames', () => {
  const all = [shared, mine, other];
  const run = (status: OfferStatus) =>
    myGames({ all, myUid: ME, offers: new Map([['S1', offer('S1', status, 'p2', 'p1')]]), friendPlayers: new Map(), selfPlayerId: 'ME' });

  it('includes accepted offers, remapped, next to my own games', () => {
    const games = run('accepted');
    expect(games.map((g) => g.id)).toEqual(['S1', 'M1']);
    const agg = aggregate(games);
    expect(agg.byPlayer.ME.games).toBe(2);
    expect(agg.byPlayer.ME.wins).toBe(1);
  });

  it('leaves out pending and declined offers', () => {
    expect(run('pending').map((g) => g.id)).toEqual(['M1']);
    expect(run('declined').map((g) => g.id)).toEqual(['M1']);
  });

  it('ignores offers whose owner does not match the game', () => {
    const games = myGames({ all, myUid: ME, offers: new Map([['O1', offer('O1', 'accepted')]]), friendPlayers: new Map() });
    expect(games.map((g) => g.id)).toEqual(['M1']);
  });

  it('accepted games pass the mine filter', () => {
    expect(filterGames(run('accepted'), { scope: 'mine', myUid: ME }).map((g) => g.id)).toEqual(['S1', 'M1']);
  });
});
