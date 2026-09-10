/* eslint-disable no-console */
/**
 * Headless E2E smoke (§11.5 support): logs in as the seeded owner, visits
 * every §5.4 route, records console errors / failed API calls / missing
 * queryFn warnings, and probes the one-tap completion flow on Today.
 * Run: node scripts/e2e-smoke.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ROUTES = [
  '/',
  '/chores',
  '/chores/new',
  '/household',
  '/setup',
  '/setup/roles',
  '/routines',
  '/home',
  '/supplies',
  '/shopping',
  '/activity',
  '/notifications',
  '/settings',
  '/more',
  '/print',
];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

const consoleErrors = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') consoleErrors.push(text);
});
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('/api/v1/auth/login')) {
    consoleErrors.push(`HTTP ${res.status()} ${res.url().replace(BASE, '')}`);
  }
});

// 1) Login
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 60000 });
// wait for hydration (inputs are controlled by React state)
await page.waitForSelector('input[autocomplete="off"]', { timeout: 30000 });
await page.type('input[autocomplete="off"]', 'BEKELE');
await page.type('input[autocomplete="username"]', 'hana');
await page.type('input[autocomplete="current-password"]', 'hana1234');
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 2000));
const afterLogin = await page.evaluate(() => ({
  url: location.pathname,
  body: document.body.innerText.slice(0, 400),
}));
console.log('AFTER LOGIN →', afterLogin.url);
console.log(afterLogin.body.replace(/\n+/g, ' | ').slice(0, 300));

// 2) Route sweep
const results = [];
for (const route of ROUTES) {
  consoleErrors.length = 0;
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const info = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.innerText ?? null,
    hasSkeleton: Boolean(document.querySelector('[data-skeleton], .animate-pulse')),
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 180),
  }));
  results.push({ route, ...info, errors: [...consoleErrors] });
}

console.log('\n=== ROUTE SWEEP ===');
for (const r of results) {
  const flag = r.errors.length ? '⚠' : '✓';
  console.log(`${flag} ${r.route} — h1: ${r.h1 ?? '—'}${r.hasSkeleton ? ' [stuck skeleton]' : ''}`);
  if (r.errors.length) console.log('   errors:', JSON.stringify(r.errors.slice(0, 3)));
}

// 3) Today completion probe (§5.3 one-tap + Undo toast)
console.log('\n=== TODAY COMPLETION PROBE ===');
await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const cardButtons = await page.$$eval('main button', (btns) =>
  btns
    .filter((b) => !b.disabled)
    .map((b) => (b.getAttribute('aria-label') ?? b.innerText).slice(0, 40)),
);
console.log('enabled buttons on Today:', JSON.stringify(cardButtons.slice(0, 10)));

await browser.close();
