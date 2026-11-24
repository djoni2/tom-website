# The cover image

Every Times of Madeira article gets one illustration: a political cartoon in
one fixed house style. The style text below is fixed. Only the scene changes.

## The house style (do not edit)

> modern political cartoon illustration style, expressive exaggerated
> caricature, heavy ink linework, vivid cel shading, vibrant colors, comic book
> style, speech bubbles, dramatic lighting --ar 16:9 --style raw

`scripts/make-cartoon.mjs` holds this text and prepends it to every prompt, so
run the script rather than retyping the style. The `--ar 16:9 --style raw`
flags are Midjourney flags: the script keeps them in the saved prompt file for
pasting, and strips them when it calls an API that does not understand them.

## What the style actually looks like

Three published covers, the reference for anything new:

- <https://www.timesofmadeira.com/media/eviction-madeira.webp> - a family and
  their boxes on a Funchal street, a landlord nailing up an eviction notice, a
  police officer taking notes. Drawn signage in Portuguese.
- <https://www.timesofmadeira.com/media/albuquerque-madeira-psd.webp> - a
  single caricatured politician, finger raised, against a saturated sunset
  coast, with big poster lettering.
- <https://www.timesofmadeira.com/media/trump-greenland.webp> - a huge
  caricatured figure looming over a map while small figures plead, five speech
  bubbles.

What they have in common, and what a new cover needs:

- **Real caricature.** Recognisable faces with exaggerated features and clear
  emotion. This is the part that carries the joke.
- **Heavy ink linework** over **cel shading** - flat colour areas with defined
  shadow edges, not gradients.
- **Saturated colour** and dramatic light: sunset oranges, deep blues, strong
  greens.
- **A Madeira setting** that is actually drawn: terraced hillsides, red-tiled
  roofs, cobbled streets, the coast.
- **Speech bubbles with short hand-lettered text**, often Portuguese. Two to
  five bubbles is normal for this style.
- Landscape, 16:9.

## Style B: cinematic object (works on a free model)

The caricature style above needs a paid model. When one is not available, use
this instead. It is a different look, not a cheap imitation of the first, and
it suits Times of Madeira: closer to a serious photo-illustration than a joke.

> cinematic editorial photo illustration, dramatic side light, deep shadows,
> rich colour, high detail. No people, no faces, no text.

Rules that make it work on a weak model:

- **One subject, not a composition.** A liner looming over a quay works. A
  split-screen of past and present does not - the free model ignored that
  instruction completely and returned an unrelated harbour.
- **No faces.** This is the point: it sidesteps the thing open models do worst.
  Silhouettes at most.
- **No text in the image.** Add bubbles or labels afterwards with
  `lib-bubbles.mjs` if the story wants them.
- **Four short sentences maximum.** Long prompts get ignored from the middle.
- **Name a Madeira cue** when the story is local: terraced hillside, red tiled
  roofs, cobbled quay, banana palms, the Atlantic.
- Dark and weathered reads well against the paper's engraved masthead.

An object carrying the story is the strongest version of this: a battered
steamer trunk, a stack of eviction boxes, an empty council chair. The reader
gets the subject in one glance and nobody's face is invented.

## Writing the scene

The scene is the one thing you write per article. Describe **what a reader
would see**, not what the article argues:

- who is in frame, and what they are doing right now
- their expressions, since caricature is the point
- where it happens, with something that places it in Madeira
- what each speech bubble says, in a few words

Good: "A 1930s liner crowded with cheering holidaymakers looms over a small
Funchal quay where two islanders squint up at it, arms folded."

Bad: "An article about Nazi cruises to Madeira." That is a topic, not a scene.

## Text in the image

Short bubbles only, a few words each, the way the references do it. Never a
sentence of body copy, never a headline - the headline already sits beside the
image on the page.

## Taste

The cartoon runs on a news site, above a factual article.

- Caricature the powerful, not the victims of a story.
- For historical subjects, draw the scene, not the symbols. A period ship and a
  crowd carry the story; regime insignia do not belong on the front page.
- No real private individuals. Public figures only, and only when they are in
  the article.
- When a subject does not suit a cartoon, say so and fall back to
  `make-cover.mjs`, the typographic card.

## Running it

```bash
node scripts/make-cartoon.mjs \
  --scene "..." --bubbles "ONE; TWO; THREE" \
  --out articles/<slug>.cover.webp
```

