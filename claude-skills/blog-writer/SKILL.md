---
name: blog-writer
description: Turn a source URL into a Times of Madeira news article - New York Times style, B2 English, strictly fact-checked - then generate a cover image and publish it to the Hyvor Blogs dev blog. Use when given a link to write up, asked to draft or post an article for Times of Madeira, or asked to publish an existing draft.
---

# blog-writer

Input: a URL (or pasted text). Output: a published article on the Times of
Madeira dev blog, with a cover image, tags and a description.

The one rule behind all the others: **nothing reaches the page that is not in
the source.** No remembered context, no filled-in causes, no invented quotes.
A short, accurate article beats a complete-sounding one.

## Before drafting

Read `references/style-rules.md` in full. It is the brief - headline rules, H2
rules, banned words, quote handling, B2 constraints - and it is not summarised
here. `references/tags.md` holds the tag taxonomy to pick from.

Work in `articles/` under the current directory. One article is four files:

```
articles/2026-10-11-<slug>.source.txt  the extracted source text, kept for checking
articles/2026-10-11-<slug>.facts.md    fact ledger, each claim with its source line
articles/2026-10-11-<slug>.md          the draft (front matter + body)
articles/2026-10-11-<slug>.cover.webp  the generated cover, always webp
```

## Steps

### 1. Read the source

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/fetch-source.mjs "<url>" --out articles/<slug>.source.txt
```

It prints the title, byline, publication date, language and every quoted
passage it found, then the article text. If it extracts under 180 words the
page is JavaScript-rendered or paywalled: say so and ask the user to paste the
text rather than writing from the fragment.

A source in Portuguese is normal. Work from the Portuguese and translate.

### 2. Build the fact ledger first

Write `<slug>.facts.md` before a word of the article. One line per fact:

```markdown
- 412 speeding cases in September | "registou 412 casos de excesso de velocidade em setembro"
- campaign name: Operação Verão Seguro | "no âmbito da Operação Verão Seguro"
- QUOTE (pt): "Vamos manter estas operações durante o inverno"
  translation: "We will keep these operations through the winter."
  speaker: Nuno Silva, PSP operation commander, briefing of 2 October
- GAP: the source does not say how many cases led to charges
```

Then draft only from this file. If a sentence you want to write has no line
here, either find it in the source or drop the sentence.

### 3. Plan the structure

One H1 and 4-6 H2s. For each H2, note which ledger fact it previews. Check
before writing that no figure appears in two H2s and that each section answers
a different question (what happened, how big, who is affected, what is next,
what is still unknown).

### 4. Write the draft

Front matter drives both the lint and the publish step:

```markdown
---
title: Police Record 412 Speeding Cases in Funchal During September Campaign
slug: police-record-412-speeding-cases-funchal-september
description: A 150-character summary for search results and the article card.
tags: [Funchal, Road Safety, Police]
source_url: https://www.dnoticias.pt/...
kicker: MADEIRA | ROAD SAFETY
cover_scene: Traffic officers wave down a line of cars on a coastal road above Funchal at dusk, a driver leaning out of a window red-faced, an officer deadpan with a notebook
cover_bubbles: OUTRA VEZ?!; 412 CASOS
---

# Police Record 412 Speeding Cases in Funchal During September Campaign

Opening paragraph: the single most important fact, with its **key words bold**.

## Officers Stopped 2,140 Vehicles Across Four Weeks in Funchal

Checks ran at **eleven points** in the city between 1 and 30 September.

Officers stopped vehicles at three points:

- the Via Rápida
- the port approach
- the airport road

:::callout 💡
**Important**: the campaign runs through the winter, so these figures are not
final.
:::

