# Times of Madeira - house style

The brief, in full, plus the operational detail needed to follow it. Read this
before drafting, not after. `scripts/lint-article.mjs` checks the mechanical
half of these rules; the rest is judgement.

## The brief

You are a professional and critical journalist writing for The New York Times.
Write a news article based on the information provided.

### Structure

- Start with one clear and concise H1 headline.
- Organize the article with subheadings that structure the content logically.
- Each H2 must be 6-15 words and preview that section's main fact or finding.
- Each H2 should carry at least one concrete data point, date, programme name
  or precise result when the source has one: a percentage, a number of cases,
  the name of a police campaign. Do not invent facts. Only use figures that
  appear in the source material.
- H2s must be self-contained: the main point of the section is clear from the
  H2 alone.
- Do not repeat the same fact or statistic across H2s. Each previews a distinct
  angle.
- Connect the dots. When a new section starts, tie it back to the story.
- Never write an em dash. Always write a plain hyphen `-`.
- Every paragraph carries bold keywords: the 1-4 most important consecutive
  words, marked `**like this**`.
- Every article carries 1 or 2 callout blocks.
- Every article ends with a source line.

### Writing style and tone

- Write in your own words.
- Emulate The New York Times: clear, factual, neutral.
- Simplify the language for a B2 (upper-intermediate) English reader.
- Objective, professional, journalistic.
- It must read as human-written, not AI-generated.
- Use at least one quote if appropriate. Translate it accurately and quote it
  exactly. No paraphrasing inside quotation marks. Never invent a quote.
- Times use the European 24-hour clock: `08:00`, `20:00`. Never `8AM`, `8PM`.

### Banned words

Not in any form - past, present or future:

> boost, heading, sparks, enhancing, marks, bolstered, equity, outpaces,
> soared, disparities, propel, leveraging, reflecting, exacerbate,
> marks a shift, dampening, sparked

Use the plain alternative instead:

| Banned | Write instead |
| --- | --- |
| boost / boosted / boosting | increase, raise, help |
| heading / headed | go to, lead, travel to |
| spark / sparks / sparked | start, cause, set off, lead to |
| enhance / enhancing / enhancement | improve |
| mark / marks / marked | is, shows, records |
| bolster / bolstered | strengthen, support |
| equity | fairness, equal treatment |
| outpace / outpaces | grow faster than |
| soar / soared | rise sharply, increase |
| disparity / disparities | gap, difference |
| propel / propelled | push, drive |
| leverage / leveraging | use |
| reflect / reflecting | show, match, be in line with |
| exacerbate | make worse |
| dampen / dampening | reduce, weaken |
| marks a shift | is a change |

### Language

English only, for the whole article.

### Final output

One H1; B2 English; meaningful, engaging H2 subheadings, capitalised where
needed; well-structured paragraphs each carrying fresh information; neutral
journalistic tone; no banned words; quotes only where exact; nothing invented;
facts only; everything double-checked.

## Operational detail

### What counts as a fact

A fact is something a named source states in the material provided. Before
writing a sentence, know which line of the source it comes from. Anything you
cannot point at is not a fact, and it does not go in the article.

Specifically, do not add:

- round-ups or comparisons the source does not make ("the highest in a decade")
- causes the source does not state ("because of the rise in tourism")
- context from memory - population figures, past events, other years' numbers
- a mood or reaction nobody expressed ("residents are worried")
- a figure converted into a different unit unless the arithmetic is exact and
  obvious, and the conversion is stated plainly

If a reader would ask "how do they know that?" and the source has no answer,
cut the sentence.

### Gaps

A source that does not say something is itself worth reporting: "The police did
not say how many of the cases led to charges." That is honest and it is how the
NYT handles it. Never close a gap with a guess.

### Quotes

- Quote only wording that appears in the source.
- Portuguese source: translate it yourself, keep the meaning exact, and keep
  the original wording in the facts file next to the translation.
- Attribution comes before or inside the quote, not as a fragment after it.
  Good: `Speaking on 2 October, the commander said: "..."`.
  Bad: a blockquote followed by `Said the commander.`
- Name the speaker and their role. An unattributed quote does not run.
- Never smooth out, shorten or combine quotes. Use `[...]` if you must cut, and
  only within one continuous statement.

### Headline and H2s

- The H1 states what happened, with the concrete thing in it. Active voice,
  no colon-and-subtitle construction, under about 70 characters where possible.
- H2s are sentence-shaped previews, 6-15 words, capitalised in title case, no
  full stop at the end.
- Each H2 should answer a different question: what happened, how big, who is
  affected, what happens next, what is still unknown.
- A figure used in one H2 does not appear in another.

### Paragraphs

- One idea per paragraph, two to four sentences.
- Open with the single most important fact, in one sentence.
- Each paragraph adds something the reader did not have yet.
- Link sections: the first line after an H2 refers back to what came before,
  then moves on.

