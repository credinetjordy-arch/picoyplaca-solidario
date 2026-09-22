/**
 * Scraper CDP para LATAM Ecuador
 * Conecta a Chrome en http://127.0.0.1:9222
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_URL = 'http://127.0.0.1:9222';
const TARGET = 'https://www.latamairlines.com/ec/es';
const OUT_DIR = path.resolve('scripts/output');

async function main() {
  const res = await fetch(`${CDP_URL}/json/version`);
  if (!res.ok) throw new Error('Chrome CDP no disponible en :9222');
  const { webSocketDebuggerUrl } = await res.json();

  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(TARGET, { waitUntil: 'networkidle2', timeout: 90000 });

  await page.evaluate(() => {
    const stay = [...document.querySelectorAll('button')].find((b) =>
      /Continuar en LATAM Ecuador/i.test(b.textContent || ''),
    );
    stay?.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const data = await page.evaluate(() => ({
    title: document.title,
    fonts: [...new Set([...document.fonts].map((f) => `${f.family} ${f.weight}`))],
    headerBg: getComputedStyle(document.querySelector('header')!).backgroundColor,
  }));

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'scrape.json'), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop.png'), fullPage: true });
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile.png'), fullPage: true });
  console.log('Scrape guardado en scripts/output/');
  await page.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
