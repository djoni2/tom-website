---
name: bs2
description: Turn a source URL, PDF, screenshot or pasted text into a full Times of Madeira news article in New York Times style - B2 English, strictly fact-checked, data-rich H2s, figures shown in tables, the source's videos and embeds taken over - then publish it to the dev blog and the live timesofmadeira.com blog and return both links, the gaps, and Twitter/X and Facebook posts. Use when asked to "do the same with <link>", to write a full article (not a short summary) for Times of Madeira, or when the user types /bs2.
---

# bs2

Input: a URL, several URLs, a PDF, a screenshot (e.g. a DREM Power BI
dashboard) or pasted text, often in Portuguese. Output: a full news article,
published on **both** blogs, plus a report and two social posts.

This is the long form of `/bs`. It uses the same scripts, tags, covers and
publishing steps from `blog-summary` and `blog-writer`. Only the writing rules
below are different, and they override the `/bs` length and H2 limits.

The one rule behind all the others: **nothing reaches the page that is not in
the source or checked against another reliable source.** No remembered
context, no filled-in causes, no invented quotes. The user checks quotes
word by word ("did you make up that quote?"), so every quote must be traceable
to an exact place in a source.

## Writing rules

| Element      | Rule |
| ------------ | ---- |
| Style        | **New York Times news style.** Lead with the news, then the details, then the context. Neutral tone, no opinion, no hype. |
| Language     | **English only**, **B2 level**. Everyday words, one idea per sentence, nothing over about 25 words. Translate everything. |
| Length       | As long as the source supports. **Use everything relevant in the source**; do not cut it down to a summary. Do not pad. |
| Headline     | **One H1**, Title Case, active voice, ideally under about 60 characters. The same text goes in `title`. |
| H2s          | **6-15 words each**, Title Case. **Each H2 carries a concrete data point** (a figure, date, amount, count or place). **No figure repeated across H2s**, and no H2 repeating the H1's figure. As many H2s as the story needs (usually 3-7). |
| Paragraphs   | 1-3 short sentences. Every paragraph adds something new. |
| Bold         | In every paragraph, the **1-4 most important consecutive words**. Never a whole clause, never inside a quote. |
| Quotes       | Translated **accurately**, never invented, merged or smoothed. A paraphrase in the source gets **no quotation marks**. If a transcript looks garbled, paraphrase instead of quoting. Quote block with speaker on the line underneath (see `/bs`), **without quotation marks** around a quote block (`> Text.`, not `> "Text."`): the theme draws its own quote sign. |
| Allegations  | Crime and court stories: "according to the charges", "prosecutors say", "allegedly". Never state an accusation as fact. End with the presumption of innocence where it fits. |
| People       | Use **they/them** or avoid pronouns when the source does not show someone's gender. A Portuguese title like "o presidente" or "o secretário de Estado" is grammatically masculine and does **not** show it. Do not name someone the source does not name. |
| Times        | 24-hour clock: `08:00`, `16:27`. |
| Dashes       | Plain hyphen `-`. **Never an em dash** (—) or en dash. |
| Author       | `author: Mat` in the front matter only. **Never write "By Mat"** or any byline in the body. |
| Emoji        | None in the article. |
| Sources      | A `Source:` line per source at the very end, link text = bare domain (as in `/bs`). |
| Tags         | **Exactly two existing tags** from the live taxonomy. Never create one. Write them with their accents (`Câmara de Lobos`): the tag search is accent-sensitive, so `Camara de Lobos` silently drops the tag. |
| Cover        | An existing library image you have **looked at** (see `/bs` "The cover image"). |
| Description  | 110-160 characters, factual, for search results. |
| Poll         | **Every article carries one poll** (survey) in its first part: right after the lead paragraph(s), before the first H2. One meaningful question, **3 answers (never more than 4)**. See "Poll" below. |
| Related      | **One other Times of Madeira article**, linked as a preview card (image + headline + one-sentence description), not a plain link. Two cards only on an article without a poll. See "Related article previews" below. |
| Comments     | Where it genuinely fits, end with one short question that invites readers to react in the comments (the widget sits right under the article). See "Comment prompt" below. Skip it when the story doesn't call for one - it does not belong on every article - and never repeat the poll's question. |

### Banned words

