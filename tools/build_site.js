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

const FAMILY_COLORS = {
  Action: '#ff6b6b',
  Adventure: '#3ddc97',
  'Cards & Board': '#c792ea',
  Idle: '#ffd166',
  Other: '#9fb3c8',
  Platformer: '#4dabf7',
  Puzzle: '#7cc4ff',
  RPG: '#f783ac',
  Racing: '#ff922b',
  Rhythm: '#e599f7',
  Roguelike: '#b197fc',
  Shooter: '#ffa94d',
  Simulation: '#63e6be',
  Strategy: '#a9e34b',
  Survival: '#ffc078',
};
const FEATURED = ['court-rally', 'snake', 'shard-breaker', 'sokoban', 'orbit-defenders', 'tower-defense'];

const familyColor = (family) => FAMILY_COLORS[family] || FAMILY_COLORS.Other;

function renderCard(entry) {
  const search = `${entry.title} ${entry.mechanic} ${entry.family} ${entry.summary}`.toLowerCase();
  const subtitle = entry.mechanic === entry.title ? '' : `<small>${escapeHtml(entry.mechanic)}</small>`;
  return `<li class="card" style="--c:${familyColor(entry.family)}" data-family="${escapeHtml(entry.family)}" data-search="${escapeHtml(search)}">
  <a class="cover" href="play/${entry.dir}/" data-game="${entry.dir}" aria-label="Play ${escapeHtml(entry.title)}">
    <img src="play/${entry.dir}/icon.svg" alt="" width="84" height="84" loading="lazy">
    <span class="tag">${escapeHtml(entry.family)}</span>
    <span class="go" aria-hidden="true">Play</span>
  </a>
  <div class="body">
    <h3>${escapeHtml(entry.title)}</h3>
    ${subtitle}
    <p>${escapeHtml(entry.summary)}</p>
    <div class="links"><a href="${entry.spec}">How it works</a><a href="${entry.code}">Code</a></div>
  </div>
</li>`;
}

function renderFeatured(entry) {
  return `<a class="pick" style="--c:${familyColor(entry.family)}" href="play/${entry.dir}/" data-game="${entry.dir}">
  <img src="play/${entry.dir}/icon.svg" alt="" width="52" height="52" loading="lazy">
  <span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.family)}</small></span>
</a>`;
}

