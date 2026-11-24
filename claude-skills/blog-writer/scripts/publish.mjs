#!/usr/bin/env node
// Publish a Times of Madeira draft to Hyvor Blogs through the Console API.
//
//   node publish.mjs <draft.md> [--cover cover.png] [--draft] [--dry-run]
//                    [--blog <subdomain>] [--post-id <id>] [--author <slug|id>]
//                    [--cover-url <url>] [--featured-url <url>]
//                    [--language <code>] [--json]
//
// Order of operations (each step is skipped cleanly if not needed):
//   1. resolve the API key and the blog's primary language
//   2. POST /post                       -> empty draft post, and its variant id
//   3. GET  /misc/prosemirror/json      -> article HTML as ProseMirror JSON
//   4. POST /documents/checkpoint       -> the content (see the note at step 4)
//      PATCH /post/{id}/variant         -> title, slug, description
//   5. POST /media (+ PATCH /post/{id}) -> cover image and featured_image_url
//   6. POST /tag + PATCH /post/{id}/tags
//   7. POST /post/{id}/variant/publish  -> live (unless --draft)
//
// Several of these differ from the published API docs - the corrections are
// recorded in references/hyvor-api.md.
//
// The key is read from HYVOR_CONSOLE_KEY, or from ~/.hyvor/console-key.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseDraft, markdownToHtml, splitHeadline, slugify, setFrontMatter, CUSTOM_HTML_RE, CUSTOM_NODE_RE } from './lib-article.mjs';
import { MIME_BY_EXT } from './lib-image.mjs';

const sha1 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const flag = (name) => argv.includes(`--${name}`);

// Flags that take a value, so their value is not mistaken for the draft path.
const VALUED = new Set(['blog', 'cover', 'cover-url', 'featured-url', 'post-id', 'author', 'language', 'language-id']);
let file = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { if (VALUED.has(a.slice(2))) i++; continue; }
  file = a;
  break;
}
if (!file) {
  console.error('usage: node publish.mjs <draft.md> [--cover cover.png] [--draft] [--dry-run]');
  process.exit(2);
}

const DEV_BLOG = 'dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83';
const subdomain = arg('blog') || process.env.HYVOR_BLOG_SUBDOMAIN || DEV_BLOG;
const BASE = `https://blogs.hyvor.com/api/console/v0/blog/${subdomain}`;
const dryRun = flag('dry-run');
const stayDraft = flag('draft');

function readKey() {
  if (process.env.HYVOR_CONSOLE_KEY) return process.env.HYVOR_CONSOLE_KEY.trim();
  const keyFile = path.join(os.homedir(), '.hyvor', 'console-key');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf8').trim();
  return null;
}
const KEY = readKey();
if (!KEY && !dryRun) {
  console.error([
    'No Console API key found.',
    '',
    'Create one in the Hyvor Console (Settings -> API Keys) with the scopes',
    'posts.write.own, posts.publish.own, media.write and tags.write, then either:',
    '  setx HYVOR_CONSOLE_KEY "<key>"            (new shells pick it up)',
    `  or save it to ${path.join(os.homedir(), '.hyvor', 'console-key')}`,
  ].join('\n'));
  process.exit(3);
}

const log = (...a) => console.log(...a);
const steps = [];

async function api(method, pathname, body, { multipart = false } = {}) {
  const url = `${BASE}${pathname}`;
  if (dryRun && method !== 'GET') {
    steps.push({ method, url, body: multipart ? '<multipart>' : body });
    log(`DRY  ${method} ${pathname}`);
    return { __dryRun: true, id: 0, url: '', json: '{}' };
  }
  const headers = { 'X-API-KEY': KEY };
  let payload;
  if (multipart) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${pathname} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  // Long query strings (the HTML batches) would bury the log.
  const shown = pathname.length > 70 ? `${pathname.slice(0, 67)}...` : pathname;
  log(`${String(res.status)}  ${method} ${shown}`);
  return text ? JSON.parse(text) : {};
}

// --- read the draft ---------------------------------------------------------
const { meta, body } = parseDraft(file);
const { headline, rest } = splitHeadline(body);
const title = meta.title || headline;
if (!title) {
  console.error('draft has neither a front-matter title nor an H1 headline');
  process.exit(2);
}
const slug = meta.slug || slugify(title);
const description = (meta.description || '').slice(0, 350);
const tags = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [];
const html = markdownToHtml(rest);

