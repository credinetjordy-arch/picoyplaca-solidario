import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = 'http://127.0.0.1:9222';
const TARGET =
  'https://www.latamairlines.com/ec/es/ofertas-vuelos?origin=UIO&outbound=2026-08-20T00%3A00%3A00.000Z&destination=GYE&adt=1&chd=0&inf=0&trip=RT&cabin=Economy&redemption=false&sort=RECOMMENDED&inbound=2026-09-16T00%3A00%3A00.000Z';
const OUT = path.resolve('scripts/output');

async function main() {
  const { webSocketDebuggerUrl } = await (await fetch(`${CDP_URL}/json/version`)).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await fs.mkdir(OUT, { recursive: true });

  const shots = [];
  page.on('domcontentloaded', async () => {
    shots.push('dcl');
    await page.screenshot({ path: path.join(OUT, 'wait-dcl.png') }).catch(() => {});
  });

  const nav = page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, 'wait-400.png') });
  const info400 = await page.evaluate(() => ({
    title: document.title,
    bg: getComputedStyle(document.body).backgroundColor,
    text: document.body.innerText.slice(0, 400),
    overlays: [...document.querySelectorAll('[class*="load"], [class*="Load"], [class*="spinner"], [class*="wait"], [class*="Wait"], [class*="overlay"]')]
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className).slice(0, 120),
        text: (el.innerText || '').slice(0, 80),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      })),
  }));
  await fs.writeFile(path.join(OUT, 'wait-400.json'), JSON.stringify(info400, null, 2));

  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, 'wait-1200.png') });
  const info1200 = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText.slice(0, 800),
    htmlLen: document.body.innerHTML.length,
  }));
  await fs.writeFile(path.join(OUT, 'wait-1200.json'), JSON.stringify(info1200, null, 2));

  await nav.catch(() => {});
  console.log('captured', shots);
  await page.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