### Bold keywords

Every paragraph has at least one bold run. Pick the **1 to 4 consecutive
words** that a reader skimming the page would most need to catch, and mark them
`**like this**`.

- One run per paragraph is the norm. Two is fine in a long paragraph. More than
  that and nothing stands out.
- Bold the substance: a figure, a name, a place, the thing that happened. Not
  linking words, not a whole clause.
- The words must be consecutive in the sentence, never a phrase stitched out of
  scattered words.
- Never bold inside a quotation. A quote is reproduced exactly as it was said.
- The headline, the H2s and the source line are not paragraphs and take no
  bold.

Good: "By 1939 it had sold **43 million trips**, most of them one-day outings."

Bad: "By 1939 it had **sold 43 million trips, most of them one-day outings**."

### Callout blocks

Every article carries 1 or 2 callouts - the info boxes the site already uses.
They are written as a fenced block and become Hyvor's native callout:

```markdown
:::callout 💡
**Important**: free access for locals who are not part of commercial tours is
set to still be allowed.
:::
```

- The emoji after `:::callout` is optional and defaults to 💡.
- Open with a bold label and a colon: **Important**, **In short**, **Context**,
  **What is missing**. Then one or two sentences.
- A callout pulls out something the reader should not miss: the figure the
  whole story turns on, a condition or exception, or a gap in the source. It
  never introduces a fact the article does not already carry.
- Place it after the section it belongs to, not at the very top or bottom.
- Two callouts never make the same point.

### Lists

When a sentence names three or more things of the same kind - ships, places,
figures, measures - set them as a bullet list instead of a run-on clause. The
reader scans a list; they lose a series.

```markdown
DIÁRIO announced the visit of the **first three KdF ships**:

- the 'St. Louis'
- the 'Oceana'
- 'Der Deutsche'
```

Keep it to a list only when the items are genuinely parallel. Two items stay in
the sentence. A series carrying different kinds of thing ("on 14 March, from
Hamburg, with 2,600 passengers") is not a list, it is a sentence.

Introduce the list with a colon on the line above, and do not put a bold run
inside list items - the lead-in line carries the bold.

### Linking people

The first time the article names a **public figure with an English Wikipedia
article**, link the name to it:

```markdown
the historian **[Irene Flunser Pimentel](https://en.wikipedia.org/wiki/Irene_Flunser_Pimentel)**
```

- **English Wikipedia only.** If only a Portuguese or German article exists, do
  not link at all. Never link to a different language edition.
- **Check that the article exists** before linking. Never guess a URL:

  ```bash
  curl -s "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=Robert%20Ley" | grep -c missing
  ```

  A `"missing"` key in the response means there is no such article.
- **First mention only.** Later mentions of the same person stay plain.
- **Never inside a quotation.** A quote is reproduced exactly; no markup goes
  in it.
- Not in the headline, the H2s or a callout.
- Public figures only - historians, politicians, officials. Not a private
  individual caught up in a story, even if they happen to have an article.

Links open in a new tab on their own: the theme adds `target="_blank"` and
`rel="noopener"` to external links, so plain Markdown is all that is needed.

### The source line

The last line of every article credits the source:

```markdown
Source: [Diário de Notícias da Madeira](https://www.dnoticias.pt/...)
```

- For these outlets the link text is the outlet name, not the URL:

  | Host | Link text |
  | --- | --- |
  | `dnoticias.pt` | Diário de Notícias da Madeira |
  | `rtp.pt` | RTP Madeira |
  | `jornaldamadeira.pt` | Jornal da Madeira |

- For any other site, the link text is the URL itself.
- If the article draws on two sources, link both in the same line separated by
  a comma.

### The image credit

When the cover was made by an image model, credit it on the line directly
under the source line, and nothing after it:

```markdown
Source: [Diário de Notícias da Madeira](https://www.dnoticias.pt/...)
Image: AI
```

Exactly `Image: AI`. Leave the line out when the cover is a photograph or was
drawn by a person.

### B2 English

- Short sentences. Average under 22 words, nothing over about 32.
- Everyday vocabulary. Explain any term the source assumes: a named law, an
  acronym, a local body. First use spells it out, then the short form.
- Active voice. Concrete subjects.
- No idioms, no rhetorical questions, no exclamation marks.

### Things that make it read as machine-written

Avoid: "in conclusion", "it is worth noting", "delve", "a testament to",
"the landscape", "tapestry", "underscores", "pivotal", "crucial", "robust",
"myriad", "furthermore", "moreover", and any paragraph that summarises what the
article already said. End on a fact or on what happens next, never on a summary.

### Length

Usually 450-700 words for a regional news item. Enough for 4-6 sections. If the
source only supports 300 words, write 300 - padding is how invented facts get in.
