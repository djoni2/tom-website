---
name: bs
description: Turn one or more source URLs into a short, engaging English summary post for the Times of Madeira blog - B2 English, short phrases, bold keywords, the key quote as a Hyvor quote block, a source link per source, and a fitting cover picked from the blog's own media library - then publish it to both the dev blog and the live timesofmadeira.com blog. Use when asked to summarise a link, write a short recap of an article, or post a summary rather than a full article.
---

# blog-summary

Input: one or more URLs (or pasted text). Output: a published **summary** on the
Times of Madeira dev blog - short, easy to read, and enough for a reader to be
up to date in under a minute.

This is the short form. For a full New York Times style news article, use the
`blog-writer` skill instead. This skill reuses `blog-writer`'s fetcher,
publisher and tag taxonomy, and replaces its style rules with the ones below.

The one rule behind all the others: **nothing reaches the page that is not in
the source.** No remembered context, no filled-in causes, no invented quotes.
A short, accurate summary beats a complete-sounding one.

## The format, in full

| Element    | Rule                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language   | **English only**, whatever language the sources are in. Translate everything, quotes included.                                                                                          |
| Level      | **B2**. Everyday words, short phrases, one idea per sentence. Nothing over about 25 words.                                                                                              |
| Length     | **150-500 words** of body text. Over 500 is no longer a summary.                                                                                                                        |
| Headline   | One H1. States what happened, active voice, under about 70 characters. Use Title Case for all headlines.                                                                                |
| Sections   | 1-3 H2s of 3-8 words.                                                                                                                                                                   |
| Paragraphs | 1-3 short sentences each. Every paragraph adds something new.                                                                                                                           |
| Bold       | Every paragraph marks the **1-4 most important consecutive words**, like this. Never a whole clause, never inside a quote.                                                              |
| Quote      | If a source carries quotes, the single most important one runs as a **Hyvor quote block** (see below), translated into English, with the speaker named on the line directly underneath. |
| Callout    | **One per summary**, carrying context the article itself does not give (see below).                                                                                                     |
| People     | A famous person with an **English Wikipedia** article gets linked, first mention only, **three per summary at most**.                                                                   |
| Emoji      | **None** that you write. The info box supplies the site's own lightbulb.                                                                                                                |
| Em dash    | Never. Plain hyphen `-`.                                                                                                                                                                |
| Times      | 24-hour clock: `08:00`, `20:00`.                                                                                                                                                        |
| Sources    | A `Source:` line per source, each its own paragraph, at the very end. Link text is the **domain**.                                                                                      |
| Tags       | **Exactly two**, both from the existing taxonomy. Never invented.                                                                                                                       |
| Cover      | An existing image from the blog's media library that **fits the story** - looked at, not just name-matched.                                                                             |

Engaging means concrete, not loud: the real figure, the real date, the real
consequence for the reader. No teasers, no rhetorical questions, no
exclamation marks.

## The quote block

A quote goes in as a Markdown blockquote. That is the same block the Hyvor
editor inserts with the **`/quote`** command, and `publish.mjs` converts it
into exactly that node.

```markdown
> "Housing is now the biggest problem for families on this island."

**Miguel Albuquerque**, President of the Regional Government
```

- **English only.** Translate the original wording yourself, keep the meaning
  exact, and keep the original beside the translation in your notes. The
  original language never appears on the page.
- **Who said it goes directly underneath**, on its own short line: the name in
  bold, then the role. No blank line between the quote and that line.
- **One quote per summary.** Pick the one that carries the story. If the
  sources have no quotes, the summary runs without one.
- Never invent, merge, trim or smooth a quote. Use `[...]` for a cut inside one
  continuous statement.
- No bold and no links inside the quote itself.

## The context callout

Every summary carries **at most one** callout selected from the did-you-know.md
file based on topic relevance. If no fitting callout is found, omit the callout
entirely.

To select a callout:

1. Identify the main topic(s) of the article from its content
2. Review the did-you-know.md file for callouts with matching topics
3. Choose the callout that best fits the article's subject and context
4. If no relevant callout is found, do not include a callout section

When including a callout:

- Use the exact text from did-you-know.md (including the "**Did you know?**" opening)
- Format it as a Hyvor callout block using :::callout
- Place it after the paragraph it supports, not at the very top or bottom
- Only include if the callout adds meaningful context not already in the article
- Verify any facts in the callout against sources if possible, but do not delay
  publishing for verification unless the callout contains critical information

```markdown
:::callout
**Did you know?** [Exact text from did-you-know.md]
:::
```

## Linking people

The first time the summary names a **public figure with an English Wikipedia
article**, link the name:

