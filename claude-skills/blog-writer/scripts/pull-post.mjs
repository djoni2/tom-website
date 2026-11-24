#!/usr/bin/env node
// Pull a published Hyvor post back into its local draft, so an edit starts
// from what is actually live (text, cover, title, description, tags) instead
// of from a file that may be days behind the Hyvor editor.
//
//   node pull-post.mjs <draft.md> [--blog <subdomain>] [--post-id <id>]
//                      [--dry-run] [--id-only] [--json]
//
// Without --post-id the post is found by the draft's slug. The body is
// rewritten from the post's live ProseMirror content (lib-prosemirror.mjs),
// the front matter is refreshed, and these keys record the pull:
//
//   pulled_from: <subdomain>   pulled_post_id: <id>
//   pulled_hash: <sha1 of the live content>   pulled_at: <ISO time>
//
// publish.mjs --post-id refuses to update a live post whose pulled_hash no
// longer matches, which is what stops a republish from undoing edits made in
// the Hyvor editor.
//
// --id-only prints the post id for the slug and changes nothing.
// --dry-run prints the refreshed draft to stdout instead of writing it.
//
// The key is read from HYVOR_CONSOLE_KEY, or from ~/.hyvor/console-key.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseDraft, setFrontMatter } from './lib-article.mjs';
import { proseMirrorToMarkdown } from './lib-prosemirror.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const flag = (name) => argv.includes(`--${name}`);
const VALUED = new Set(['blog', 'post-id']);
let file = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { if (VALUED.has(a.slice(2))) i++; continue; }
  file = a;
  break;
}
if (!file) {
  console.error('usage: node pull-post.mjs <draft.md> [--blog <subdomain>] [--post-id <id>] [--dry-run] [--id-only]');
  process.exit(2);
}

const DEV_BLOG = 'dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83';
const subdomain = arg('blog') || process.env.HYVOR_BLOG_SUBDOMAIN || DEV_BLOG;
const BASE = `https://blogs.hyvor.com/api/console/v0/blog/${subdomain}`;
const sha1 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex');

