#!/usr/bin/env node
// Render a Times of Madeira cover image (1600x900 PNG) for an article.
//
//   node make-cover.mjs --title "..." [--kicker "LOCAL NEWS"] [--out cover.png]
//                       [--date 2026-10-11] [--variant ridge|coast|night]
//                       [--theme dark|light] [--repo <path to tom repo>]
//
// The art is drawn in HTML/SVG and screenshotted with the Playwright that the
// tom theme repo already depends on, so the cover needs no image service, no
// API key, and carries no third-party licence. Colours come from the live
// theme (accent #c91400, ink #05051c).
import fs from 'node:fs';
import path from 'node:path';
import { loadChromium, pngToWebp, asWebpPath } from './lib-image.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const title = arg('title');
if (!title) {
  console.error('usage: node make-cover.mjs --title "Headline" [--kicker TEXT] [--out file.png]');
  process.exit(2);
}
const kicker = (arg('kicker') || 'MADEIRA').toUpperCase();
const out = asWebpPath(path.resolve(arg('out') || 'cover.webp'));
const date = arg('date') || new Date().toISOString().slice(0, 10);
const variant = arg('variant') || 'ridge';
const theme = arg('theme') || 'dark';
const width = Number(arg('width') || 1600);
const height = Number(arg('height') || 900);
const repo = arg('repo') || process.env.TOM_REPO || 'C:/Users/samad/Desktop/TOM/website';

// Playwright lives in the theme repo, not in this skill.
let chromium;
try {
  chromium = loadChromium(repo);
} catch (err) {
  console.error(err.message);
  process.exit(3);
}

const ink = theme === 'light' ? '#05051c' : '#f4f4f6';
const bg1 = theme === 'light' ? '#ffffff' : '#05051c';
const bg2 = theme === 'light' ? '#f3f1f3' : '#121226';
const accent = arg('accent') || '#c91400';

// Headline length drives the type size so long and short headlines both fill
// the frame without overflowing it.
const n = title.length;
const titleSize = n <= 45 ? 92 : n <= 65 ? 78 : n <= 90 ? 66 : n <= 120 ? 56 : 48;

const ART = {
  // Layered mountain ridges: the island read from the sea.
  ridge: `
    <path d="M0 640 L220 470 L380 560 L560 400 L760 540 L940 430 L1160 580 L1360 470 L1600 600 L1600 900 L0 900 Z"
          fill="${accent}" opacity="0.16"/>
    <path d="M0 720 L260 580 L470 660 L700 520 L910 650 L1130 560 L1340 670 L1600 580 L1600 900 L0 900 Z"
          fill="${accent}" opacity="0.28"/>
    <path d="M0 800 L300 700 L540 770 L820 660 L1080 760 L1340 700 L1600 780 L1600 900 L0 900 Z"
          fill="${accent}" opacity="0.5"/>`,
  // Atlantic swell.
  coast: `
    <path d="M0 620 Q200 560 400 620 T800 620 T1200 620 T1600 620 L1600 900 L0 900 Z" fill="${accent}" opacity="0.14"/>
    <path d="M0 700 Q200 640 400 700 T800 700 T1200 700 T1600 700 L1600 900 L0 900 Z" fill="${accent}" opacity="0.26"/>
    <path d="M0 780 Q200 720 400 780 T800 780 T1200 780 T1600 780 L1600 900 L0 900 Z" fill="${accent}" opacity="0.45"/>`,
  // Funchal amphitheatre at night: for evening or policing stories.
  night: `
    <circle cx="1320" cy="180" r="74" fill="#ffd9a0" opacity="0.12"/>
    <path d="M0 760 L240 600 L520 700 L860 560 L1180 690 L1600 620 L1600 900 L0 900 Z" fill="${accent}" opacity="0.3"/>
    ${Array.from({ length: 56 }, (_, i) => {
      // Deterministic scatter so the same headline renders the same cover.
      // Kept in the lower band so the lights read as the town, not as stars.
      const x = (i * 137.5) % 1600;
      const y = 790 + ((i * 29) % 90);
      const r = 1.5 + ((i * 7) % 3);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="#ffd9a0" opacity="0.45"/>`;
    }).join('')}`,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${width}px; height: ${height}px; overflow: hidden;
    font-family: 'Heebo', 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(145deg, ${bg1} 0%, ${bg2} 100%);
    color: ${ink};
  }
  .art { position: absolute; inset: 0; }
  /* Keeps the headline readable wherever the art happens to be bright. */
  .shade { position: absolute; inset: 0; background:
    linear-gradient(to top, ${bg1}cc 0%, ${bg1}73 32%, transparent 66%); }
  .frame { position: absolute; inset: 0; padding: 86px 96px; display: flex; flex-direction: column; }
  .kicker {
    font-size: 26px; font-weight: 700; letter-spacing: .22em; color: ${accent};
    display: flex; align-items: center; gap: 22px;
  }
  .kicker::after { content: ''; flex: 1; height: 2px; background: ${accent}; opacity: .45; }
  h1 {
    margin-top: auto; font-size: ${titleSize}px; font-weight: 900; line-height: 1.08;
    letter-spacing: -.02em; max-width: 1180px; text-wrap: balance;
  }
  .rule { width: 132px; height: 8px; background: ${accent}; margin: 44px 0 32px; }
  footer { display: flex; align-items: baseline; justify-content: space-between; font-size: 24px; }
  .mark { font-weight: 900; letter-spacing: .16em; }
  .mark span { color: ${accent}; }
  .date { opacity: .62; letter-spacing: .08em; }
</style></head>
<body>
  <svg class="art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${ART[variant] || ART.ridge}</svg>
  <div class="shade"></div>
  <div class="frame">
    <div class="kicker">${esc(kicker)}</div>
    <h1>${esc(title)}</h1>
    <div class="rule"></div>
    <footer>
      <div class="mark">TIMES OF <span>MADEIRA</span></div>
      <div class="date">${esc(date)}</div>
    </footer>
  </div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  // Give the webfont a moment; the fallback stack keeps it readable if offline.
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // Published covers are webp: the same picture as PNG is several times larger.
  const png = await page.screenshot({ type: 'png' });
  fs.writeFileSync(out, await pngToWebp(chromium, png));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`cover written: ${out} (${width}x${height}, ${kb} KB webp, variant ${variant})`);
} finally {
  await browser.close();
}
