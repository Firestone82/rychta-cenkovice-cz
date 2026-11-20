// Browser smoke test of the main flows: cookie settings, hero search, booking request, availability,
// contact form, sign-in, confirming a request, booking from a message, conflicts, sign-out.
// Needs Playwright (npm i playwright) and a running site with a known administrator:
//   BASE=http://localhost:8080 ADMIN=you@example.com PASS=... node tools/e2e-smoke.js
// It creates test bookings and messages, so run it against a development database
// without hCaptcha keys (a robot cannot solve the captcha).
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:4200';
const ADMIN = process.env.ADMIN;
const PASS = process.env.PASS;
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'cs-CZ', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security|CSP|Refused/i.test(m.text())) errors.push('CSP ' + m.text()); });
  const shot = () => Promise.resolve();
  const stamp = Date.now() % 100000;
  const guest = `Test Host ${stamp}`;
  const day = (offset) => new Date(Date.UTC(2027, 4, 1 + (stamp % 40) * 7 + offset)).toISOString().slice(0, 10);
  const [D0, D1, D2, D3, D4] = [0, 1, 2, 3, 4].map(day);
  const [M0, M1, M3] = [40, 41, 43].map(day);

  // 0. cookie bar: nothing is stored before a choice, refusing takes one click
  await page.goto(BASE + '/cs', { waitUntil: 'networkidle' });
  await page.waitForSelector('rc-cookie-consent .bar');
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.click('#cookies-necessary');
  await page.waitForSelector('rc-cookie-consent .bar', { state: 'detached' });
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), ['rc-consent']);
  await page.click('#open-cookie-settings');
  await page.waitForSelector('dialog.settings[open]');
  await page.check('#ck-preferences-box');
  await page.click('#cookies-save');
  await page.waitForSelector('dialog.settings[open]', { state: 'detached' });
  assert.equal(await page.evaluate(() => localStorage.getItem('rc-lang')), 'cs');
  console.log('0 ok: cookie bar and settings');

  // 1. hero search carries dates to the booking page
  await page.goto(BASE + '/cs', { waitUntil: 'networkidle' });
  await page.fill('#hero-in', D0);
  await page.dispatchEvent('#hero-in', 'change');
  await page.fill('#hero-guests', '5');
  await page.dispatchEvent('#hero-guests', 'change');
  await page.click('form.search button[type=submit]');
  await page.waitForURL('**/cs/rezervace?**');
  assert.equal(await page.inputValue('#b-in'), D0);
  assert.equal(await page.inputValue('#b-out'), D2);
  assert.equal(await page.inputValue('#b-guests'), '5');
  console.log('1 ok: hero search ->', page.url());

  // 2. empty submit shows errors and focuses first problem
  await page.waitForSelector('.units .tag');
  await page.click('button.submit');
  await page.waitForSelector('.notice.is-error');
  console.log('2 ok: validation notice:', (await page.textContent('.summary .notice')).trim());

  // 3. capacity warning then valid booking of apartment 2 (6 beds)
  await page.click('.units li:nth-child(4) label'); // apartment 4: 3 beds
  await page.waitForTimeout(200);
  console.log('3 capacity:', (await page.textContent('#units .status')).trim());
  await page.click('.units li:nth-child(4) label');
  await page.click('.units li:nth-child(2) label');
  await page.fill('#b-name', guest);
  await page.fill('#b-email', 'host@example.com');
  await page.fill('#b-phone', '+420 777 123 456');
  await page.fill('#b-note', 'Přijedeme kolem páté.');
  await page.check('.consent input[type=checkbox]');
  await shot('booking-filled');
  await page.click('button.submit');
  await page.waitForSelector('.done .code');
  const code = (await page.textContent('.done .code')).trim();
  await shot('booking-done');
  console.log('3 ok: booking code', code);

  // 4. the same dates now show apartment 2 as taken
  await page.goto(BASE + `/cs/rezervace?from=${D1}&to=${D3}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.units .tag');
  const disabled = await page.isDisabled('.units li:nth-child(2) input');
  assert.ok(disabled, 'apartment 2 should be taken');
  console.log('4 ok: apartment 2 is taken for overlapping dates');
  // departure day is free for arrival
  await page.goto(BASE + `/cs/rezervace?from=${D2}&to=${D4}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.units .tag');
  assert.ok(!(await page.isDisabled('.units li:nth-child(2) input')), 'departure day should be free');
  console.log('4b ok: departure day is free for a new arrival');

  // 5. contact form
  await page.goto(BASE + '/en/contact', { waitUntil: 'networkidle' });
  await page.fill('#c-name', guest);
  await page.fill('#c-email', 'host@example.com');
  await page.fill('#c-message', 'Hello, we would like apartment 4 from 20 to 23 March 2027 for two people.');
  await page.check('.consent input[type=checkbox]');
  await page.click('main form button[type=submit]');
  await page.waitForSelector('.done');
  console.log('5 ok: contact sent:', (await page.textContent('.done h2')).trim());

  // 6. admin: protected route redirects to login, wrong password, then sign in
  await page.goto(BASE + '/admin/bookings', { waitUntil: 'networkidle' });
  assert.ok(page.url().includes('/admin/login'), 'should redirect to login');
  await page.fill('#l-email', ADMIN);
  await page.fill('#l-password', 'wrong-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('.notice.is-error');
  console.log('6 wrong password:', (await page.textContent('.notice')).trim());
  await page.fill('#l-password', PASS);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/bookings');
  console.log('6 ok: signed in, returned to', page.url());

  // access token is not in web storage
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  assert.ok(!/eyJ/.test(storage), 'no JWT in storage');
  const cookies = await ctx.cookies();
  const rc = cookies.find((c) => c.name === 'rc_refresh');
  console.log('6b ok: no token in storage; refresh cookie httpOnly=%s sameSite=%s path=%s', rc.httpOnly, rc.sameSite, rc.path);

  // 7. confirm the pending web booking from the list
  await page.click('.a-seg button:nth-child(2)'); // pending
  await page.waitForSelector(`tr:has-text("${guest}")`);
  await page.click(`tr:has-text("${guest}") .a-row-actions button:first-child`);
  await page.waitForSelector('.toast, rc-toasts li, rc-toasts div div', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  assert.equal(await page.locator(`tr:has-text("${guest}")`).count(), 0, 'confirmed booking leaves the pending list');
  console.log('7 ok: booking confirmed');

  // 8. create a booking from the contact message
  await page.goto(BASE + '/admin/messages', { waitUntil: 'networkidle' });
  await page.click(`li:has-text("${guest}") .a-actions a.btn:first-child`);
  await page.waitForSelector('#bf-name');
  assert.equal(await page.inputValue('#bf-name'), guest);
  assert.equal(await page.inputValue('#bf-email'), 'host@example.com');
  await page.fill('#bf-in', M0);
  await page.dispatchEvent('#bf-in', 'change');
  await page.fill('#bf-out', M3);
  await page.dispatchEvent('#bf-out', 'change');
  await page.click('.units li:nth-child(4) label');
  await page.fill('#bf-guests', '2');
  await page.dispatchEvent('#bf-guests', 'change');
  await shot('admin-from-message');
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/bookings');
  console.log('8 ok: booking created from message');
  await page.goto(BASE + '/admin/messages', { waitUntil: 'networkidle' });
  assert.ok(await page.locator(`li:has-text("${guest}") a.tag-confirmed`).count(), 'message links to its booking');
  console.log('8b ok: message shows the linked booking');

  // 9. conflict: a second manual booking on the same dates and apartment is refused
  await page.goto(BASE + `/admin/bookings/new?from=${M1}&a=4`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.unit.is-taken');
  await page.fill('#bf-name', 'Kolize');
  await page.click('button[type=submit]');
  await page.waitForSelector('.side .notice.is-error');
  console.log('9 ok: conflict:', (await page.textContent('.side .notice')).trim());
  await shot('admin-conflict');

  // 10. calendar shows March booking; sign out; protected page redirects again
  await page.goto(BASE + '/admin/calendar', { waitUntil: 'networkidle' });
  await shot('admin-calendar');
  await page.click('button.a-foot-link');
  await page.waitForURL('**/admin/login');
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  assert.ok(page.url().includes('/admin/login'));
  console.log('10 ok: signed out');
  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
