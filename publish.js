#!/usr/bin/env node
// Compress good_morning/*.html -> good_morning_site/d/*.html.gz (gzip, no password),
// regenerate manifest.json, then git commit & push.
//
// No encryption / no passphrase: the viewer opens freely and gunzips in the browser.
// The raw HTML is never committed — only the gzipped blobs are pushed.
// Usage:  node publish.js            # compress new/changed days, push
//         node publish.js --all      # re-compress every day
//         node publish.js --no-push  # local only, skip git
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const SITE = __dirname;
const SRC  = path.resolve(SITE, '..', 'good_morning');
const DDIR = path.join(SITE, 'd');

(async () => {
  const force = process.argv.includes('--all');
  const noPush = process.argv.includes('--no-push');
  if (!fs.existsSync(SRC)) { console.error('source dir not found: ' + SRC); process.exit(1); }
  if (!fs.existsSync(DDIR)) fs.mkdirSync(DDIR, { recursive: true });

  const files = fs.readdirSync(SRC).filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f)).sort();
  const changed = [];
  for (const f of files) {
    const date = f.replace('.html', '');
    const out = path.join(DDIR, date + '.html.gz');
    const srcPath = path.join(SRC, f);
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(srcPath).mtimeMs) continue;
    const gz = zlib.gzipSync(fs.readFileSync(srcPath), { level: 9 });
    fs.writeFileSync(out, gz);
    changed.push(date);
  }
  const dates = fs.readdirSync(DDIR).filter(f => /\.html\.gz$/.test(f))
    .map(f => f.replace('.html.gz', '')).sort();
  fs.writeFileSync(path.join(SITE, 'manifest.json'),
    JSON.stringify({ dates, updated: new Date().toISOString() }, null, 2));
  console.log('compressed: ' + (changed.length ? changed.join(', ') : '(none new)'));
  console.log('manifest: ' + dates.length + ' day(s)');

  if (noPush) return;
  try {
    execSync('git add -A', { cwd: SITE, stdio: 'inherit' });
    const msg = 'publish ' + (changed.length ? changed.join(',') : 'refresh');
    execSync('git diff --cached --quiet || git commit -m ' + JSON.stringify(msg),
      { cwd: SITE, stdio: 'inherit', shell: '/bin/bash' });
    execSync('git push', { cwd: SITE, stdio: 'inherit' });
    console.log('pushed.');
  } catch (e) {
    console.error('git step failed: ' + e.message);
    process.exit(1);
  }
})();
