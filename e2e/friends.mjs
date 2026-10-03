// Two-account friends flow against the dev server in emulator mode.
//   1) firebase emulators:start --only auth,firestore
//   2) npm run dev:emu
//   3) node e2e/friends.mjs [outDir]
// Alice and Bob link fake Google accounts (Auth emulator popup), claim handles, become friends,
// and Bob reviews the games Alice offers him. Seeds players and past games through the emulator REST API.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const PROJECT = process.env.PROJECT_ID ?? 'compile-tracker-cln';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const RUN = Date.now().toString(36);
const A = `alice_${RUN}`;
const B = `bob_${RUN}`;
const OUT = process.argv[2] ?? 'e2e/out-friends';
mkdirSync(OUT, { recursive: true });

const problems = [];
const step = (s) => console.log('>', s);
/** Waits for the locator to become visible (isVisible() does not wait). */
const seen = (locator, timeout = 10_000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
const check = (ok, msg) => {
  if (!ok) problems.push(msg);
  console.log(ok ? '  ✓' : '  ✗', msg);
};

/* ---------- emulator REST (owner bypasses rules) ---------- */

const val = (v) =>
  v === null ? { nullValue: null }
  : typeof v === 'string' ? { stringValue: v }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? { integerValue: String(v) }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : Array.isArray(v) ? { arrayValue: { values: v.map(val) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };

async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: val(data).mapValue.fields }),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`);
}

async function get(path) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  return res.ok ? res.json() : null;
}

const game = (owner, winnerId, loserId, day) => {
  const playedAt = new Date(`2026-09-${day}T18:00:00Z`);
  return {
    schemaVersion: 1,
    ownerUid: owner,
    playedAt,
    yearMonth: '2026-09',
    p1: { playerId: winnerId, protocols: ['fire', 'plague', 'speed'], compiled: ['fire', 'plague', 'speed'] },
    p2: { playerId: loserId, protocols: ['darkness', 'life', 'water'], compiled: ['life'] },
    winner: 'p1',
    allProtocols: ['darkness', 'fire', 'life', 'plague', 'speed', 'water'],
    isTestData: false,
    createdAt: playedAt,
  };
};

/* ---------- browser ---------- */

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function user(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ERR_BLOCKED_BY_CLIENT/.test(m.text())) problems.push(`${name} console: ${m.text()}`);
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/${name}-${n}.png`, fullPage: true });

  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  const linkBtn = page.getByRole('button', { name: /link google account/i });
  await linkBtn.waitFor({ timeout: 30_000 });
  const [popup] = await Promise.all([ctx.waitForEvent('page'), linkBtn.click()]);
  await popup.waitForLoadState('domcontentloaded');
  await popup.getByText(/add new account/i).click();
  await popup.locator('#email-input').fill(`${name.toLowerCase()}-${RUN}@example.com`);
  await popup.locator('#display-name-input').fill(name);
  await popup.getByRole('button', { name: /sign in with google/i }).click();
  await page.getByText(/linked|google/i).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  const uid = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const name = dbs.find((d) => d.name?.startsWith('firebaseLocalStorageDb'))?.name;
    if (!name) return null;
    return new Promise((resolve) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => {
        const tx = req.result.transaction('firebaseLocalStorage', 'readonly');
        const all = tx.objectStore('firebaseLocalStorage').getAll();
        all.onsuccess = () => resolve(all.result.find((r) => r.value?.uid)?.value.uid ?? null);
      };
    });
  });
  return { page, ctx, shot, uid };
}

async function claimHandle(u, handle) {
  await u.page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  const field = u.page.getByLabel('Your handle');
  await field.waitFor({ timeout: 15_000 });
  await field.fill(handle);
  await u.page.getByRole('button', { name: /^claim$/i }).click();
  await u.page.getByText(`@${handle}`, { exact: true }).first().waitFor({ timeout: 10_000 });
}

