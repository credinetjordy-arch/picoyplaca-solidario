/**
 * Extrae estructura de la página de ofertas-vuelos LATAM vía CDP.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = 'http://127.0.0.1:9222';
const TARGET =
  'https://www.latamairlines.com/ec/es/ofertas-vuelos?origin=UIO&outbound=2026-08-20T00%3A00%3A00.000Z&destination=GYE&adt=1&chd=0&inf=0&trip=RT&cabin=Economy&redemption=false&sort=RECOMMENDED&inbound=2026-09-16T00%3A00%3A00.000Z';
const OUT_DIR = path.resolve('scripts/output');

async function main() {
  const res = await fetch(`${CDP_URL}/json/version`);
  if (!res.ok) throw new Error('Chrome CDP no disponible en :9222');
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 90000 });

  await page.evaluate(() => {
    const stay = [...document.querySelectorAll('button')].find((b) =>
      /Continuar en LATAM Ecuador/i.test(b.textContent || ''),
    );
    stay?.click();
  });

  for (let i = 0; i < 30; i++) {
    const ready = await page.evaluate(() => {
      const text = document.body.innerText;
      return /elige un vuelo/i.test(text) && (document.querySelectorAll('[class*="flight"], [class*="itinerary"], [class*="offer"]').length > 3);
    });
    if (ready) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  await new Promise((r) => setTimeout(r, 2500));

  const data = await page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const box = (el) => {
      if (!el) return null;
      const s = cs(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        className: String(el.className).slice(0, 180),
        text: (el.innerText || '').slice(0, 220).replace(/\s+/g, ' ').trim(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        color: s?.color,
        bg: s?.backgroundColor,
        font: `${s?.fontFamily} ${s?.fontSize} ${s?.fontWeight}`,
        pad: s ? `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}` : '',
        border: s?.border,
        radius: s?.borderRadius,
      };
    };

    const buttons = [...document.querySelectorAll('button, a, [role="button"]')]
      .slice(0, 80)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        name: (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        className: String(el.className).slice(0, 120),
      }));

    const headings = [...document.querySelectorAll('h1,h2,h3')].map((el) => ({
      tag: el.tagName,
      text: el.innerText.replace(/\s+/g, ' ').trim(),
      className: String(el.className).slice(0, 120),
    }));

    return {
      title: document.title,
      h1: document.querySelector('h1')?.innerText,
      bodySnippet: document.body.innerText.slice(0, 6000),
      header: box(document.querySelector('header')),
      headings,
      buttons,
    };
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'offers-structure.json'), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, 'offers-desktop.png') });
  await page.screenshot({ path: path.join(OUT_DIR, 'offers-desktop-full.png'), fullPage: true });
  console.log('OK headings', data.headings.length, 'buttons', data.buttons.length);
  await page.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