```markdown
**[Cristiano Ronaldo](https://en.wikipedia.org/wiki/Cristiano_Ronaldo)**
```

- **Check the article exists first. Never guess a URL:**

  ```bash
  node C:/Users/samad/.claude/skills/blog-summary/scripts/check-wikipedia.mjs "Emanuel Câmara" "Miguel Pinto Luz"
  ```

  It prints `EXISTS` with the canonical URL, `MISSING`, or `DISAMBIGUATION`
  (which is not a usable link). Use the URL it prints.

- **English Wikipedia only.** If only a Portuguese or German article exists, do
  not link at all. Never link another language edition.

- **Three links per summary at most**, and only people - not companies, not
  airlines, not places.

- **First mention only.** Later mentions of the same person stay plain.

- **Never inside the quote** and never in the headline. Inside the callout is
  fine if that is where the person first appears.

- Public figures only. Not a private individual caught up in a story.

The theme adds `target="_blank"` and `rel="noopener"` to external links by
itself, so plain Markdown is all that is needed.

## The source lines

The summary ends with one line per source, each as its own paragraph. The link
text is the **domain**, without `www.`; the link itself is the full article URL:

```markdown
Source: [dnoticias.pt](https://www.dnoticias.pt/2026/10/14/509033-portugueses-que-vivem-nas-ilhas/)

Source: [rtp.pt](https://www.rtp.pt/madeira/...)
```

Nothing comes after the last source line. (This differs from `blog-writer`,
which spells out the outlet name - a summary shows the bare domain.)

## The cover image

Every summary gets a cover **chosen from the images already hosted on
timesofmadeira.com** - about 1,800 files in the blog's media library
(`https://blogs.hyvor.com/console/times-of-madeira/tools/media`). Never
generate one, and never hotlink an image from the source site.

### Choosing it

```bash
node C:/Users/samad/.claude/skills/blog-summary/scripts/find-media.mjs \
  --top 8 --download <scratchpad>/covers  tap airline madeira airport
```

It ranks library filenames against your terms and downloads the top matches.

**Then look at the downloaded images before choosing one.** This is the step
that matters: filenames are a rough index, not a description. In the TAP trial,
the names ranked three `tap-*` files first, but the best photo on the blog was
`madeira-airport-plane.webp` - a TAP jet taxiing at Madeira airport with the
terraced hillside behind it - and `tap-air2.jpg`, which sounds ideal, is a
cut-out aircraft on a pink gradient that does not read as a news photo.

Pick on, in this order:

1. **Subject match.** The specific beats the generic: a TAP plane at Madeira
   airport beats any plane, which beats a runway.
2. **How it survives the crop.** The theme puts the cover in a 16:9 band with
   `object-fit: cover`, so a 3:2 photo loses about 17% of its height and a 4:3
   about 25%, taken off the top and bottom. A subject near an edge gets cut.
3. **It is a photograph of the thing**, not a graphic, a logo or a cut-out.

Two traps worth knowing: a `.jpg` name in this library is often WebP bytes, so
the extension says nothing about the format; and reusing the same image on
several posts is fine - the library is the blog's own stock.

### Using it

Put the chosen URL in the front matter as `cover_url`, then publish with
**`--featured-url`**, which points the post at the hosted file:

```bash
--featured-url https://www.timesofmadeira.com/media/madeira-airport-plane.webp
```

Use `--featured-url`, not `--cover-url`: `--cover-url` copies the image into
the library again under a hash name, so publishing to two blogs would add two
duplicates of a file that is already there.

**If nothing in the library fits**, fall back to the house panorama and say so
when you report back:

```
https://www.timesofmadeira.com/media/housing-crisis-shock-policy.webp
```

**One image per summary. No image in the body, and never touch the cover of
another post.**

## Steps

Work in `articles/` under the current directory. A summary is two kinds of file:

```
articles/2026-10-14-<slug>.source.txt    extracted source text, one per URL
articles/2026-10-14-<slug>.summary.md    the draft (front matter + body)
```

