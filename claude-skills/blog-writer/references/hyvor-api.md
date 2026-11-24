# Hyvor Blogs Console API - what the publisher uses

`scripts/publish.mjs` wraps all of this. Read this file when a call fails, when
you need an endpoint the script does not cover, or when setting the key up for
the first time.

Docs: <https://hyvor.com/blogs/docs/api-console>

## Access

- Base path: `https://blogs.hyvor.com/api/console/v0/blog/{subdomain}`
- Auth header: `X-API-KEY: <key>`
- Request params go in a JSON body (`Content-Type: application/json`), except
  on GET, where they are query parameters.
- Responses are always a JSON object or array.

The dev blog of this project is `dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83`
(`https://dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83.hyvorblogs.io`, `noindex`).
It is the default target of the publisher.

### The key

Not stored in this repo and not in the environment by default. Create one in
the Console under the blog's API keys, with scopes to write and publish posts,
write media and write tags. Then either:

```
setx HYVOR_CONSOLE_KEY "<key>"            # new shells pick it up
```

or save it as a single line in `%USERPROFILE%\.hyvor\console-key`.

The same key exists as the `HYVOR_CONSOLE_KEY` GitHub secret used by
`.github/workflows` in the tom theme repo to sync theme files. It is a secret:
never print it, never put it in a file inside a repo.

## The endpoints the publisher calls

| Step | Call | Notes |
| --- | --- | --- |
| language | `GET /languages` | `Language{id, code, name, is_primary}` - pick `is_primary`. On the dev blog: `en`, id 5865 |
| create | `POST /post` `{is_page:false}` | returns `Post{id, variants:[{id, language_id, status}], ...}` - **take the variant id from here**, the content and publish calls address it |
| convert | `GET /misc/prosemirror/json?html=...` | returns `{json: string}`; the only supported way to turn HTML into post content |
| content | `POST /documents/checkpoint` | `{post_variant_id, version, content}`; `content` is the ProseMirror JSON **string**. `version` must equal the variant's current document version exactly - 0 for a new post |
| fields | `PATCH /post/{id}/variant` | `{language_id, title, slug, description}`; title and slug max 255, description max 350 |
| cover | `POST /media` (multipart) | fields `file` and `post_id`; returns `Media{id, url, name, extension}` |
| cover by URL | `POST /media/from-url` | `{url, post_id?}` |
| featured | `PATCH /post/{id}` | `{featured_image_url, canonical_url?, is_featured?, published_at?}` |
| tags | `GET /tags?search=` then `PATCH /post/{id}/tags` `{ids:[...]}` | match existing tags only. **`POST /tag` is off limits** - see below |
| authors | `GET /users` then `PATCH /post/{id}/authors` | `{ids:[...]}` - user ids, matched here by `slug` |
| publish | `POST /post/{id}/variant/publish` `{post_variant_id, publish_at?}` | `publish_at` null = now, a timestamp = schedule. Generates a slug if unset. **Draft variants only** |
| edit a live post | `POST /post/{id}/variant/update-content` `{post_variant_id}` | undocumented. The save path for a variant that is already published or scheduled; reads the same `content_unsaved` a checkpoint wrote |

## The info-block (callout)

The grey info box on the site is Hyvor's native `callout` node. The editor
emits this exact markup, and the converter turns it straight back into a node:

```html
<aside style="background-color:#f1f1ef;color:#000000"><span>💡</span><div><strong>Important</strong>: text</div></aside>
```

```json
{"type":"callout","attrs":{"emoji":"💡","bg":"#f1f1ef","fg":"#000000"},"content":[...]}
```

`lib-article.mjs` builds that markup from the `:::callout` fence, so drafts
never contain raw HTML. The emoji must be sent as real UTF-8; a Windows shell
mangles it to `??`, which is why the publisher sends it through `fetch` and not
through `curl`.

## Where the published docs are wrong

Verified against the live API and against the source at
<https://github.com/hyvor/blogs> (`symfony/src/Api/Console/`) on 2026-10-11.
Each cost a failed call before it was found, so trust this table over the
docs page:

1. **`PATCH /post/{id}/variant` has no `content` field.** `UpdatePostVariantInput`
   does not declare one. Sending `content` returns 200 and silently discards it,
   and the post then fails to publish with "Cannot publish post variant with no
   content". Content goes through `POST /documents/checkpoint`.
2. **`POST /post/{id}/variant/publish` takes `post_variant_id`, not
   `language_id`.** With `language_id` it returns 422
   `post_variant_id: This value should not be null`.
