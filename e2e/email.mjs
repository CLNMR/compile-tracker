// Email/password accounts against the dev server in emulator mode.
//   1) firebase emulators:start --only auth,firestore
//   2) npm run dev:emu
//   3) node e2e/email.mjs [outDir]
// A guest creates an email account (keeping its uid), signs out, signs back in, and hits the error paths.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const RUN = Date.now().toString(36);
const EMAIL = `carol-${RUN}@example.com`;
const PASSWORD = 'compile-123';
const OUT = process.argv[2] ?? 'e2e/out-email';
mkdirSync(OUT, { recursive: true });

const problems = [];
const step = (s) => console.log('>', s);
/** Waits for the locator to become visible (isVisible() does not wait). */
const seen = (locator, timeout = 10_000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
const check = (ok, msg) => {
  if (!ok) problems.push(msg);
  console.log(ok ? '  ✓' : '  ✗', msg);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  // Failed sign-ins are expected here; the emulator answers them with HTTP 400.
  if (m.type() === 'error' && !/favicon|ERR_BLOCKED_BY_CLIENT|status of 400|\[auth\]/.test(m.text())) problems.push(`console: ${m.text()}`);
});
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

const uid = () =>
  page.evaluate(async () => {
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

const dialog = () => page.getByRole('dialog', { name: /email account/i });

async function openDialog() {
  const btn = page.getByRole('button', { name: /email & password/i });
  await btn.waitFor({ timeout: 30_000 });
  await btn.click();
  await dialog().waitFor();
}

async function fill(email, password) {
  await dialog().locator('input[type=email]').fill(email);
  await dialog().locator('input[type=password]').fill(password);
}

try {
  step('guest creates an email account');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await openDialog();
  await page.waitForTimeout(500);
  const guestUid = await uid();
  await fill(EMAIL, '123');
  await dialog().getByRole('button', { name: /^create account$/i }).last().click();
  check(await seen(dialog().getByText(/at least 6 characters/i)), 'short password rejected');
  await fill(EMAIL, PASSWORD);
  await shot('01-create');
  await dialog().getByRole('button', { name: /^create account$/i }).last().click();
  check(await seen(page.getByText('Account created')), 'account created toast');
  check(await seen(page.getByText(`identity: email — ${EMAIL}`)), 'identity line shows the email');
  check((await uid()) === guestUid, 'uid kept (guest data moves into the account)');
  await shot('02-created');

  step('friends section is available');
  await page.goto(`${BASE}/players`, { waitUntil: 'domcontentloaded' });
  check(await seen(page.getByLabel('Your handle')), 'handle field on Players page');
  check((await page.getByLabel('Your handle').inputValue()).startsWith('carol'), 'handle suggested from the email');

  step('sign out, then the errors');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^sign out$/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^sign out$/i }).click();
  check(await seen(page.getByText(/identity: anonymous guest/i)), 'back to anonymous');
  await openDialog();
  await fill(EMAIL, PASSWORD);
  await dialog().getByRole('button', { name: /^create account$/i }).last().click();
  check(await seen(dialog().getByText(/already has an account/i)), 'email in use explained');
  check((await dialog().getByRole('radio', { name: /sign in/i }).getAttribute('aria-checked')) === 'true', 'switched to sign in');
  await fill(EMAIL, 'wrong-password');
  await dialog().getByRole('button', { name: /^sign in$/i }).last().click();
  check(await seen(dialog().getByText('Wrong email or password.')), 'wrong password explained');
  await dialog().getByRole('button', { name: /forgot password/i }).click();
  check(await seen(page.getByText('Reset email sent')), 'reset email toast');
  await shot('03-errors');

  step('sign back in');
  await fill(EMAIL, PASSWORD);
  await dialog().getByRole('button', { name: /^sign in$/i }).last().click();
  check(await seen(page.getByText(`identity: email — ${EMAIL}`)), 'signed in again');
  await page.waitForTimeout(500);
  check((await uid()) === guestUid, 'same uid as before');
  await shot('04-signed-in');

  step('German labels');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('compile.locale', 'de'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  check(await seen(page.getByText(`identität: e-mail — ${EMAIL}`)), 'German identity line');
} catch (e) {
  problems.push(`fatal: ${e.message}`);
} finally {
  await browser.close();
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\n0 problems');
process.exit(problems.length ? 1 : 0);