function readKey() {
  if (process.env.HYVOR_CONSOLE_KEY) return process.env.HYVOR_CONSOLE_KEY.trim();
  const keyFile = path.join(os.homedir(), '.hyvor', 'console-key');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf8').trim();
  return null;
}
const KEY = readKey();
if (!KEY) {
  console.error('No Console API key: set HYVOR_CONSOLE_KEY or save it to ~/.hyvor/console-key');
  process.exit(3);
}
const log = (...a) => console.error(...a);

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, { headers: { 'X-API-KEY': KEY } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${pathname} failed (${res.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// --- find the post -----------------------------------------------------------
const { meta, body } = parseDraft(file);
const slug = meta.slug || '';
let postId = Number(arg('post-id') || 0);
if (!postId) {
  if (!slug) throw new Error('the draft has no slug in its front matter; pass --post-id');
  const found = await get(`/posts?search=${encodeURIComponent(slug)}&limit=20`);
  const list = Array.isArray(found) ? found : found.data || [];
  const hits = list.filter((p) => p.slug === slug || (p.variants || []).some((v) => v.slug === slug));
  if (hits.length !== 1) {
    throw new Error(`${hits.length} posts on ${subdomain} match slug "${slug}"${hits.length ? `: ${hits.map((p) => p.id).join(', ')}` : ''}; pass --post-id`);
  }
  postId = hits[0].id;
}
if (flag('id-only')) {
  console.log(postId);
  process.exit(0);
}

// --- read what is live -------------------------------------------------------
const doc = await get(`/documents/post?post_id=${postId}`);
const variant = doc.variant || {};
const post = doc.post || {};
const languageId = variant.language_id;
// variant.content is what readers see; checkpoint_content is the editor's
// current document. They differ when someone has unsaved edits in the editor.
const published = variant.content || '';
const checkpoint = doc.document?.checkpoint_content || '';
const content = published || checkpoint;
if (!content) throw new Error(`post ${postId} has no content`);
// The two serialisations differ in noise (key order, `suggestions: null`,
// empty heading ids), so compare what they say, not how they are written.
const asMarkdown = (s) => proseMirrorToMarkdown(JSON.parse(s));
if (published && checkpoint && asMarkdown(published) !== asMarkdown(checkpoint)) {
  log('warning: the Hyvor editor holds unsaved changes that differ from the published text.');
  log('         Pulled the PUBLISHED version. Ask before publishing over the editor draft.');
}

const warnings = [];
const markdown = proseMirrorToMarkdown(JSON.parse(content), { warn: (m) => warnings.push(m) });
const title = variant.title || post.title || meta.title || '';
const tags = (post.tags || [])
  .map((t) => (t.variants || []).find((v) => v.language_id === languageId)?.name || t.variants?.[0]?.name || t.name)
  .filter(Boolean);

const changes = {
  title,
  slug: variant.slug || slug,
  description: variant.description || meta.description || '',
  tags: tags.length ? tags : undefined,
  cover_url: post.featured_image_url || meta.cover_url || undefined,
  pulled_from: subdomain,
  pulled_post_id: postId,
  pulled_hash: sha1(content),
  pulled_at: new Date().toISOString(),
};
for (const k of Object.keys(changes)) if (changes[k] === undefined) delete changes[k];

// --- report what differs -----------------------------------------------------
const oldBodyLines = body.split('\n').map((l) => l.trim()).filter(Boolean);
const newBody = `# ${title}\n\n${markdown}`;
const newBodyLines = newBody.split('\n').map((l) => l.trim()).filter(Boolean);
const oldSet = new Set(oldBodyLines);
const newSet = new Set(newBodyLines);
const removed = oldBodyLines.filter((l) => !newSet.has(l));
const added = newBodyLines.filter((l) => !oldSet.has(l));

log(`post     ${postId} on ${subdomain}${subdomain === DEV_BLOG ? ' (dev)' : ' (LIVE BLOG)'}  status ${variant.status}`);
log(`title    ${title}`);
log(`cover    ${changes.cover_url || '-'}${meta.cover_url && changes.cover_url && meta.cover_url !== changes.cover_url ? `   (draft had ${meta.cover_url})` : ''}`);
log(`tags     ${tags.join(', ') || '-'}${meta.tags && tags.join('|') !== [].concat(meta.tags).join('|') ? `   (draft had ${[].concat(meta.tags).join(', ')})` : ''}`);
if (meta.description && changes.description !== meta.description) log('descr.   changed on the blog');
if (meta.title && title !== meta.title) log(`title    changed on the blog (draft had "${meta.title}")`);
for (const w of warnings) log(`note     ${w}`);
const show = (label, lines) => {
  if (!lines.length) return;
  log(`\n${label} (${lines.length} line${lines.length === 1 ? '' : 's'}):`);
  for (const l of lines.slice(0, 25)) log(`  ${l.length > 160 ? `${l.slice(0, 157)}...` : l}`);
  if (lines.length > 25) log(`  ... and ${lines.length - 25} more`);
};
show('only in the local draft (the blog no longer has these)', removed);
show('only on the blog (added or reworded there)', added);
if (!removed.length && !added.length) log('\nbody     identical to the local draft');

// --- write ---------------------------------------------------------------------
if (flag('dry-run')) {
  const fm = Object.entries({ ...meta, ...changes }).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`).join('\n');
  process.stdout.write(`---\n${fm}\n---\n\n${newBody}`);
  process.exit(0);
}
setFrontMatter(file, changes);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const m = raw.replace(/\r\n/g, '\n').match(/^---\n[\s\S]*?\n---\n?/);
const next = `${m ? m[0] : ''}\n${newBody.trimEnd()}\n`.replace(/\n/g, nl);
fs.writeFileSync(file, next);
log(`\nwrote    ${file}`);
if (flag('json')) console.log(JSON.stringify({ post_id: postId, blog: subdomain, title, cover_url: changes.cover_url, tags, warnings }, null, 2));