function renderIndex(entries) {
  const families = [...new Set(entries.map((e) => e.family))].sort();
  const chips = families
    .map((f) => `<button type="button" class="chip" style="--c:${familyColor(f)}" data-filter="${escapeHtml(f)}" aria-pressed="false">${escapeHtml(f)} <span>${entries.filter((e) => e.family === f).length}</span></button>`)
    .join('\n');
  const step = Math.max(1, Math.floor(entries.length / 24));
  const mosaic = entries
    .filter((_, index) => index % step === 3 % step)
    .slice(0, 24)
    .map((e, index) => `<a href="play/${e.dir}/" data-game="${e.dir}" title="${escapeHtml(e.title)}" style="--c:${familyColor(e.family)};--i:${index % 8}"><img src="play/${e.dir}/icon.svg" alt="${escapeHtml(e.title)}" width="64" height="64"></a>`)
    .join('\n');
  const picks = FEATURED
    .map((slug) => entries.find((e) => e.dir.endsWith(`-${slug}`)))
    .filter(Boolean)
    .map(renderFeatured)
    .join('\n');
  const games = entries.map((e) => ({ dir: e.dir, title: e.title, family: e.family, summary: e.summary, spec: e.spec, code: e.code }));
  const data = JSON.stringify(games).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game of Everything</title>
<meta name="description" content="Play ${entries.length} 2D game mechanics in your browser. See how each one works, and use the code in your own game. Free and open source.">
<meta property="og:title" content="Game of Everything">
<meta property="og:description" content="Play ${entries.length} 2D game mechanics in your browser for free.">
<style>
:root {
  color-scheme: dark;
  --bg: #080c1a; --panel: #111830; --panel-2: #182244; --line: #27335c;
  --text: #f4f6fc; --muted: #aab4cf; --accent: #ffd166; --ink: #171203;
  --radius: 14px;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  background:
    radial-gradient(900px 500px at 85% -10%, #2b2470 0, transparent 65%),
    radial-gradient(700px 420px at 0% 0%, #123a5c 0, transparent 60%),
    var(--bg);
  background-repeat: no-repeat;
}
a { color: inherit; }
img { display: block; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.wrap { width: min(1180px, 100%); margin: 0 auto; padding: 0 16px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 18px; padding-bottom: 18px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; text-decoration: none; letter-spacing: -.01em; }
.brand i { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; width: 26px; height: 26px; transform: rotate(45deg) scale(.82); }
.brand b { background: #ff6b6b; border-radius: 3px; }
.brand b:nth-child(2) { background: #ffd166; }
.brand b:nth-child(3) { background: #7cc4ff; }
.brand b:nth-child(4) { background: #3ddc97; }
.top nav { display: flex; gap: 8px; }
.ghost { padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; font-size: 14px; font-weight: 600; text-decoration: none; }
.ghost:hover { background: var(--panel-2); }
.hero { display: grid; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 40px; padding-top: 36px; padding-bottom: 56px; }
h1 { margin: 0; font-size: clamp(42px, 7vw, 76px); font-weight: 900; line-height: .98; letter-spacing: -.035em; }
h1 em { color: var(--accent); font-style: normal; }
.lead { max-width: 520px; margin: 20px 0 28px; color: var(--muted); font-size: 19px; }
.cta { display: flex; flex-wrap: wrap; gap: 12px; }
.btn { min-height: 52px; padding: 0 24px; border: 0; border-radius: 12px; font: 800 17px system-ui, sans-serif; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
.btn.main { background: var(--accent); color: var(--ink); box-shadow: 0 5px 0 #b98d1e; transition: transform .08s, box-shadow .08s; }
.btn.main:hover { transform: translateY(-1px); box-shadow: 0 6px 0 #b98d1e; }
.btn.main:active { transform: translateY(4px); box-shadow: 0 1px 0 #b98d1e; }
.btn.alt { background: var(--panel-2); color: var(--text); border: 1px solid var(--line); }
.facts { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 26px 0 0; padding: 0; color: var(--muted); font-size: 14px; list-style: none; }
.facts b { color: var(--text); }
.mosaic { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.mosaic a { aspect-ratio: 1; padding: 10%; border: 1px solid color-mix(in srgb, var(--c) 40%, var(--line)); border-radius: 12px; background: color-mix(in srgb, var(--c) 14%, var(--panel)); animation: bob 5s ease-in-out infinite; animation-delay: calc(var(--i) * -.6s); transition: transform .15s; }
.mosaic a:hover { transform: scale(1.1); }
.mosaic img { width: 100%; height: 100%; }
@keyframes bob { 50% { translate: 0 -5px; } }
h2 { margin: 0 0 14px; font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
.start { padding-bottom: 44px; }
.picks { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.pick { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--line); border-left: 4px solid var(--c); border-radius: 12px; background: var(--panel); text-decoration: none; }
.pick:hover { background: var(--panel-2); }
.pick strong, .pick small { display: block; }
.pick small { color: var(--muted); }
.tools { position: sticky; top: 0; z-index: 5; margin: 0 -16px 18px; padding: 12px 16px; background: color-mix(in srgb, var(--bg) 90%, transparent); backdrop-filter: blur(8px); }
.row { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
#search { flex: 1; min-width: 0; min-height: 46px; padding: 0 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); color: var(--text); font: inherit; }
#count { flex: none; margin: 0; color: var(--muted); font-size: 14px; }
.chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.chip { flex: none; min-height: 36px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--text); font: 600 14px system-ui, sans-serif; cursor: pointer; }
.chip span { color: var(--muted); font-weight: 500; }
.chip[aria-pressed="true"] { border-color: var(--c, var(--accent)); background: var(--c, var(--accent)); color: var(--ink); }
.chip[aria-pressed="true"] span { color: inherit; }
#games { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
.card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); transition: transform .15s, border-color .15s; }
.card:hover { transform: translateY(-3px); border-color: var(--c); }
.card[hidden] { display: none; }
.cover { position: relative; display: grid; place-items: center; height: 136px; background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--c) 34%, transparent), transparent 70%), var(--panel-2); text-decoration: none; }
.cover img { filter: drop-shadow(0 8px 14px #0007); transition: transform .15s; }
.card:hover .cover img { transform: scale(1.1) rotate(-3deg); }
.tag { position: absolute; top: 10px; left: 10px; padding: 2px 9px; border-radius: 999px; background: var(--c); color: var(--ink); font-size: 12px; font-weight: 800; }
.go { position: absolute; right: 10px; bottom: 10px; padding: 3px 11px; border-radius: 8px; background: var(--accent); color: var(--ink); font-size: 13px; font-weight: 800; opacity: 0; transition: opacity .15s; }
.card:hover .go, .cover:focus-visible .go { opacity: 1; }
.body { display: flex; flex: 1; flex-direction: column; padding: 13px 14px 14px; }
h3 { margin: 0; font-size: 18px; line-height: 1.25; }
.body small { color: var(--muted); }
.body p { display: -webkit-box; flex: 1; margin: 8px 0 12px; overflow: hidden; color: var(--muted); font-size: 14px; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; }
.links { display: flex; gap: 16px; font-size: 14px; }
.links a { color: var(--accent); }
#empty { display: none; padding: 40px 0; color: var(--muted); text-align: center; }
.help { margin-top: 56px; padding: 28px; border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(120deg, var(--panel-2), var(--panel)); }
.help p { max-width: 620px; margin: 0 0 18px; color: var(--muted); }
footer { padding-top: 28px; padding-bottom: 36px; color: var(--muted); font-size: 14px; }
dialog { width: min(980px, calc(100vw - 24px)); height: min(760px, calc(100dvh - 24px)); max-height: none; padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: #0b1020; color: var(--text); }
dialog::backdrop { background: #030610d9; backdrop-filter: blur(4px); }
.player { display: grid; grid-template-columns: 1fr 280px; height: 100%; }
#frame { width: 100%; height: 100%; border: 0; background: #0b1020; }
.side { display: flex; flex-direction: column; gap: 10px; padding: 20px; overflow-y: auto; border-left: 1px solid var(--line); background: var(--panel); }
.side h2 { margin: 0; padding-right: 36px; font-size: 22px; }
.side p { margin: 0; color: var(--muted); font-size: 14px; }
.side .links { flex-direction: column; gap: 8px; margin-top: auto; }
#close { position: absolute; top: 12px; right: 12px; z-index: 2; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel-2); color: var(--text); font-size: 20px; cursor: pointer; }
@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 28px; padding-top: 12px; padding-bottom: 40px; }
  .mosaic a:nth-child(n+13) { display: none; }
  .player { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
  .side { padding: 12px 56px 12px 14px; border-top: 1px solid var(--line); border-left: 0; }
  .side h2 { padding: 0; font-size: 18px; }
  .side p { display: none; }
  .side .links { flex-direction: row; margin-top: 0; }
  dialog { width: 100vw; max-width: 100vw; height: 100dvh; border: 0; border-radius: 0; }
}
@media (max-width: 560px) {
  #games { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .cover { height: 104px; }
  .cover img { width: 62px; height: 62px; }
  .body { padding: 10px; }
  h3 { font-size: 15px; }
  .body p, .links, .go { display: none; }
  .side .links { display: flex; }
}
@media (hover: none) { .go { opacity: 1; } }
body:has(dialog[open]) { overflow: hidden; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
<a class="brand" href="./"><i aria-hidden="true"><b></b><b></b><b></b><b></b></i>Game of Everything</a>
<nav aria-label="Project links"><a class="ghost" href="${REPO_URL}">GitHub</a></nav>
</header>
<section class="hero">
<div>
<h1>Every game idea.<br><em>Ready to play.</em></h1>
<p class="lead">Play ${entries.length} game mechanics in your browser, see how each one works, and use the code in your own game.</p>
<div class="cta">
<button type="button" class="btn main" id="random">Play a random game</button>
<a class="btn alt" href="#browse">Browse all games</a>
</div>
<ul class="facts"><li><b>${entries.length}</b> games</li><li><b>${families.length}</b> families</li><li><b>Free</b> and open source</li><li><b>No</b> install or account</li></ul>
</div>
<div class="mosaic" aria-label="A few of the games">
${mosaic}
</div>
</section>
<section class="start">
<h2>Start here</h2>
<div class="picks">
${picks}
</div>
</section>
<main id="browse">
<h2>All games</h2>
<div class="tools">
<div class="row"><input id="search" type="search" placeholder="Search games, like chess or farming" aria-label="Search games"><p id="count" role="status"></p></div>
<div class="chips" role="group" aria-label="Filter by family">
<button type="button" class="chip" data-filter="" aria-pressed="true">All <span>${entries.length}</span></button>
${chips}
</div>
</div>
<ul id="games">
${entries.map(renderCard).join('\n')}
</ul>
<p id="empty">No games match that search.</p>
</main>
<section class="help">
<h2>Help build it</h2>
<p>Add a new game, make one feel better, or explain a mechanic in plain words. Small changes are welcome, and there are starter tasks ready to pick up.</p>
<a class="btn main" href="${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22">See starter tasks</a>
</section>
<footer>Free and open source under the MIT license.</footer>
</div>
<dialog id="player" aria-label="Game player">
<button type="button" id="close" aria-label="Close game">×</button>
<div class="player">
<iframe id="frame" title="Game" allow="autoplay; fullscreen"></iframe>
<aside class="side">
<h2 id="p-title"></h2>
<p id="p-family"></p>
<p id="p-summary"></p>
<div class="links"><a id="p-spec" href="#">How it works</a><a id="p-code" href="#">See the code</a><a id="p-open" href="#">Open full page</a></div>
</aside>
</div>
</dialog>
<script id="data" type="application/json">${data}</script>
<script>
const games = JSON.parse(document.getElementById('data').textContent);
const byDir = new Map(games.map((game) => [game.dir, game]));
const cards = [...document.querySelectorAll('.card')];
const chips = [...document.querySelectorAll('.chip')];
const search = document.getElementById('search');
const count = document.getElementById('count');
const empty = document.getElementById('empty');
const player = document.getElementById('player');
const frame = document.getElementById('frame');
let family = '';

function update() {
  const words = search.value.toLowerCase().split(/\\s+/).filter(Boolean);
  let shown = 0;
  for (const card of cards) {
    const match = (!family || card.dataset.family === family)
      && words.every((word) => card.dataset.search.includes(word));
    card.hidden = !match;
    if (match) shown += 1;
  }
  count.textContent = shown === 1 ? '1 game' : shown + ' games';
  empty.style.display = shown ? 'none' : 'block';
}

function openGame(dir) {
  const game = byDir.get(dir);
  if (!game) return;
  const url = 'play/' + dir + '/';
  frame.src = url;
  document.getElementById('p-title').textContent = game.title;
  document.getElementById('p-family').textContent = game.family;
  document.getElementById('p-summary').textContent = game.summary;
  document.getElementById('p-spec').href = game.spec;
  document.getElementById('p-code').href = game.code;
  document.getElementById('p-open').href = url;
  history.replaceState(null, '', '#play=' + dir);
  if (!player.open) player.showModal();
  frame.focus();
}

function closeGame() {
  frame.removeAttribute('src');
  history.replaceState(null, '', location.pathname);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-game]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  openGame(link.dataset.game);
});
chips.forEach((chip) => chip.addEventListener('click', () => {
  family = chip.dataset.filter;
  chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
  update();
}));
search.addEventListener('input', update);
document.getElementById('random').addEventListener('click', () => {
  openGame(games[Math.floor(Math.random() * games.length)].dir);
});
document.getElementById('close').addEventListener('click', () => player.close());
player.addEventListener('close', closeGame);
update();
const linked = location.hash.match(/^#play=(.+)$/);
if (linked) openGame(decodeURIComponent(linked[1]));
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
