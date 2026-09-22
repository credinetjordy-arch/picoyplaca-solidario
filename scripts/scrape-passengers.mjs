/**
 * Navega ofertas → tarifa → pasajeros en LATAM y extrae estructura/estilos.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = 'http://127.0.0.1:9222';
const OUT_DIR = path.resolve('scripts/output');
const TARGET =
  'https://www.latamairlines.com/ec/es/ofertas-vuelos?origin=UIO&outbound=2026-08-20T00%3A00%3A00.000Z&destination=GYE&adt=1&chd=0&inf=0&trip=OW&cabin=Economy&redemption=false&sort=RECOMMENDED';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissGeo(page) {
  await page.evaluate(() => {
    const stay = [...document.querySelectorAll('button')].find((b) =>
      /Continuar en LATAM Ecuador/i.test(b.textContent || ''),
    );
    stay?.click();
  });
}

async function waitOffers(page) {
  for (let i = 0; i < 45; i++) {
    const ready = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return /elige un vuelo|vuelos disponibles|resultados/i.test(text) && document.querySelectorAll('button').length > 5;
    });
    if (ready) return true;
    await sleep(1000);
  }
  return false;
}

async function clickFirstFare(page) {
  return page.evaluate(() => {
    const fareBtn = [...document.querySelectorAll('button')].find((b) => /^Elegir$/i.test((b.textContent || '').trim()));
    if (fareBtn) {
      fareBtn.click();
      return { ok: true, text: fareBtn.textContent };
    }
    const expand = [...document.querySelectorAll('button')].find((b) => /tarifa|ver tarifas|mostrar/i.test(b.textContent || ''));
    expand?.click();
    return { ok: false, expanded: Boolean(expand) };
  });
}

async function extractPage(page) {
  return page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const box = (el) => {
      if (!el) return null;
      const s = cs(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 200),
        text: (el.innerText || '').slice(0, 300).replace(/\s+/g, ' ').trim(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        color: s?.color,
        bg: s?.backgroundColor,
        font: `${s?.fontSize} ${s?.fontWeight} ${s?.fontFamily?.split(',')[0]}`,
        pad: s ? `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}` : '',
        border: s?.border,
        radius: s?.borderRadius,
      };
    };

    const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map((el) => box(el));
    const stepper = [...document.querySelectorAll('[class*="step"], [class*="Step"], nav ol li, [role="tablist"] *')]
      .slice(0, 20)
      .map((el) => box(el));
    const inputs = [...document.querySelectorAll('input, select, textarea')].slice(0, 30).map((el) => ({
      ...box(el),
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      label: el.closest('label')?.innerText?.slice(0, 80) || el.getAttribute('aria-label'),
    }));

    return {
      url: location.href,
      title: document.title,
      h1: document.querySelector('h1')?.innerText,
      bodySnippet: document.body.innerText.slice(0, 8000),
      headings,
      stepper,
      inputs,
      buttons: [...document.querySelectorAll('button')].slice(0, 40).map((b) => ({
        text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        className: String(b.className).slice(0, 160),
      })),
    };
  });
}

async function main() {
  const res = await fetch(`${CDP_URL}/json/version`);
  if (!res.ok) throw new Error('Chrome CDP no disponible en :9222');
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await dismissGeo(page);
  await waitOffers(page);
  await sleep(2000);

  let offersData = await extractPage(page);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'passengers-offers.json'), JSON.stringify(offersData, null, 2));

  // Expand first flight card if needed
  await page.evaluate(() => {
    const card = document.querySelector('[class*="flight"], [class*="itinerary"], [class*="Offer"]');
    card?.click();
  });
  await sleep(1500);

  let fareClick = await clickFirstFare(page);
  if (!fareClick.ok) {
    await sleep(1500);
    fareClick = await clickFirstFare(page);
  }

  for (let i = 0; i < 30; i++) {
    const onPassengers = await page.evaluate(() => /datos de los pasajeros|información de contacto|pasajero/i.test(document.body.innerText));
    if (onPassengers) break;
    await sleep(1000);
  }
  await sleep(2000);

  const passengerData = await extractPage(page);
  await fs.writeFile(path.join(OUT_DIR, 'passengers-page-desktop.json'), JSON.stringify({ fareClick, ...passengerData }, null, 2));

  await page.setViewport({ width: 390, height: 844 });
  await sleep(1200);
  const mobileData = await extractPage(page);
  await fs.writeFile(path.join(OUT_DIR, 'passengers-page-mobile.json'), JSON.stringify(mobileData, null, 2));

  console.log('Saved passenger scrape to scripts/output/');
  console.log('URL:', passengerData.url);
  console.log('H1:', passengerData.h1);
  await page.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
