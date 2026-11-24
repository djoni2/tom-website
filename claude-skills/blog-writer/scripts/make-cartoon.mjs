#!/usr/bin/env node
// Build the editorial-cartoon prompt for an article and, when an image model is
// configured, generate the image.
//
//   node make-cartoon.mjs --scene "..." [--bubbles "ONE; TWO"] [--out cover.webp]
//                         [--size 1536x1024] [--quality medium|high] [--print-prompt]
//
// --scene  what the drawing shows, in your words. Describe people and action,
//          not the article. Required.
// --bubbles  short bubble texts separated by ";". A few words each, never a
//            sentence of body copy.
//
// The house style is fixed and lives in references/image-prompt.md so every
// cover looks like it came from the same illustrator. This script only adds the
// scene to it. Output is always .webp.
//
// Generation needs an image model. It looks for, in order:
//   OPENAI_API_KEY         -> POST {OPENAI_BASE_URL}/images/generations  (best)
//   IMAGE_API_KEY + IMAGE_API_BASE  -> the same OpenAI-shaped request
//   CF_ACCOUNT_ID + CF_API_TOKEN    -> Cloudflare Workers AI, FLUX.1 schnell,
//                                      free tier, bubbles drawn locally
// With no key it writes the prompt to <out>.prompt.txt and stops, so the prompt
// can be pasted into whichever image tool you use. Bring the file back with
// publish.mjs --cover <file>, or point at a hosted one with --cover-url.
import fs from 'node:fs';
import path from 'node:path';
import { loadChromium, pngToWebp, asWebpPath } from './lib-image.mjs';
import { composeCover } from './lib-bubbles.mjs';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const flag = (n) => argv.includes(`--${n}`);

const scene = arg('scene');
if (!scene) {
  console.error('usage: node make-cartoon.mjs --scene "what the drawing shows" [--bubbles "ONE; TWO"] [--out cover.webp]');
  process.exit(2);
}
const caption = arg('caption');
const out = asWebpPath(path.resolve(arg('out') || 'cover.webp'));
const size = arg('size') || '1536x1024';
const model = arg('model') || process.env.IMAGE_MODEL || 'gpt-image-2';
// gpt-image-2 bills by tokens: roughly $0.05 an image at medium, $0.21 at high.
// Medium is enough for a blog cover; go high only when the bubble lettering
// comes back malformed.
const quality = arg('quality') || 'medium';

// The house style, verbatim. Do not edit per article.
const STYLE = 'modern political cartoon illustration style, expressive exaggerated '
  + 'caricature, heavy ink linework, vivid cel shading, vibrant colors, comic book '
  + 'style, speech bubbles, dramatic lighting';
// Midjourney flags: kept in the saved prompt, stripped for API calls that would
// read them as literal words.
const MJ_FLAGS = '--ar 16:9 --style raw';

// Two to five short bubbles is normal for this style; separate them with ";".
const bubbleList = (arg('bubbles') || caption || '')
  .split(';').map((b) => b.trim()).filter(Boolean);
const TEXT_RULE = bubbleList.length
  ? `Speech bubbles, hand lettered, reading exactly: ${bubbleList.map((b) => `"${b}"`).join(', ')}. `
    + 'No other text in the image: no caption, no title, no body copy.'
  : 'No text anywhere in the image: no speech bubbles, no caption, no title, no lettering.';

const core = `${STYLE}. Scene: ${scene}. ${TEXT_RULE} Wide 16:9 landscape composition.`;
// The saved prompt keeps the Midjourney flags for pasting; the API call uses
// `core` alone, since an API reads them as literal words.
const prompt = `${core} ${MJ_FLAGS}`;

