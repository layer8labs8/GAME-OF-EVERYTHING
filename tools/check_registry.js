#!/usr/bin/env node
// Validates registry/mechanics.json against the mechanics/ folder.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STATUS = ['idea', 'spec', 'logic', 'playable', 'polished', 'shipped'];
const LOGIC = STATUS.indexOf('logic');
const PLAYABLE = STATUS.indexOf('playable');
const LEVELS = ['none', 'endless', 'data'];

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
const mechanicsDir = path.join(ROOT, 'mechanics');
const errors = [];
const ids = new Set();
const slugs = new Set();
const folders = new Set();

for (const m of registry.mechanics) {
  const label = `${m.id}-${m.slug}`;
  if (!/^\d{4}$/.test(m.id)) errors.push(`${label}: id must be 4 digits`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug)) errors.push(`${label}: slug must be lowercase-kebab`);
  if (ids.has(m.id)) errors.push(`${label}: duplicate id`);
  if (slugs.has(m.slug)) errors.push(`${label}: duplicate slug`);
  ids.add(m.id);
  slugs.add(m.slug);
  if (!m.name || !m.family) errors.push(`${label}: name and family are required`);
  const rank = STATUS.indexOf(m.status);
  if (rank < 0) {
    errors.push(`${label}: unknown status "${m.status}"`);
    continue;
  }

  const dir = path.join(mechanicsDir, label);
  const has = (f) => fs.existsSync(path.join(dir, f));
  folders.add(label);
  if (rank < LOGIC && fs.existsSync(dir)) errors.push(`${label}: folder exists but status is "${m.status}"`);
  if (rank >= LOGIC && !(has('www/logic.js') && has('test.js'))) errors.push(`${label}: status "${m.status}" needs www/logic.js and test.js`);
  if (rank >= PLAYABLE && !has('www/index.html')) errors.push(`${label}: status "${m.status}" needs www/index.html`);
  if (m.bot && !has('env.js')) errors.push(`${label}: bot is true but env.js is missing`);
  if (m.levels !== undefined && !LEVELS.includes(m.levels)) errors.push(`${label}: levels must be one of ${LEVELS.join(', ')}`);
  if (rank >= LOGIC && m.levels === undefined) errors.push(`${label}: status "${m.status}" needs a levels value`);
  if (m.levels === 'data' && !(has('levels.json') && has('solver.js'))) errors.push(`${label}: levels "data" needs levels.json and solver.js`);
}

if (fs.existsSync(mechanicsDir)) {
  for (const d of fs.readdirSync(mechanicsDir, { withFileTypes: true })) {
    if (d.isDirectory() && !folders.has(d.name)) errors.push(`mechanics/${d.name}: folder has no registry entry`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => '  - ' + e).join('\n'));
  console.error(`registry check failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`registry ok: ${registry.mechanics.length} mechanics`);
