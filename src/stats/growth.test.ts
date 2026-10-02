import { describe, expect, it } from 'vitest';
import { mkGame } from '@/test/fixtures';
import { daysBetween, dayKey, gameActivity, parseCounterId, summarizeCounters, type CounterRow } from './growth';

describe('day helpers', () => {
  it('formats UTC days and fills ranges', () => {
    expect(dayKey(Date.UTC(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(daysBetween('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(daysBetween('2026-10-02', '2026-10-01')).toEqual([]);
  });

  it('parses counter ids', () => {
    expect(parseCounterId('visit_reddit')).toEqual({ kind: 'visit', source: 'reddit' });
    expect(parseCounterId('newUser_pwa')).toEqual({ kind: 'newUser', source: 'pwa' });
    expect(parseCounterId('bogus_reddit')).toBeNull();
    expect(parseCounterId('visit')).toBeNull();
  });
});

describe('summarizeCounters', () => {
  const rows: CounterRow[] = [
    { day: '2026-10-01', kind: 'visit', source: 'reddit', n: 10 },
    { day: '2026-10-02', kind: 'visit', source: 'reddit', n: 5 },
    { day: '2026-10-02', kind: 'game', source: 'reddit', n: 2 },
    { day: '2026-10-02', kind: 'visit', source: 'bgg', n: 7 },
    { day: '2026-10-02', kind: 'newUser', source: 'bgg', n: 4 },
    { day: '2026-09-01', kind: 'visit', source: 'direct', n: 99 }, // outside the window
  ];

  it('totals per source, sorted by visits', () => {
    const { sources, totals } = summarizeCounters(rows, '2026-10-01', '2026-10-03');
    expect(sources.map((s) => s.source)).toEqual(['reddit', 'bgg']);
    expect(sources[0]).toEqual({ source: 'reddit', visit: 15, newUser: 0, game: 2, link: 0 });
    expect(totals).toEqual({ visit: 22, newUser: 4, game: 2, link: 0 });
  });

  it('builds a gap-free daily series', () => {
    const { days } = summarizeCounters(rows, '2026-10-01', '2026-10-03');
    expect(days.map((d) => [d.day, d.visit])).toEqual([
      ['2026-10-01', 10],
      ['2026-10-02', 12],
      ['2026-10-03', 0],
    ]);
  });
});

describe('gameActivity', () => {
  const at = (d: number) => new Date(2026, 9, d, 12);
  const games = [
    mkGame({ ownerUid: 'old', playedAt: at(1) }),
    mkGame({ ownerUid: 'old', playedAt: at(5) }),
    mkGame({ ownerUid: 'new', playedAt: at(6), p1: { playerId: 'alpha' }, p2: { playerId: 'beta' } }),
    mkGame({ ownerUid: 'tester', playedAt: at(6), isTestData: true }),
  ];

  it('counts games, guests, active and new owners in the window; ignores test data', () => {
    const r = gameActivity(games, at(4).getTime(), at(8).getTime());
    expect(r).toEqual({ games: 2, guestGames: 1, activeOwners: 2, newOwners: 1, allOwners: 2 });
  });
});
