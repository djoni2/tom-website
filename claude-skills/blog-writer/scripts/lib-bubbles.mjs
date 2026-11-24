// Compose a generated picture into a 16:9 cover and draw the speech bubbles on
// top in real type.
//
// Open-weight models (FLUX schnell and friends) draw the scene well but render
// lettering as gibberish. Rather than fight that, the art is generated with no
// text at all and the bubbles are added here, so the Portuguese is always
// spelled correctly and matches the house lettering.
import { pngToWebp } from './lib-image.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Bubbles sit along the top band, which in these scenes is sky or background.
// Tails point down towards whoever is speaking below.
function layout(count, width) {
  const slots = {
    1: [0.5],
    2: [0.26, 0.74],
    3: [0.2, 0.5, 0.8],
    4: [0.16, 0.38, 0.62, 0.85],
  }[Math.min(count, 4)] || [0.5];
  return slots.slice(0, count).map((f) => f * width);
}

export async function composeCover(chromium, imageBuffer, bubbles, opts = {}) {
  const width = opts.width || 1536;
  const height = opts.height || 864;
  const mime = opts.mime || 'image/jpeg';
  const src = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  const centres = layout(bubbles.length, width);

  const bubbleHtml = bubbles.map((text, i) => {
    const t = esc(text);
    // Longer text needs a wider bubble and smaller type.
    const chars = t.length;
    const w = Math.min(Math.max(220, chars * 26 + 70), 520);
    const size = chars <= 12 ? 54 : chars <= 20 ? 44 : 36;
    const left = Math.min(Math.max(centres[i] - w / 2, 28), width - w - 28);
    const top = 40 + (i % 2) * 86;
    return `<div class="bubble" style="left:${left}px;top:${top}px;width:${w}px">
      <span style="font-size:${size}px">${t}</span><i></i></div>`;
  }).join('');

  // cropBottom trims a fraction off the bottom of the source - used to remove
  // a generator's corner watermark before the picture is published.
  const crop = Math.min(Math.max(opts.cropBottom || 0, 0), 0.4);
  const imgHeight = 100 / (1 - crop);

  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Permanent+Marker&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${width}px;height:${height}px;overflow:hidden;position:relative;background:#000}
  img.base{position:absolute;top:0;left:0;width:100%;height:${imgHeight}%;
           object-fit:cover;object-position:top center;display:block}
  .bubble{
    position:absolute;background:#fffdf6;border:5px solid #0d0d0d;border-radius:28px;
    padding:14px 22px;text-align:center;font-family:'Bangers','Permanent Marker',Impact,sans-serif;
    color:#14171f;letter-spacing:1.5px;line-height:1.1;
    box-shadow:5px 6px 0 rgba(0,0,0,.35);
  }
  /* the tail */
  .bubble i{
    position:absolute;left:38px;bottom:-30px;width:0;height:0;
    border-left:16px solid transparent;border-right:26px solid transparent;
    border-top:32px solid #0d0d0d;
  }
  .bubble i::after{
    content:'';position:absolute;left:-10px;top:-36px;width:0;height:0;
    border-left:10px solid transparent;border-right:17px solid transparent;
    border-top:24px solid #fffdf6;
  }
</style></head>
<body><img class="base" src="${src}">${bubbleHtml}</body></html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png' });
    return await pngToWebp(chromium, png, opts.quality || 0.9);
  } finally {
    await browser.close();
  }
}