Source: [Diário de Notícias da Madeira](https://www.dnoticias.pt/...)
Image: AI
```

**Writing Guidelines:**
- **Capitalization**: Use proper title case for H2 headings (capitalize major words)
- **Paragraphing**: Aim for 2-5 sentences per paragraph for better readability
- **Source and Image**: Both must be on their own separate lines at the very end of the article
- **Wikipedia Links**: Link famous names to Wikipedia (English version only, open in new window) - maximum 3 names per article

Three elements every article needs, all enforced by the linter:

- **Bold keywords in every paragraph.** The 1-4 most important consecutive
  words, `**like this**`. Never inside a quotation, never a whole clause.
- **1 or 2 callout blocks**, written as the `:::callout` fence above. They
  become the info boxes the site already uses.
- **A source line, last.** `Source: [name](url)`. For `dnoticias.pt`,
  `rtp.pt` and `jornaldamadeira.pt` the link text is the outlet name
  (Diário de Notícias da Madeira, RTP Madeira, Jornal da Madeira). For any
  other site the link text is the URL itself.
- **`Image: AI` directly under it** whenever the cover came from an image
  model. Nothing after that line.
- **Exactly two distinct tags** from `references/tags.md`.
- **Bullet lists for runs of three or more** parallel items, rather than a
  series inside a sentence.
- **Wikipedia links on public figures**, first mention only, English Wikipedia
  only, and only after checking the article exists. Never inside a quotation.
  **Limit: Maximum 3 Wikipedia links per article.** The theme opens external links in a new tab by itself.

`references/style-rules.md` carries the detail on all three.

`cover_scene` and `cover_bubbles` feed the cover image in step 6. Bubbles are
separated by `;`, a few words each, never a sentence of body copy.

**Exactly two tags**, both from the taxonomy in `references/tags.md`: one for
the subject, one for a different angle, and never two that say the same thing.
Never invent a tag and never create one through the API - if nothing fits, say
so and let the user decide. The linter fails a draft without two distinct tags.

### 5. Lint, then verify by hand

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/lint-article.mjs articles/<slug>.md
```

Fix every error. Judge each warning. Then do the pass the linter cannot: read
the source and the draft side by side and confirm every number, name, date,
place and quote. A quote that is not verbatim in the source comes out.

### 6. Make the cover

Every article gets an editorial cartoon in one fixed house style. Read
`references/image-prompt.md` before writing the scene - it covers what makes a
usable scene, the rule against sentences in the image, and the taste limits.

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/make-cartoon.mjs \
  --scene "<what a reader would see, from cover_scene>" \
  --bubbles "BEM-VINDOS?; WUNDERBAR!" \
  --out articles/<slug>.cover.webp
```

The style text is fixed inside the script. You only write the scene and the
speech bubbles. The exact prompt is always saved next to the image as
`<out>.prompt.txt`.

**Covers are always `.webp`, never `.png`** - the same picture runs about six
times larger as PNG. Both image scripts write webp and `publish.mjs` sends the
matching content type.

**This needs an image model, which is not configured on this machine.** With no
`OPENAI_API_KEY` (or `IMAGE_API_KEY` + `IMAGE_API_BASE`) the script writes the
prompt and stops. When that happens, do not quietly ship a different kind of
image and do not try to draw the style by hand - an SVG scene cannot do
caricature and reads as clip art beside the published covers. Tell the user the
cartoon could not be generated, give them the prompt file, and either wait for
an image or fall back, saying plainly that it is a placeholder, to the
typographic card:

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/make-cover.mjs \
  --title "<the H1>" --kicker "MADEIRA | HISTORY" \
  --variant coast --out articles/<slug>.card.webp
```

`--variant` is `ridge` (general news), `coast` (sea, weather, tourism) or
`night` (evening events, policing, culture).

Look at whichever image you end up with before publishing. A photograph you
have the right to use can be published instead with `publish.mjs --cover-url`.

**One image, one article.** The cover belongs to the article being written.
Do not touch the images on any other post, and do not go looking for images to
fix. Broken pictures elsewhere on the blog are someone else's to deal with:
report what you saw and leave them alone. The seeded demo posts on the dev blog
are a known case - their filler images point at a Cloudinary account Hyvor has
disabled (`cloud_name dqabfne6s is disabled`, HTTP 401), so they will keep
showing as empty boxes until those posts are deleted or given real images.

### 7. Publish

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/publish.mjs articles/<slug>.md \
  --cover articles/<slug>.cover.png
```

It creates the post, converts the body to the editor's format, uploads the
cover, sets the tags and publishes, then prints the live URL and the Console
URL. `--draft` stops before publishing; `--dry-run` prints the calls without
making them; `--post-id <id>` updates an existing post instead of creating one.

Needs a Console API key - see `references/hyvor-api.md` for creating one and
for what to do when a call fails.

### 8. Report back

Give the user the live URL, the headline, and - this part matters - anything
the source did not support that a reader might expect, listed as gaps rather
than quietly omitted.

## Hard rules

- No fact, figure, name, date or quote that is not in the source material.
- No invented or paraphrased quotes inside quotation marks.
- No bold inside a quotation, and no callout that adds a fact the article does
  not already carry.
- No sentences inside the cover image.
- **Touch only the image of the article being written.** Make one image, attach
  it to that post, and leave every other post's image alone. Never replace,
  re-upload or delete another post's media, even when it is broken.
- **Never create tags.** Only tags the blog already has may go on a post. The
  tag list is the blog owner's editorial decision, not something an article
  adds to. `publish.mjs` enforces this: an unmatched tag is reported and left
  off. Check what exists before writing the front matter, and report any tag
  you wanted but could not use instead of creating it.
- Never publish an article that still has lint errors.
- The default target is the dev blog, which is `noindex`. Publishing to any
  other blog needs the user to say so in that turn.
- If asked to publish an existing draft, start at step 5. Do not re-report
  someone else's checks as your own.