if (flag('print-prompt')) {
  console.log(prompt);
  process.exit(0);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
const promptFile = `${out}.prompt.txt`;
fs.writeFileSync(promptFile, `${prompt}\n`);

const key = process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;
const base = process.env.OPENAI_API_KEY
  ? (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')
  : process.env.IMAGE_API_BASE;

const cfAccount = process.env.CF_ACCOUNT_ID;
const cfToken = process.env.CF_API_TOKEN;

if (!key && cfAccount && cfToken) {
  // Free path: Cloudflare Workers AI runs FLUX.1 [schnell] inside a 10,000
  // neuron/day free allocation, roughly 170 covers a day, no watermark.
  // It draws the scene but renders lettering as gibberish, so the art is asked
  // for WITHOUT any text and the bubbles are drawn afterwards in real type.
  const artPrompt = `${STYLE}. Scene: ${scene}. No text, no lettering, no writing `
    + 'anywhere in the image. Wide 16:9 landscape composition.';
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: artPrompt.slice(0, 2048), steps: Number(arg('steps') || 8) }),
    }
  );
  const body = await r.text();
  if (!r.ok) {
    console.error(`Cloudflare Workers AI failed (${r.status}): ${body.slice(0, 300)}`);
    console.error(`the prompt is kept at ${promptFile}`);
    process.exit(5);
  }
  const parsed = JSON.parse(body);
  const b64 = parsed.result?.image;
  if (!b64) {
    console.error(`unexpected Cloudflare response: ${body.slice(0, 300)}`);
    process.exit(5);
  }
  const art = Buffer.from(b64, 'base64');
  const chromium = loadChromium(arg('repo'));
  const webp = bubbleList.length
    ? await composeCover(chromium, art, bubbleList, { mime: 'image/jpeg' })
    : await composeCover(chromium, art, [], { mime: 'image/jpeg' });
  fs.writeFileSync(out, webp);
  console.log(`cartoon written: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB webp, flux-1-schnell, free tier)`);
  if (bubbleList.length) console.log(`bubbles drawn locally: ${bubbleList.join(' | ')}`);
  console.log('Look at it before publishing.');
} else if (!key && flag('free')) {
  // Last resort: pollinations.ai needs no key. Measured against the published
  // covers it does NOT reach the house standard - generic styling instead of
  // caricature, frequent anatomy errors, no usable speech bubbles, a
  // "pollinations.ai" watermark, and output capped near 1024x576 whatever size
  // is asked for. It is here so a draft can have something to look at. Never
  // publish its output without the user seeing it first and saying yes.
  const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(core)}`
    + `?width=1024&height=576&nologo=true&seed=${arg('seed') || 1}`;
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok) {
    console.error(`free generator failed (${r.status}) - it is rate limited and often returns 402.`);
    console.error(`the prompt is kept at ${promptFile}`);
    process.exit(5);
  }
  const png = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(out, await pngToWebp(loadChromium(arg('repo')), png));
  console.log(`DRAFT-QUALITY image written: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB webp)`);
  console.log('This is NOT the house style: it is watermarked and low resolution.');
  console.log('Show it to the user before publishing it.');
} else if (!key || !base) {
  console.error('No image model configured, so no image was generated.');
  console.error(`The prompt is written to:\n  ${promptFile}`);
  console.error('');
  console.error('Either paste that prompt into your image tool and publish the result with');
  console.error('  publish.mjs --cover <file.webp>  (or --cover-url <url>)');
  console.error('or set a key so this script can do it:');
  console.error('  setx OPENAI_API_KEY "<key>"');
  console.error('  (or IMAGE_API_KEY + IMAGE_API_BASE for an OpenAI-shaped endpoint)');
  console.error('');
  console.error('For a free option, create a Cloudflare account (no card) and set:');
  console.error('  setx CF_ACCOUNT_ID "<account id>"');
  console.error('  setx CF_API_TOKEN  "<token with Workers AI read>"');
  console.error('That runs FLUX.1 schnell inside the 10,000 neuron/day free allocation.');
  console.error('');
  console.error('--free uses a keyless generator, but its output is watermarked and well');
  console.error('below the house style. It is for a look, not for publishing.');
  process.exitCode = 4;
} else {
  const res = await fetch(`${base.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt: core, size, n: 1, quality, output_format: 'webp' }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`image request failed (${res.status}): ${text.slice(0, 400)}`);
    console.error(`the prompt is kept at ${promptFile}`);
    process.exit(5);
  }
  const data = JSON.parse(text);
  const item = data.data?.[0] || {};
  let bytes = null;
  if (item.b64_json) bytes = Buffer.from(item.b64_json, 'base64');
  else if (item.url) bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  if (bytes) {
    // Models that ignore output_format hand back PNG; re-encode so the
    // published file is always webp.
    const isWebp = bytes.slice(8, 12).toString() === 'WEBP';
    fs.writeFileSync(out, isWebp ? bytes : await pngToWebp(loadChromium(arg('repo')), bytes));
  } else {
    console.error(`unexpected image response: ${text.slice(0, 300)}`);
    process.exit(5);
  }
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`cartoon written: ${out} (${size}, ${kb} KB webp, ${model} @ ${quality})`);
  console.log(`prompt kept at:  ${promptFile}`);
  console.log('Look at it before publishing. Check that it carries no stray lettering.');
}