try {
  step('Alice and Bob link Google');
  const alice = await user('Alice');
  const bob = await user('Bob');
  check(!!alice.uid && !!bob.uid && alice.uid !== bob.uid, `two real accounts (${alice.uid}, ${bob.uid})`);

  step('seed players and two past games for Alice');
  const now = new Date();
  await put(`users/${alice.uid}`, { enabledSets: ['MN01'], defaultPlayerId: 'aliceMeAAAAAAAAAAAAA' });
  await put(`users/${alice.uid}/players/aliceMeAAAAAAAAAAAAA`, { name: 'Alice', createdAt: now, archived: false });
  await put(`users/${alice.uid}/players/aliceBobAAAAAAAAAAAA`, { name: 'Bobby', createdAt: now, archived: false });
  await put(`games/past1`, game(alice.uid, 'aliceMeAAAAAAAAAAAAA', 'aliceBobAAAAAAAAAAAA', '20'));
  await put(`games/past2`, game(alice.uid, 'aliceBobAAAAAAAAAAAA', 'aliceMeAAAAAAAAAAAAA', '21'));
  await put(`users/${bob.uid}`, { enabledSets: ['MN01'], defaultPlayerId: 'bobMeBBBBBBBBBBBBBBB' });
  await put(`users/${bob.uid}/players/bobMeBBBBBBBBBBBBBBB`, { name: 'Bob', createdAt: now, archived: false });
  await put(`users/${bob.uid}/players/bobAliceBBBBBBBBBBBB`, { name: 'Ali', createdAt: now, archived: false });

  step('claim handles');
  await claimHandle(alice, A);
  await claimHandle(bob, B);
  await alice.shot('01-handle');

  step('QR dialog renders');
  await alice.page.getByRole('button', { name: /show qr/i }).click();
  await alice.page.locator('[role="img"] svg').waitFor({ timeout: 10_000 }).catch(() => problems.push('QR svg not rendered'));
  await alice.shot('02-qr');
  await alice.page.keyboard.press('Escape');

  step('errors: unknown handle, own handle');
  const addField = alice.page.getByLabel('Add a friend by handle');
  await addField.fill('nobody_here');
  await alice.page.getByRole('button', { name: /^add$/i }).click();
  check(await seen(alice.page.getByText('No account with this handle.')), 'unknown handle error');
  await addField.fill(A);
  await alice.page.getByRole('button', { name: /^add$/i }).click();
  check(await seen(alice.page.getByText('That is your own handle.')), 'own handle error');

  step('Alice adds @bob and links him to her player "Bobby"');
  await addField.fill(`@${B.toUpperCase()}`);
  await alice.page.getByRole('button', { name: /^add$/i }).click();
  const dialog = alice.page.getByRole('dialog', { name: /add friend/i });
  await dialog.waitFor({ timeout: 10_000 });
  await dialog.getByRole('combobox').click();
  await alice.page.getByRole('option', { name: 'Bobby' }).click();
  await alice.shot('03-add-dialog');
  await dialog.getByRole('button', { name: /^add friend$/i }).click();
  check(await seen(alice.page.getByText(`2 games offered to @${B}`)), 'toast: 2 past games offered');
  check(await seen(alice.page.getByText('is Bobby in your games')), 'friend row shows link');
  await alice.shot('04-friend-added');

  step('Bob sees Alice automatically and links her to "Ali"');
  await bob.page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  await bob.page.getByText(`@${A}`, { exact: true }).waitFor({ timeout: 10_000 }).catch(() => problems.push('Bob: @alice not in friend list'));
  await bob.page.getByRole('button', { name: /link player/i }).click();
  const link = bob.page.getByRole('dialog', { name: new RegExp(`link @${A}`, 'i') });
  await link.getByRole('combobox').click();
  await bob.page.getByRole('option', { name: 'Ali' }).click();
  await link.getByRole('button', { name: /^save$/i }).click();
  check(await seen(bob.page.getByText('is Ali in your games')), 'Bob linked Alice to Ali');
  await bob.shot('04b-linked');

  step('Bob reviews offers');
  const badge = await bob.page.locator('nav a[href="/games"] [aria-label]').first().textContent().catch(() => null);
  check(badge === '2', `nav badge shows 2 (got ${badge})`);
  await bob.page.goto(`${BASE}/games/offers`, { waitUntil: 'domcontentloaded' });
  await bob.page.getByRole('button', { name: /^accept$/i }).first().waitFor({ timeout: 10_000 });
  await bob.shot('05-offers');
  const cards = await bob.page.locator('main li').allTextContents();
  check(cards.some((c) => c.includes('Bob') && c.includes('Ali')), 'offered cards show my names (Bob vs Ali)');
  await bob.page.getByRole('button', { name: /^accept$/i }).first().click();
  await bob.page.waitForTimeout(800);
  await bob.page.getByRole('button', { name: /^decline$/i }).first().click();
  await bob.page.waitForTimeout(800);
  const offers = (await get(`users/${bob.uid}/offers/past1`))?.fields?.status?.stringValue + '/' + (await get(`users/${bob.uid}/offers/past2`))?.fields?.status?.stringValue;
  check(offers === 'accepted/declined' || offers === 'declined/accepted', `decisions stored (${offers})`);
  await bob.shot('06-offers-decided');

  step("Bob's own stats include the accepted game");
  await bob.page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  await bob.page.waitForTimeout(1000);
  const bobRow = await bob.page.locator('li', { has: bob.page.getByText('Bob', { exact: true }) }).first().textContent();
  check(/[01]–[01]/.test(bobRow ?? '') && !/0–0/.test(bobRow ?? ''), `Bob's record counts 1 game (${bobRow?.replace(/\s+/g, ' ').slice(0, 60)})`);
  await bob.shot('07-bob-players');

  step('Alice records a new game vs Bobby in the wizard → offered');
  const ap = alice.page;
  await ap.goto(`${BASE}/games/new`, { waitUntil: 'domcontentloaded' });
  await ap.getByRole('combobox', { name: /player 2/i }).click();
  await ap.getByRole('option', { name: 'Bobby' }).click();
  await ap.getByRole('button', { name: /next|continue/i }).first().click();
  const pcards = ap.locator('button[aria-pressed]');
  const n = await pcards.count();
  const half = Math.floor(n / 2);
  for (const [start, end] of [[0, half], [half, n]]) {
    let picked = 0;
    for (let i = start; i < end && picked < 3; i++) {
      if (await pcards.nth(i).isEnabled()) {
        await pcards.nth(i).click();
        picked++;
      }
    }
  }
  await ap.getByRole('button', { name: /next|continue|result/i }).first().click();
  await ap.waitForTimeout(300);
  const rc = ap.locator('section[aria-label$="result"]').first().locator('button');
  for (let i = 0; i < 3; i++) await rc.nth(i).click();
  await ap.getByRole('button', { name: /compile game/i }).first().click();
  await ap.waitForTimeout(1500);
  await alice.shot('07b-saved');
  check(await seen(ap.getByText('Offered to your friend')), 'toast: new game offered');
  await ap.waitForURL(/\/games\/[^/]+$/, { timeout: 10_000 }).catch(() => {});
  await bob.page.goto(`${BASE}/games/offers`, { waitUntil: 'domcontentloaded' });
  check(await seen(bob.page.getByRole('button', { name: /^accept$/i }).first()), 'Bob sees the new offer');

  step('Alice removes Bob; Bob keeps the accepted game');
  await ap.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  await ap.getByRole('button', { name: /remove friend/i }).click();
  await alice.shot('07c-remove');
  await ap.getByRole('dialog').getByRole('button', { name: /^remove$/i }).click();
  check(await seen(ap.getByText('no friends yet.')), 'Alice: friend list empty');
  await bob.page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  check(await seen(bob.page.getByText('no friends yet.')), 'Bob: friend list empty');
  check(await bob.page.getByRole('link', { name: /review/i }).count() === 0, 'pending offers from ex-friend hidden');
  const accepted = await get(`users/${bob.uid}/offers/past1`);
  check(!!accepted, 'accepted offer kept');

  step('deep link /add/bob opens the add dialog for Alice');
  await ap.goto(`${BASE}/add/${B}`, { waitUntil: 'domcontentloaded' });
  check(await seen(ap.getByRole('dialog', { name: /add friend/i })), 'deep link → add dialog');
  await alice.shot('08-deeplink');
} catch (e) {
  problems.push(`fatal: ${e.message}`);
} finally {
  await browser.close();
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\n0 problems');
process.exit(problems.length ? 1 : 0);
