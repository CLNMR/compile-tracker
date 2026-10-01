import { describe, expect, it } from 'vitest';
import { rate, wilsonLower } from './wilson';

describe('rate', () => {
  it('divides and guards against zero', () => {
    expect(rate(3, 4)).toBe(0.75);
    expect(rate(0, 0)).toBe(0);
    expect(rate(5, 0)).toBe(0);
  });
});

describe('wilsonLower', () => {
  it('matches known values at z = 1.96', () => {
    expect(wilsonLower(0, 0)).toBe(0);
    expect(wilsonLower(1, 1)).toBeCloseTo(0.2065, 3);
    expect(wilsonLower(10, 10)).toBeCloseTo(0.7225, 3);
    expect(wilsonLower(8, 10)).toBeCloseTo(0.4902, 3);
    expect(wilsonLower(50, 100)).toBeCloseTo(0.4038, 3);
    expect(wilsonLower(0, 10)).toBe(0);
  });

  it('is conservative for small samples and converges with n', () => {
    expect(wilsonLower(1, 1)).toBeLessThan(wilsonLower(8, 10));
    expect(wilsonLower(80, 100)).toBeGreaterThan(wilsonLower(8, 10));
    expect(wilsonLower(8000, 10000)).toBeGreaterThan(0.79);
    expect(wilsonLower(8000, 10000)).toBeLessThan(0.8);
    expect(wilsonLower(8, 10)).toBeLessThanOrEqual(0.8);
  });

  it('accepts a custom z', () => {
    expect(wilsonLower(8, 10, 0)).toBeCloseTo(0.8, 10);
    expect(wilsonLower(8, 10, 2.58)).toBeLessThan(wilsonLower(8, 10, 1.96));
  });
});