Never use these, in any form (plural, -ing, -ed, etc.):

> boost, heading, sparks, sparked, enhancing, marks, marks a shift, bolstered,
> equity, outpaces, soared, disparities, propel, leveraging, reflecting,
> exacerbate, dampening

"heading" includes "heading to/for". "marks" includes "this marks...".
Grep the draft for every one of them before publishing:

```bash
grep -inE "boost|heading|spark|enhanc|\bmark(s|ed|ing)?\b|bolster|equity|outpac|soar|disparit|propel|leverag|reflect|exacerbat|dampen|—|–|By Mat" articles/<slug>.summary.md
```

### Fact-checking

- Check every number, name, date and place against the source a second time
  after drafting.
- **Check the arithmetic.** If you derive a figure (a sum, a share, an average),
  say it is derived in the report, and check it fits the source's other numbers
  (e.g. occupancy x ADR = RevPAR, the parts add up to the total).
- Do not add claims like "usually", "a record" or "the first time" unless the
  source says so.
- Use the source's own terms. An "estimated economic impact" is not revenue.
- If the source contradicts itself, use the version that fits the data and
  mention the issue in the report.
- If the user asks for added context (for example "mention Putin and the
  security risks from Russia"), take it from the primary document or
  Wikipedia. Quote only words you can point to, with the page or section.

## Tables

Present the figures in **tables** whenever a story has more than a handful of
numbers (statistics, budgets, comparisons, rankings). The user prefers this.
Hyvor drops raw tables from Markdown, so they go in a `:::html` fence, which
`publish.mjs` turns into a `custom_html` node.

Generate them with the house style: green `#1a7f37` ▲ for rises, red
`#cf222e` ▼ for falls, grey "was" lines for last year's value, and blue bars
for rankings. Every table sits in `<div style="overflow-x:auto">`, so it
scrolls inside its own box on a phone.

```bash
node C:/Users/samad/.claude/skills/bs2/scripts/make-table.mjs <scratchpad>/tables.json
```

The spec format is documented at the top of `make-table.mjs`. Paste the output
into the draft where it fits, usually under the lead or under the H2 it belongs
to. A table does not replace the prose: the key figures still appear in the
text.

## Poll

Every article carries **one poll** (the user calls it a survey). It gives
readers a one-tap way to react, and the results are something to report on
later. The polls run on the site's own widget: a `tom-poll` div in the
article, the questions in `worker/src/polls.json` in the website repo, served
by the `tom-polls` Cloudflare Worker.

**The question.** Ask the one thing the story leaves open for readers: a
decision they can take a side on (a fee, a closure, a new rule), a trade-off
with no clear right answer, or their own experience or expectation ("Will this
change your plans?"). Not a quiz on the article's facts, not "do you agree with
the headline", not "what do you think about this". Neutral, B2 English, no
banned words, no em dashes, under about 90 characters.

**The answers.** **3 options, never more than 4.** Short labels (under about
45 characters), mutually exclusive, covering the realistic range. A yes/no
question gets a third option for the middle ground or "Not sure". Do not steer:
no loaded or joke options. Keys are short lowercase slugs (`yes`, `no`,
`unsure`, `more`, `less`).

**Register it.** Look in `worker/src/polls.json` first: if an existing poll
asks the same question, **reuse its id** so the votes accumulate. Otherwise add
one, id in kebab-case naming the topic (not the article), unique in the file:

```json
"trail-fee-level": {
  "question": "What should Madeira charge hikers for the levada trails?",
  "options": [
    { "key": "free", "label": "Nothing, the trails should stay free" },
    { "key": "same", "label": "The current fee is about right" },
    { "key": "more", "label": "More, to fund maintenance and rangers" }
  ]
}
```

Commit and push it (merge to `main` so the **Deploy Polls Worker** action
runs; it also runs on `main-1`). The widget shows nothing until the Worker
knows the id, so **before the live publish** check:

```bash
curl -s "https://tom-polls.timesofmadeira.workers.dev/polls/<id>?voterId=check"
```

A 200 with the question means it is live; a 404 means the deploy (about a
minute) has not finished or the id is misspelt.

**Embed it** right after the lead paragraph(s), before the first H2, full width,
in the same `:::html` fence as tables and embeds:

```markdown
:::html
<div class="tom-poll" data-poll-id="<id>"></div>
:::
```

With a poll in the article, the related-card count is **one**, and the closing
comment prompt (if any) must ask something **different** from the poll.

**Print it** at the end of the report (see "Report format"), as plain text,
so the user sees the question and the options without opening the page.

## Related article previews

Every article links to **one other Times of Madeira article** that genuinely
relates to it (same story's follow-up, the policy it's reacting to, the place
or person it's about), as a preview card with an image, a headline **and a
one-sentence description underneath**, not a plain text link or a
headline-only card. A second card is allowed only on an article without a poll.
Skip it only when nothing on the blog actually relates, and say so in the
report.

Find candidates with `grep -rl` over `articles/*.summary.md` for the topic,
person or place, or check `blog-summary/URLs.md`. **Always take the title,
cover image and description from the live `timesofmadeira.com` page itself**
(`curl` it and read the `<title>`/`og:title`, `og:image` and
`<meta name="description">`/`og:description`, or the rendered `<h1>` and cover
`<img>`) - never from the local `.summary.md` draft. A post can be edited
after it was drafted, so the local file is not proof of what is actually
live; using it caused a wrong title and a wrong image once already.

```markdown
:::html
<div style="margin:1.2em 0"><a href="<the other article's live URL>" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:12px;box-sizing:border-box"><img src="<its cover_url>" alt="<short alt text>" style="width:110px;height:82px;object-fit:cover;border-radius:6px;flex:0 0 auto"><span style="min-width:0;display:block"><span style="font-size:.78em;text-transform:uppercase;letter-spacing:.04em;opacity:.65;margin-bottom:4px;display:block">Related</span><span style="font-weight:700;font-size:1.03em;line-height:1.3;display:block;margin-bottom:3px"><the other article's title></span><span style="font-size:.88em;line-height:1.35;opacity:.75;display:block"><the other article's live meta description></span></span></a></div>
:::
```

Place it where it fits the flow, usually right after the paragraph that
raises the related topic. Same `:::html` fence as tables and embeds, so the
linter's word-count and missing-bold warnings on that line don't apply.

## Comment prompt

The Hyvor comments widget sits right under the article now, so a closing
question can genuinely seed discussion - but only when the story actually
raises one. Judge it case by case:

- **Ask it** when the story has a real fork readers can take a side on: a
  decision affecting them (a fare rise, a closed road, a new rule), a local
  change they'd notice, a tradeoff with no clear right answer, or something
  people would plausibly have their own experience of.
- **Skip it** for routine reporting with no natural question (a court
  allegation update, a statistics release, an obituary, a process story), or
  when the question would just restate the headline ("What do you think
  about this budget?"). A forced or generic prompt reads as filler.
- Make it **specific to this article's facts**, not a template - name the
  place, figure or choice the story is actually about. Vary the phrasing and
  angle article to article; the same "Let us know in the comments!" on every
  post defeats the point.
- **Never ask what the poll already asks.** The poll takes the main fork; the
  comment prompt, if there is one, asks for something a tap cannot give (an
  experience, an example, a reason). If nothing is left, skip it.
- One sentence, placed after the last paragraph (before the `Source:`
  line(s) and related-article card). No heading, no emoji, not bolded as a
  CTA - it reads as a natural closing line, not a banner. A short explicit
  nudge to the comments is fine when it fits the tone (e.g. "Have you
  noticed the delays? Tell us in the comments.") but isn't required - the
  question alone is often enough.
- Never invent a stance or imply an answer; keep it neutral, matching the
  rest of the article's tone.
- Note the decision (added, and why, or skipped, and why) in the report's
  **setup** section.

## Embeds

Take over the source's **videos, Instagram posts and charts** where they add
something.

- Find them: `node C:/Users/samad/.claude/skills/bs2/scripts/find-embeds.cjs "<url>"`
  (run from the website repo, which has Playwright in `node_modules`).
- **Instagram:** the `blockquote` + `embed.js` code does **not** run on Hyvor.
  Use a direct iframe:

  ```markdown
  :::html
  <div style="max-width:540px;margin:1em auto"><iframe src="https://www.instagram.com/reel/<ID>/embed/captioned/" title="<Name> on Instagram" style="width:100%;height:860px;border:0;border-radius:8px;background:#fff" scrolling="no" allowtransparency="true" allowfullscreen loading="lazy"></iframe></div>
  :::
  ```

  Use `/p/<ID>/` instead of `/reel/<ID>/` for a photo post.
- **Datawrapper, YouTube and others:** paste the iframe into a `:::html` fence.
- The linter counts `:::html` content as prose, so ignore its word-count and
  missing-bold errors on those lines.

## Reading the source

| Source | How |
| ------ | --- |
| Normal page | `node C:/Users/samad/.claude/skills/blog-writer/scripts/fetch-source.mjs "<url>" --out articles/<slug>.source.txt` |
| JavaScript page (jm-madeira.pt, idealista, and others; under 180 words extracted) | `node C:/Users/samad/.claude/skills/bs2/scripts/fetch-rendered.cjs "<url>"`, run from the website repo |
| EU press release (ec.europa.eu presscorner) | `https://ec.europa.eu/commission/presscorner/api/documents?reference=IP/25/856&language=en`, field `docuLanguageResource.htmlContent` |
| PDF | Download it, then `node C:/Users/samad/.claude/skills/bs2/scripts/pdf-text.mjs <file.pdf> <out.txt>` (the font warnings are harmless). Text is tagged `[p1]`, `[p2]`, ... so quotes can be cited by page. |
| Screenshot / dashboard | Read the image yourself, carefully. Note the period and the comparison base. |
| Pasted text | Use it as the source. Still put the article URL in `source_url` and the Source line. |

Python is not installed. Use node.

## Steps

1. **Read every source** (table above). Save the text to `articles/<date>-<slug>.source.txt`.
2. **Plan.** Note the lead, every fact with its source line, the quotes
   (original beside your translation), the figures for tables, the embeds,
   the poll question, and what the source does **not** say.
3. **Draft** `articles/<date>-<slug>.summary.md` with the front matter from
   `/bs` (title, slug, description, tags, `author: Mat`, source_url,
   cover_url). Pick tags from the live list and the cover with `find-media.mjs`
   (look at the images). Add an evergreen link from
   `blog-summary/URLs.md` or a relevant earlier Times of Madeira article only
   where it really helps. Write the **poll** (see "Poll" above) and embed it
   after the lead, before the first H2. Add **one related-article preview
   card** (see "Related article previews" above) unless nothing on the blog
   genuinely relates. Add the `did-you-know.md` callout only if it fits.
   Close with a comment-seeding question only where it genuinely fits and
   asks something other than the poll (see "Comment prompt" above).
4. **Register the poll.** Add it to `worker/src/polls.json` (or reuse an
   existing id), commit, push and merge to `main` so the Worker deploys, then
   `curl` the poll URL until it returns 200 (see "Poll").
5. **Lint and check.**
   `node C:/Users/samad/.claude/skills/blog-summary/scripts/lint-summary.mjs articles/<slug>.summary.md`.
   The `length`, `h2-length` and `h2-count` rules come from `/bs` and are
   **overridden** here, so ignore them. Fix everything else, run the
   banned-word grep, then read the source and the draft side by side again.
6. **Publish, dev first, then live.** Use the same commands as `/bs` step 5,
   with `--featured-url <cover_url>`. Live uses
   `HYVOR_CONSOLE_KEY=$(cat ~/.hyvor/console-key-prod)` and
   `--blog times-of-madeira`. **Never print the prod key.** Before the live
   call, check that the tags exist and the slug is free on `times-of-madeira`.
   A Hyvor API 522 error is usually temporary, so retry once.
   **Changing a post that is already published is a different procedure**:
   see "Editing a published post" below. Never just re-run publish on it.
7. **Verify both pages.** curl each URL and check: HTTP 200, the H2 count,
   the cover, **zero "By Mat"**, the poll div, and the source link. For
   tables and embeds, run
   `node C:/Users/samad/.claude/skills/bs2/scripts/check-page.cjs <url> <scratchpad>`
   from the website repo. It saves desktop and mobile screenshots and prints
   the table count and `scrollWidth`; on mobile, `scrollWidth` must be 390,
   meaning no sideways scrolling. **Look at the screenshots**, and check that
   the poll shows its question and options.
8. **Report back** (format below).

## Editing a published post

The user changes covers, headlines and text **in the Hyvor editor** after an
article goes live. Those edits exist only on the blog. `publish.mjs --post-id`
writes the whole document from the local draft, so re-running it on a stale
draft silently undoes them. **The live post is the source of truth, never the
local file.** This applies to every later request on an article ("add a
sentence", "change the picture", "fix the headline"), whether or not it comes
in as `/bs2`.

1. **Pull the live post into the draft first**, from the live blog:

   ```bash
   HYVOR_CONSOLE_KEY=$(cat ~/.hyvor/console-key-prod) \
   node C:/Users/samad/.claude/skills/blog-writer/scripts/pull-post.mjs articles/<slug>.summary.md --blog times-of-madeira
   ```

   It finds the post by the draft's slug (or `--post-id <id>`), rewrites the
   body from the live content, refreshes `title`, `description`, `tags` and
   `cover_url`, and records `pulled_from`, `pulled_post_id`, `pulled_hash` and
   `pulled_at` in the front matter. It prints what differed from the local
   draft: **read that**, it is the list of the user's edits, and they stay.
   A `:::node` fence in the pulled draft is a block with no Markdown form; it
   round-trips as it is, so leave it alone. If the script warns that the
   editor holds unsaved changes, tell the user before publishing.
2. **Make the requested edit** in the refreshed draft, and nothing else. Do
   not re-pick the cover, re-word paragraphs or re-choose tags.
3. **Publish dev, then live, each with its own post id.** Get the dev id with
   `node .../pull-post.mjs articles/<slug>.summary.md --id-only` (dev key,
   default blog); the live id is `pulled_post_id`. Pass
   `--featured-url <the cover_url the pull wrote>`; the script skips the cover
   and tag calls when they already match the blog. On the live blog the script
   **refuses** a draft that was not pulled from that post, or a post that
   changed since the pull (someone edited it in the meantime): pull again,
   redo the edit, publish again. `--force` exists for the case the user
   explicitly wants the live version replaced; never use it on your own.
4. **Verify both pages** as in step 7, and check the user's own edits are
   still there (the cover, the changed wording).

Changing only the cover is the same procedure: pull, set `cover_url`, publish
with `--featured-url <new url>`.

## Report format

1. One line saying it is published on both blogs and verified.
2. The **headline**, the **live URL** with post id, and the **dev URL** with
   post id.
3. The **sections**: a numbered list of the H2s.
4. The **setup**: source and date, tags, cover, and any decisions such as
   allegation wording, avoided pronouns, translated terms, overridden lint
   rules, tables, embeds or the related-article preview added, and whether a
   comment prompt was added (and why) or skipped (and why).
5. The **gaps**: what a reader might expect that the source does not give,
   any derived figures, contradictions in the source, quotes or callouts left
   out and why.
6. The **poll**, printed as plain text (no code block): the poll id, the
   question, then one line per answer, and whether the id is new or reused.
   Example:

   Poll trail-fee-level (new)
   What should Madeira charge hikers for the levada trails?
   - Nothing, the trails should stay free
   - The current fee is about right
   - More, to fund maintenance and rangers

7. The **social posts**, each in a code block:
   - **Twitter/X:** under 280 characters, 2-3 emojis, key terms in
     **sans-serif bold Unicode** (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀), the real live link, hashtags
     (always `#Madeira` plus 1-2 more).
   - **Facebook:** a bold Unicode headline, 1-2 short paragraphs, 2-3 emojis,
     "Read more 👇", the real live link, hashtags.
   - Short, neutral and factual. The banned words apply here too.

## Hard rules

- Nothing invented. Unsure means leave it out and list it as a gap.
- Quotes only from the source's words, accurately translated, with the exact
  location known.
- Allegations always worded as allegations.
- No banned words, no em dashes, no "By Mat" in the body.
- Exactly two existing tags, and a cover you have looked at.
- One poll per article, 3 answers (4 at most), registered and deployed
  before the live publish, and printed in the report.
- One related-article card when the article has a poll.
- Publish to the dev blog first, then live, every time, and verify both pages.
- Never update a published post without pulling it first (pull-post.mjs).
  The user's edits in the Hyvor editor always win over the local draft.
- Never print or commit the prod key.