3. **`GET /post/{id}` does not exist.** It returns 405 `Allow: PATCH, DELETE`.
   To read one post, use `GET /documents/post?post_id={id}` - it returns
   `{post, variant, document}`, where `document.checkpoint_version` is the
   version the next checkpoint must send.
4. **`Post.variants`, not `Post.variant_statuses`.** The live objects from
   `POST /post` and `GET /posts` use `variants:[{id, language_id, status,
   words, seo_score}]`.
5. **Editing a published post needs a different route.** `/variant/publish`
   rejects a variant that is not a draft ("Post variant is already published").
   The undocumented `POST /post/{id}/variant/update-content` is what the
   Console uses to save an edit to a live article. `publish.mjs --post-id`
   reads the variant status first and picks the right one.

Minor: `description` accepts 350 characters, not the documented 255.

### Why content works this way

The editor is collaborative. `content_unsaved` is the live document, written
only by `/documents/checkpoint` (full snapshot) and `/documents/steps`
(incremental edits); `content` is the published copy. Publishing reads
`content_unsaved`, which is why a post with no checkpoint cannot be published.

Also useful:

- `POST /post/{id}/variant/unpublish` `{post_variant_id}` - back to draft.
- `DELETE /post/{id}` - remove a post created by mistake.
- `GET /posts?search=&limit=` - `PostListItem[]`, for finding an earlier post.
- `DELETE /blog/cache` `{type:'all'}` - if a change does not appear on the site.
- `GET /media/unsplash/search` - exists, but its parameters are not documented.
  Treat any use of it as best-effort and fall back to a generated cover.

## Do not create tags

`POST /tag` exists and works, and publishing must not call it. The blog's tag
list is the owner's editorial decision. A post gets tags that already exist, or
it gets fewer tags - never a new one invented to fit the article. `publish.mjs`
matches against `GET /tags` and reports anything it could not match.

The same caution applies to `POST /user`, `POST /navigation` and
`POST /language`: publishing an article never needs to create blog-level
objects. If an article seems to need one, say so and let the user decide.

## Gotchas

- **Content must be ProseMirror JSON**, sent to `/documents/checkpoint`.
  The checkpoint endpoint validates it, so HTML or Markdown is rejected there
  rather than silently stored. Always go through `GET /misc/prosemirror/json`.
- **A stale `version` on a checkpoint returns 409**, not an error the script
  retries. For an existing post, read the current version from
  `GET /documents/post?post_id={id}` first - `publish.mjs --post-id` does this.
- **That converter takes HTML in the query string**, so a whole article can
  overflow the URL. `publish.mjs` sends the article in ~1.6 KB batches of whole
  blocks and concatenates the returned `content` arrays into one
  `{type:'doc', content:[...]}`. Keep that batching if you rewrite it.
- **`POST /post` makes a draft with no title.** A failure between creating the
  post and patching the variant leaves an empty draft behind. Delete it, or
  re-run with `--post-id <id>` to fill the same post rather than making another.
- **Publishing is a separate call.** Without it the post stays a draft, which
  is what `--draft` leaves you with.
- **Slugs must be unique.** A repeated slug is rejected; add a distinguishing
  word rather than a number where you can.
- **The dev blog is `noindex`**, so publishing there is safe to redo. A
  different `--blog` is a real, indexed site: confirm with the user first.

## Reading a post back (pull-post.mjs)

- There is **no `GET /post/{id}`** (405, only PATCH and DELETE). Read a post
  with `GET /documents/post?post_id={id}`: `post` carries
  `featured_image_url`, `tags[]` (with `variants[].name`) and `is_featured`;
  `variant` carries `title`, `slug`, `description`, `status` and `content`;
  `document` carries `checkpoint_version` and `checkpoint_content`.
- `variant.content` is the **published** document (what readers see);
  `document.checkpoint_content` is the editor's current document. They are
  serialised differently (key order, `attrs.suggestions: null`, empty heading
  `id`), so compare them by meaning, not by string.
- `GET /posts?search=<slug>` finds a post by slug; match `slug` or
  `variants[].slug` exactly, because the search is fuzzy.
- Known node types: `paragraph`, `heading`, `blockquote`, `bullet_list`,
  `ordered_list`, `list_item`, `horizontal_rule`, `figure` > `image`,
  `callout` (attrs `emoji`, `bg`, `fg`), `custom_html`, `hard_break`; marks
  `strong`, `em`, `code`, `link` (attrs `href`). `lib-prosemirror.mjs` maps
  these back to the draft Markdown and keeps anything else as a `:::node`
  fence, which `publish.mjs` puts back verbatim.
