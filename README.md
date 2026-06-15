# Good Morning — encrypted archive (GitHub Pages)

A single-page viewer for the daily **Good Morning** briefings. Pages is public, so
each day's HTML is **client-side encrypted** — only someone with the passphrase can read it.

```
index.html      ← the only plaintext: password prompt + ←/→ day navigation + viewer
config.json     ← KDF salt + iterations (salt is NOT secret)   [generated]
manifest.json   ← list of available dates                       [generated]
d/YYYY-MM-DD.enc← gzip(html) then AES-256-GCM                    [generated]
publish.js      ← local: encrypt new days, commit & push
set-pass.sh     ← store the passphrase locally (outside the repo)
```

## Crypto
- key  = `PBKDF2-SHA256(passphrase, salt, 200000)` → AES-256-GCM
- file = `iv(12 bytes) || AES-GCM( gzip(html) )`
- Browser decrypts with WebCrypto + `DecompressionStream('gzip')` — no server, no libraries.
- The **raw HTML never leaves your machine**; only the `.enc` blobs are pushed.

## First-time setup
```bash
bash set-pass.sh          # choose your passphrase (saved to ~/.config/good-morning/passphrase, chmod 600)
node publish.js --all     # encrypt every existing day, commit & push
```
Then open `https://philocsera.github.io/good-morning/` and enter the passphrase.
←/→ (or the ‹ › buttons / swipe) move between days. 🔒 forgets the saved passphrase on this device.

## Daily
`run_good_morning.sh` calls `node publish.js` automatically after each 1 AM brief, so new
days appear without manual steps.

## Changing the passphrase
```bash
bash set-pass.sh          # new passphrase (salt in config.json stays the same)
node publish.js --all     # MUST re-encrypt everything with the new key
```

## Notes
- The viewer remembers the passphrase in `localStorage` only if "이 기기에서 기억" is checked.
- Lose the passphrase → content is unrecoverable from the repo; just `set-pass.sh` + `publish.js --all` to reset.
- Pages is served publicly even from a private repo (free plan needs a public repo) — the encryption,
  not the repo visibility, is what keeps the content private.
