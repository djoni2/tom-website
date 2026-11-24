---
name: bs2
description: Turn a source URL, PDF, screenshot or pasted text into a full Times of Madeira news article in New York Times style - B2 English, strictly fact-checked, data-rich H2s, figures shown in tables, the source's videos and embeds taken over - then publish it to the dev blog and the live timesofmadeira.com blog and return both links, the gaps, and Twitter/X and Facebook posts. Use when asked to "do the same with <link>", to write a full article (not a short summary) for Times of Madeira, or when the user types /bs2.
---

# bs2

Input: a URL, several URLs, a PDF, a screenshot (e.g. a DREM Power BI
dashboard) or pasted text, often in Portuguese. Output: a full news article,
published on **both** blogs, plus a report and two social posts.

This is the long form of `/bs`. It shares `/bs`'s fetcher, publisher, tag
taxonomy, cover library and front matter; the **writing rules below are the
complete brief for an article** and override `/bs` on length, H2s and
paragraphs. Scripts live in `C:/Users/samad/.claude/skills/<skill>/scripts/`
(`bs2`, `blog-summary`, `blog-writer`); run them from the website repo, which
has Playwright in `node_modules`. Python is not installed. The canonical copy
of this skill is `~/.claude/skills/bs2`; `claude-skills/bs2` in the website
repo is a backup, keep the two identical.

The one rule behind all the others: **nothing reaches the page that is not in
the source or checked against another reliable source.** No remembered
context, no filled-in causes, no invented quotes. The user checks quotes
word by word ("did you make up that quote?"), so every quote must be traceable
to an exact place in a source.

## Writing rules

| Element      | Rule |
| ------------ | ---- |
| Style        | **New York Times news style.** Lead with the news, then the details, then the context. Neutral tone, no opinion, no hype, no teasers, no rhetorical questions, no exclamation marks. |
| Language     | **English only**, **B2 level**. Everyday words, one idea per sentence, nothing over about 25 words. Translate everything, quotes included. |
| Length       | As long as the source supports. **Use everything relevant in the source**; do not cut it down to a summary. Do not pad. |
| Headline     | **One H1**, Title Case, active voice, ideally under about 60 characters. The same text goes in `title`. |
| H2s          | **6-15 words each**, Title Case. **Each H2 carries a concrete data point** (a figure, date, amount, count or place). **No figure repeated across H2s**, and no H2 repeating the H1's figure. As many as the story needs (usually 3-7); each answers a different question. |
| Paragraphs   | **2-4 short sentences**, most of them 3-4; a one-liner only now and then. Every paragraph adds something new. |
| Bold         | In every paragraph, the **1-4 most important consecutive words**. Never a whole clause, never inside a quote. |
| Links        | **Every hyperlink is bold**: `**[text](url)**`, the `Source:` lines included. Public figures with an English Wikipedia article get linked on first mention (three at most, checked with `check-wikipedia.mjs`, never guessed). Evergreen links from `blog-summary/URLs.md` only where they really help. |
| Quotes       | Translated **accurately**, never invented, merged or smoothed. A paraphrase in the source gets **no quotation marks**. A garbled transcript is paraphrased, not quoted. Quote block `> Text.` with `**Speaker**, role` on the line underneath; **no quotation marks around the block**, the theme draws its own. Several quote blocks are fine when the source carries them. |
| Allegations  | Crime and court stories: "according to the charges", "prosecutors say", "allegedly". Never state an accusation as fact. End with the presumption of innocence where it fits. |
| People       | **They/them** or no pronoun when the source does not show someone's gender. A Portuguese title like "o presidente" is grammatically masculine and does **not** show it. Do not name someone the source does not name. |
| Times        | 24-hour clock: `08:00`, `16:27`. |
| Dashes       | Plain hyphen `-`. **Never an em dash** (—) or en dash. |
| Author       | `author: Mat` in the front matter only. **Never write "By Mat"** or any byline in the body. |
| Emoji        | None in the article. |
| Callout      | At most one `:::callout` with a `did-you-know.md` entry, only if it genuinely fits. None is the norm. |
| Sources      | A `Source:` line per source at the very end (only the related card may follow), link text = bare domain, bold: `Source: **[dnoticias.pt](url)**`. |
| Tags         | **Exactly two existing tags** from the live taxonomy (`blog-writer/references/tags.md`, check the live list). Never create one. Write them with their accents (`Câmara de Lobos`): the tag search is accent-sensitive, so `Camara de Lobos` silently drops the tag. |
| Cover        | An existing library image you have **looked at**, picked with `find-media.mjs` (see `/bs` "The cover image"), published with `--featured-url`. |
| Description  | 110-160 characters, factual, for search results. |
| Poll         | **Every article carries one poll** (the user calls it a survey): right after the lead paragraph(s), before the first H2. One question, **3 answers (never more than 4)**. See "Poll". |
| Related      | **One other Times of Madeira article** as a preview card (image, headline, one-sentence description). Two cards only on an article without a poll. See "Related article card". |
| Comments     | Where it genuinely fits, end with one short question that invites readers to the comments. Not on every article, and never the poll's question. See "Comment prompt". |

