/**
 * Privacy policy and imprint. Bodies are plain text: blank line = new paragraph, "• " lines = list items.
 * The operator block (name, address, email) is rendered by the page, not part of these strings.
 */
export const legal = {
  links: {
    privacy: 'Privacy policy',
    imprint: 'Imprint',
  },
  updated: 'Last updated: {date}',
  missingOperator: 'operator details missing — set VITE_LEGAL_NAME, VITE_LEGAL_ADDRESS and VITE_LEGAL_EMAIL',
  german: 'The German version is authoritative.',
  email: 'Email',

  privacy: {
    title: 'Privacy policy',
    controller: {
      title: 'Who is responsible',
      body: 'Responsible for the processing of personal data in this app (controller under Art. 4(7) GDPR):',
    },
    overview: {
      title: 'In short',
      body: 'Compile Tracker is a free, non-commercial fan app for recording games of the card game Compile. There is no advertising, no data is sold, and nothing is tracked across other websites. Google Analytics only runs if you allow it.',
    },
    hosting: {
      title: 'Hosting and server logs',
      body: 'The app is hosted on Firebase Hosting by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. When you open the app, the servers process technical data that every browser sends: IP address, time of the request, requested address, referring page, browser and operating system. This is necessary to deliver the app and keep it secure (Art. 6(1)(f) GDPR).\n\nGoogle may also process data in the USA. Google LLC is certified under the EU–US Data Privacy Framework, for which the EU Commission has issued an adequacy decision (Art. 45 GDPR).',
    },
    account: {
      title: 'Sign-in',
      body: 'On your first visit, Firebase Authentication (Google) creates a random, anonymous user id and keeps you signed in on this device. No name or email is needed for that.\n\nIf you choose to link a Google account in Settings, Google passes your Google account id, email address, name and profile picture to Firebase Authentication. We use this only to sign you in on your devices; it is not stored in the game database and is never shown to other users.\n\nLegal basis: Art. 6(1)(b) GDPR (providing the app you use).',
    },
    data: {
      title: 'Games, players and settings',
      body: 'The app stores what you enter in Cloud Firestore (Google), in the Frankfurt region (europe-west3):\n• Games: protocols, which protocols were compiled, winner, first player, date.\n• Players: the names you give them, plus your settings (enabled sets, default player).\n\nPlayer names and settings are only visible to you. Games are visible to all users so the shared statistics can be computed, but without names: other users only see Alpha/Beta or a pseudonym such as "P-3F9A".\n\nLegal basis: Art. 6(1)(b) GDPR. The data is kept until you delete it in the app, or ask us to delete it.',
    },
    device: {
      title: 'Storage on your device',
      body: 'The app stores the following on your device so that it works, also offline:\n• Your sign-in session and an offline copy of the data (IndexedDB).\n• Your language choice, your analytics choice and an unfinished game draft (local and session storage).\n• The app files, for offline use and installation (service worker cache).\n\nThis is strictly necessary for the service you requested (§ 25(2) no. 2 TDDDG), so no consent is needed. You can remove it at any time by clearing the site data in your browser. You will then lose access to anonymous data that is not linked to a Google account.',
    },
    counters: {
      title: 'Anonymous usage counts',
      body: 'To find out where users come from, the app adds 1 to a daily counter for each of these events: a visit, a new anonymous user, a saved game, a linked Google account. Each count is stored per source (e.g. Reddit, BoardGameGeek, installed app, search engine), which is taken from the tag in the link you followed or from the referring website. No user id, IP address or device id is stored with the counters.\n\nLegal basis: Art. 6(1)(f) GDPR. Our legitimate interest is knowing which channels bring players to the app.',
    },
    cloudflare: {
      title: 'Cloudflare Web Analytics',
      body: 'We use Cloudflare Web Analytics by Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA, to count page views. It records the page, the referring website, browser, operating system, device type, country and loading times. According to Cloudflare it sets no cookies, uses no local storage and does no fingerprinting. Your IP address is used to determine the country but is not stored.\n\nLegal basis: Art. 6(1)(f) GDPR. Our legitimate interest is a privacy-friendly measurement of how much the app is used. Cloudflare, Inc. is certified under the EU–US Data Privacy Framework.',
    },
    ga: {
      title: 'Google Analytics (only with your consent)',
      body: 'If you allow it, the app uses Google Analytics 4 by Google Ireland Limited to understand how it is used. Google Analytics sets cookies (_ga, _ga_…) that are kept for up to 2 years, and records:\n• the pages you open and the source of your visit (link tags, referring website),\n• app events: game saved, player created, Google account linked, app installed,\n• device, browser, screen size, language and approximate location (derived from the IP address; Google Analytics 4 does not store IP addresses).\n\nAdvertising features are turned off. Event data is deleted after 14 months at the latest. Data may be transferred to Google LLC in the USA, which is certified under the EU–US Data Privacy Framework.\n\nLegal basis: your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG). You can withdraw it at any time in Settings → Privacy, with effect for the future. The app then removes the Google Analytics cookies.',
    },
    other: {
      title: 'Fonts and other resources',
      body: 'Fonts and icons are part of the app itself. Apart from the services listed here, no external content is loaded.',
    },
    rights: {
      title: 'Your rights',
      body: 'You have the right to:\n• access your data (Art. 15 GDPR),\n• have it corrected (Art. 16) or deleted (Art. 17),\n• restrict its processing (Art. 18),\n• receive it in a portable format (Art. 20),\n• object to processing based on legitimate interests (Art. 21),\n• withdraw your consent at any time (Art. 7(3)).\n\nTo do so, email us at the address above. You can also complain to a data protection supervisory authority (Art. 77 GDPR), for example in the place where you live.',
    },
    changes: {
      title: 'Changes',
      body: 'We update this policy when the app changes. The current version is always available in the app.',
    },
  },

  imprint: {
    title: 'Imprint',
    provider: {
      title: 'Provider',
      body: 'Information according to § 5 DDG:',
    },
    project: {
      title: 'About this project',
      body: 'Compile Tracker is a private, non-commercial fan project. Compile is a game by Michael Yang, published by Greater Than Games. This app is not affiliated with or endorsed by them; all trademarks belong to their owners.',
    },
    liability: {
      title: 'Liability',
      body: 'The content of this app was created with care, but we cannot guarantee that it is correct, complete or up to date. Statistics are computed from games entered by users. We are not responsible for the content of external websites we link to; their operators are.',
    },
  },
} as const;
