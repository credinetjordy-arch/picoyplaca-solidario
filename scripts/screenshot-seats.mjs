import puppeteer from 'puppeteer-core';

const CDP = 'http://127.0.0.1:9222';
const URL = 'http://localhost:4322/seleccion-asientos?origin=UIO&destination=GYE&trip=roundtrip&depart=2026-08-22&return=2026-09-21&adults=1&children=0&infants=0&cabin=Economy';

const mock = {
  search: '?origin=UIO&destination=GYE&trip=roundtrip&depart=2026-08-22&return=2026-09-21&adults=1&children=0&infants=0&cabin=Economy',
  trip: 'roundtrip',
  from: { code: 'UIO', city: 'Quito' },
  to: { code: 'GYE', city: 'Guayaquil' },
  depart: '2026-08-22',
  returnDate: '2026-09-21',
  adults: 1,
  children: 0,
  infants: 0,
  cabin: 'Economy',
  outbound: { legId: '1', fareId: 'light', fareName: 'Light', price: 110.14, flight: { depart: '18:43', arrive: '19:35', duration: '0 h 52 min', stops: 'Directo', stopCount: 0, airline: 'LATAM Airlines Ecuador', flightNumber: 'LA1408' } },
  inbound: { legId: '2', fareId: 'full', fareName: 'Full', price: 122.16, flight: { depart: '06:35', arrive: '07:27', duration: '0 h 52 min', stops: 'Directo', stopCount: 0, airline: 'LATAM Airlines Ecuador', flightNumber: 'LA1401' } },
};

async function main() {
  const res = await fetch(`${CDP}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((data) => {
    sessionStorage.setItem('latam-checkout-selection', JSON.stringify(data));
  }, mock);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scripts/output/seats-desktop.png', fullPage: false });
  const info = await page.evaluate(() => ({
    title: document.querySelector('.seats-top__title')?.textContent,
    tabs: document.querySelectorAll('.seats-tab').length,
    seats: document.querySelectorAll('.seat-btn').length,
    mapScroll: getComputedStyle(document.getElementById('seats-map-scroll')).overflowY,
  }));
  console.log(JSON.stringify(info, null, 2));
  await page.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
