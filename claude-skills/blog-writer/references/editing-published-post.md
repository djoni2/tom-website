# Editing a post that is already published

The user changes covers, headlines and text **in the Hyvor editor** after a
post goes live. Those edits exist only on the blog. `publish.mjs --post-id`
writes the whole document from the local draft, so re-running it on a stale
draft silently undoes them. **The live post is the source of truth, never the
local file.** This applies to every later request on a post ("add a
sentence", "change the picture", "fix the headline"), whatever skill it
arrives through.

1. **Pull the live post into the draft first.**

   ```bash
   HYVOR_CONSOLE_KEY=$(cat ~/.hyvor/console-key-prod) \
   node C:/Users/samad/.claude/skills/blog-writer/scripts/pull-post.mjs articles/<slug>.summary.md --blog times-of-madeira
   ```

   It finds the post by the draft's slug (or `--post-id <id>`), rewrites the
   body from the live content, refreshes `title`, `description`, `tags` and
   `cover_url`, and records `pulled_from`, `pulled_post_id`, `pulled_hash` and
   `pulled_at` in the front matter. It prints what differed from the local
   draft: **read that**, it is the list of the user's edits, and they stay.
   A `:::node` fence is a block with no Markdown form; leave it alone. If the
   script warns that the editor holds unsaved changes, tell the user before
   publishing.
2. **Make the requested edit** in the refreshed draft, and nothing else. Do
   not re-pick the cover, re-word paragraphs or re-choose tags.
3. **Publish dev, then live, each with its own post id.** The dev id comes
   from `pull-post.mjs articles/<slug>.summary.md --id-only` (dev key, default
   blog); the live id is `pulled_post_id`. Pass `--featured-url <the cover_url
   the pull wrote>`; the script skips the cover and tag calls when they
   already match. On the live blog the script **refuses** a draft that was not
   pulled from that post, or a post that changed since the pull: pull again,
   redo the edit, publish again. `--force` exists for the case the user
   explicitly wants the live version replaced; never use it on your own.
4. **Verify both pages** and check the user's own edits are still there (the
   cover, the changed wording).

Changing only the cover is the same procedure: pull, set `cover_url`, publish
with `--featured-url <new url>`.
