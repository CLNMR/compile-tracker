import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, increment, query, setDoc, Timestamp, where } from 'firebase/firestore';

const PROJECT_ID = 'compile-tracker-rules-test';
const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const ADMIN = 'admin-uid';

let env: RulesTestEnvironment;

const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [emuHost, emuPort] = host.split(':');

function validGame(owner = ALICE, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    ownerUid: owner,
    playedAt: Timestamp.fromDate(new Date('2026-09-20T18:00:00Z')),
    yearMonth: '2026-09',
    p1: { playerId: 'p1xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'plague', 'speed'], compiled: ['fire', 'plague', 'speed'] },
    p2: { playerId: 'p2xxxxxxxxxxxxxxxxxx', protocols: ['darkness', 'life', 'water'], compiled: ['life'] },
    winner: 'p1',
    firstPlayer: 'p1',
    allProtocols: ['darkness', 'fire', 'life', 'plague', 'speed', 'water'],
    isTestData: false,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8').replace('lZnbYJhKdjQi6CDr3m23v2mmSGF2', ADMIN),
      host: emuHost,
      port: Number(emuPort),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

const dbAs = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

describe('players', () => {
  it('owner can create, read, update and delete own players', async () => {
    const db = dbAs(ALICE);
    const ref = doc(db, 'users', ALICE, 'players', 'pl1');
    await assertSucceeds(setDoc(ref, { name: 'Colin', createdAt: Timestamp.now(), archived: false }));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, { name: 'Col', createdAt: Timestamp.now(), archived: true }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('other users cannot read or list players', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'players', 'pl1'), { name: 'Colin', createdAt: Timestamp.now(), archived: false });
    });
    const db = dbAs(BOB);
    await assertFails(getDoc(doc(db, 'users', ALICE, 'players', 'pl1')));
    await assertFails(getDocs(collection(db, 'users', ALICE, 'players')));
  });

  it('rejects extra fields and empty names', async () => {
    const db = dbAs(ALICE);
    await assertFails(setDoc(doc(db, 'users', ALICE, 'players', 'x'), { name: 'A', createdAt: Timestamp.now(), archived: false, email: 'a@b.c' }));
    await assertFails(setDoc(doc(db, 'users', ALICE, 'players', 'y'), { name: '', createdAt: Timestamp.now(), archived: false }));
  });

  it('unauthenticated users cannot do anything', async () => {
    const db = dbAs(null);
    await assertFails(setDoc(doc(db, 'users', ALICE, 'players', 'x'), { name: 'A', createdAt: Timestamp.now(), archived: false }));
    await assertFails(getDocs(collection(db, 'games')));
  });
});

