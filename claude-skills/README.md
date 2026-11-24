# Claude Code skills for Times of Madeira (backup copy)

These are copies of the user-level Claude Code skills that write and publish
Times of Madeira articles. The live copies that Claude actually loads sit in
`C:\Users\samad\.claude\skills\`. This folder exists so they are versioned and
backed up with the website. It is not loaded by Claude Code (project skills
would live under `.claude/skills/`), so there is no duplicate-skill conflict.

| Folder | Skill | What it does |
| ------ | ----- | ------------ |
| `bs2/` | `/bs2` | Full New York Times style article from a URL, PDF, screenshot or text, with poll, tables, embeds and a related card; publishes to dev and live |
| `blog-summary/` | `/bs` | Short summary post; also holds the cover-picking and tag rules and `URLs.md` (evergreen links) |
| `blog-writer/` | `blog-writer` | Shared scripts: `publish.mjs` (create or update a Hyvor post), `pull-post.mjs` (pull a live post back into its draft before editing), `fetch-source.mjs`, `make-cover.mjs`, and the Hyvor API notes in `references/` |

No API keys are stored here. The scripts read them from `~/.hyvor/console-key`
(dev) and `~/.hyvor/console-key-prod` (live).

`bs2/scripts/node_modules` is not included; restore it with `npm install`
inside `bs2/scripts/`.

## Restore

Copy the three folders back to `C:\Users\samad\.claude\skills\` (overwriting),
then run `npm install` in `bs2/scripts/`.

## Keeping it current

After changing a skill in `~/.claude/skills`, copy the folder here again and
commit. The copy is only as good as its last sync.
