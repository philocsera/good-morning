#!/usr/bin/env node
// Encrypt good_morning/*.html -> good_morning_site/d/*.enc (gzip then AES-GCM),
// regenerate manifest.json, then git commit & push.
//
// Crypto contract (must match index.html browser side):
//   key  = PBKDF2-SHA256(passphrase, salt, iterations) -> AES-256-GCM
//   file = iv(12 bytes) || AES-GCM( gzip(html) )
//   salt + iterations live in config.json (salt is NOT secret).
//
// Passphrase source (in order): env GM_PASS, then ~/.config/good-morning/passphrase
// Usage:  node publish.js            # encrypt new/changed days, push
//         node publish.js --all      # re-encrypt every day (use after password change)
//         node publish.js --no-push  # local only, skip git
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
const zlib = require('zlib');

const SITE = __dirname;
const SRC  = path.resolve(SITE, '..', 'good_morning');
const DDIR = path.join(SITE, 'd');
const ITER = 200000;

function readPass() {
  if (process.env.GM_PASS) return process.env.GM_PASS;
  const pf = path.join(process.env.HOME, '.config', 'good-morning', 'passphrase');
  if (fs.existsSync(pf)) return fs.readFileSync(pf, 'utf8').replace(/\r?\n+$/, '');
  console.error('No passphrase. Set $GM_PASS or create ' + pf + ' (run set-pass.sh).');
  process.exit(1);
}
function loadOrInitConfig() {
  const cf = path.join(SITE, 'config.json');
  if (fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  const salt = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16)));
  const cfg = { cipher: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: ITER, salt: salt.toString('base64') };
  fs.writeFileSync(cf, JSON.stringify(cfg, null, 2));
  console.log('created config.json (new salt)');
  return cfg;
}
async function deriveKey(pass, cfg) {
  const base = await subtle.importKey('raw', Buffer.from(pass, 'utf8'), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: Buffer.from(cfg.salt, 'base64'), iterations: cfg.iterations, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}
async function encrypt(html, key) {
  const gz = zlib.gzipSync(Buffer.from(html, 'utf8'), { level: 9 });
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, gz));
  return Buffer.concat([Buffer.from(iv), ct]);
}

(async () => {
  const force = process.argv.includes('--all');
  const noPush = process.argv.includes('--no-push');
  const pass = readPass();
  const cfg = loadOrInitConfig();
  const key = await deriveKey(pass, cfg);
  if (!fs.existsSync(DDIR)) fs.mkdirSync(DDIR, { recursive: true });
  if (!fs.existsSync(SRC)) { console.error('source dir not found: ' + SRC); process.exit(1); }

  const files = fs.readdirSync(SRC).filter(f => /^\d{4}-\d{2}-\d{2}\.html$/.test(f)).sort();
  const changed = [];
  for (const f of files) {
    const date = f.replace('.html', '');
    const out = path.join(DDIR, date + '.enc');
    const srcPath = path.join(SRC, f);
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(srcPath).mtimeMs) continue;
    fs.writeFileSync(out, await encrypt(fs.readFileSync(srcPath, 'utf8'), key));
    changed.push(date);
  }
  const dates = fs.readdirSync(DDIR).filter(f => /\.enc$/.test(f)).map(f => f.replace('.enc', '')).sort();
  fs.writeFileSync(path.join(SITE, 'manifest.json'),
    JSON.stringify({ dates, updated: new Date().toISOString() }, null, 2));
  console.log('encrypted: ' + (changed.length ? changed.join(', ') : '(none new)'));
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
