#!/usr/bin/env node
// Mechanical style gate for a Times of Madeira draft.
//   node lint-article.mjs <draft.md> [--allow word] [--json]
// Errors must be fixed before publishing. Warnings need a judgement call.
// It cannot check facts - only re-reading the source against the draft does that.
import { parseDraft } from './lib-article.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const asJson = args.includes('--json');
const allow = new Set(
  args.flatMap((a, i) => (a === '--allow' ? [String(args[i + 1] || '').toLowerCase()] : []))
);

if (!file) {
  console.error('usage: node lint-article.mjs <draft.md> [--allow word] [--json]');
  process.exit(2);
}

// Every inflection of the banned words, with the plain replacement to reach for.
const BANNED = [
  [/\bboost(s|ed|ing)?\b/gi, 'increase / raise / help'],
  [/\bhead(ing|ings|ed)\b/gi, 'go to / lead / title'],
  [/\bspark(s|ed|ing)?\b/gi, 'start / cause / set off'],
  [/\benhanc(e|es|ed|ing|ement|ements)\b/gi, 'improve'],
  [/\bmark(s|ed|ing)\b/gi, 'is / shows / records'],
  [/\bbolster(s|ed|ing)?\b/gi, 'strengthen / support'],
  [/\bequit(y|ies)\b/gi, 'fairness / equal treatment'],
  [/\boutpac(e|es|ed|ing)\b/gi, 'grow faster than'],
  [/\bsoar(s|ed|ing)?\b/gi, 'rise sharply / increase'],
  [/\bdisparit(y|ies)\b/gi, 'gap / difference'],
  [/\bpropel(s|led|ling)?\b/gi, 'push / drive'],
  [/\bleverag(e|es|ed|ing)\b/gi, 'use'],
  [/\breflect(s|ed|ing)?\b/gi, 'show / match / is in line with'],
  [/\bexacerbat(e|es|ed|ing)\b/gi, 'make worse'],
  [/\bdampen(s|ed|ing)?\b/gi, 'reduce / weaken'],
  [/\bmarks a shift\b/gi, 'is a change'],
];

