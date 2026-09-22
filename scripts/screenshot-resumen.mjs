import puppeteer from 'puppeteer-core';

const CDP = 'http://127.0.0.1:9222';
const URL = 'http://localhost:4322/resumen-viaje?origin=UIO&destination=GYE&trip=roundtrip&depart=2026-08-22&return=2026-09-21&adults=1&children=0&infants=0&cabin=Economy';

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
  outbound: {
    legId: '1',
    fareId: 'light',
    fareName: 'Light',
    price: 110.14,
    flight: {
      id: '1',
      outboundLegId: '1',
      depart: '18:43',
      arrive: '19:35',
      duration: '0 h 52 min',
      stops: 'Directo',
      stopCount: 0,
      price: 110.14,
      arriveNextDay: false,
      airline: 'LATAM Airlines Ecuador',
      flightNumber: 'LA 1408',
      operators: [{ name: 'LATAM Airlines Ecuador', code: 'XL' }],
    },
  },
  inbound: {
    legId: '2',
    fareId: 'full',
    fareName: 'Full',
    price: 122.16,
    flight: {
      id: '2',
      outboundLegId: '2',
      depart: '06:35',
      arrive: '07:27',
      duration: '0 h 52 min',
      stops: 'Directo',
      stopCount: 0,
      price: 122.16,
      arriveNextDay: false,
      airline: 'LATAM Airlines Ecuador',
      flightNumber: 'LA 1401',
      operators: [{ name: 'LATAM Airlines Ecuador', code: 'XL' }],
    },
  },
};

async function main() {
  const res = await fetch(`${CDP}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((data) => {
    sessionStorage.setItem('latam-checkout-selection', JSON.stringify(data));
  }, mock);
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scripts/output/resumen-desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'scripts/output/resumen-mobile.png', fullPage: true });
  await page.close();
  console.log('ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
