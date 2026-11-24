#!/usr/bin/env node
// Fetch a source page and print its readable text plus the metadata a reporter
// needs (title, byline, publication date, language, original-language quotes).
//
//   node fetch-source.mjs <url> [--out source.txt] [--json] [--raw raw.html]
//
// Plain fetch and strip: no renderer, no reader service. If the page is a
// JavaScript shell or behind a paywall the text will be short, and the script
// says so rather than pretending it read the article.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const url = argv.find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.error('usage: node fetch-source.mjs <url> [--out source.txt] [--json] [--raw raw.html]');
  process.exit(2);
}

const res = await fetch(url, {
  redirect: 'follow',
  headers: {
    // A plain desktop UA: some regional news sites return an error page to
    // an unidentified client.
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
  },
});
const html = await res.text();
if (arg('raw')) fs.writeFileSync(arg('raw'), html);
if (!res.ok) console.error(`warning: HTTP ${res.status} from ${res.url}`);

const pick = (re) => (html.match(re) || [])[1]?.trim() || null;
const metaTag = (name) =>
  pick(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'))
  || pick(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, 'i'));

// Portuguese sources lean on named entities for accents, so these have to be
// decoded properly - blanking them silently corrupts names and quotes.
const NAMED = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', laquo: '"', raquo: '"',
  ndash: '-', mdash: '-', hellip: '...', euro: '€', deg: '°',
  ordm: 'º', ordf: 'ª', middot: '·', bull: '•',
  aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', auml: 'ä',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
  oacute: 'ó', ograve: 'ò', ocirc: 'ô', otilde: 'õ', ouml: 'ö',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  ccedil: 'ç', ntilde: 'ñ', yacute: 'ý',
};
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-zA-Z]+);/g, (full, name) => {
    const lower = name.toLowerCase();
    const hit = NAMED[lower];
    if (hit === undefined) return full;
    // &Aacute; is the capital of &aacute;
    return name[0] === name[0].toUpperCase() && lower !== name ? hit.toUpperCase() : hit;
  });

// JSON-LD often carries the cleanest date and byline.
const ld = [];
for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
  try { ld.push(JSON.parse(m[1].trim())); } catch { /* malformed blocks are common */ }
}
const flatLd = ld.flatMap((x) => (Array.isArray(x) ? x : x && x['@graph'] ? x['@graph'] : [x])).filter(Boolean);
const article = flatLd.find((x) => /article|newsarticle|report/i.test(String(x['@type'] || ''))) || {};
const authorOf = (a) => (Array.isArray(a) ? a.map(authorOf).filter(Boolean).join(', ') : a && (a.name || a['@id'])) || null;

const meta = {
  url: res.url,
  status: res.status,
  title: decode(article.headline || metaTag('og:title') || pick(/<title[^>]*>([\s\S]*?)<\/title>/i) || ''),
  description: decode(metaTag('og:description') || metaTag('description') || ''),
  author: decode(authorOf(article.author) || metaTag('article:author') || metaTag('author') || ''),
  published: article.datePublished || metaTag('article:published_time') || metaTag('date') || null,
  modified: article.dateModified || metaTag('article:modified_time') || null,
  site: decode(metaTag('og:site_name') || new URL(res.url).hostname),
  language: pick(/<html[^>]+lang=["']([^"']+)["']/i),
  og_image: metaTag('og:image') ? decode(metaTag('og:image')) : null,
};

// Prefer the article element; fall back to main, then the whole body.
let scope = html;
const scoped = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
if (scoped && scoped[1].length > 600) scope = scoped[1];

const text = scope
  .replace(/<(script|style|noscript|svg|iframe|form|nav|aside|header|footer)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<\/(p|div|li|h[1-6]|blockquote|section|tr)>/gi, '\n\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((l) => decode(l).replace(/[ \t ]+/g, ' ').trim())
  .filter((l, i, a) => l.length > 0 && l !== a[i - 1])
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const words = text.split(/\s+/).filter(Boolean).length;

// Quotation marks used by Portuguese and English sources, so the writer can
// find the exact wording to translate rather than paraphrasing from memory.
const quotes = [...new Set(
  [...text.matchAll(/[«"“]([^»"”\n]{25,400})[»"”]/g)]
    .map((m) => m[1].trim())
    // Drop template and markup debris so the list stays quotable prose.
    .filter((q) => !/[<>{}|#\[\]]/.test(q) && /^[\p{Lu}\p{Ll}]/u.test(q) && q.split(/\s+/).length >= 5)
)];

const out = { ...meta, words, quotes, text };

if (argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const header = [
    `URL:        ${out.url}`,
    `TITLE:      ${out.title}`,
    `SITE:       ${out.site}`,
    `AUTHOR:     ${out.author || '(none found)'}`,
    `PUBLISHED:  ${out.published || '(none found)'}`,
    `LANGUAGE:   ${out.language || '(unknown)'}`,
    `WORDS:      ${out.words}`,
    `OG IMAGE:   ${out.og_image || '-'}`,
    '',
    quotes.length ? `QUOTED PASSAGES IN SOURCE (${quotes.length}):` : 'QUOTED PASSAGES IN SOURCE: none detected',
    ...quotes.map((q, i) => `  [${i + 1}] ${q}`),
    '',
    '--- TEXT ---',
    '',
  ].join('\n');
  const body = header + text;
  if (arg('out')) {
    fs.writeFileSync(arg('out'), body);
    console.log(`${arg('out')} written (${words} words)`);
  } else {
    console.log(body);
  }
}

if (words < 180) {
  console.error('\nwarning: fewer than 180 words extracted. The page is probably rendered by JavaScript or behind a paywall.');
  console.error('Ask the user to paste the article text, or try the AMP version / the source of the report.');
  // exitCode, not exit(): an abrupt exit while sockets are open trips a libuv
  // assertion on Windows.
  process.exitCode = 4;
}