### Banned words

Never, in any form (plural, -ing, -ed): boost, heading (incl. "heading to"),
sparks, enhancing, marks ("this marks..."), bolstered, equity, outpaces,
soared, disparities, propel, leveraging, reflecting, exacerbate, dampening.
The linter catches them, plus em dashes, "By Mat", AI tells ("underscores",
"pivotal", "robust"...) and Portuguese leftovers. It also applies to the poll
and the social posts.

### Fact-checking

- After drafting, check every number, name, date and place against the source
  a second time, reading source and draft side by side.
- **Check the arithmetic.** A derived figure (sum, share, average) is marked
  as derived in the report and must fit the source's other numbers
  (occupancy x ADR = RevPAR, the parts add up to the total).
- No "usually", "a record" or "the first time" unless the source says so. Use
  the source's own terms: an "estimated economic impact" is not revenue.
- If the source contradicts itself, use the version that fits the data and
  mention it in the report.
- Added context the user asks for ("mention the security risks from Russia")
  comes from the primary document or Wikipedia, quoted only where you can
  point to the page or section.

## Tables

Whenever a story has more than a handful of numbers (statistics, budgets,
comparisons, rankings), the figures go in **tables**; the user prefers this.
Write the spec (format documented at the top of the script) and generate:

```bash
node C:/Users/samad/.claude/skills/bs2/scripts/make-table.mjs <scratchpad>/tables.json
```

It prints `:::html` fences in the house style (green ▲ rises, red ▼ falls,
grey "was" lines, blue bars for rankings, body-size text, horizontal scroll
on a phone). Paste each under the lead or the H2 it belongs to. A table does
not replace the prose: the key figures still appear in the text.

## Poll

