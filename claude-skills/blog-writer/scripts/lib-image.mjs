// Shared image helpers. Chromium does the webp encoding, so the skill needs no
// native image library: a PNG buffer goes in, a webp buffer comes out.
import path from 'node:path';
import { createRequire } from 'node:module';

export function loadChromium(repo) {
  const base = repo || process.env.TOM_REPO || 'C:/Users/samad/Desktop/TOM/website';
  try {
    const req = createRequire(path.join(path.resolve(base), 'package.json'));
    return req('@playwright/test').chromium;
  } catch (err) {
    throw new Error(
      `could not load Playwright from ${base}: ${err.message}\n`
      + 'run "npm install" in the tom repo, or pass --repo <path>.'
    );
  }
}

/**
 * Re-encode a PNG buffer as webp inside Chromium. Quality 0.9 keeps a
 * full-bleed 1600x900 cover around 60-120 KB, against ~250 KB as PNG.
 */
export async function pngToWebp(chromium, png, quality = 0.9) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    const out = await page.evaluate(async ({ src, q }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', q);
    }, { src: dataUrl, q: quality });
    if (!out.startsWith('data:image/webp')) {
      throw new Error('Chromium did not produce webp');
    }
    return Buffer.from(out.split(',')[1], 'base64');
  } finally {
    await browser.close();
  }
}

/** Covers are always .webp - swap whatever extension was asked for. */
export function asWebpPath(p) {
  return p.replace(/\.(png|jpe?g|webp)$/i, '') + '.webp';
}

export const MIME_BY_EXT = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};
