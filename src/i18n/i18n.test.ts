import { describe, expect, it } from 'vitest';
import { PROTOCOLS } from '@/data/protocols';
import { localeFromBrowser, matchLocale } from './locale';
import { MESSAGES } from './messages';
import { PROTOCOL_NAMES_DE, protocolName, sortByProtocolName } from './names';
import { interpolate, translate } from './translate';
import { formatPercent, formatYearMonth } from './format';

describe('locale detection', () => {
  it('maps BCP-47 tags onto supported locales', () => {
    expect(matchLocale('de')).toBe('de');
    expect(matchLocale('de-AT')).toBe('de');
    expect(matchLocale('DE_CH')).toBe('de');
    expect(matchLocale('en-GB')).toBe('en');
    expect(matchLocale('fr')).toBeNull();
    expect(matchLocale(undefined)).toBeNull();
  });

  it('takes the first supported browser language and falls back to English', () => {
    expect(localeFromBrowser(['fr-FR', 'de-DE', 'en-US'])).toBe('de');
    expect(localeFromBrowser(['fr-FR', 'it'])).toBe('en');
    expect(localeFromBrowser([])).toBe('en');
  });
});

describe('translate', () => {
  it('interpolates placeholders and formats numbers per locale', () => {
    expect(interpolate('{a} of {b}', { a: 1, b: 1234 }, 'en')).toBe('1 of 1,234');
    expect(interpolate('{a} von {b}', { a: 1, b: 1234 }, 'de')).toBe('1 von 1.234');
    expect(interpolate('{missing} stays', {}, 'en')).toBe('{missing} stays');
  });

  it('selects plural forms by count', () => {
    expect(translate('en', 'common.game.games', { count: 1 })).toBe('1 game');
    expect(translate('en', 'common.game.games', { count: 2 })).toBe('2 games');
    expect(translate('de', 'common.game.games', { count: 1 })).toBe('1 Spiel');
    expect(translate('de', 'common.game.games', { count: 0 })).toBe('0 Spiele');
  });

  it('translates into German', () => {
    expect(translate('de', 'common.actions.save')).toBe('Speichern');
    expect(translate('en', 'common.actions.save')).toBe('Save');
  });
});

/** Walk a catalogue; yields [dottedKey, leaf]. */
function* leaves(node: unknown, prefix = ''): Generator<[string, string]> {
  if (typeof node === 'string') {
    yield [prefix, node];
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) yield* leaves(v, prefix ? `${prefix}.${k}` : k);
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalogue parity (en ↔ de)', () => {
  const en = new Map(leaves(MESSAGES.en));
  const de = new Map(leaves(MESSAGES.de));

  it('has the same keys in both languages', () => {
    expect([...de.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('has no empty German strings', () => {
    const empty = [...de].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('uses the same placeholders in both languages', () => {
    const mismatched = [...en].filter(([k, v]) => {
      const d = de.get(k);
      return d !== undefined && placeholders(v).join() !== placeholders(d).join();
    });
    expect(mismatched.map(([k]) => k)).toEqual([]);
  });

  it('pairs every plural _one with an _other', () => {
    const orphan = [...en.keys()].filter((k) => k.endsWith('_one') && !en.has(k.replace(/_one$/, '_other')));
    expect(orphan).toEqual([]);
  });
});

describe('protocol names', () => {
  it('has a German name for every protocol', () => {
    const missing = PROTOCOLS.filter((p) => !PROTOCOL_NAMES_DE[p.id]);
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it('German names are unique', () => {
    const names = Object.values(PROTOCOL_NAMES_DE);
    expect(new Set(names).size).toBe(names.length);
  });

  it('resolves by id or definition and falls back for unknown ids', () => {
    expect(protocolName('fire', 'en')).toBe('Fire');
    expect(protocolName('fire', 'de')).toBe('Feuer');
    expect(protocolName(PROTOCOLS[0], 'de')).toBe('Dunkelheit');
    expect(protocolName('bogus', 'de')).toBe('bogus');
  });

  it('sorts by the localized name', () => {
    const ids = ['water', 'fire', 'speed'];
    expect(sortByProtocolName(ids, 'en')).toEqual(['fire', 'speed', 'water']);
    // Feuer, Geschwindigkeit, Wasser
    expect(sortByProtocolName(ids, 'de')).toEqual(['fire', 'speed', 'water']);
    expect(sortByProtocolName(['life', 'gravity'], 'de')).toEqual(['life', 'gravity']); // Leben < Schwerkraft
  });
});

describe('formatting', () => {
  it('formats percentages per locale', () => {
    expect(formatPercent(0.5321, 'en')).toBe('53.2%');
    expect(formatPercent(0.5321, 'de')).toMatch(/^53,2\s?%$/);
  });

  it('formats year-month keys', () => {
    expect(formatYearMonth('2026-03', 'en', { month: 'long', year: 'numeric' })).toBe('March 2026');
    expect(formatYearMonth('2026-03', 'de', { month: 'long', year: 'numeric' })).toBe('März 2026');
    expect(formatYearMonth('garbage', 'en')).toBe('garbage');
  });
});
