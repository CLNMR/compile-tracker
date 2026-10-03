// Headless smoke test against the dev server in emulator mode.
//   1) npm run emulators  (or: firebase emulators:start --only auth,firestore)
//   2) npm run dev:emu
//   3) node e2e/smoke.mjs [outDir]
// Uses the locally installed Google Chrome (no browser download).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'e2e/out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();

const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|ERR_BLOCKED_BY_CLIENT/.test(m.text())) problems.push(`console: ${m.text()}`);
});

const shot = async (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const step = (s) => console.log('>', s);

try {
  step('boot');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /new game/i }).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await shot('01-home-empty');

  step('guest: no players page / nav item');
  if (await page.getByRole('link', { name: /^players$/i }).count()) problems.push('guest: Players link visible');
  await page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(`${BASE}/`, { timeout: 10_000 }).catch(() => problems.push('guest: /players did not redirect to /'));

  step('wizard: new game (Alpha vs Beta, starts at protocols)');
  await page.goto(`${BASE}/games/new`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Alpha', { exact: true }).first().waitFor({ timeout: 10_000 }).catch(() => problems.push('wizard: Alpha side missing'));
  if (await page.getByRole('combobox', { name: /player 1/i }).count()) problems.push('wizard: guest sees player select');
  await shot('03-wizard-guest');
  // pick 3 protocols per side by clicking cards in each picker
  const pickers = page.locator('[class*="ProtocolPicker"], [data-picker]');
  const cards = page.locator('button[aria-pressed]');
  const count = await cards.count();
  console.log('  protocol card buttons found:', count);
  // 3 picks per picker: first half of the buttons belongs to P1's picker, second half to P2's.
  const half = Math.floor(count / 2);
  for (const [start, end] of [[0, half], [half, count]]) {
    let picked = 0;
    for (let i = start; i < end && picked < 3; i++) {
      const c = cards.nth(i);
      if (await c.isEnabled()) {
        await c.click();
        picked++;
      }
    }
  }
  await shot('04-wizard-protocols');
  const nextBtn = page.getByRole('button', { name: /next|continue|result/i }).first();
  if (await nextBtn.isEnabled().catch(() => false)) {
    await nextBtn.click();
    // mark P1's three protocols compiled: click first three interactive cards in step 3
    await page.waitForTimeout(300);
    const resultCards = page.locator('section[aria-label$="result"]').first().locator('button');
    const n = await resultCards.count();
    console.log('  result cards:', n);
    for (let i = 0; i < Math.min(3, n); i++) await resultCards.nth(i).click();
    await shot('05-wizard-result');
    const save = page.getByRole('button', { name: /compile game|^save$/i }).first();
    if (await save.isEnabled().catch(() => false)) {
      await save.click();
      await page.waitForURL(/\/games\/[^/]+$/, { timeout: 15_000 }).catch(() => {});
      await shot('06-game-detail');
    } else {
      problems.push('wizard: save button not enabled');
    }
  } else {
    problems.push('wizard: could not reach result step (protocol selection failed)');
  }
  void pickers;

  step('wizard: winner only (compiled protocols unknown)');
  await page.goto(`${BASE}/games/new`, { waitUntil: 'domcontentloaded' });
  await page.locator('button[aria-pressed]').first().waitFor({ timeout: 10_000 });
  {
    const cards2 = page.locator('button[aria-pressed]');
    const total = await cards2.count();
    const mid = Math.floor(total / 2);
    for (const [start, end] of [[0, mid], [mid, total]]) {
      let picked = 0;
      // skip the first few so this game differs from the previous one
      for (let i = start + 3; i < end && picked < 3; i++) {
        const c = cards2.nth(i);
        if (await c.isEnabled()) {
          await c.click();
          picked++;
        }
      }
    }
  }
  await page.getByRole('button', { name: /next/i }).first().click();
  await page.getByRole('radio', { name: /winner only/i }).click();
  const saveWo = page.getByRole('button', { name: /compile game/i }).first();
  if (await saveWo.isEnabled()) problems.push('winner only: save enabled before a winner was picked');
  await page.getByRole('radiogroup', { name: /^winner$/i }).getByRole('radio', { name: 'Beta' }).click();
  await shot('05b-wizard-winner-only');
  await saveWo.click();
  await page.waitForURL(/\/games\/[^/]+$/, { timeout: 15_000 }).catch(() => problems.push('winner only: did not navigate to the game'));
  await page.waitForTimeout(500);
  if (!(await page.getByText('? / 3').count())) problems.push('winner only: detail does not show "? / 3" for the loser');
  if (!(await page.getByText(/winner only/i).count())) problems.push('winner only: detail meta missing');
  await shot('06b-game-detail-winner-only');

  step('dev tools gate (non-admin → /settings)');
  await page.goto(`${BASE}/dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/settings$/, { timeout: 15_000 }).catch(() => problems.push('gate: /dev did not redirect non-admin to /settings'));
  await page.goto(`${BASE}/dev/ui`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/settings$/, { timeout: 15_000 }).catch(() => problems.push('gate: /dev/ui did not redirect non-admin to /settings'));
  if (await page.getByRole('link', { name: /developer tools|kitchen sink/i }).count()) problems.push('settings: dev links visible to non-admin');
  if (await page.getByText(/VITE_ADMIN_UIDS/).count()) problems.push('settings: admin hint visible');

  step('games list');
  await page.goto(`${BASE}/games`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await shot('08-games');
  if (await page.getByRole('radio', { name: /^mine$/i }).count()) problems.push('guest: Mine/All toggle visible on games');
  if (!(await page.getByText(/Alpha/).count())) problems.push('games: guest game not listed as Alpha');
  const protoFilter = page.getByRole('combobox', { name: /protocol/i }).first();
  if (await protoFilter.count()) {
    await protoFilter.click();
    await page.getByRole('listbox').waitFor({ timeout: 5_000 });
    await page.screenshot({ path: `${OUT}/08a-games-protocol-select.png` });
    await page.keyboard.press('Escape');
  }

  step('stats tabs');
  await page.goto(`${BASE}/stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await shot('09-stats-overview');
  for (const tab of ['Players', 'Protocols', 'Combos']) {
    const t = page.getByRole('tab', { name: new RegExp(tab, 'i') }).first();
    if (await t.count()) {
      await t.click();
      await page.waitForTimeout(500);
      await shot(`10-stats-${tab.toLowerCase()}`);
    }
  }
  if (await page.getByRole('radio', { name: /^mine$/i }).count()) problems.push('guest: Mine/All toggle visible on stats');
  if (await page.getByRole('tab', { name: /head/i }).count()) problems.push('guest: head-to-head tab visible');

  step('settings');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/protocol sets/i).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await shot('12-settings');

  step('desktop home');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await shot('13-home-desktop');
  await page.goto(`${BASE}/stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await shot('14-stats-desktop');
} catch (e) {
  problems.push(`fatal: ${e.message}`);
  await shot('99-failure').catch(() => {});
} finally {
  await browser.close();
}

console.log('\nproblems:', problems.length);
for (const p of problems) console.log(' -', p);
process.exit(problems.some((p) => p.startsWith('fatal') || p.startsWith('pageerror')) ? 1 : 0);
