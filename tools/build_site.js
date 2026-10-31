#!/usr/bin/env node
// Builds the static play site: a searchable gallery plus every mechanic's www folder.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO_URL = 'https://github.com/layer8labs8/GAME-OF-EVERYTHING';
const SUMMARY_LENGTH = 140;

function summaryFromSpec(text) {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(#|-|\*\s|\||```|>)/.test(line)) continue;
    const plain = line.replace(/[*`_$\\]/g, '').replace(/\s+/g, ' ').trim();
    if (plain.length <= SUMMARY_LENGTH) return plain;
    return `${plain.slice(0, SUMMARY_LENGTH).replace(/\s+\S*$/, '')}...`;
  }
  return '';
}

function loadEntries(root = ROOT) {
  const { mechanics } = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'mechanics.json'), 'utf8'));
  return mechanics.map((m) => {
    const dir = `${m.id}-${m.slug}`;
    const specPath = path.join(root, 'mechanics', dir, 'SPEC.md');
    const hasSpec = fs.existsSync(specPath);
    const summary = hasSpec ? summaryFromSpec(fs.readFileSync(specPath, 'utf8')) : '';
    return {
      id: m.id,
      dir,
      title: m.title || m.name,
      mechanic: m.name,
      family: m.family,
      summary: summary || `A playable ${m.family.toLowerCase()} mechanic.`,
      spec: hasSpec ? `${REPO_URL}/blob/main/mechanics/${dir}/SPEC.md` : `${REPO_URL}/tree/main/mechanics/${dir}`,
      code: `${REPO_URL}/tree/main/mechanics/${dir}`,
    };
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCard(entry) {
  const search = `${entry.title} ${entry.mechanic} ${entry.family} ${entry.summary}`.toLowerCase();
  const subtitle = entry.mechanic === entry.title ? entry.family : `${entry.mechanic} · ${entry.family}`;
  return `<li class="card" data-family="${escapeHtml(entry.family)}" data-search="${escapeHtml(search)}">
  <a class="play" href="play/${entry.dir}/">
    <img src="play/${entry.dir}/icon.svg" alt="" width="56" height="56" loading="lazy">
    <span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(subtitle)}</small></span>
  </a>
  <p>${escapeHtml(entry.summary)}</p>
  <nav aria-label="${escapeHtml(entry.title)} links"><a href="play/${entry.dir}/">Play</a> <a href="${entry.spec}">How it works</a> <a href="${entry.code}">Code</a></nav>
</li>`;
}

function renderIndex(entries) {
  const families = [...new Set(entries.map((e) => e.family))].sort();
  const options = families
    .map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)} (${entries.filter((e) => e.family === f).length})</option>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game of Everything</title>
<meta name="description" content="Play and learn ${entries.length} 2D game mechanics. Free, open source, and no install needed.">
<style>
:root { color-scheme: dark; --bg: #0b1020; --panel: #151c33; --line: #2a3454; --text: #eef1f8; --muted: #a7b0c8; --accent: #7cc4ff; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, sans-serif; }
header, main, footer { width: min(1120px, 100%); margin: 0 auto; padding: 0 16px; }
header { padding-top: 40px; }
h1 { margin: 0; font-size: clamp(32px, 7vw, 52px); line-height: 1.1; }
header p { max-width: 640px; color: var(--muted); font-size: 18px; }
a { color: var(--accent); }
.tools { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0 12px; }
input, select { min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--text); font: inherit; }
input { flex: 1 1 260px; }
select { flex: 0 1 240px; }
#count { color: var(--muted); }
ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.card { display: flex; flex-direction: column; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.card[hidden] { display: none; }
.play { display: flex; align-items: center; gap: 12px; color: var(--text); text-decoration: none; }
.play img { flex: none; border-radius: 8px; background: var(--bg); }
.play strong, .play small { display: block; }
.play small, .card p { color: var(--muted); }
.card p { flex: 1; margin: 10px 0; font-size: 14px; }
.card nav { display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; }
.card nav a { padding: 4px 0; }
footer { padding-top: 32px; padding-bottom: 32px; color: var(--muted); }
</style>
</head>
<body>
<header>
<h1>Game of Everything</h1>
<p>Play ${entries.length} 2D game mechanics in your browser, see how each one works, and use the code in your own game.</p>
</header>
<main>
<div class="tools">
<input id="search" type="search" placeholder="Search games" aria-label="Search games">
<select id="family" aria-label="Filter by family"><option value="">All families</option>${options}</select>
</div>
<p id="count" role="status"></p>
<ul id="games">
${entries.map(renderCard).join('\n')}
</ul>
</main>
<footer>Free and open source under the MIT license. <a href="${REPO_URL}">View the code or add a game on GitHub</a>.</footer>
<script>
const cards = [...document.querySelectorAll('.card')];
const search = document.getElementById('search');
const family = document.getElementById('family');
const count = document.getElementById('count');
function update() {
  const words = search.value.toLowerCase().split(/\\s+/).filter(Boolean);
  let shown = 0;
  for (const card of cards) {
    const match = (!family.value || card.dataset.family === family.value)
      && words.every((word) => card.dataset.search.includes(word));
    card.hidden = !match;
    if (match) shown += 1;
  }
  count.textContent = shown === 1 ? '1 game' : shown + ' games';
}
search.addEventListener('input', update);
family.addEventListener('change', update);
update();
</script>
</body>
</html>
`;
}

function buildSite(outDir, root = ROOT) {
  const entries = loadEntries(root);
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const entry of entries) {
    fs.cpSync(path.join(root, 'mechanics', entry.dir, 'www'), path.join(outDir, 'play', entry.dir), { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), renderIndex(entries));
  return entries;
}

if (require.main === module) {
  const outDir = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
  const entries = buildSite(outDir);
  console.log(`site written: ${entries.length} mechanics in ${outDir}`);
}

module.exports = { buildSite, escapeHtml, loadEntries, renderIndex, summaryFromSpec };
