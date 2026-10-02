import { describe, expect, it } from 'vitest';
import { detectSource } from './source';

const base = { search: '', referrer: '', standalone: false, ownHost: 'compile-tracker-cln.web.app' };

describe('detectSource', () => {
  it('prefers the utm_source tag', () => {
    expect(detectSource({ ...base, search: '?utm_source=reddit&utm_medium=social' })).toBe('reddit');
    expect(detectSource({ ...base, search: '?utm_source=BGG' })).toBe('bgg');
    expect(detectSource({ ...base, search: '?utm_source=pwa', standalone: true })).toBe('pwa');
    expect(detectSource({ ...base, search: '?utm_source=newsletter', referrer: 'https://www.reddit.com/' })).toBe('other');
  });

  it('counts installed-app launches without a tag as pwa', () => {
    expect(detectSource({ ...base, standalone: true, referrer: 'https://www.reddit.com/' })).toBe('pwa');
  });

  it('maps referrer hosts', () => {
    expect(detectSource({ ...base, referrer: 'https://www.reddit.com/r/compile/comments/x' })).toBe('reddit');
    expect(detectSource({ ...base, referrer: 'https://out.reddit.com/t3_abc' })).toBe('reddit');
    expect(detectSource({ ...base, referrer: 'https://boardgamegeek.com/thread/1' })).toBe('bgg');
    expect(detectSource({ ...base, referrer: 'https://www.google.de/' })).toBe('search');
    expect(detectSource({ ...base, referrer: 'https://t.co/abc' })).toBe('social');
    expect(detectSource({ ...base, referrer: 'https://example.org/blog' })).toBe('other');
  });

  it('treats missing, own or garbage referrers as direct', () => {
    expect(detectSource(base)).toBe('direct');
    expect(detectSource({ ...base, referrer: 'https://compile-tracker-cln.web.app/stats' })).toBe('direct');
    expect(detectSource({ ...base, referrer: 'not a url' })).toBe('direct');
  });
});
