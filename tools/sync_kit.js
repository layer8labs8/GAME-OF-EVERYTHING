#!/usr/bin/env node
// Copies platform/web/kit.js into every game and wires it into the page.
//   node tools/sync_kit.js           update all games
//   node tools/sync_kit.js --check   fail if any game is out of date
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KIT = fs.readFileSync(path.join(ROOT, 'platform', 'web', 'kit.js'));
const LOGIC_TAG = /(<script\s+src=["']logic\.js["']\s*><\/script>)/i;
const KIT_TAG = '<script src="kit.js"></script>';
// Games are cached for offline play. Raise this whenever game files change, or returning players keep the old version.
const CACHE_VERSION = 3;

function summaryOf(spec) {
  for (const raw of spec.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(#|-|\*\s|\||```|>)/.test(line)) continue;
    return line.replace(/[*`_$\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
  }
  return '';
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function wireHtml(html, summary) {
  let out = html;
  if (!out.includes(KIT_TAG)) out = out.replace(LOGIC_TAG, `$1\n${KIT_TAG}`);
  if (summary && !/<meta\s+name=["']description["']/i.test(out)) {
    out = out.replace(/(<title>.*?<\/title>)/i, `$1\n<meta name="description" content="${escapeAttr(summary)}">`);
  }
  return out;
}

function wireWorker(sw) {
  const listed = sw.includes('kit.js') ? sw : sw.replace(/(['"])(\.\/)?logic\.js\1/, (m, q, dot) => `${m}, ${q}${dot || ''}kit.js${q}`);
  return listed.replace(/-v\d+(['"])/, `-v${CACHE_VERSION}$1`);
}

function main() {
  const check = process.argv.includes('--check');
  const dirs = fs.readdirSync(path.join(ROOT, 'mechanics'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const stale = [];
  for (const dir of dirs) {
    const www = path.join(ROOT, 'mechanics', dir, 'www');
    const specPath = path.join(ROOT, 'mechanics', dir, 'SPEC.md');
    const summary = fs.existsSync(specPath) ? summaryOf(fs.readFileSync(specPath, 'utf8')) : '';
    const kitPath = path.join(www, 'kit.js');
    const htmlPath = path.join(www, 'index.html');
    const swPath = path.join(www, 'sw.js');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const sw = fs.readFileSync(swPath, 'utf8');
    const wiredHtml = wireHtml(html, summary);
    const wiredSw = wireWorker(sw);
    const kitOk = fs.existsSync(kitPath) && fs.readFileSync(kitPath).equals(KIT);
    if (check) {
      if (!kitOk || wiredHtml !== html || wiredSw !== sw) stale.push(dir);
      continue;
    }
    fs.writeFileSync(kitPath, KIT);
    fs.writeFileSync(htmlPath, wiredHtml);
    fs.writeFileSync(swPath, wiredSw);
    if (!wiredHtml.includes(KIT_TAG) || !wiredSw.includes('kit.js')) stale.push(dir);
  }
  if (stale.length) {
    console.error(`kit out of date in ${stale.length} game(s): ${stale.slice(0, 8).join(', ')}. Run: npm run kit`);
    process.exit(1);
  }
  console.log(`kit ok: ${dirs.length} game(s)`);
}

module.exports = { summaryOf, wireHtml, wireWorker };
if (require.main === module) main();
