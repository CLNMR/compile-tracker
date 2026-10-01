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

  step('create players');
  await page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  for (const name of ['Colin', 'Anna']) {
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await page.getByRole('button', { name: /new player|add player|create/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ timeout: 10_000 });
    const input = dialog.getByRole('textbox').first();
    await input.fill(name);
    await input.press('Enter');
    await page.getByText(name, { exact: true }).first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(400);
  }
  await shot('02-players');

  step('wizard: new game');
  await page.goto(`${BASE}/games/new`, { waitUntil: 'domcontentloaded' });
  const pickSelect = async (index, text) => {
    const trigger = page.getByRole('combobox').nth(index);
    await trigger.click();
    const list = page.getByRole('listbox');
    await list.waitFor({ timeout: 5_000 });
    if (index === 0) await shot('03a-select-open');
    await list.getByRole('option', { name: text, exact: true }).click();
    await list.waitFor({ state: 'hidden', timeout: 5_000 });
  };
  await pickSelect(0, 'Colin');
  await pickSelect(1, 'Anna');
  await shot('03-wizard-players');
  await page.getByRole('button', { name: /next|continue|protocols/i }).first().click();
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
  for (const tab of ['Players', 'Protocols', 'Combos', 'Head']) {
    const t = page.getByRole('tab', { name: new RegExp(tab, 'i') }).first();
    if (await t.count()) {
      await t.click();
      await page.waitForTimeout(500);
      await shot(`10-stats-${tab.toLowerCase()}`);
    }
  }
  // switch to All scope
  const all = page.getByRole('radio', { name: /^all$/i }).first();
  if (await all.count()) {
    await all.click();
    await page.waitForTimeout(500);
    await shot('11-stats-all');
  }

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
