#!/usr/bin/env node
// Builds the related-article preview card for a /bs2 article from the LIVE
// page, so the title, cover and description are what readers actually see
// (a post can be edited in Hyvor after it was drafted).
//
//   node make-related.mjs <live timesofmadeira.com URL> [--alt "short alt text"]
//
// Prints the :::html fence to paste into the draft. Fails if the page is not
// reachable or has no og:image, rather than guessing.

const meta = (html, name) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i');
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : null;
};
const decode = (s) => (s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function main() {
  const url = process.argv[2];
  const altIdx = process.argv.indexOf('--alt');
  const altArg = altIdx === -1 ? null : process.argv[altIdx + 1];
  if (!url || !/^https:\/\/(www\.)?timesofmadeira\.com\//.test(url)) {
    console.error('usage: make-related.mjs <https://www.timesofmadeira.com/...> [--alt "..."]');
    process.exitCode = 2;
    return;
  }

  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Times of Madeira related-card builder)' } });
  if (res.status !== 200) {
    console.error(`make-related: ${url} returned HTTP ${res.status}`);
    process.exitCode = 1;
    return;
  }
  const html = await res.text();

  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '');
  const title = decode(meta(html, 'og:title') || h1 || (html.match(/<title>([^<]*)<\/title>/i) || [])[1]);
  const image = decode(meta(html, 'og:image'));
  const description = decode(meta(html, 'description') || meta(html, 'og:description'));
  const canonical = decode(meta(html, 'og:url')) || url;

  const missing = [!title && 'title', !image && 'og:image', !description && 'description'].filter(Boolean);
  if (missing.length) {
    console.error(`make-related: the live page has no ${missing.join(', ')} - cannot build the card`);
    process.exitCode = 1;
    return;
  }

  const alt = altArg || title.replace(/\s+/g, ' ');
  console.error(`title: ${title}\nimage: ${image}\ndescription: ${description}\n`);
  console.log(`:::html
<div style="margin:1.2em 0"><a href="${esc(canonical)}" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:12px;box-sizing:border-box"><img src="${esc(image)}" alt="${esc(alt)}" style="width:110px;height:82px;object-fit:cover;border-radius:6px;flex:0 0 auto"><span style="min-width:0;display:block"><span style="font-size:.78em;text-transform:uppercase;letter-spacing:.04em;opacity:.65;margin-bottom:4px;display:block">Related</span><span style="font-weight:700;font-size:1.03em;line-height:1.3;display:block;margin-bottom:3px">${esc(title)}</span><span style="font-size:.88em;line-height:1.35;opacity:.75;display:block">${esc(description)}</span></span></a></div>
:::`);
}

await main();
