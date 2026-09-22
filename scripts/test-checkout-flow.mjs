/**
 * Prueba E2E: ofertas → elegir tarifa → datos-pasajero
 */
import puppeteer from 'puppeteer-core';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4322';
const SEARCH =
  '/ofertas-vuelos?origin=UIO&destination=GYE&trip=oneway&depart=2026-08-20&adults=1&children=0&infants=0&cabin=Economy';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch(`${CDP}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}${SEARCH}`, { waitUntil: 'networkidle2', timeout: 60000 });

  for (let i = 0; i < 40; i++) {
    const cards = await page.$$('.flight-card');
    if (cards.length) break;
    await sleep(1000);
  }

  await page.evaluate(() => {
    const card = document.querySelector('.flight-card');
    card?.querySelector('.flight-card__row, button, [data-open-fares]')?.click();
    card?.click();
  });
  await sleep(1500);

  await page.evaluate(() => {
    const fare = document.querySelector('[data-fare]');
    fare?.click();
  });
  await sleep(3000);

  const result = await page.evaluate(() => ({
    url: location.pathname,
    hasForms: Boolean(document.querySelector('.trip-summary-leg')),
    hasSummary: Boolean(document.getElementById('trip-summary-footer') && !document.getElementById('trip-summary-footer')?.classList.contains('hidden')),
    storage: sessionStorage.getItem('latam-checkout-selection')?.slice(0, 120),
    title: document.querySelector('.checkout-title')?.textContent?.trim(),
  }));

  console.log(JSON.stringify(result, null, 2));
  await page.close();
  process.exit(result.url.includes('resumen-viaje') ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