log(`draft    ${file}`);
log(`blog     ${subdomain}${subdomain === DEV_BLOG ? '  (dev)' : '  (LIVE BLOG)'}`);
log(`title    ${title}`);
log(`slug     ${slug}`);
log(`tags     ${tags.join(', ') || '-'}`);
log(`html     ${html.length} chars`);
log('');

// --- 1. language ------------------------------------------------------------
let languageId = Number(arg('language-id') || 0);
let languageCode = arg('language') || null;
if (!languageId) {
  if (dryRun && !KEY) {
    languageId = 1;
    languageCode = languageCode || 'en';
    log('DRY  GET /languages (assuming primary language id 1)');
  } else {
    const languages = await api('GET', '/languages');
    const picked = languageCode
      ? languages.find((l) => l.code === languageCode)
      : languages.find((l) => l.is_primary) || languages[0];
    if (!picked) throw new Error(`no language ${languageCode || '(primary)'} on this blog`);
    languageId = picked.id;
    languageCode = picked.code;
  }
}

// --- 2. the post and its variant ---------------------------------------------
// The variant id is what the content and publish calls address, and the
// document version is what the checkpoint call has to match exactly.
let postId = Number(arg('post-id') || 0);
let variantId = 0;
let docVersion = 0;
let variantStatus = 'draft';
let live = null; // what the blog currently holds, when updating
if (!postId) {
  const post = await api('POST', '/post', { is_page: false });
  postId = post.id || 0;
  variantId = (post.variants || []).find((v) => v.language_id === languageId)?.id
    || (post.variants || [])[0]?.id || 0;
} else if (!(dryRun && !KEY)) {
  const q = languageCode ? `&variant_language_code=${languageCode}` : '';
  const doc = await api('GET', `/documents/post?post_id=${postId}${q}`);
  variantId = doc.variant?.id || 0;
  docVersion = doc.document?.checkpoint_version || 0;
  variantStatus = doc.variant?.status || 'draft';
  if (!variantId) throw new Error(`no variant for post ${postId}`);
  log(`post ${postId} variant ${variantId} is ${variantStatus} at document version ${docVersion}`);

  // What the blog holds right now, so an update changes only what the draft
  // actually changes and never silently undoes an edit made in the editor.
  live = {
    content: doc.variant?.content || doc.document?.checkpoint_content || '',
    featured: doc.post?.featured_image_url || null,
    tags: (doc.post?.tags || []).map((t) => (t.variants || []).find((v) => v.language_id === languageId)?.name || t.variants?.[0]?.name || t.name).filter(Boolean),
  };
  live.hash = sha1(live.content);

  // Guard for the live blog: the draft must have been pulled from this very
  // post (pull-post.mjs) and the post must not have changed since. Otherwise
  // the full-document checkpoint below would overwrite edits made in Hyvor.
  const isLive = variantStatus === 'published' || variantStatus === 'scheduled';
  if (isLive && subdomain !== DEV_BLOG && !flag('force')) {
    const pulledHere = meta.pulled_from === subdomain && Number(meta.pulled_post_id) === postId;
    if (!pulledHere) {
      console.error([
        `refusing to update published post ${postId} on ${subdomain}:`,
        'the draft was not pulled from it, so the live text, cover and tags may differ from the file.',
        'Run first:',
        `  node ${path.join(path.dirname(fileURLToPath(import.meta.url)), 'pull-post.mjs').replace(/\\/g, '/')} ${file} --blog ${subdomain} --post-id ${postId}`,
        'then make the edit in the refreshed draft and publish again. --force overrides this.',
      ].join('\n'));
      process.exit(4);
    }
    if (meta.pulled_hash !== live.hash) {
      console.error([
        `refusing to update post ${postId} on ${subdomain}: it changed since the draft was pulled`,
        `(pulled ${meta.pulled_at || 'earlier'}). Someone edited it in the Hyvor editor.`,
        'Pull it again, re-apply the edit to the refreshed draft, then publish. --force overrides this.',
      ].join('\n'));
      process.exit(4);
    }
  }
}