It writes `<out>.prompt.txt` every time, so the exact prompt is on record next
to the article.

## This needs an image model

There is no local way to draw this. The style depends on caricatured faces and
painterly ink shading, and **hand-authored SVG does not come close** - it was
tried, and a flat vector scene reads as a clip-art diagram next to the
references above. Do not offer one as if it were the house style.

### What was tried, so it is not retried blind

- **Hand-drawn SVG**: rejected. Flat vector cannot do caricature faces and
  reads as clip art beside the references.
- **pollinations.ai** (keyless, behind `--free`): generates something, but
  generic cartoon styling rather than caricature, frequent anatomy errors, no
  usable speech bubbles, a watermark burned into the corner, output capped near
  1024x576, and HTTP 402 after a few requests. Draft-quality only; never
  publish it without the user seeing it and agreeing.
- **Hyvor's own AI endpoints**: text only (`/ai/agent`, `/ai/translate`), no
  image generation.

The references were made by a capable model (DALL-E 3 / Midjourney class).
Nothing cheaper has matched them.

With no key the script writes the prompt and stops. Then either:

- paste the prompt into Midjourney or another image tool and bring the file
  back with `publish.mjs --cover <file.webp>`, or
- set `OPENAI_API_KEY` (optionally `OPENAI_BASE_URL`, `IMAGE_MODEL`), or
  `IMAGE_API_KEY` + `IMAGE_API_BASE` for any OpenAI-shaped endpoint, and the
  script generates it directly.

### Which model

The hard part of this house style is not the drawing, it is **legible text
inside the speech bubbles**. Most models garble it. Checked October 2026:

| Model | Why / why not | Cost per image |
| --- | --- | --- |
| **GPT Image 2** (`gpt-image-2`, the default) | Top of the Artificial Analysis image arena, and one of only two models that reliably render text in frame. Speaks the Images API this script already calls. | ~$0.05 medium, ~$0.21 high |
| **Ideogram v3** | The most reliable text renderer of all. Use it if bubble lettering comes back malformed on GPT Image 2. | ~$0.04-0.08 |
| **Midjourney** | Best art direction, and the `--ar 16:9 --style raw` flags in the house prompt are Midjourney syntax, so the published references were probably made there. No official API, so it cannot be automated - paste the prompt by hand. | subscription |
| Flux 2 Pro, Nano Banana, Imagen 4 | Fine all-rounders, weaker at text in frame. Not worth it here. | ~$0.03-0.07 |

Quality: `--quality medium` is enough for a blog cover. Go `high` only when
the lettering comes out wrong. At roughly 30 articles a month, medium is a
couple of dollars.

### The free option

**Cloudflare Workers AI** running FLUX.1 [schnell]. A free Cloudflare account,
no credit card, gives 10,000 Neurons a day; a cover costs about 58 Neurons, so
roughly 170 covers a day at no charge. No watermark, and FLUX.1 schnell is
Apache 2.0, so the output is fine to publish.

```
setx CF_ACCOUNT_ID "<account id>"
setx CF_API_TOKEN  "<API token with Workers AI read>"
```

The script picks this path automatically when there is no OpenAI key.

**Its one weakness is text**, which is exactly what this house style needs. So
the free path splits the job:

1. the model is asked for the scene **with no text at all**
2. `lib-bubbles.mjs` composes the art into a 1536x864 frame and draws the
   speech bubbles on top in real type (Bangers, heavy black outline, tail)

The lettering is therefore always correctly spelled, in Portuguese or German,
and consistent between covers - better than any model manages on its own. What
you give up against GPT Image 2 is caricature likeness: FLUX schnell draws a
good scene but weaker faces.

Bubbles are laid along the top band, where these scenes have sky. If a bubble
lands on a face, re-run with a different `--seed` or drop to fewer bubbles.

`make-cover.mjs` remains the stopgap: a typographic card in the blog's colours,
no image model needed. It is a placeholder, not the house style - say so
whenever one is published.

## Always webp

Covers are published as `.webp`, never `.png`. A full-bleed PNG runs several
hundred KB for the same picture. Both scripts write webp, and `publish.mjs`
sends the right content type from the file extension.

## Only the article being written

Make one image for the article in hand and attach it to that post. Never
replace, re-upload or delete the image on any other post, even a broken one,
unless the user asks for exactly that.
