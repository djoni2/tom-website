// ProseMirror JSON (as Hyvor stores a post's content) -> the Markdown dialect
// that lib-article.mjs's markdownToHtml() understands, so a live post can be
// pulled back into its .summary.md draft before it is edited and re-published.
//
// The mapping mirrors markdownToHtml():
//   paragraph        -> text with **bold**, *em*, `code`, [link](href)
//   heading          -> #, ##, ...
//   blockquote       -> > text
//   bullet_list      -> - item          ordered_list -> 1. item
//   horizontal_rule  -> ---
//   figure/image     -> ![alt](src)
//   callout          -> :::callout <emoji> ... :::
//   custom_html      -> :::html ... :::
//   anything else    -> :::node <json> :::   (kept verbatim, round-trips as is)
//
// Whenever a block would not survive the Markdown -> HTML -> ProseMirror
// round trip (text that looks like Markdown, a node type we do not know, a
// paragraph that starts like a heading or list), it is written as a :::node
// fence instead, so nothing the editor holds is lost.
import { CALLOUT_BG, CALLOUT_FG } from './lib-article.mjs';

const KNOWN_MARKS = new Set(['strong', 'em', 'code', 'link']);
// Plain text that the forward converter would read as markup.
const LOOKS_LIKE_MARKDOWN = /\*\*|`|\[[^\]]+\]\([^)\s]+\)|(^|[\s(])\*[^*\n]+\*(?=[\s).,;:!?]|$)/;
// A paragraph line that markdownToHtml() would treat as a block of another kind.
const LOOKS_LIKE_BLOCK = /^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|!\[|:::|-{3,}$|\*{3,}$|_{3,}$)/;

export function nodeFence(node) {
  return `:::node\n${JSON.stringify(node)}\n:::`;
}

class Unsafe extends Error {}

function wrapMarks(text, marks, warn) {
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  let core = text.trim();
  if (!core) return text;
  const types = new Set(marks.map((m) => m.type));
  for (const t of types) if (!KNOWN_MARKS.has(t)) warn(`mark "${t}" has no Markdown form, kept as :::node`);
  if ([...types].some((t) => !KNOWN_MARKS.has(t))) throw new Unsafe('unknown mark');
  if (!types.size && LOOKS_LIKE_MARKDOWN.test(core)) throw new Unsafe('text looks like markdown');
  if (types.size && /[*`[\]]/.test(core)) throw new Unsafe('marked text contains markup characters');
  if (types.has('code')) core = `\`${core}\``;
  if (types.has('em')) core = `*${core}*`;
  const link = marks.find((m) => m.type === 'link');
  if (link) core = `[${core}](${link.attrs?.href || ''})`;
  if (types.has('strong')) core = `**${core}**`;
  return lead + core + trail;
}

function inlineToMarkdown(nodes, warn) {
  const parts = [];
  for (const n of nodes || []) {
    if (n.type === 'hard_break') { parts.push({ text: ' ', marks: [], key: '[]' }); continue; }
    if (n.type !== 'text') throw new Unsafe(`inline node "${n.type}"`);
    const marks = n.marks || [];
    const key = JSON.stringify(marks);
    const last = parts[parts.length - 1];
    if (last && last.key === key) last.text += n.text;
    else parts.push({ text: n.text || '', marks, key });
  }
  return parts.map((p) => wrapMarks(p.text, p.marks, warn)).join('').replace(/\s+/g, ' ').trim();
}

function paragraphsOf(node, warn) {
  // A container (blockquote, list_item) holds paragraphs; join them with a
  // space because the Markdown dialect has one paragraph per block.
  const paras = (node.content || []).map((c) => {
    if (c.type !== 'paragraph') throw new Unsafe(`nested "${c.type}" in ${node.type}`);
    return inlineToMarkdown(c.content, warn);
  }).filter(Boolean);
  if (paras.length > 1) warn(`${node.type} with ${paras.length} paragraphs joined into one`);
  return paras.join(' ');
}

function blockToMarkdown(node, warn) {
  switch (node.type) {
    case 'paragraph': {
      const text = inlineToMarkdown(node.content, warn);
      if (!text) return null; // an empty line in the editor
      if (LOOKS_LIKE_BLOCK.test(text)) throw new Unsafe('paragraph starts like another block');
      return text;
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2));
      const text = inlineToMarkdown(node.content, warn);
      return text ? `${'#'.repeat(level)} ${text}` : null;
    }
    case 'blockquote':
      return `> ${paragraphsOf(node, warn)}`;
    case 'bullet_list':
    case 'ordered_list': {
      const items = (node.content || []).map((li, i) => {
        if (li.type !== 'list_item') throw new Unsafe(`"${li.type}" inside ${node.type}`);
        const text = paragraphsOf(li, warn);
        return node.type === 'bullet_list' ? `- ${text}` : `${i + 1}. ${text}`;
      });
      return items.join('\n');
    }
    case 'horizontal_rule':
      return '---';
    case 'figure':
    case 'image': {
      const img = node.type === 'image' ? node : (node.content || []).find((c) => c.type === 'image');
      if (!img || (node.content || []).length > 1) throw new Unsafe('figure is more than one image');
      const alt = String(img.attrs?.alt || '').replace(/[\[\]]/g, '');
      return `![${alt}](${img.attrs?.src || ''})`;
    }
    case 'callout': {
      const { emoji, bg, fg } = node.attrs || {};
      if ((bg && bg !== CALLOUT_BG) || (fg && fg !== CALLOUT_FG)) throw new Unsafe('callout with custom colours');
      const text = inlineToMarkdown(node.content, warn);
      return `:::callout ${emoji || ''}`.trimEnd() + `\n${text}\n:::`;
    }
    case 'custom_html': {
      const html = (node.content || []).map((c) => c.text || '').join('');
      if (/^\s*:::\s*$/m.test(html)) throw new Unsafe('html contains a fence line');
      return `:::html\n${html.trim()}\n:::`;
    }
    default:
      throw new Unsafe(`node type "${node.type}"`);
  }
}

/**
 * Convert a ProseMirror document to the draft Markdown dialect.
 * `warn(message)` is called once per block that had to fall back to :::node.
 */
export function proseMirrorToMarkdown(doc, { warn = () => {} } = {}) {
  const blocks = [];
  for (const node of doc.content || []) {
    try {
      const md = blockToMarkdown(node, warn);
      if (md != null) blocks.push(md);
    } catch (e) {
      if (!(e instanceof Unsafe)) throw e;
      warn(`${node.type}: ${e.message} - kept verbatim as :::node`);
      blocks.push(nodeFence(node));
    }
  }
  return `${blocks.join('\n\n')}\n`;
}
