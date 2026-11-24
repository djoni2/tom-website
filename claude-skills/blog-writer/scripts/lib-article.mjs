// Shared helpers: front matter parsing and a small Markdown -> HTML converter
// for the subset of Markdown the article drafts use.
import fs from 'node:fs';

/**
 * Parse the YAML front matter of a draft. Deliberately a subset parser:
 * `key: value`, quoted values, `[a, b]` inline lists and `- item` block lists.
 * Anything more exotic is a sign the draft is drifting from the template.
 */
export function parseDraft(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  // `offset` lets callers report line numbers that match the file on disk.
  if (!m) return { meta: {}, body: raw.trim(), raw, hasFrontMatter: false, offset: 0 };

  const meta = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && key) {
      if (!Array.isArray(meta[key])) meta[key] = [];
      meta[key].push(unquote(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const value = kv[2].trim();
    if (value === '') meta[key] = '';
    else if (/^\[.*\]$/.test(value)) {
      meta[key] = value.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    } else meta[key] = unquote(value);
  }
  const rest = raw.slice(m[0].length);
  const blankLead = rest.length - rest.replace(/^\n+/, '').length;
  return {
    meta,
    body: rest.trim(),
    raw,
    hasFrontMatter: true,
    offset: m[0].split('\n').length - 1 + blankLead,
  };
}

function unquote(s) {
  return s.replace(/^['"]/, '').replace(/['"]$/, '').trim();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  let out = esc(text);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}">`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

// The info block on the live site is Hyvor's native callout. This is exactly
// the markup the editor produces, and GET /misc/prosemirror/json turns it back
// into a `callout` node with the emoji and colours as attributes.
export const CALLOUT_BG = '#f1f1ef';
export const CALLOUT_FG = '#000000';
export const CALLOUT_EMOJI = '\u{1F4A1}';

// Raw HTML as a base64 marker, so it survives the HTML -> ProseMirror converter.
export const CUSTOM_HTML_RE = /^@@customhtml:([A-Za-z0-9+/=]+)@@$/;
function customHtmlMarker(html) {
  return `@@customhtml:${Buffer.from(html.trim(), 'utf8').toString('base64')}@@`;
}
// A verbatim ProseMirror node (written by pull-post.mjs for anything that has
// no Markdown form), carried the same way and put back exactly as it was.
export const CUSTOM_NODE_RE = /^@@customnode:([A-Za-z0-9+/=]+)@@$/;
function customNodeMarker(json) {
  JSON.parse(json); // fail loudly here rather than at the checkpoint call
  return `@@customnode:${Buffer.from(json.trim(), 'utf8').toString('base64')}@@`;
}

/**
 * Rewrite front-matter keys in a draft file, keeping every other line and the
 * key order as they are. New keys are appended before the closing `---`.
 * A value that is an array is written as `[a, b]`; null deletes the key.
 */
export function setFrontMatter(file, changes) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = raw.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fmt = (v) => (Array.isArray(v) ? `[${v.join(', ')}]` : String(v));
  const lines = m ? m[1].split('\n') : [];
  const pending = { ...changes };
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!kv || !(kv[1] in pending)) { out.push(lines[i]); continue; }
    const value = pending[kv[1]];
    delete pending[kv[1]];
    // Drop a following `- item` list that belonged to this key.
    while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) i++;
    if (value !== null && value !== undefined) out.push(`${kv[1]}: ${fmt(value)}`);
  }
  for (const [k, v] of Object.entries(pending)) {
    if (v !== null && v !== undefined) out.push(`${k}: ${fmt(v)}`);
  }
  const body = m ? text.slice(m[0].length) : text;
  const next = `---\n${out.join('\n')}\n---\n${body.replace(/^\n*/, '\n')}`;
  fs.writeFileSync(file, next.replace(/\n/g, nl));
}

function calloutHtml(emoji, text) {
  return `<aside style="background-color:${CALLOUT_BG};color:${CALLOUT_FG}">`
    + `<span>${emoji || CALLOUT_EMOJI}</span><div>${inline(text)}</div></aside>`;
}

/**
 * Markdown -> HTML for the article subset: headings, paragraphs, blockquotes,
 * lists, callouts, images, horizontal rules. The HTML then goes through Hyvor's
 * GET /misc/prosemirror/json so the editor owns the final document shape.
 *
 * Callouts are written as a fenced block:
 *
 *   :::callout 💡
 *   **Important**: the point worth pulling out of the story.
 *   :::
 *
 * The emoji is optional and defaults to the light bulb the site already uses.
 */
export function markdownToHtml(body) {
  const lines = body.split('\n');
  const out = [];
  let list = null;
  let para = [];
  let quote = [];
  let callout = null;

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const flushAll = () => { flushPara(); flushQuote(); flushList(); };

  let rawHtml = null;
  let rawNode = null;

  for (const line of lines) {
    const t = line.trim();

    // A :::html fence carries raw markup (an iframe embed). Hyvor's converter
    // drops iframes, so it travels as a marker paragraph that publish.mjs
    // swaps for a native `custom_html` node.
    if (rawHtml) {
      if (t === ':::') {
        out.push(`<p>${customHtmlMarker(rawHtml.join('\n'))}</p>`);
        rawHtml = null;
      } else {
        rawHtml.push(line);
      }
      continue;
    }
    if (/^:::\s*html\s*$/i.test(t)) { flushAll(); rawHtml = []; continue; }

    // A :::node fence carries one ProseMirror node as JSON, verbatim.
    if (rawNode) {
      if (t === ':::') {
        out.push(`<p>${customNodeMarker(rawNode.join('\n'))}</p>`);
        rawNode = null;
      } else {
        rawNode.push(line);
      }
      continue;
    }
    if (/^:::\s*node\s*$/i.test(t)) { flushAll(); rawNode = []; continue; }

    // Inside a callout fence everything is collected until the closing :::
    if (callout) {
      if (t === ':::') {
        out.push(calloutHtml(callout.emoji, callout.lines.join(' ')));
        callout = null;
      } else if (t) {
        callout.lines.push(t);
      }
      continue;
    }
    const open = t.match(/^:::\s*callout\s*(\S+)?\s*$/i);
    if (open) { flushAll(); callout = { emoji: open[1] || CALLOUT_EMOJI, lines: [] }; continue; }

    if (!t) { flushAll(); continue; }

    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushAll(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); out.push('<hr>'); continue; }

    const bq = t.match(/^>\s?(.*)$/);
    if (bq) { flushPara(); flushList(); quote.push(bq[1]); continue; }
    flushQuote();

    const ul = t.match(/^[-*+]\s+(.*)$/);
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { flushList(); out.push(`<${want}>`); list = want; }
      out.push(`<li><p>${inline((ul || ol)[1])}</p></li>`);
      continue;
    }
    flushList();

    const img = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) { flushPara(); out.push(`<figure><img src="${img[2]}" alt="${img[1]}"></figure>`); continue; }

    para.push(t);
  }
  // An unclosed fence still renders, rather than silently dropping the text.
  if (callout) out.push(calloutHtml(callout.emoji, callout.lines.join(' ')));
  flushAll();
  return out.join('\n');
}

/** Headline (first H1) and the body below it, which is what gets published. */
export function splitHeadline(body) {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => /^#\s+\S/.test(l.trim()));
  if (i === -1) return { headline: null, rest: body };
  return {
    headline: lines[i].trim().replace(/^#\s+/, '').trim(),
    rest: lines.slice(i + 1).join('\n').trim(),
  };
}

export function slugify(s) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80);
}