### 1. Read every source

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/fetch-source.mjs "<url>" --out articles/<slug>.source.txt
```

Run it once per URL (`.source-2.txt`, `.source-3.txt` for the rest). It prints
the title, byline, date, language and **every quoted passage it found**, which
is where the quote block comes from. Under 180 words extracted means the page
is JavaScript-rendered or paywalled: say so and ask the user to paste the text
rather than summarising a fragment.

A Portuguese or German source is normal. Work from the original and translate.

### 2. Pick what goes in

A summary is a selection, so make it deliberately. Before drafting, note:

- the single fact a reader must take away - that is the lead
- two to four supporting facts, each with the line of the source it came from
- the most important quote, with speaker and role, original wording beside your
  translation
- what the sources do **not** say, if a reader would reasonably ask

Anything you cannot point at in a source does not go in. When two sources
disagree, say so in one short sentence rather than picking one.

### 3. Write the draft

```markdown
---
title: Madeira Freezes New Holiday Rental Licences in Funchal
slug: madeira-freezes-new-holiday-rental-licences-funchal
description: A 110-160 character summary for search results and the article card.
tags: [Real Estate, Funchal]
source_url: https://www.dnoticias.pt/2026/10/14/...
cover_url: https://www.timesofmadeira.com/media/funchal-apartment-balconies.webp
---

# Madeira Freezes New Holiday Rental Licences in Funchal

The regional government has stopped **all new licences** for holiday rentals in
Funchal. The freeze starts on 1 November and runs for two years.

Funchal has **4,200 registered rentals** today. The government says about one
flat in six in the city centre goes to tourists.

> "Housing is now the biggest problem for families on this island."

