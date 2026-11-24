#!/usr/bin/env node
// Mechanical style gate for a Times of Madeira summary post.
//   node lint-summary.mjs <draft.summary.md> [--allow word] [--json]
//
// Errors must be fixed before publishing. Warnings need a judgement call.
// It cannot check facts or a translation - only reading the sources beside the
// summary does that.
//
// Front matter parsing is shared with the blog-writer skill, which also owns
// the fetcher and the publisher this skill calls.
import { parseDraft } from '../../blog-writer/scripts/lib-article.mjs';

const args = process.argv.slice(2);
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allow') { i++; continue; }
  if (args[i].startsWith('--')) continue;
  file = args[i];
  break;
}
const asJson = args.includes('--json');
const allow = new Set(
  args.flatMap((a, i) => (a === '--allow' ? [String(args[i + 1] || '').toLowerCase()] : []))
);

if (!file) {
  console.error('usage: node lint-summary.mjs <draft.summary.md> [--allow word] [--json]');
  process.exit(2);
}

// Covers come from the blog's own media library, which the theme renders as a
// wide band above the headline. This one is the fallback when nothing fits.
const MEDIA_PREFIX = 'https://www.timesofmadeira.com/media/';
const PANORAMA = `${MEDIA_PREFIX}housing-crisis-shock-policy.webp`;

// Same banned list as the long form, with the plain replacement to reach for.
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

