import puppeteer from 'puppeteer-core';

const CDP = 'http://127.0.0.1:9222';
const URL = 'http://localhost:4322/datos-pasajero?origin=UIO&destination=GYE&trip=oneway&depart=2026-08-20&adults=1&children=0&infants=0&cabin=Economy';

const mock = {
  search: '?origin=UIO&destination=GYE&trip=oneway&depart=2026-08-20&adults=1&children=0&infants=0&cabin=Economy',
  trip: 'oneway',
  from: { code: 'UIO', city: 'Quito' },
  to: { code: 'GYE', city: 'Guayaquil' },
  depart: '2026-08-20',
  adults: 1,
  children: 0,
  infants: 0,
  cabin: 'Economy',
  outbound: {
    legId: '1',
    fareId: 'light',
    fareName: 'Light',
    price: 79.09,
    flight: {
      id: '1',
      outboundLegId: '1',
      depart: '06:15',
      arrive: '07:05',
      duration: '50 min',
      stops: 'Directo',
      stopCount: 0,
      price: 79.09,
      arriveNextDay: false,
      airline: 'LATAM',
      flightNumber: 'LA1234',
    },
  },
  inbound: null,
};

async function shot(page, name) {
  await page.screenshot({ path: `scripts/output/${name}.png`, fullPage: true });
}

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
  await shot(page, 'checkout-desktop');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await shot(page, 'checkout-mobile');
  await page.close();
  console.log('screenshots saved');
}

main().catch(console.error);
