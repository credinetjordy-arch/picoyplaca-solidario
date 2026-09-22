import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = 'http://127.0.0.1:9222';
const OUT = path.resolve('scripts/output/post-fare-flow.json');

const TARGET =
  'https://www.latamairlines.com/ec/es/ofertas-vuelos?origin=UIO&outbound=2026-08-28T00%3A00%3A00.000Z&destination=GYE&adt=1&chd=0&inf=0&trip=RT&cabin=Economy&redemption=false&sort=RECOMMENDED&inbound=2026-09-04T00%3A00%3A00.000Z';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pageInfo(page) {
  return page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        className: String(el.className || '').slice(0, 120),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: cs.backgroundColor,
        color: cs.color,
        font: `${cs.fontSize} ${cs.fontWeight}`,
      };
    };
    const headings = [...document.querySelectorAll('h1,h2,h3')].slice(0, 12).map((el) => pick(el));
    const buttons = [...document.querySelectorAll('button, a[role="button"], [role="button"]')]
      .filter((el) => (el.innerText || el.getAttribute('aria-label') || '').trim())
      .slice(0, 40)
      .map((el) => pick(el));
    return {
      url: location.href,
      title: document.title,
      bodyStart: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 2500),
      headings,
      buttons,
    };
  });
}

async function clickFirst(page, pattern) {
  return page.evaluate((re) => {
    const rx = new RegExp(re, 'i');
    const btn = [...document.querySelectorAll('button, a, [role="button"]')].find((el) =>
      rx.test(el.innerText || el.getAttribute('aria-label') || ''),
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, pattern);
}

async function main() {
  const res = await fetch(`${CDP_URL}/json/version`);
  if (!res.ok) throw new Error('CDP unavailable');
  const { webSocketDebuggerUrl } = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });
  const log = [];

  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(1500);
  await page.evaluate(() => {
    const stay = [...document.querySelectorAll('button')].find((b) => /Continuar en LATAM Ecuador/i.test(b.textContent || ''));
    stay?.click();
  });

  for (let i = 0; i < 60; i++) {
    const info = await pageInfo(page);
    if (/elige un vuelo/i.test(info.bodyStart) && !/tardando/i.test(info.bodyStart)) break;
    await sleep(1500);
  }

  log.push({ step: 'offers-loaded', ...(await pageInfo(page)) });

  await clickFirst(page, 'Elegir');
  await sleep(2500);
  log.push({ step: 'after-first-elegir', ...(await pageInfo(page)) });

  const hasReturn = /elige un vuelo de vuelta/i.test((await pageInfo(page)).bodyStart);
  if (hasReturn) {
    await clickFirst(page, 'Elegir');
    await sleep(3500);
    log.push({ step: 'after-return-elegir', ...(await pageInfo(page)) });
  }

  await page.screenshot({ path: path.resolve('scripts/output/post-fare-desktop.png'), fullPage: true });
  await page.setViewport({ width: 390, height: 844 });
  await sleep(500);
  await page.screenshot({ path: path.resolve('scripts/output/post-fare-mobile.png'), fullPage: true });

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(log, null, 2));
  console.log('saved', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
