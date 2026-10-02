/** Consent banner and the Privacy panel in Settings. */
export const privacy = {
  banner: {
    title: 'Analytics',
    body: 'May we use Google Analytics to see where visitors come from and which features get used? It sets cookies. No ads, no player names. You can change this any time in Settings.',
    accept: 'Allow',
    decline: 'Decline',
  },
  settings: {
    title: 'Privacy',
    ga: 'Google Analytics',
    gaDesc: 'Sessions, traffic sources and feature use. Sets cookies; no ads.',
    status: {
      granted: 'analytics: allowed on this device',
      denied: 'analytics: declined on this device',
      unset: 'analytics: not decided yet',
    },
    cookieFree:
      'Always on and cookie-free: anonymous daily counts of visits, new users and saved games per source (e.g. Reddit), plus Cloudflare page-view statistics. No names, no device ids.',
  },
} as const;
