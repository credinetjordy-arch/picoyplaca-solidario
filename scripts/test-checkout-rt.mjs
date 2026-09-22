import puppeteer from 'puppeteer-core';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4322';
const SEARCH =
  '/ofertas-vuelos?origin=UIO&destination=GYE&trip=roundtrip&depart=2026-08-20&return=2026-09-16&adults=1&children=0&infants=0&cabin=Economy';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickFare(page) {
  await page.evaluate(() => {
    const card = document.querySelector('.flight-card');
    card?.click();
  });
  await sleep(1200);
  await page.evaluate(() => document.querySelector('[data-fare]')?.click());
  await sleep(2500);
}

async function main() {
  const res = await fetch(`${CDP}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.goto(`${BASE}${SEARCH}`, { waitUntil: 'networkidle2', timeout: 90000 });
  for (let i = 0; i < 40; i++) {
    if (await page.$('.flight-card')) break;
    await sleep(1000);
  }
  await pickFare(page);
  const step1 = await page.evaluate(() => document.getElementById('offers-title')?.innerHTML || '');
  if (!/vuelta/i.test(step1)) throw new Error('Expected inbound step');
  await pickFare(page);
  const result = await page.evaluate(() => {
    const data = JSON.parse(sessionStorage.getItem('latam-checkout-selection') || 'null');
    return {
      url: location.pathname,
      trip: data?.trip,
      hasOutbound: Boolean(data?.outbound),
      hasInbound: Boolean(data?.inbound),
      legs: document.querySelectorAll('.checkout-leg').length,
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await page.close();
  if (!result.hasInbound || result.legs < 2) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
