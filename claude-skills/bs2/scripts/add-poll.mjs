#!/usr/bin/env node
// Registers a poll for a /bs2 article and prints the embed fence.
//
//   node add-poll.mjs <id> --question "..." --option key=Label --option key=Label [--option key=Label]
//                     [--repo <website repo>] [--commit] [--wait]
//   node add-poll.mjs --list                 every poll in polls.json (to reuse an id)
//   node add-poll.mjs <id> --check           is the Worker serving this id yet?
//
// Checks the id (kebab-case, unique), the question (one question, no banned
// words, no em dash, under about 90 characters) and the options (3-4, unique
// lowercase keys, labels under about 45 characters), then writes
// worker/src/polls.json. If the id already exists with the same question it
// is reused and nothing is written.
//
// --commit commits and pushes polls.json on the current branch. The "Deploy
// Polls Worker" action runs on main and main-1; on any other branch it prints
// a reminder to merge. --wait then polls the Worker until it serves the id
// (about a minute) or gives up after three minutes.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WORKER = 'https://tom-polls.timesofmadeira.workers.dev/polls/';
const BANNED = /\b(boost|head(ing|ed)|spark|enhanc|mark(s|ed|ing)|bolster|equit(y|ies)|outpac|soar|disparit|propel|leverag|reflect|exacerbat|dampen)/i;
const FLAGS_WITH_VALUE = new Set(['--question', '--option', '--repo']);

class Fail extends Error {}
const fail = (msg) => { throw new Fail(`add-poll: ${msg}`); };
const embed = (pollId) => `:::html\n<div class="tom-poll" data-poll-id="${pollId}"></div>\n:::`;

async function check(pollId) {
  try {
    const r = await fetch(`${WORKER}${pollId}?voterId=check`);
    return r.status === 200 ? await r.json() : null;
  } catch { return null; }
}

async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f) => { const i = argv.indexOf(f); return i === -1 ? null : argv[i + 1]; };
  const vals = (f) => argv.flatMap((a, i) => (a === f ? [argv[i + 1]] : []));
  const id = argv.find((a, i) => !a.startsWith('--') && !FLAGS_WITH_VALUE.has(argv[i - 1]));

  const repo = val('--repo') || process.cwd();
  const file = path.join(repo, 'worker', 'src', 'polls.json');
  if (!fs.existsSync(file)) fail(`no polls.json at ${file} - run from the website repo or pass --repo`);
  const polls = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (has('--list')) {
    for (const [k, p] of Object.entries(polls)) {
      console.log(`${k}\n  ${p.question}\n${p.options.map((o) => `  - ${o.label} (${o.key})`).join('\n')}`);
    }
    return;
  }
  if (!id) fail('usage: add-poll.mjs <id> --question "..." --option key=Label ... [--commit] [--wait]');

  if (has('--check')) {
    const d = await check(id);
    console.log(d ? `live: ${d.question || JSON.stringify(d).slice(0, 120)}` : 'not live yet (404 or unreachable) - deploy pending or id misspelt');
    process.exitCode = d ? 0 : 1;
    return;
  }

  // --- validate --------------------------------------------------------------
  const problems = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) problems.push(`id "${id}" is not kebab-case`);
  const question = val('--question');
  const options = vals('--option').map((o) => {
    const m = String(o).match(/^([a-z0-9]+(?:-[a-z0-9]+)*)=(.+)$/);
    return m ? { key: m[1], label: m[2].trim() } : { bad: o };
  });

  const existing = polls[id];
  let reused = false;
  if (existing) {
    if (!question || existing.question === question) reused = true;
    else problems.push(`id "${id}" exists with a different question: "${existing.question}" - pick a new id, or drop --question to reuse it`);
  }

  if (!reused) {
    if (!question) problems.push('missing --question');
    else {
      if (question.length > 90) problems.push(`question is ${question.length} characters, keep it under about 90`);
      if (!/\?\s*$/.test(question)) problems.push('question does not end with "?"');
      if ((question.match(/\?/g) || []).length > 1) problems.push('ask one question, not two');
      if (/[—–]/.test(question)) problems.push('em/en dash in the question - use a plain hyphen');
      if (BANNED.test(question)) problems.push(`banned word in the question: "${question.match(BANNED)[0]}"`);
      if (/^(do you agree|what do you think)/i.test(question)) problems.push('"do you agree" / "what do you think" is not a poll question - ask about the decision, trade-off or expectation itself');
    }
    if (options.length < 3 || options.length > 4) problems.push(`${options.length} options - a poll has 3 (4 at most)`);
    for (const o of options) {
      if (o.bad) { problems.push(`option "${o.bad}" is not key=Label (lowercase slug key)`); continue; }
      if (o.label.length > 45) problems.push(`label "${o.label}" is ${o.label.length} characters, keep it under about 45`);
      if (/[—–]/.test(o.label)) problems.push(`em/en dash in label "${o.label}"`);
      if (BANNED.test(o.label)) problems.push(`banned word in label "${o.label}"`);
    }
    const keys = options.filter((o) => o.key).map((o) => o.key);
    if (new Set(keys).size !== keys.length) problems.push('option keys must be unique');
    const labels = options.filter((o) => o.label).map((o) => o.label.toLowerCase());
    if (new Set(labels).size !== labels.length) problems.push('two options have the same label');
    for (const [k, p] of Object.entries(polls)) {
      if (p.question.toLowerCase() === (question || '').toLowerCase()) problems.push(`poll "${k}" already asks this question - reuse that id so the votes accumulate`);
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(`  - ${p}`);
    fail(`${problems.length} problem(s)`);
  }

  // --- write -----------------------------------------------------------------
  if (reused) {
    console.log(`reusing poll "${id}" (already in polls.json)`);
  } else {
    polls[id] = { question, options: options.map(({ key, label }) => ({ key, label })) };
    fs.writeFileSync(file, JSON.stringify(polls, null, 2) + '\n');
    console.log(`added poll "${id}" to ${path.relative(process.cwd(), file) || file}`);
  }
  const poll = polls[id];
  console.log(`\n${poll.question}`);
  for (const o of poll.options) console.log(`- ${o.label}`);

  if (has('--commit') && !reused) {
    const git = (cmd) => execSync(`git ${cmd}`, { cwd: repo, stdio: 'pipe' }).toString().trim();
    const branch = git('rev-parse --abbrev-ref HEAD');
    git('add worker/src/polls.json');
    git(`commit -m "Add ${id} poll" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`);
    git(`push origin ${branch}`);
    console.log(`\ncommitted and pushed on ${branch}`);
    if (!['main', 'main-1'].includes(branch)) console.log(`NOTE: the Worker deploys only from main or main-1 - merge ${branch} into main and push`);
  }

  if (has('--wait')) {
    process.stdout.write('\nwaiting for the Worker');
    const deadline = Date.now() + 3 * 60 * 1000;
    let live = await check(id);
    while (!live && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10000));
      process.stdout.write('.');
      live = await check(id);
    }
    console.log(live ? ' live' : ' still 404 after three minutes - check the Deploy Polls Worker action');
    if (!live) process.exitCode = 1;
  }

  console.log(`\nembed (right after the lead paragraph(s), before the first H2):\n${embed(id)}`);
}

try {
  await main();
} catch (e) {
  if (!(e instanceof Fail)) throw e;
  console.error(e.message);
  process.exitCode = 1;
}
