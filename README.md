# Good Morning — archive (GitHub Pages)

A single-page viewer for the daily **Good Morning** briefings. No password — it opens directly.
Each day's HTML is **gzip-compressed** (not encrypted), so the raw HTML isn't committed and the
browser gunzips it on the fly.

```
index.html      ← the viewer: ←/→ day navigation, renders the day in an iframe
manifest.json   ← list of available dates                  [generated]
d/YYYY-MM-DD.html.gz ← gzip of the day's HTML               [generated]
publish.js      ← local: compress new days, commit & push
```

## How it works
- `publish.js` gzips each `good_morning/YYYY-MM-DD.html` into `d/YYYY-MM-DD.html.gz`, writes
  `manifest.json`, and pushes. The **raw HTML never leaves your machine** — only the `.gz` blobs.
- `index.html` fetches `manifest.json`, loads the newest day (or `#YYYY-MM-DD` from the URL),
  gunzips with `DecompressionStream('gzip')`, and shows it. ←/→ (or ‹ › / swipe) move between days.

> Note: gzip is **not** privacy — anyone can decompress it. It only keeps the repo free of raw,
> searchable/indexable HTML and shrinks size (~32K → ~12K). For real privacy you'd need
> client-side encryption with a passphrase; that was intentionally removed for frictionless access.

## Manual publish
```bash
node publish.js --all     # re-compress every day, commit & push
node publish.js           # only new/changed days
node publish.js --no-push # local only
```

## Daily
`run_good_morning.sh` calls `node publish.js` automatically after each 1 AM brief.

Site: https://philocsera.github.io/good-morning/
