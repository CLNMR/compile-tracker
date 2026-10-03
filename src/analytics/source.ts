/** Where a visit came from. Fixed list: the Firestore rules whitelist exactly these for the counters. */
export const SOURCES = ['reddit', 'bgg', 'pwa', 'search', 'social', 'other', 'direct'] as const;
export type Source = (typeof SOURCES)[number];

/** `utm_source` values (lowercased) → source. Anything else that is tagged counts as `other`. */
const UTM_ALIASES: Readonly<Record<string, Source>> = {
  reddit: 'reddit',
  bgg: 'bgg',
  boardgamegeek: 'bgg',
  pwa: 'pwa',
  homescreen: 'pwa',
};

const REFERRERS: readonly [RegExp, Source][] = [
  [/(^|\.)(reddit\.com|redd\.it)$/, 'reddit'],
  [/(^|\.)boardgamegeek\.com$/, 'bgg'],
  [/(^|\.)(google|bing|duckduckgo|ecosia|yahoo|startpage|qwant|brave)\.[a-z.]+$/, 'search'],
  [/(^|\.)(facebook\.com|instagram\.com|t\.co|twitter\.com|x\.com|discord\.com|discord\.gg|bsky\.app|youtube\.com|whatsapp\.com|threads\.net)$/, 'social'],
];

export interface SourceInput {
  /** `location.search` of the landing page. */
  search: string;
  /** `document.referrer`; often empty (in-app browsers, privacy settings). */
  referrer: string;
  /** Launched as installed app. */
  standalone: boolean;
  /** Our own hosts (main domain and the Firebase default domains), so internal referrers count as direct. */
  ownHosts: readonly string[];
}

/** Order: explicit `utm_source` tag → installed app → referrer host → direct. */
export function detectSource({ search, referrer, standalone, ownHosts }: SourceInput): Source {
  const utm = new URLSearchParams(search).get('utm_source')?.trim().toLowerCase();
  if (utm) return UTM_ALIASES[utm] ?? 'other';
  if (standalone) return 'pwa';
  let host = '';
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
  } catch {
    host = '';
  }
  if (!host || ownHosts.includes(host)) return 'direct';
  for (const [re, source] of REFERRERS) if (re.test(host)) return source;
  return 'other';
}