describe('games', () => {
  it('owner can create a valid game and anyone signed in can read it', async () => {
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 'g1'), validGame()));
    await assertSucceeds(getDoc(doc(dbAs(BOB), 'games', 'g1')));
    await assertSucceeds(getDocs(collection(dbAs(BOB), 'games')));
  });

  it('cannot create a game owned by someone else', async () => {
    await assertFails(setDoc(doc(dbAs(BOB), 'games', 'g1'), validGame(ALICE)));
  });

  it('rejects a name field on games (pseudonymization)', async () => {
    await assertFails(setDoc(doc(dbAs(ALICE), 'games', 'g1'), validGame(ALICE, { p1Name: 'Colin' })));
    await assertFails(
      setDoc(doc(dbAs(ALICE), 'games', 'g2'), validGame(ALICE, { p1: { playerId: 'p1xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'plague', 'speed'], compiled: ['fire', 'plague', 'speed'], name: 'Colin' } })),
    );
  });

  it('rejects invalid shapes', async () => {
    const db = dbAs(ALICE);
    // duplicate protocol within a side
    await assertFails(setDoc(doc(db, 'games', 'a'), validGame(ALICE, { p1: { playerId: 'p1xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'fire', 'speed'], compiled: ['fire', 'speed'] } })));
    // same protocol on both sides
    await assertFails(
      setDoc(doc(db, 'games', 'b'), validGame(ALICE, { p2: { playerId: 'p2xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'life', 'water'], compiled: [] }, allProtocols: ['fire', 'fire', 'life', 'plague', 'speed', 'water'] })),
    );
    // winner with only 2 compiled
    await assertFails(setDoc(doc(db, 'games', 'c'), validGame(ALICE, { p1: { playerId: 'p1xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'plague', 'speed'], compiled: ['fire', 'plague'] } })));
    // loser with 3 compiled
    await assertFails(setDoc(doc(db, 'games', 'd'), validGame(ALICE, { p2: { playerId: 'p2xxxxxxxxxxxxxxxxxx', protocols: ['darkness', 'life', 'water'], compiled: ['darkness', 'life', 'water'] } })));
    // compiled not subset
    await assertFails(setDoc(doc(db, 'games', 'e'), validGame(ALICE, { p2: { playerId: 'p2xxxxxxxxxxxxxxxxxx', protocols: ['darkness', 'life', 'water'], compiled: ['fire'] } })));
    // allProtocols inconsistent
    await assertFails(setDoc(doc(db, 'games', 'f'), validGame(ALICE, { allProtocols: ['darkness', 'fire', 'life', 'plague', 'speed', 'metal'] })));
    // bad winner
    await assertFails(setDoc(doc(db, 'games', 'g'), validGame(ALICE, { winner: 'p3' })));
    // wrong schema version
    await assertFails(setDoc(doc(db, 'games', 'h'), validGame(ALICE, { schemaVersion: 2 })));
  });

  it('firstPlayer is optional', async () => {
    const g = validGame();
    delete (g as Record<string, unknown>).firstPlayer;
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 'g1'), g));
  });

  it('only the owner can update or delete a real game', async () => {
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 'g1'), validGame()));
    await assertFails(setDoc(doc(dbAs(BOB), 'games', 'g1'), validGame(BOB)));
    await assertFails(deleteDoc(doc(dbAs(BOB), 'games', 'g1')));
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 'g1'), validGame(ALICE, { winner: 'p2', p1: { playerId: 'p1xxxxxxxxxxxxxxxxxx', protocols: ['fire', 'plague', 'speed'], compiled: [] }, p2: { playerId: 'p2xxxxxxxxxxxxxxxxxx', protocols: ['darkness', 'life', 'water'], compiled: ['darkness', 'life', 'water'] } })));
    await assertSucceeds(deleteDoc(doc(dbAs(ALICE), 'games', 'g1')));
  });

  it('anyone signed in can delete test data; admin can delete anything', async () => {
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 't1'), validGame(ALICE, { isTestData: true })));
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'games', 'r1'), validGame(ALICE)));
    await assertSucceeds(deleteDoc(doc(dbAs(BOB), 'games', 't1')));
    await assertFails(deleteDoc(doc(dbAs(BOB), 'games', 'r1')));
    await assertSucceeds(deleteDoc(doc(dbAs(ADMIN), 'games', 'r1')));
  });
});

describe('users & stats', () => {
  it('user settings are private', async () => {
    await assertSucceeds(setDoc(doc(dbAs(ALICE), 'users', ALICE), { enabledSets: ['MN01'] }));
    await assertFails(getDoc(doc(dbAs(BOB), 'users', ALICE)));
    await assertFails(setDoc(doc(dbAs(BOB), 'users', ALICE), { enabledSets: ['MN02'] }));
  });

  it('stats docs are readable by all, writable by admin only', async () => {
    await assertFails(setDoc(doc(dbAs(ALICE), 'stats', 'global'), { asOf: Timestamp.now() }));
    await assertSucceeds(setDoc(doc(dbAs(ADMIN), 'stats', 'global'), { asOf: Timestamp.now() }));
    await assertSucceeds(getDoc(doc(dbAs(BOB), 'stats', 'global')));
  });
});

describe('analytics counters', () => {
  const counter = (uid: string | null, id = 'visit_reddit', day = '2026-10-03') => doc(dbAs(uid), 'analytics', day, 'counters', id);
  const bump = (uid: string | null, id?: string, day = '2026-10-03') => setDoc(counter(uid, id, day), { day, n: increment(1) }, { merge: true });

  it('signed-in users can add +1 to whitelisted counters', async () => {
    await assertSucceeds(bump(ALICE));
    await assertSucceeds(bump(BOB));
    await assertSucceeds(bump(ALICE, 'newUser_pwa'));
    await assertSucceeds(bump(ALICE, 'game_direct'));
    await assertSucceeds(bump(ALICE, 'link_bgg'));
    await assertFails(bump(null));
  });

  it('rejects unknown counters, bad days, extra fields and jumps', async () => {
    await assertFails(bump(ALICE, 'visit_hackernews'));
    await assertFails(bump(ALICE, 'pageview_reddit'));
    await assertFails(bump(ALICE, 'visit_reddit', 'yesterday'));
    await assertFails(setDoc(counter(ALICE), { day: '2026-10-03', n: 5 }));
    await assertFails(setDoc(counter(ALICE), { day: '2026-10-02', n: 1 }));
    await assertFails(setDoc(counter(ALICE), { day: '2026-10-03', n: 1, uid: ALICE }));
    await assertSucceeds(bump(ALICE));
    await assertFails(setDoc(counter(ALICE), { day: '2026-10-03', n: 0 }));
    await assertFails(setDoc(counter(ALICE), { day: '2026-10-03', n: 10 }));
    await assertFails(deleteDoc(counter(ALICE)));
  });

  it('only admins can read counters', async () => {
    await assertSucceeds(bump(ALICE));
    await assertFails(getDoc(counter(ALICE)));
    await assertFails(getDocs(query(collectionGroup(dbAs(ALICE), 'counters'), where('day', '>=', '2026-01-01'))));
    await assertSucceeds(getDocs(query(collectionGroup(dbAs(ADMIN), 'counters'), where('day', '>=', '2026-01-01'))));
    await assertSucceeds(getDoc(counter(ADMIN)));
  });
});