// Phrases that read as machine-written. Warnings, not errors.
const AI_TELLS = [
  /\bin conclusion\b/gi,
  /\bit(?:'s| is) worth noting\b/gi,
  /\bdelve[sd]?\b/gi,
  /\ba testament to\b/gi,
  /\bthe (?:political |economic |media )?landscape\b/gi,
  /\btapestry\b/gi,
  /\bunderscor(?:e|es|ed|ing)\b/gi,
  /\bpivotal\b/gi,
  /\bcrucial\b/gi,
  /\bnavigat(?:e|es|ed|ing) the\b/gi,
  /\bgame[- ]chang(?:er|ing)\b/gi,
  /\brobust\b/gi,
  /\bmyriad\b/gi,
  /\bfurthermore\b/gi,
  /\bmoreover\b/gi,
];

const errors = [];
const warnings = [];
const notes = [];

const { meta, body, hasFrontMatter, offset } = parseDraft(file);
const lines = body.split('\n');
// +offset so reported lines match the file on disk, front matter included.
const lineOf = (index) => body.slice(0, Math.max(0, index)).split('\n').length + offset;

// --- front matter -----------------------------------------------------------
if (!hasFrontMatter) {
  errors.push({ line: 1, rule: 'front-matter', msg: 'draft has no YAML front matter' });
}
for (const key of ['title', 'description', 'source_url']) {
  if (!meta[key]) errors.push({ line: 1, rule: 'front-matter', msg: `front matter is missing "${key}"` });
}
if (meta.description && meta.description.length > 350) {
  errors.push({ line: 1, rule: 'description', msg: `description is ${meta.description.length} chars, the API limit is 350` });
}
if (meta.description && (meta.description.length < 80 || meta.description.length > 170)) {
  warnings.push({ line: 1, rule: 'description', msg: `description is ${meta.description.length} chars; 110-160 reads best in search results` });
}
if (meta.title && meta.title.length > 70) {
  warnings.push({ line: 1, rule: 'title', msg: `title is ${meta.title.length} chars; search results cut off near 60-70` });
}
// Every article carries exactly two tags, both from the blog's taxonomy.
const tagList = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [];
if (tagList.length !== 2) {
  errors.push({ line: 1, rule: 'tags', msg: `${tagList.length} tags in front matter, the rule is exactly 2 - see references/tags.md` });
}
if (new Set(tagList.map((t) => t.toLowerCase())).size !== tagList.length) {
  errors.push({ line: 1, rule: 'tags', msg: 'the two tags must be different' });
}

// --- banned words -----------------------------------------------------------
for (const [re, better] of BANNED) {
  for (const m of body.matchAll(re)) {
    if (allow.has(m[0].toLowerCase())) continue;
    errors.push({ line: lineOf(m.index), rule: 'banned-word', msg: `"${m[0]}" is on the banned list - use ${better}` });
  }
}

// --- dashes, times, quotes --------------------------------------------------
for (const m of body.matchAll(/[—–]/g)) {
  errors.push({ line: lineOf(m.index), rule: 'dash', msg: 'em/en dash found - write a plain hyphen "-" instead' });
}
for (const m of body.matchAll(/\b\d{1,2}(?::\d{2})?\s?(?:a\.?m\.?|p\.?m\.?)\b/gi)) {
  errors.push({ line: lineOf(m.index), rule: 'time-format', msg: `"${m[0].trim()}" - use 24-hour European time (08:00, 20:00)` });
}
for (const m of body.matchAll(/[“”‘’]/g)) {
  warnings.push({ line: lineOf(m.index), rule: 'quote-mark', msg: 'curly quote - use straight quotes so the editor does not double-convert' });
}

// --- bold keywords, callouts and the source line ----------------------------
// Every paragraph has to carry a bold run of 1-4 words. The source line and
// the inside of a callout are the only paragraphs exempt.
const SOURCE_RE = /^Source:\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/;
// Named outlets are linked by name, not by bare URL.
const OUTLETS = [
  [/(^|\.)dnoticias\.pt$/i, 'Diário de Notícias da Madeira'],
  [/(^|\.)rtp\.pt$/i, 'RTP Madeira'],
  [/(^|\.)jornaldamadeira\.pt$/i, 'Jornal da Madeira'],
];

let inCallout = false;
let calloutCount = 0;
let sourceLine = null;
let imageLine = null;
const paragraphs = [];

lines.forEach((l, i) => {
  const t = l.trim();
  const lineNo = i + 1 + offset;
  if (/^:::\s*callout/i.test(t)) { inCallout = true; calloutCount++; return; }
  if (inCallout) { if (t === ':::') inCallout = false; return; }
  if (!t || /^[#>\-*]/.test(t) || /^\d+[.)]/.test(t) || /^!\[/.test(t)) return;
  if (/^Source:/i.test(t)) { sourceLine = { text: t, line: lineNo }; return; }
  if (/^Image:/i.test(t)) { imageLine = { text: t, line: lineNo }; return; }
  paragraphs.push({ text: t, line: lineNo });
});

// A run of three or more named things usually reads better as a list. Two
// items stay in the sentence, so the pattern needs at least two before the
// "and" plus the one after it.
const ITEM = "(?:'[^'\\n]{2,40}'|[A-Z][\\w'’-]*(?: [A-Z][\\w'’-]*)*)";
const SERIES = new RegExp(`${ITEM}(?:,\\s+${ITEM}){1,},?\\s+and\\s+${ITEM}`);
for (const p of paragraphs) {
  const quoted = (p.text.match(/'[^'\n]{2,40}'/g) || []).length;
  if (quoted >= 3 || SERIES.test(p.text)) {
    notes.push({ line: p.line, rule: 'enumeration', msg: 'three or more named items in one sentence - consider a bullet list instead' });
  }
}

if (inCallout) {
  errors.push({ line: 1, rule: 'callout', msg: 'a ::: callout fence was never closed' });
}
if (calloutCount < 1 || calloutCount > 2) {
  errors.push({ line: 1, rule: 'callout', msg: `${calloutCount} callout blocks; every article needs 1 or 2` });
}

for (const p of paragraphs) {
  const bolds = [...p.text.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
  if (bolds.length === 0) {
    errors.push({ line: p.line, rule: 'bold', msg: 'paragraph has no bold keywords - mark the 1-4 most important consecutive words' });
    continue;
  }
  for (const b of bolds) {
    const n = b.split(/\s+/).filter(Boolean).length;
    if (n > 4) {
      errors.push({ line: p.line, rule: 'bold', msg: `bold run is ${n} words, the limit is 4: "${b}"` });
    }
  }
}

if (!sourceLine) {
  errors.push({ line: 1, rule: 'source', msg: 'no "Source: [name](url)" line at the end of the article' });
} else {
  const m = sourceLine.text.match(SOURCE_RE);
  if (!m) {
    errors.push({ line: sourceLine.line, rule: 'source', msg: 'source line must read: Source: [link text](https://...)' });
  } else {
    const [, label, href] = m;
    let host = '';
    try { host = new URL(href).hostname; } catch { /* malformed URLs are caught below */ }
    if (!host) {
      errors.push({ line: sourceLine.line, rule: 'source', msg: `source URL is not a valid URL: ${href}` });
    }
    const outlet = OUTLETS.find(([re]) => re.test(host));
    if (outlet && label !== outlet[1]) {
      errors.push({ line: sourceLine.line, rule: 'source', msg: `link text for ${host} must be "${outlet[1]}", not "${label}"` });
    }
    if (!outlet && label !== href) {
      notes.push({ line: sourceLine.line, rule: 'source', msg: `${host} is not a named outlet, so the link text is normally the URL itself` });
    }
  }
  // The credit block closes the article: Source, then Image when the cover
  // was made by a model, and nothing after it.
  const lastContent = [...lines].reverse().find((l) => l.trim());
  const expectedLast = imageLine ? imageLine.text : sourceLine.text;
  if (lastContent && lastContent.trim() !== expectedLast) {
    warnings.push({ line: sourceLine.line, rule: 'source', msg: 'the credit block (Source, then Image) should close the article' });
  }
  if (imageLine) {
    if (imageLine.line < sourceLine.line) {
      errors.push({ line: imageLine.line, rule: 'image-credit', msg: 'the "Image:" line belongs directly under "Source:", not above it' });
    }
    if (!/^Image:\s*AI$/.test(imageLine.text)) {
      errors.push({ line: imageLine.line, rule: 'image-credit', msg: `the credit for a generated cover reads exactly "Image: AI", not "${imageLine.text}"` });
    }
  } else {
    notes.push({ line: sourceLine.line, rule: 'image-credit', msg: 'no "Image: AI" line - add one directly under Source if the cover was generated by a model' });
  }
}

// --- headings ---------------------------------------------------------------
const h1 = lines.filter((l) => /^#\s+\S/.test(l.trim()));
if (h1.length !== 1) {
  errors.push({ line: 1, rule: 'h1', msg: `found ${h1.length} H1 headlines, the article needs exactly 1` });
}

const h2 = [];
lines.forEach((l, i) => {
  const m = l.trim().match(/^##\s+(.*)$/);
  if (m) h2.push({ text: m[1].trim(), line: i + 1 + offset });
});
if (h2.length < 3) {
  warnings.push({ line: 1, rule: 'h2-count', msg: `only ${h2.length} H2 sections; 4-6 usually structures a news article better` });
}
for (const h of h2) {
  const words = h.text.split(/\s+/).filter(Boolean).length;
  if (words < 6 || words > 15) {
    errors.push({ line: h.line, rule: 'h2-length', msg: `H2 is ${words} words, the rule is 6-15: "${h.text}"` });
  }
  if (!/\d/.test(h.text)) {
    notes.push({ line: h.line, rule: 'h2-data', msg: `H2 has no figure or date - confirm the source offers no concrete data point here: "${h.text}"` });
  }
  if (/[.!?]$/.test(h.text)) {
    warnings.push({ line: h.line, rule: 'h2-punctuation', msg: `H2 ends with punctuation: "${h.text}"` });
  }
}

// A figure repeated across two H2s means two sections preview the same fact.
const figures = new Map();
for (const h of h2) {
  const found = new Set((h.text.match(/\d+(?:[.,]\d+)*\s?%?/g) || []).map((s) => s.trim()));
  for (const f of found) {
    if (!figures.has(f)) figures.set(f, []);
    figures.get(f).push(h.line);
  }
}
for (const [f, where] of figures) {
  if (where.length > 1) {
    warnings.push({ line: where[0], rule: 'h2-repeat', msg: `figure "${f}" appears in ${where.length} H2s (lines ${where.join(', ')}) - give each section a distinct angle` });
  }
}

// --- readability (B2) -------------------------------------------------------
// Measured line by line so a flagged sentence points at the line it is on.
// Headings, list items and blockquotes are not prose and stay out: a
// blockquote is usually a verbatim quote, which is not ours to shorten.
const sentences = [];
lines.forEach((l, i) => {
  const t = l.trim();
  if (!t || /^[#>\-*]/.test(t) || /^\d+[.)]/.test(t) || t.startsWith(':::')) return;
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    if (s.trim().length > 1) sentences.push({ text: s, line: i + 1 + offset });
  }
});
let longest = 0;
let total = 0;
for (const { text, line } of sentences) {
  const n = text.split(/\s+/).filter(Boolean).length;
  total += n;
  longest = Math.max(longest, n);
  if (n > 32) {
    warnings.push({ line, rule: 'sentence-length', msg: `${n}-word sentence - split it for a B2 reader` });
  }
}
const avg = sentences.length ? total / sentences.length : 0;
if (avg > 23) {
  warnings.push({ line: 1, rule: 'readability', msg: `average sentence is ${avg.toFixed(1)} words; aim under 22 for B2` });
}
notes.push({ line: 1, rule: 'stats', msg: `${sentences.length} sentences, avg ${avg.toFixed(1)} words, longest ${longest}` });

// --- AI tells ---------------------------------------------------------------
for (const re of AI_TELLS) {
  for (const m of body.matchAll(re)) {
    warnings.push({ line: lineOf(m.index), rule: 'ai-tell', msg: `"${m[0]}" reads as machine-written - rephrase` });
  }
}

// --- quotes to verify -------------------------------------------------------
const quoted = [...body.matchAll(/"([^"\n]{12,})"/g)].map((m) => m[1]);
const blockquotes = lines.filter((l) => /^>\s?\S/.test(l.trim())).length;
if (quoted.length === 0 && blockquotes === 0) {
  warnings.push({ line: 1, rule: 'quote', msg: 'no quote in the article - include one if the source has a usable one' });
}
for (const q of quoted) {
  notes.push({ line: lineOf(body.indexOf(q)), rule: 'verify-quote', msg: `check this is verbatim in the source: "${q.slice(0, 90)}${q.length > 90 ? '...' : ''}"` });
}

// --- report -----------------------------------------------------------------
if (asJson) {
  console.log(JSON.stringify({ file, errors, warnings, notes }, null, 2));
} else {
  const show = (label, list) => {
    if (!list.length) return;
    console.log(`\n${label} (${list.length})`);
    for (const e of [...list].sort((a, b) => a.line - b.line)) {
      console.log(`  ${String(e.line).padStart(4)}  ${e.rule.padEnd(16)} ${e.msg}`);
    }
  };
  console.log(`lint ${file}`);
  show('ERRORS - must fix', errors);
  show('WARNINGS - judge each', warnings);
  show('NOTES', notes);
  console.log(errors.length ? `\nFAIL: ${errors.length} error(s)` : '\nPASS: no errors');
}
process.exit(errors.length ? 1 : 0);
