/** Plain proportion; 0 when there are no trials. */
export function rate(wins: number, n: number): number {
  return n > 0 ? wins / n : 0;
}

/**
 * Lower bound of the Wilson score interval. Ranks small samples conservatively:
 * 1/1 scores lower than 8/10. Returns 0 for n = 0.
 */
export function wilsonLower(wins: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (centre - margin) / denom);
}