const AI_TELLS = [
  /\bin conclusion\b/gi,
  /\bin summary\b/gi,
  /\bit(?:'s| is) worth noting\b/gi,
  /\bdelve[sd]?\b/gi,
  /\ba testament to\b/gi,
  /\bthe (?:political |economic |media )?landscape\b/gi,
  /\btapestry\b/gi,
  /\bunderscor(?:e|es|ed|ing)\b/gi,
  /\bpivotal\b/gi,
  /\bcrucial\b/gi,
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
for (const key of ['title', 'description', 'cover_url']) {
  if (!meta[key]) errors.push({ line: 1, rule: 'front-matter', msg: `front matter is missing "${key}"` });
}
if (!meta.source_url && !meta.source_urls) {
  errors.push({ line: 1, rule: 'front-matter', msg: 'front matter is missing "source_url" (or "source_urls")' });
}
if (meta.cover_url && !meta.cover_url.startsWith(MEDIA_PREFIX)) {
  errors.push({ line: 1, rule: 'cover', msg: `cover_url must be an image already in the blog's library (${MEDIA_PREFIX}...), found ${meta.cover_url}` });
}
if (meta.cover_url === PANORAMA) {
  notes.push({ line: 1, rule: 'cover', msg: 'using the house panorama - correct only if no library image fitted the story; say so when reporting back' });
}
if (meta.cover_url && /\/[0-9a-f]{32}\.[a-z]+$/i.test(meta.cover_url)) {
  warnings.push({ line: 1, rule: 'cover', msg: 'that is a hash-named upload, not an editorial image - pick one by name with find-media.mjs' });
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

// Exactly two tags, both from the blog's existing taxonomy, never invented.
const tagList = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [];
if (tagList.length !== 2) {
  errors.push({ line: 1, rule: 'tags', msg: `${tagList.length} tags in front matter, the rule is exactly 2 - see blog-writer/references/tags.md` });
}
if (new Set(tagList.map((t) => t.toLowerCase())).size !== tagList.length) {
  errors.push({ line: 1, rule: 'tags', msg: 'the two tags must be different from each other' });
}

// --- banned words, dashes, times, emoji -------------------------------------
for (const [re, better] of BANNED) {
  for (const m of body.matchAll(re)) {
    if (allow.has(m[0].toLowerCase())) continue;
    errors.push({ line: lineOf(m.index), rule: 'banned-word', msg: `"${m[0]}" is on the banned list - use ${better}` });
  }
}
for (const m of body.matchAll(/[—–]/g)) {
  errors.push({ line: lineOf(m.index), rule: 'dash', msg: 'em/en dash found - write a plain hyphen "-" instead' });
}
for (const m of body.matchAll(/\b\d{1,2}(?::\d{2})?\s?(?:a\.?m\.?|p\.?m\.?)\b/gi)) {
  errors.push({ line: lineOf(m.index), rule: 'time-format', msg: `"${m[0].trim()}" - use 24-hour European time (08:00, 20:00)` });
}
// A summary carries no emoji at all, the callout fence included.
for (const m of body.matchAll(/\p{Extended_Pictographic}/gu)) {
  errors.push({ line: lineOf(m.index), rule: 'emoji', msg: `emoji "${m[0]}" - summaries carry none, not even in a callout` });
}
for (const m of body.matchAll(/[“”‘’]/g)) {
  warnings.push({ line: lineOf(m.index), rule: 'quote-mark', msg: 'curly quote - use straight quotes so the editor does not double-convert' });
}
// `![` opens a Markdown image, which is not an exclamation.
for (const m of body.matchAll(/!(?!\[)/g)) {
  warnings.push({ line: lineOf(m.index), rule: 'exclamation', msg: 'exclamation mark - a summary states the fact instead' });
}

// --- walk the body ----------------------------------------------------------
// Two passes. The first gives every line a kind; the second turns the prose
// line that follows a quote block into that quote's attribution, so the bold,
// quote, source and length rules each look at the right lines.
const kinds = [];       // one entry per body line
const callouts = [];    // { line, fence, text[] }
let inCallout = false;
let calloutCount = 0;

lines.forEach((l, i) => {
  const t = l.trim();
  if (/^:::\s*callout/i.test(t)) {
    inCallout = true;
    calloutCount++;
    kinds[i] = 'callout';
    callouts.push({ line: i + 1 + offset, fence: t, text: [] });
    return;
  }
  if (inCallout) {
    kinds[i] = 'callout';
    if (t === ':::') inCallout = false;
    else if (t) callouts[callouts.length - 1].text.push(t);
    return;
  }
  if (!t) { kinds[i] = 'blank'; return; }
  if (/^>/.test(t)) { kinds[i] = 'quote'; return; }
  if (/^#\s/.test(t)) { kinds[i] = 'h1'; return; }
  if (/^##\s/.test(t)) { kinds[i] = 'h2'; return; }
  if (/^#{3,}\s/.test(t)) { kinds[i] = 'h'; return; }
  if (/^!\[/.test(t)) { kinds[i] = 'image'; return; }
  if (/^[-*+]\s/.test(t) || /^\d+[.)]\s/.test(t)) { kinds[i] = 'list'; return; }
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { kinds[i] = 'rule'; return; }
  if (/^Source:/i.test(t)) { kinds[i] = 'source'; return; }
  if (/^Image:/i.test(t)) { kinds[i] = 'image-credit'; return; }
  kinds[i] = 'prose';
});
if (inCallout) errors.push({ line: 1, rule: 'callout', msg: 'a ::: callout fence was never closed' });

const lineNoAt = (i) => i + 1 + offset;
const quoteBlocks = [];  // { start, end, text[], attribution }
for (let i = 0; i < lines.length; i++) {
  if (kinds[i] !== 'quote') continue;
  const start = i;
  const text = [];
  while (i < lines.length && kinds[i] === 'quote') {
    text.push(lines[i].trim().replace(/^>\s?/, ''));
    i++;
  }
  const end = i - 1;
  // The speaker line is the next line of content, with or without a blank
  // line in between (the editor needs the blank line to end the quote node).
  // Only a short run counts: a full paragraph after the quote means the
  // attribution is missing, not that the paragraph is one.
  let j = i;
  while (j < lines.length && kinds[j] === 'blank') j++;
  let k = j;
  while (k < lines.length && kinds[k] === 'prose') k++;
  let attribution = null;
  if (k > j) {
    const text = lines.slice(j, k).map((l) => l.trim()).join(' ');
    if (text.split(/\s+/).filter(Boolean).length <= 14) {
      attribution = { text, line: lineNoAt(j) };
      for (let m = j; m < k; m++) kinds[m] = 'attribution';
    }
  }
  quoteBlocks.push({ start: lineNoAt(start), end: lineNoAt(end), text, attribution });
}

const paragraphs = [];   // prose that must carry a bold run
const sourceLines = [];  // the credit block at the end
const h2 = [];
let imageLines = 0;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  const lineNo = lineNoAt(i);
  // A wrapped paragraph is one paragraph: consecutive prose lines join up.
  if (kinds[i] === 'prose') {
    const start = i;
    while (i + 1 < lines.length && kinds[i + 1] === 'prose') i++;
    paragraphs.push({ text: lines.slice(start, i + 1).map((l) => l.trim()).join(' '), line: lineNoAt(start) });
    continue;
  }
  if (kinds[i] === 'source') sourceLines.push({ text: t, line: lineNo });
  else if (kinds[i] === 'h2') h2.push({ text: t.replace(/^##\s+/, ''), line: lineNo });
  else if (kinds[i] === 'image') imageLines++;
  else if (kinds[i] === 'image-credit') {
    errors.push({ line: lineNo, rule: 'image-credit', msg: 'no "Image:" credit on a summary - the cover is the fixed house panorama' });
  }
}

// --- quotes -----------------------------------------------------------------
if (quoteBlocks.length === 0) {
  notes.push({ line: 1, rule: 'quote', msg: 'no quote block - correct only if no source carries a usable quote' });
}
if (quoteBlocks.length > 1) {
  warnings.push({ line: quoteBlocks[1].start, rule: 'quote', msg: `${quoteBlocks.length} quote blocks; a summary runs the single most important one` });
}
for (const q of quoteBlocks) {
  const text = q.text.join(' ').trim();
  if (!q.attribution) {
    errors.push({ line: q.end, rule: 'quote-attribution', msg: 'quote has no speaker line directly underneath - add "**Name**, role"' });
  } else {
    if (!/\*\*[^*]+\*\*/.test(q.attribution.text)) {
      errors.push({ line: q.attribution.line, rule: 'quote-attribution', msg: `the speaker's name goes in bold: "${q.attribution.text.slice(0, 60)}"` });
    }
    const n = q.attribution.text.split(/\s+/).filter(Boolean).length;
    if (n > 12) {
      warnings.push({ line: q.attribution.line, rule: 'quote-attribution', msg: `the speaker line is ${n} words - name and role are enough` });
    }
  }
  if (/\*\*/.test(text)) {
    errors.push({ line: q.start, rule: 'quote-bold', msg: 'bold inside a quote - a quote is reproduced as it was said' });
  }
  if (/\[[^\]]+\]\(/.test(text)) {
    errors.push({ line: q.start, rule: 'quote-link', msg: 'link inside a quote - keep the quote plain' });
  }
  if (!/^["']/.test(text) || !/["']\.?$/.test(text)) {
    warnings.push({ line: q.start, rule: 'quote-marks', msg: 'the quote should sit inside straight quotation marks' });
  }
  notes.push({ line: q.start, rule: 'verify-quote', msg: `check this matches the source exactly, in meaning and in English: "${text.slice(0, 90)}${text.length > 90 ? '...' : ''}"` });
}

// --- the context callout ----------------------------------------------------
// One per summary, carrying context the source does not give. The linter can
// only check its shape; whether the context is true is a judgement call, and
// an unverified fact in here is worse than no callout at all.
if (calloutCount > 1) {
  errors.push({ line: callouts[1].line, rule: 'callout', msg: `${calloutCount} callouts - a summary carries exactly one` });
}
if (calloutCount === 0) {
  warnings.push({ line: 1, rule: 'callout', msg: 'no context callout - add one unless there is genuinely no context you can stand behind, and say so when reporting back' });
}
for (const c of callouts) {
  if (/^:::\s*callout\s+\S/i.test(c.fence)) {
    errors.push({ line: c.line, rule: 'callout', msg: `write a bare ":::callout" - the site adds its own icon, not "${c.fence}"` });
  }
  const text = c.text.join(' ');
  if (!text) {
    errors.push({ line: c.line, rule: 'callout', msg: 'callout is empty' });
    continue;
  }
  if (!/^\*\*[^*]+\*\*\s*:/.test(text)) {
    errors.push({ line: c.line, rule: 'callout', msg: 'callout opens with a bold label and a colon, e.g. "**Who he is**: ..."' });
  }
  const words = text.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;
  if (words > 45) {
    warnings.push({ line: c.line, rule: 'callout', msg: `callout is ${words} words - one or two short sentences is the format` });
  }
  // Hedged context is unverified context, and unverified context does not ship.
  // `\b` after a digit never matches mid-number, so the vague-figure hedges
  // ("about 2015") are a separate alternative with no trailing boundary.
  const HEDGE = /\b(?:probably|reportedly|allegedly|apparently|some say|it is believed|may have|might have|is thought to)\b|\b(?:roughly|about|around|some)\s+\d/gi;
  for (const m of text.matchAll(HEDGE)) {
    errors.push({ line: c.line, rule: 'callout-hedge', msg: `"${m[0]}" in the callout - context goes in only when you are sure of it` });
  }
  notes.push({ line: c.line, rule: 'verify-callout', msg: `confirm every fact here is true and does not go stale: "${text.replace(/\*\*/g, '').slice(0, 90)}${text.length > 90 ? '...' : ''}"` });
}

// --- Wikipedia links --------------------------------------------------------
// People only, English only, first mention only, three at most, and never in
// the headline or inside the quote.
const wikiLinks = [];
lines.forEach((l, i) => {
  for (const m of l.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    let host = '';
    try { host = new URL(m[2]).hostname.toLowerCase(); } catch { continue; }
    if (!/(^|\.)wikipedia\.org$/.test(host)) continue;
    wikiLinks.push({ label: m[1], url: m[2], host, line: i + 1 + offset, kind: kinds[i] });
  }
});
if (wikiLinks.length > 3) {
  errors.push({ line: wikiLinks[3].line, rule: 'wikipedia', msg: `${wikiLinks.length} Wikipedia links - three per summary is the limit` });
}
const seenWiki = new Set();
for (const w of wikiLinks) {
  if (w.host !== 'en.wikipedia.org') {
    errors.push({ line: w.line, rule: 'wikipedia', msg: `${w.host} - English Wikipedia only, or no link at all` });
  }
  if (w.kind === 'h1' || w.kind === 'h2' || w.kind === 'h') {
    errors.push({ line: w.line, rule: 'wikipedia', msg: 'no link in a headline or subheading' });
  }
  if (w.kind === 'quote') {
    errors.push({ line: w.line, rule: 'wikipedia', msg: 'no link inside the quote - it is reproduced as it was said' });
  }
  const key = w.url.replace(/[#?].*$/, '').toLowerCase();
  if (seenWiki.has(key)) {
    errors.push({ line: w.line, rule: 'wikipedia', msg: `${w.label} is linked twice - first mention only` });
  }
  seenWiki.add(key);
  if (/\/wiki\/[^/]*%3F|\/wiki\/$/i.test(w.url)) {
    errors.push({ line: w.line, rule: 'wikipedia', msg: `malformed Wikipedia URL: ${w.url}` });
  }
}
if (wikiLinks.length) {
  notes.push({
    line: wikiLinks[0].line,
    rule: 'verify-wikipedia',
    msg: `confirm with check-wikipedia.mjs: ${wikiLinks.map((w) => `"${w.label}"`).join(', ')}`,
  });
}

// --- bold keywords ----------------------------------------------------------
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
  if (bolds.length > 2) {
    warnings.push({ line: p.line, rule: 'bold', msg: `${bolds.length} bold runs in one paragraph - one is the norm, two at most` });
  }
}

// --- headings ---------------------------------------------------------------
const h1 = lines.filter((l) => /^#\s+\S/.test(l.trim()));
if (h1.length !== 1) {
  errors.push({ line: 1, rule: 'h1', msg: `found ${h1.length} H1 headlines, the summary needs exactly 1` });
}
if (h2.length === 0) {
  errors.push({ line: 1, rule: 'h2-count', msg: 'summary needs at least 1 H2 section' });
}
if (h2.length > 3) {
  warnings.push({ line: h2[3].line, rule: 'h2-count', msg: `${h2.length} H2 sections; a summary carries 1-3` });
}
for (const h of h2) {
  const words = h.text.split(/\s+/).filter(Boolean).length;
  if (words > 8) {
    errors.push({ line: h.line, rule: 'h2-length', msg: `H2 is ${words} words, the limit is 8: "${h.text}"` });
  }
  if (/[.!?]$/.test(h.text)) {
    warnings.push({ line: h.line, rule: 'h2-punctuation', msg: `H2 ends with punctuation: "${h.text}"` });
  }
}

// --- images -----------------------------------------------------------------
if (imageLines) {
  errors.push({ line: 1, rule: 'image', msg: `${imageLines} image(s) in the body - the fixed panorama cover is the only image` });
}

// --- the source block -------------------------------------------------------
// Every source gets its own paragraph, with the bare domain as the link text.
const SOURCE_RE = /^Source:\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/;
const domainOf = (host) => host.replace(/^www\./i, '').toLowerCase();
if (!sourceLines.length) {
  errors.push({ line: 1, rule: 'source', msg: 'no "Source: [domain](url)" line at the end of the summary' });
}
sourceLines.forEach((s, i) => {
  const m = s.text.match(SOURCE_RE);
  if (!m) {
    errors.push({ line: s.line, rule: 'source', msg: 'source line must read: Source: [domain](https://...)' });
    return;
  }
  const [, label, href] = m;
  let host = '';
  try { host = new URL(href).hostname; } catch { /* reported below */ }
  if (!host) {
    errors.push({ line: s.line, rule: 'source', msg: `source URL is not a valid URL: ${href}` });
  } else if (label !== domainOf(host)) {
    errors.push({ line: s.line, rule: 'source', msg: `the link text is the bare domain "${domainOf(host)}", not "${label}"` });
  }
  // Each source is its own paragraph, so the lines cannot be adjacent.
  const prev = sourceLines[i - 1];
  if (prev && s.line - prev.line < 2) {
    errors.push({ line: s.line, rule: 'source', msg: 'each source is its own paragraph - leave a blank line between them' });
  }
});
const declared = []
  .concat(meta.source_urls || [], meta.source_url ? [meta.source_url] : [])
  .filter(Boolean);
const linked = sourceLines.map((s) => (s.text.match(SOURCE_RE) || [])[2]).filter(Boolean);
for (const u of declared) {
  if (!linked.includes(u)) {
    warnings.push({ line: 1, rule: 'source', msg: `front matter names ${u}, which has no Source line` });
  }
}
const lastContent = [...lines].reverse().find((l) => l.trim());
if (sourceLines.length && lastContent && lastContent.trim() !== sourceLines[sourceLines.length - 1].text) {
  errors.push({ line: sourceLines[sourceLines.length - 1].line, rule: 'source', msg: 'the source block closes the summary - nothing comes after it' });
}

// --- length and readability (B2, short phrases) -----------------------------
const prose = paragraphs.map((p) => p.text).join(' ');
const bodyWords = prose.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;
if (bodyWords > 400) {
  errors.push({ line: 1, rule: 'length', msg: `${bodyWords} words of prose - over 400 is an article, not a summary (target 150-300)` });
} else if (bodyWords > 300 || bodyWords < 150) {
  warnings.push({ line: 1, rule: 'length', msg: `${bodyWords} words of prose; the target is 150-300` });
}

const sentences = [];
for (const p of paragraphs) {
  for (const s of p.text.split(/(?<=[.!?])\s+/)) {
    if (s.trim().length > 1) sentences.push({ text: s, line: p.line });
  }
}
let longest = 0;
let total = 0;
for (const { text, line } of sentences) {
  const n = text.split(/\s+/).filter(Boolean).length;
  total += n;
  longest = Math.max(longest, n);
  if (n > 25) {
    warnings.push({ line, rule: 'sentence-length', msg: `${n}-word sentence - split it, a summary runs on short phrases` });
  }
}
const avg = sentences.length ? total / sentences.length : 0;
if (avg > 20) {
  warnings.push({ line: 1, rule: 'readability', msg: `average sentence is ${avg.toFixed(1)} words; aim under 18 for a B2 summary` });
}
for (const p of paragraphs) {
  const n = p.text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 1).length;
  if (n > 3) {
    warnings.push({ line: p.line, rule: 'paragraph-length', msg: `${n} sentences in one paragraph - a summary paragraph runs 1-3` });
  }
}
notes.push({ line: 1, rule: 'stats', msg: `${bodyWords} words, ${sentences.length} sentences, avg ${avg.toFixed(1)}, longest ${longest}, ${paragraphs.length} paragraphs, ${sourceLines.length} source(s)` });

// --- AI tells ---------------------------------------------------------------
for (const re of AI_TELLS) {
  for (const m of body.matchAll(re)) {
    warnings.push({ line: lineOf(m.index), rule: 'ai-tell', msg: `"${m[0]}" reads as machine-written - rephrase` });
  }
}

// --- non-English leftovers --------------------------------------------------
// A summary translated from Portuguese sometimes keeps a word or a whole quote
// in the original. These are the giveaways worth a second look.
const LEFTOVERS = /\b(?:disse|afirmou|segundo|governo regional|câmara municipal|não|também|sobre o|que a|dos|das|sagte|laut|der Regierung)\b/gi;
for (const m of body.matchAll(LEFTOVERS)) {
  warnings.push({ line: lineOf(m.index), rule: 'language', msg: `"${m[0]}" is not English - the whole post, quotes included, runs in English` });
}

// --- report -----------------------------------------------------------------
if (asJson) {
  console.log(JSON.stringify({ file, errors, warnings, notes }, null, 2));
} else {
  const show = (label, list) => {
    if (!list.length) return;
    console.log(`\n${label} (${list.length})`);
    for (const e of [...list].sort((a, b) => a.line - b.line)) {
      console.log(`  ${String(e.line).padStart(4)}  ${e.rule.padEnd(17)} ${e.msg}`);
    }
  };
  console.log(`lint ${file}`);
  show('ERRORS - must fix', errors);
  show('WARNINGS - judge each', warnings);
  show('NOTES', notes);
  console.log(errors.length ? `\nFAIL: ${errors.length} error(s)` : '\nPASS: no errors');
}
process.exit(errors.length ? 1 : 0);
