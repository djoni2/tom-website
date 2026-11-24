#!/usr/bin/env node
// Search the Times of Madeira media library for a cover that fits the story.
//
//   node find-media.mjs tap airline privatisation
//   node find-media.mjs --download <dir> tap madeira airport
//   node find-media.mjs --all                      (dump every file, newest first)
//   node find-media.mjs --refresh tap              (ignore the cached listing)
//
// Filenames are only a rough index of 1,800+ files, so this ranks candidates
// by name and then DOWNLOADS the top ones with --download. Look at those
// images before choosing: the name "tap-air2" turns out to be a cut-out on a
// pink gradient, and "madeira-airport-plane" is the best TAP photo on the blog.
//
// Needs the production Console key (~/.hyvor/console-key-prod): the media
// library lives on the live blog, and the dev key is refused there.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const argOf = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const downloadDir = argOf('download');
const limit = Number(argOf('top') || 8);
const terms = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--download' && argv[i - 1] !== '--top')
  .map((t) => t.toLowerCase());

if (!terms.length && !flag('all')) {
  console.error('usage: node find-media.mjs [--download <dir>] [--top N] [--all] [--refresh] <terms...>');
  process.exit(2);
}

const BLOG = 'times-of-madeira';
const BASE = `https://blogs.hyvor.com/api/console/v0/blog/${BLOG}`;
const CACHE = path.join(os.tmpdir(), `tom-media-${BLOG}.json`);
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function readKey() {
  const f = path.join(os.homedir(), '.hyvor', 'console-key-prod');
  if (process.env.HYVOR_CONSOLE_KEY_PROD) return process.env.HYVOR_CONSOLE_KEY_PROD.trim();
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  return null;
}

async function loadMedia() {
  if (!flag('refresh') && fs.existsSync(CACHE)) {
    const age = Date.now() - fs.statSync(CACHE).mtimeMs;
    if (age < CACHE_TTL_MS) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  }
  const key = readKey();
  if (!key) {
    console.error(`No production key at ${path.join(os.homedir(), '.hyvor', 'console-key-prod')}`);
    process.exit(3);
  }
  const all = [];
  // `page=` is ignored by this endpoint - offset is the only paging that works.
  for (let offset = 0; offset < 20000; offset += 100) {
    const res = await fetch(`${BASE}/media?limit=100&offset=${offset}`, { headers: { 'X-API-KEY': key } });
    if (!res.ok) throw new Error(`GET /media failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < 100) break;
  }
  fs.writeFileSync(CACHE, JSON.stringify(all));
  return all;
}

const media = await loadMedia();
media.sort((a, b) => (b.uploaded_at || 0) - (a.uploaded_at || 0));

if (flag('all')) {
  for (const m of media) console.log(m.url);
  console.error(`\n${media.length} files.`);
  process.exit(0);
}

// Score by how many query terms the filename carries, with a whole-word match
// worth more than a substring so "tap" does not win on "landscape".
const scored = [];
for (const m of media) {
  const name = m.name.toLowerCase().replace(/\.[a-z0-9]+$/, '');
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  let score = 0;
  const matched = [];
  for (const t of terms) {
    if (words.includes(t)) { score += 3; matched.push(t); }
    else if (name.includes(t)) { score += 1; matched.push(t); }
  }
  if (score) scored.push({ ...m, score, matched: [...new Set(matched)] });
}
scored.sort((a, b) => b.score - a.score || (b.uploaded_at || 0) - (a.uploaded_at || 0));

if (!scored.length) {
  console.log(`No filename matches for: ${terms.join(', ')}`);
  console.log('Try broader terms, or fall back to the house panorama image.');
  process.exit(0);
}

const shown = scored.slice(0, Math.max(limit, 1));
for (const m of shown) {
  console.log(`${String(m.score).padStart(2)}  ${m.url}   [${m.matched.join(' ')}]`);
}
console.log(`\n${scored.length} match(es), showing ${shown.length}.`);

if (downloadDir) {
  fs.mkdirSync(downloadDir, { recursive: true });
  console.log('');
  for (const m of shown) {
    const res = await fetch(m.url);
    const buf = Buffer.from(await res.arrayBuffer());
    // Files served as .jpg are often WebP bytes; keep the library name so the
    // URL and the local file stay in step.
    const out = path.join(downloadDir, m.name);
    fs.writeFileSync(out, buf);
    console.log(`${res.status}  ${String(Math.round(buf.length / 1024)).padStart(4)}KB  ${out}`);
  }
  console.log('\nNow LOOK at these files before choosing one.');
}