// --- 3. HTML -> ProseMirror --------------------------------------------------
// The converter takes HTML in the query string, so the article goes over in
// block-sized batches and the resulting documents are concatenated.
function splitBlocks(source) {
  const out = [];
  let open = null;
  let buf = [];
  for (const line of source.split('\n')) {
    const tag = line.match(/^<(ul|ol|blockquote|figure|aside)[\s>]/);
    // A block that opens and closes on one line (a callout) is already whole.
    if (tag && !open && !line.includes(`</${tag[1]}>`)) { open = tag[1]; buf = [line]; continue; }
    if (open) {
      buf.push(line);
      if (line.startsWith(`</${open}>`)) { out.push(buf.join('\n')); open = null; buf = []; }
      continue;
    }
    if (line.trim()) out.push(line);
  }
  if (buf.length) out.push(buf.join('\n'));
  return out;
}

async function htmlToProseMirror(source) {
  const batches = [];
  let current = '';
  for (const block of splitBlocks(source)) {
    if (current && (current.length + block.length) > 1600) { batches.push(current); current = ''; }
    current += (current ? '\n' : '') + block;
  }
  if (current) batches.push(current);

  const content = [];
  for (const [i, batch] of batches.entries()) {
    if (dryRun && !KEY) {
      log(`DRY  GET /misc/prosemirror/json (batch ${i + 1}/${batches.length})`);
      continue;
    }
    const res = await api('GET', `/misc/prosemirror/json?html=${encodeURIComponent(batch)}`);
    const doc = JSON.parse(res.json);
    content.push(...(doc.content || []));
  }
  // :::html fences arrive as marker paragraphs; turn them into custom_html nodes.
  const nodes = content.map((node) => {
    const text = node.type === 'paragraph' && node.content?.length === 1 ? node.content[0].text || '' : '';
    const m = text.trim().match(CUSTOM_HTML_RE);
    if (m) return { type: 'custom_html', content: [{ type: 'text', text: Buffer.from(m[1], 'base64').toString('utf8') }] };
    // :::node fences (written by pull-post.mjs) are verbatim ProseMirror nodes.
    const n = text.trim().match(CUSTOM_NODE_RE);
    if (n) return JSON.parse(Buffer.from(n[1], 'base64').toString('utf8'));
    return node;
  });
  return JSON.stringify({ type: 'doc', content: nodes });
}

const content = await htmlToProseMirror(html);

// --- 4. content, then the variant fields -------------------------------------
// Content does NOT go through PATCH /post/{id}/variant - that endpoint has no
// content field and silently ignores one. The editor writes content through
// the collaborative-document checkpoint, and publishing reads content_unsaved,
// so this call is what makes a post publishable.
await api('POST', '/documents/checkpoint', {
  post_variant_id: variantId,
  version: docVersion,
  content,
});

await api('PATCH', `/post/${postId}/variant`, {
  language_id: languageId,
  title,
  slug,
  description: description || undefined,
});

// --- 5. cover image ----------------------------------------------------------
// Three ways in, in order of precedence:
//   --cover <file>        upload a local file to this blog's media library
//   --cover-url <url>     fetch a remote image INTO the library (a new copy)
//   --featured-url <url>  point at an image that is already hosted; no upload,
//                         so reusing a library image does not duplicate it
const coverFile = arg('cover');
const coverUrl = arg('cover-url');
const featuredUrl = arg('featured-url');
let featured = null;
if (coverFile) {
  if (!fs.existsSync(coverFile)) throw new Error(`cover file not found: ${coverFile}`);
  if (dryRun) {
    log(`DRY  POST /media (${coverFile})`);
  } else {
    const form = new FormData();
    const ext = path.extname(coverFile).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    form.append('file', new Blob([fs.readFileSync(coverFile)], { type: mime }), path.basename(coverFile));
    form.append('post_id', String(postId));
    const media = await api('POST', '/media', form, { multipart: true });
    featured = media.url;
  }
} else if (coverUrl) {
  const media = await api('POST', '/media/from-url', { url: coverUrl, post_id: postId });
  featured = media.url || coverUrl;
} else if (featuredUrl) {
  // Already hosted: just reference it.
  featured = featuredUrl;
}

const postPatch = {};
if (featured && live && live.featured === featured) log(`cover unchanged (${featured})`);
else if (featured) postPatch.featured_image_url = featured;
if (meta.canonical_url) postPatch.canonical_url = meta.canonical_url;
if (String(meta.is_featured).toLowerCase() === 'true') postPatch.is_featured = true;
if (Object.keys(postPatch).length) await api('PATCH', `/post/${postId}`, postPatch);