**[Miguel Albuquerque](https://en.wikipedia.org/wiki/Miguel_Albuquerque)**,
President of the Regional Government

:::callout
**Who he is**: Albuquerque has led the regional government since 2015 and was
mayor of Funchal for 21 years before that.
:::

Owners with a licence keep it. The government did **not say** what happens to
applications that are already filed.

Source: [dnoticias.pt](https://www.dnoticias.pt/2026/10/14/...)
```

With more than one source, add one `Source:` paragraph per source, in the order
you used them.

**Exactly two tags, and never invented.** Both from the taxonomy in
`C:/Users/samad/.claude/skills/blog-writer/references/tags.md`, and read the
live list first. One for the subject, one for a different angle - the place,
the sector or the lens - and never two that say the same thing. If nothing
fits, say so and let the user decide; never create a tag through the API.

Write the callout and check the Wikipedia links as you draft - see **The
context callout** and **Linking people** above. Both are part of the format,
not a polish step.

**Pick the cover now too**, with `find-media.mjs`, and put its URL in
`cover_url` - see **The cover image**. Looking at the candidates is part of
choosing; do not pick one on its filename.

### 4. Lint, then check by hand

```bash
node C:/Users/samad/.claude/skills/blog-summary/scripts/lint-summary.mjs articles/<slug>.summary.md
```

Fix every error, judge every warning. Then do the pass the linter cannot: read
each source and the summary side by side and confirm every number, name, date,
place and the quote. A quote whose meaning is not exactly in the source comes
out.

### 5. Publish to both blogs

**Every summary goes to both the dev blog and production.** The user asked for
this standing, so it needs no fresh confirmation - but dev goes first, so a
broken draft is caught on the `noindex` blog before the live one.

Dev:

```bash
node C:/Users/samad/.claude/skills/blog-writer/scripts/publish.mjs articles/<slug>.summary.md \
  --featured-url <the cover_url from the front matter>
```

Then production, which is **`times-of-madeira`**, served as
`www.timesofmadeira.com` and indexed:

```bash
HYVOR_CONSOLE_KEY=$(cat ~/.hyvor/console-key-prod) \
node C:/Users/samad/.claude/skills/blog-writer/scripts/publish.mjs articles/<slug>.summary.md \
  --blog times-of-madeira \
  --featured-url <the cover_url from the front matter>
```

Before the production call, check on `times-of-madeira` itself that both tags
exist (`GET /tags?search=`) and that the slug is free (`GET /posts?search=`).
Tags, media and slugs are per blog, so a dev success proves nothing about the
live one.

**Console API keys are per blog.** The dev key returns 403 `Invalid API key` on
`times-of-madeira`, so the live blog uses its own key from
`~/.hyvor/console-key-prod`, passed as above - never printed, never written
into the repo.

`--draft` stops before publishing, `--dry-run` prints the calls without making
them, `--post-id <id>` updates an existing post instead of creating one. See
`C:/Users/samad/.claude/skills/blog-writer/references/hyvor-api.md` when a call
fails.

The two blogs hold two separate posts with two different ids. An edit after
publishing has to be applied to both, each with its own `--post-id`.

Then open **both** live URLs and look at the rendered pages: the panorama band,
the quote block, the callout, the Wikipedia link, the bold runs, the source
lines. A green publish is not proof the page reads right.

### 6. Report back

Give the user **both URLs** - the live timesofmadeira.com one and the dev one -
with the headline and the two post ids. Then list, plainly, as gaps: anything a
reader might expect that the sources did not support, any tag you wanted but
could not use, and the callout or quote you left out and why.

After reporting back, **always generate powerful Facebook and Twitter posts** for the respective posts in the terminal:

**For Twitter/X:**

- Keep under 280 characters
- Use emojis strategically (2-3 emojis maximum)
- Convert key terms to **non-serif bold unicode** (using mathematical bold characters)
- Include the actual link (not just [Link])
- Include relevant hashtags
- Make it engaging and shareable
- **Make it shorter than previous versions**

**For Facebook:**

- Can be longer (aim for 1-3 short paragraphs)
- Use emojis (2-3 emojis maximum)
- Convert key terms to **non-serif bold unicode**
- Include the actual link
- Include a call to action if appropriate
- Maintain the engaging tone of the summary
- **Make it shorter than previous versions**

Example format for Twitter:
𝐌𝐚𝐝𝐞𝐢𝐫𝐚 𝐅𝐫𝐞𝐞𝐳𝐞𝐬 𝐍𝐞𝐰 𝐇𝐨𝐥𝐢𝐝𝐚𝐲 𝐑𝐞𝐧𝐭𝐚𝐥 𝐋𝐢𝐜𝐞𝐧𝐜𝐞𝐬 𝐢𝐧 𝐅𝐮𝐧𝐜𝐡𝐚𝐥 🏠㊗️
The regional government has stopped 𝐚𝐥𝐥 𝐧𝐞𝐰 𝐥𝐢𝐜𝐞𝐧𝐜𝐞𝐬 for holiday rentals in Funchal starting 1 Nov for 2 years. With 4,200 registered rentals today, ~1 in 6 city centre flats go to tourists. "Housing is now the biggest problem for families on this island." - 𝐌𝐢𝐠𝐮𝐞𝐥 𝐀𝐥𝐛𝐮𝐪𝐮𝐞𝐫𝐪𝐮𝐞 𝐑𝐞𝐠𝐢𝐨𝐧𝐚𝐥 𝐆𝐨𝐯𝐞𝐫𝐧𝐦𝐞𝐧𝐭
https://www.timesofmadeira.com/article-slug
#Madeira #Funchal #HousingCrisis

Example format for Facebook:
𝐌𝐚𝐝𝐞𝐢𝐫𝐚 𝐅𝐫𝐞𝐞𝐳𝐞𝐬 𝐍𝐞𝐰 𝐇𝐨𝐥𝐢𝐝𝐚𝐲 𝐑𝐞𝐧𝐭𝐚𝐥 𝐋𝐢𝐜𝐞𝐧𝐜𝐞𝐬 𝐢𝐧 𝐅𝐮𝐧𝐜𝐡𝐚𝐥 🏠㊗️
The regional government has stopped all new licences for holiday rentals in Funchal. The freeze starts on 1 November and runs for two years.

Funchal has 4,200 registered rentals today. The government says about one flat in six in the city centre goes to tourists.

> "Housing is now the biggest problem for families on this island."
>
> 𝐌𝐢𝐠𝐮𝐞𝐥 𝐀𝐥𝐛𝐮𝐪𝐮𝐞𝐫𝐩𝐞, 𝐏𝐫𝐞𝐬𝐢𝐝𝐞𝐧𝐭 𝐨𝐟 𝐭𝐡𝐞 𝐑𝐞𝐠𝐢𝐨𝐧𝐚𝐥 𝐆𝐨𝐯𝐞𝐫𝐧𝐦𝐞𝐧𝐭

https://www.timesofmadeira.com/article-slug
#Madeira #Funchal #Housing #Tourism #RegionalGovernment

## Hard rules

- No fact, figure, name, date or quote that is not in the sources - **except
  inside the one callout**, which may carry context from outside the source as
  long as it is true, checked, and not a live figure that will go stale.
- Nothing invented anywhere, callout included. Unsure means leave it out.
- No invented, paraphrased or merged quotes inside quotation marks.
- Quotes in English only, with the speaker on the line directly underneath.
- No emoji that you write; the info box brings the site's own lightbulb.
- One context callout per summary, opening with a bold label.
- At most three Wikipedia links, English Wikipedia only, people only, first
  mention only, and each one checked with `check-wikipedia.mjs` before it ships.
- One bold run of 1-4 consecutive words in every paragraph, never inside a quote.
- The cover is an existing library image that you have **looked at**, set with
  `--featured-url`. The house panorama only when nothing fits, and say so.
- A `Source:` line per source, each its own paragraph, last in the post, with
  the domain as the link text.
- **Exactly two existing tags. Never create a tag.**
- Never publish a draft that still has lint errors - on either blog.
- **Publish to dev first, then production.** Both, every time. A third blog
  would still need the user to say so in that turn.
