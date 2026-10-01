import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';

// `@/repo/games` initialises the Firebase app on import; stub the app module so only `buildGame` runs.
vi.mock('@/firebase/app', () => ({ app: {}, auth: {}, db: {}, useEmulators: false, ADMIN_UIDS: [] }));

import { buildGame } from '@/repo/games';
import { ALL_SET_IDS } from '@/data/sets';
import { protocolsInSets } from '@/data/protocols';
import { aggregate, protocolWinRate } from '@/stats';
import { docsFromInputs } from '@/test/fixtures';
import { TEST_PLAYER_NAMES, deckStrength, generateGames, mulberry32, playerSkill, protocolStrength, type GenerateOptions } from './generate';

const players = ['pa', 'pb', 'pc', 'pd'];
const now = new Date(2026, 9, 1, 12);
const base: GenerateOptions = { games: 100, playerIds: players, enabledSets: ['MN01'], seed: 7, now };

describe('mulberry32', () => {
  it('is deterministic and uniform-ish in [0, 1)', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const xs = Array.from({ length: 2000 }, () => a());
    expect(Array.from({ length: 2000 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('strength model', () => {
  it('applies hand-picked overrides and hashes the rest', () => {
    expect(protocolStrength('fire')).toBeGreaterThan(protocolStrength('apathy'));
    expect(protocolStrength('speed')).toBeGreaterThan(0.5);
    expect(protocolStrength('inert')).toBeLessThan(-0.5);
    expect(protocolStrength('water')).toBe(protocolStrength('water'));
    expect(Math.abs(protocolStrength('water'))).toBeLessThanOrEqual(0.6);
    expect(deckStrength(['fire', 'plague', 'water'])).toBeGreaterThan(deckStrength(['fire', 'metal', 'water']) - 0.3);
    expect(deckStrength(['love', 'hate', 'apathy'])).toBeGreaterThan(deckStrength(['love', 'apathy', 'unity']) - 0.1);
    expect(deckStrength([])).toBe(0);
    expect(playerSkill(0)).toBeGreaterThan(playerSkill(3));
    expect(playerSkill(50)).toBe(-0.6);
  });
});

describe('generateGames', () => {
  it('exposes the test player names', () => {
    expect(TEST_PLAYER_NAMES).toEqual(['Test-Alpha', 'Test-Beta', 'Test-Gamma', 'Test-Delta', 'Test-Epsilon', 'Test-Zeta', 'Test-Eta', 'Test-Theta']);
  });

  it('is deterministic for a seed and differs across seeds', () => {
    const a = generateGames(base);
    const b = generateGames({ ...base });
    expect(b).toEqual(a);
    expect(JSON.stringify(generateGames({ ...base, seed: 8 }))).not.toBe(JSON.stringify(a));
    expect(a).toHaveLength(100);
    expect(generateGames({ ...base, games: 0 })).toEqual([]);
  });

  it('produces 500 games that all pass buildGame', () => {
    const inputs = generateGames({ ...base, games: 500, enabledSets: [...ALL_SET_IDS], playerIds: TEST_PLAYER_NAMES });
    expect(inputs).toHaveLength(500);
    const created = Timestamp.now();
    for (const input of inputs) {
      const g = buildGame('test', input, created);
      expect(g.isTestData).toBe(true);
      expect(g.allProtocols).toHaveLength(6);
      const winner = g.winner === 'p1' ? g.p1 : g.p2;
      const loser = g.winner === 'p1' ? g.p2 : g.p1;
      expect(winner.compiled).toEqual(winner.protocols);
      expect(loser.compiled.length).toBeLessThanOrEqual(2);
      for (const c of loser.compiled) expect(loser.protocols).toContain(c);
      expect(g.p1.playerId).not.toBe(g.p2.playerId);
    }
  });

  it('only draws protocols from the enabled sets and sorts output by date', () => {
    const inputs = generateGames({ ...base, enabledSets: ['MN02', 'AX02'], games: 200 });
    const allowed = new Set(protocolsInSets(['MN02', 'AX02']).map((p) => p.id));
    for (const g of inputs) for (const p of [...g.p1.protocols, ...g.p2.protocols]) expect(allowed.has(p)).toBe(true);
    for (let i = 1; i < inputs.length; i++) expect(inputs[i].playedAt.getTime()).toBeGreaterThanOrEqual(inputs[i - 1].playedAt.getTime());
  });

  it('keeps dates inside the window and biases toward recent weeks', () => {
    const days = 200;
    const inputs = generateGames({ ...base, games: 2000, days });
    const lo = now.getTime() - days * 86_400_000;
    let recent = 0;
    for (const g of inputs) {
      const t = g.playedAt.getTime();
      expect(t).toBeGreaterThanOrEqual(lo);
      expect(t).toBeLessThanOrEqual(now.getTime());
      if (now.getTime() - t <= 42 * 86_400_000) recent++;
    }
    // 42/200 = 21% uniform share plus the 30% recent boost → clearly more than uniform.
    expect(recent / inputs.length).toBeGreaterThan(0.35);
    // default window is 540 days
    const wide = generateGames({ ...base, games: 500 });
    const oldest = Math.min(...wide.map((g) => g.playedAt.getTime()));
    expect(oldest).toBeGreaterThanOrEqual(now.getTime() - 540 * 86_400_000);
    expect(oldest).toBeLessThan(now.getTime() - 300 * 86_400_000);
  });

  it('sets firstPlayer in roughly 85% of games', () => {
    const inputs = generateGames({ ...base, games: 2000 });
    const known = inputs.filter((g) => g.firstPlayer).length / inputs.length;
    expect(known).toBeGreaterThan(0.8);
    expect(known).toBeLessThan(0.9);
    expect(inputs.some((g) => g.firstPlayer === 'p1')).toBe(true);
    expect(inputs.some((g) => g.firstPlayer === 'p2')).toBe(true);
  });

  it('uses all players, favouring lower indexes, and biases outcomes by strength', () => {
    const inputs = generateGames({ ...base, games: 3000, enabledSets: [...ALL_SET_IDS] });
    const counts = new Map<string, number>();
    for (const g of inputs) for (const pid of [g.p1.playerId, g.p2.playerId]) counts.set(pid, (counts.get(pid) ?? 0) + 1);
    expect([...counts.keys()].sort()).toEqual([...players].sort());
    expect(counts.get('pa')!).toBeGreaterThan(counts.get('pd')!);

    const agg = aggregate(docsFromInputs(inputs));
    const rows = protocolWinRate(agg);
    const rateOf = (id: string) => rows.find((r) => r.id === id)!.rate;
    expect(rateOf('fire')).toBeGreaterThan(rateOf('apathy'));
    expect(rateOf('speed')).toBeGreaterThan(rateOf('inert'));
    expect(agg.firstPlayerWins / agg.firstPlayerKnown).toBeGreaterThan(0.5);
    expect(agg.byPlayer.pa.wins / agg.byPlayer.pa.games).toBeGreaterThan(agg.byPlayer.pd.wins / agg.byPlayer.pd.games);
    // Loser compiled counts cover the whole 0–2 range.
    expect(agg.loserCompiledHist.every((n) => n > 0)).toBe(true);
  });

  it('throws when fewer than 6 protocols or 2 players are available', () => {
    expect(() => generateGames({ ...base, enabledSets: ['AX01'] })).toThrow(/at least 6 protocols/);
    expect(() => generateGames({ ...base, enabledSets: [] })).toThrow(/at least 6 protocols/);
    expect(() => generateGames({ ...base, playerIds: ['solo'] })).toThrow(/at least 2 distinct/);
    expect(() => generateGames({ ...base, playerIds: ['x', 'x'] })).toThrow(/at least 2 distinct/);
  });

  it('works with exactly 6 protocols and 2 players', () => {
    const inputs = generateGames({ ...base, enabledSets: ['AX01', 'AX02'], playerIds: ['x', 'y'], games: 50 });
    expect(inputs).toHaveLength(50);
    for (const g of inputs) {
      expect(new Set([...g.p1.protocols, ...g.p2.protocols]).size).toBe(6);
      expect(new Set([g.p1.playerId, g.p2.playerId])).toEqual(new Set(['x', 'y']));
    }
  });

  it('defaults `now` to the current time', () => {
    const before = Date.now();
    const inputs = generateGames({ ...base, now: undefined, games: 20, days: 1 });
    for (const g of inputs) expect(g.playedAt.getTime()).toBeLessThanOrEqual(Date.now());
    for (const g of inputs) expect(g.playedAt.getTime()).toBeGreaterThanOrEqual(before - 86_400_000 - 1000);
  });
});