// --- 6. tags and author ------------------------------------------------------
// Tags are matched against the ones the blog already has and are NEVER
// created. The tag list is an editorial decision that belongs to the blog
// owner, so a front-matter tag with no match is reported and skipped.
const unmatchedTags = [];
if (tags.length && !(dryRun && !KEY)) {
  const ids = [];
  for (const name of tags) {
    const found = await api('GET', `/tags?search=${encodeURIComponent(name)}&limit=100`);
    const hit = Array.isArray(found)
      ? found.find((t) => (t.variants || []).some((v) => (v.name || '').toLowerCase() === name.toLowerCase()))
        || found.find((t) => (t.name || '').toLowerCase() === name.toLowerCase())
      : null;
    if (hit) ids.push(hit.id);
    else unmatchedTags.push(name);
  }
  const sameTags = live && live.tags.length === tags.length
    && tags.every((t) => live.tags.some((l) => l.toLowerCase() === t.toLowerCase()));
  if (sameTags) log(`tags unchanged (${live.tags.join(', ')})`);
  else if (ids.length) await api('PATCH', `/post/${postId}/tags`, { ids });
  if (unmatchedTags.length) {
    log(`note: no existing tag for ${unmatchedTags.map((t) => `"${t}"`).join(', ')} - left off the post.`);
    log('      Pick from the blog\'s existing tags, or ask the user to create them in the Console.');
  }
}

const author = arg('author') || meta.author;
if (author && !(dryRun && !KEY)) {
  const usersResp = await api('GET', '/users?limit=100');
  const users = Array.isArray(usersResp) ? usersResp : (usersResp.users || []);
  const hit = /^\d+$/.test(String(author))
    ? users.find((u) => u.id === Number(author))
    : users.find((u) => u.slug === author)
      || users.find((u) => (u.variants || []).some((v) => (v.name || '').toLowerCase() === String(author).toLowerCase()));
  if (hit) await api('PATCH', `/post/${postId}/authors`, { ids: [hit.id] });
  else log(`note: no blog user matched "${author}" - author left as is`);
}

// --- 7. publish, or push the new content to an already-live post --------------
// /variant/publish refuses a variant that is not a draft, so editing a live
// article goes through /variant/update-content instead. Both read the content
// written by the checkpoint in step 4.
let liveUrl = `https://${subdomain}.hyvorblogs.io/${slug}`;
let action = 'published';
if (stayDraft) {
  log('\n--draft given: the post stays a draft.');
  action = 'draft';
} else {
  const live = variantStatus === 'published' || variantStatus === 'scheduled';
  const route = live ? 'update-content' : 'publish';
  if (live) action = 'updated';
  const variant = await api('POST', `/post/${postId}/variant/${route}`, { post_variant_id: variantId });
  if (variant && variant.url) liveUrl = variant.url;
  // Record what the blog holds now, so the next edit of this draft passes the
  // guard without a fresh pull (as long as nobody edits the post in Hyvor).
  if (live && subdomain !== DEV_BLOG && !dryRun) {
    const after = await api('GET', `/documents/post?post_id=${postId}`);
    const now = after.variant?.content || after.document?.checkpoint_content || '';
    setFrontMatter(file, {
      pulled_from: subdomain,
      pulled_post_id: postId,
      pulled_hash: sha1(now),
      pulled_at: new Date().toISOString(),
    });
    log(`draft    pulled_hash refreshed for ${subdomain}`);
  }
}

const result = {
  post_id: postId,
  language_id: languageId,
  language: languageCode,
  slug,
  title,
  status: dryRun ? `dry-run (would be ${action})` : action,
  featured_image_url: featured,
  tags_not_found: unmatchedTags.length ? unmatchedTags : undefined,
  url: liveUrl,
  console_url: `https://blogs.hyvor.com/console/${subdomain}/posts/${postId}`,
  dry_run: dryRun || undefined,
};

log('');
if (flag('json')) console.log(JSON.stringify(result, null, 2));
else {
  log(`post ${postId} ${result.status}`);
  log(`  live     ${result.url}`);
  log(`  console  ${result.console_url}`);
  if (featured) log(`  cover    ${featured}`);
}
if (dryRun && steps.length) {
  log('\nwrites that were skipped:');
  for (const s of steps) log(`  ${s.method} ${s.url}`);
}