**The question** asks the one thing the story leaves open for readers: a
decision they can take a side on (a fee, a closure, a new rule), a trade-off
with no clear right answer, or their own expectation ("Will this change your
plans?"). Not a quiz on the facts, not "do you agree with the headline", not
"what do you think". Neutral, B2, under about 90 characters.

**The answers**: 3 options (4 at most), short labels under about 45
characters, mutually exclusive, covering the realistic range. A yes/no gets a
third option for the middle ground or "Not sure". No loaded or joke options.

**Register and embed it** with one command, from the website repo. Check
`--list` first: if an existing poll asks the same question, reuse its id so
the votes accumulate. A new id is kebab-case and names the topic, not the
article.

```bash
node C:/Users/samad/.claude/skills/bs2/scripts/add-poll.mjs --list
node C:/Users/samad/.claude/skills/bs2/scripts/add-poll.mjs trail-fee-level \
  --question "What should Madeira charge hikers for the levada trails?" \
  --option free="Nothing, the trails should stay free" \
  --option same="The current fee is about right" \
  --option more="More, to fund maintenance and rangers" \
  --commit --wait
```

It validates the poll, writes `worker/src/polls.json`, commits and pushes,
deploys the Worker with the local Wrangler login (the GitHub deploy action
has a broken Cloudflare token and fails every run), waits until the Worker
serves the id, and prints the `tom-poll` fence. Paste it right after the
lead, before the first H2. The widget shows nothing until the Worker knows
the id, so **the live publish waits for "live"**; `add-poll.mjs <id> --check`
asks again. The poll cannot load on the dev blog (its hyvorblogs.io origin is
not on the Worker's allowlist), so check it on the live page.

## Related article card

One other Times of Madeira article that genuinely relates (the story's
follow-up, the policy it reacts to, the place or person). Prefer evergreen or
statistics pieces over a past event announcement. Find candidates with
`grep -rl` over `articles/*.summary.md` or `blog-summary/URLs.md`, then build
the card **from the live page**, never from the local draft (posts get edited
in Hyvor after drafting):

```bash
node C:/Users/samad/.claude/skills/bs2/scripts/make-related.mjs https://www.timesofmadeira.com/<slug>
```

Paste the fence where it fits the flow, usually after the paragraph that
raises the related topic, or after the `Source:` lines. Skip it only when
nothing on the blog relates, and say so in the report.

## Comment prompt

The comments widget sits right under the article, so a closing question can
seed discussion, but only when the story has a real fork readers can take a
side on or an experience they plausibly have. Skip it for routine reporting
(court updates, statistics releases, obituaries, process stories) and
whenever it would restate the headline. One neutral sentence after the last
paragraph, specific to this article's facts, phrased differently each time,
no heading, no emoji, not bolded. **Never ask what the poll already asks**:
the comment asks for what a tap cannot give (an experience, an example, a
reason). Note the decision, either way, in the report.

## Embeds

Take over the source's **videos, Instagram posts and charts** where they add
something. Find them with
`node C:/Users/samad/.claude/skills/bs2/scripts/find-embeds.cjs "<url>"`.
Datawrapper, YouTube and other iframes go straight into a `:::html` fence.
Instagram's `blockquote` + `embed.js` does **not** run on Hyvor; use a direct
iframe (`/p/<ID>/` instead of `/reel/<ID>/` for a photo post):

```markdown
:::html
<div style="max-width:540px;margin:1em auto"><iframe src="https://www.instagram.com/reel/<ID>/embed/captioned/" title="<Name> on Instagram" style="width:100%;height:860px;border:0;border-radius:8px;background:#fff" scrolling="no" allowtransparency="true" allowfullscreen loading="lazy"></iframe></div>
:::
```

## Reading the source

| Source | How |
| ------ | --- |
| Normal page | `node C:/Users/samad/.claude/skills/blog-writer/scripts/fetch-source.mjs "<url>" --out articles/<slug>.source.txt` |
| JavaScript page (jm-madeira.pt, idealista; under 180 words extracted) | `node C:/Users/samad/.claude/skills/bs2/scripts/fetch-rendered.cjs "<url>"` |
| EU press release (ec.europa.eu presscorner) | `https://ec.europa.eu/commission/presscorner/api/documents?reference=IP/25/856&language=en`, field `docuLanguageResource.htmlContent` |
| PDF | `node C:/Users/samad/.claude/skills/bs2/scripts/pdf-text.mjs <file.pdf> <out.txt>` (font warnings are harmless). Text is tagged `[p1]`, `[p2]`... so quotes can be cited by page. |
| Screenshot / dashboard | Read the image yourself, carefully. Note the period and the comparison base. |
| Pasted text | Use it as the source. Still put the article URL in `source_url` and the Source line. |

## Steps

1. **Read every source** and save the text to `articles/<date>-<slug>.source.txt`.
2. **Plan.** Note the lead, every fact with its source line, the quotes
   (original beside your translation), the figures for tables, the embeds,
   the poll question, the related article, and what the source does **not**
   say.
3. **Draft** `articles/<date>-<slug>.summary.md` with the `/bs` front matter
   (title, slug, description, tags, `author: Mat`, source_url, cover_url).
   Pick the tags from the live list and the cover with `find-media.mjs`,
   looking at the images. Register the poll with `add-poll.mjs` and paste its
   fence after the lead; build the related card with `make-related.mjs`.
4. **Lint, then check by hand.**

   ```bash
   node C:/Users/samad/.claude/skills/blog-summary/scripts/lint-summary.mjs articles/<slug>.summary.md --long
   ```

   `--long` applies the article rules (length, H2s, poll, related card, bold
   links). Fix every error, judge every warning, then read the source and the
   draft side by side once more.
5. **Publish, dev first, then live**, with the `/bs` step 5 commands and
   `--featured-url <cover_url>`. Live uses
   `HYVOR_CONSOLE_KEY=$(cat ~/.hyvor/console-key-prod)` and
   `--blog times-of-madeira`; **never print the prod key**. Before the live
   call, check that the tags exist and the slug is free on `times-of-madeira`,
   and that the poll is live. A Hyvor 522 is usually temporary: retry once.
   **A post that is already published is a different procedure** (below);
   never just re-run publish on it.
6. **Verify both pages.** curl each URL for HTTP 200, the H2 count, the cover,
   zero "By Mat", the poll div and the source link. Then
   `node C:/Users/samad/.claude/skills/bs2/scripts/check-page.cjs <url> <scratchpad>`
   saves desktop and mobile screenshots and prints the table count and
   `scrollWidth`; on mobile it must be 390 (no sideways scrolling). **Look at
   the screenshots** and check the poll shows its question and options.
7. **Report back** (format below).

## Editing a published post

The user edits covers, headlines and text in the Hyvor editor after
publishing, and those edits exist only on the blog. **Before any change to a
live post, pull it first** with `pull-post.mjs`, make only the requested edit,
then publish dev and live with their own post ids. The full procedure is in
`C:/Users/samad/.claude/skills/blog-writer/references/editing-published-post.md`;
read it before touching a live post. Never use `--force` on your own.

## Report format

1. One line saying it is published on both blogs and verified.
2. The **headline**, the **live URL** with post id, and the **dev URL** with
   post id.
3. The **sections**: a numbered list of the H2s.
4. The **setup**: source and date, tags, cover, and any decisions such as
   allegation wording, avoided pronouns, translated terms, tables, embeds, the
   related card, and whether a comment prompt was added or skipped, and why.
5. The **gaps**: what a reader might expect that the source does not give,
   derived figures, contradictions in the source, quotes or callouts left out
   and why.
6. The **poll**, as plain text (no code block): the id and whether it is new
   or reused, the question, then one line per answer.
7. The **social posts**, as plain text (no code block, so they paste clean),
   short, neutral and factual, banned words excluded:
   - **Twitter/X:** under 280 characters, 2-3 emojis, key terms in
     **sans-serif bold Unicode** (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀), the real live link, `#Madeira`
     plus 1-2 more hashtags.
   - **Facebook:** a bold Unicode headline, 1-2 short paragraphs, 2-3 emojis,
     "Read more 👇", the real live link, hashtags.

## Hard rules

- Nothing invented. Unsure means leave it out and list it as a gap.
- Quotes only from the source's words, accurately translated, with the exact
  location known. Allegations always worded as allegations.
- No banned words, no em dashes, no "By Mat" in the body, every link bold.
- Exactly two existing tags, and a cover you have looked at.
- One poll per article, 3 answers (4 at most), live on the Worker before the
  live publish, and printed in the report. One related card with a poll.
- Lint with `--long` and publish nothing that still has errors.
- Publish to the dev blog first, then live, every time, and verify both pages.
- Never update a published post without pulling it first. The user's edits in
  the Hyvor editor always win over the local draft.
- Never print or commit the prod key.
