#!/usr/bin/env node
// Check that an English Wikipedia article exists before linking a name.
//
//   node check-wikipedia.mjs "Miguel Albuquerque" "Emanuel Camara"
//   node check-wikipedia.mjs --json "Cristiano Ronaldo"
//
// Prints one line per name:
//   EXISTS          <url>   safe to link, use this URL
//   REDIRECT        <url>   the name redirects to that article; link it
//   DISAMBIGUATION  <url>   a list page, NOT a usable link
//   MISSING                 no English article; do not link at all
//
// Guessing a Wikipedia URL is how dead links and wrong-person links ship, so
// every link in a summary goes through this first.
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const names = argv.filter((a) => !a.startsWith('--'));

if (!names.length) {
  console.error('usage: node check-wikipedia.mjs [--json] "Name One" "Name Two"');
  process.exit(2);
}

const API = 'https://en.wikipedia.org/w/api.php';
const results = [];

for (const name of names) {
  const url = `${API}?action=query&format=json&redirects=1&prop=info|pageprops`
    + `&inprop=url&ppprop=disambiguation&titles=${encodeURIComponent(name)}`;
  let data;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'times-of-madeira-blog-summary/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    results.push({ name, status: 'ERROR', detail: e.message });
    continue;
  }

  const query = data.query || {};
  const pages = Object.values(query.pages || {});
  const page = pages[0];
  // `redirects` tells us the title we asked for is not the article's own title.
  const redirected = (query.redirects || []).some((r) => r.from === name);

  if (!page || page.missing !== undefined) {
    results.push({ name, status: 'MISSING' });
    continue;
  }
  const link = page.fullurl
    || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
  if (page.pageprops && page.pageprops.disambiguation !== undefined) {
    results.push({ name, status: 'DISAMBIGUATION', title: page.title, url: link });
    continue;
  }
  results.push({ name, status: redirected ? 'REDIRECT' : 'EXISTS', title: page.title, url: link });
}

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) {
    const tail = r.url ? `  ${r.url}${r.title && r.title !== r.name ? `  (${r.title})` : ''}` : (r.detail ? `  ${r.detail}` : '');
    console.log(`${r.status.padEnd(15)} ${r.name}${tail}`);
  }
  const usable = results.filter((r) => r.status === 'EXISTS' || r.status === 'REDIRECT').length;
  console.log(`\n${usable} of ${results.length} name(s) safe to link. Link at most 3 per summary.`);
}

// A missing article is a normal answer, not a failure: exit 0 unless a lookup
// itself broke.
process.exit(results.some((r) => r.status === 'ERROR') ? 1 : 0);
